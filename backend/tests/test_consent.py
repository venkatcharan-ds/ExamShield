"""
Tests for the consent lifecycle + drift detection module.

Covers: collection, change, expiry, withdrawal, and drift detection —
both at the unit level (models.consent / ml.drift_detector) and through
the REST API (api/consent_routes.py via main:app).
"""

import time
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient

from main import app
from models.consent import store as consent_store, ConsentContext, ConsentRecord
from ml.drift_detector import detector, DRIFT_ALIGNED, DRIFT_MINOR, DRIFT_SIGNIFICANT, DRIFT_INVALID


client = TestClient(app)


def _grant(subject_id: str, **overrides) -> dict:
    body = {
        "subject_id": subject_id,
        "purpose": ["examination_integrity"],
        "data_categories": ["keystroke_timing", "mouse_movement", "tab_switching"],
        "duration_days": 30,
    }
    body.update(overrides)
    r = client.post("/api/consent/grant", json=body)
    assert r.status_code == 200
    return r.json()


@pytest.fixture(autouse=True)
def _clean_store():
    consent_store._records.clear()
    yield
    consent_store._records.clear()


# ─── 1. Consent collection ─────────────────────────────────────────────────

def test_grant_records_original_context():
    data = _grant("sess-1")
    assert data["status"] == "active"
    assert data["original_context"]["purpose"] == ["examination_integrity"]
    assert data["original_context"] == data["current_context"]
    assert data["drift"]["status"] == DRIFT_ALIGNED
    assert data["drift"]["score"] == 100
    assert any(e["event"] == "consent_granted" for e in data["audit"])


def test_grant_is_idempotent_while_active():
    first = _grant("sess-2")
    second = _grant("sess-2", purpose=["something_else"])
    # Second grant call returns the existing active record unchanged.
    assert second["consent_id"] == first["consent_id"]
    assert second["current_context"]["purpose"] == ["examination_integrity"]


def test_get_unknown_subject_404():
    r = client.get("/api/consent/does-not-exist")
    assert r.status_code == 404


# ─── 2. Consent change ──────────────────────────────────────────────────────

def test_update_expanding_purpose_is_significant_drift():
    _grant("sess-3")
    r = client.post("/api/consent/sess-3/update", json={
        "purpose": ["examination_integrity", "behavioral_analytics"],
        "reason": "product wants more insight",
    })
    assert r.status_code == 200
    data = r.json()
    assert data["drift"]["status"] == DRIFT_SIGNIFICANT
    assert any("behavioral analytics" in reason.lower() for reason in data["drift"]["reasons"])
    assert any(e["event"] == "drift_detected" for e in data["audit"])


def test_update_adding_data_category_is_significant_drift():
    _grant("sess-4")
    r = client.post("/api/consent/sess-4/update", json={
        "data_categories": ["keystroke_timing", "mouse_movement", "tab_switching", "webcam_analysis"],
    })
    data = r.json()
    assert data["drift"]["status"] == DRIFT_SIGNIFICANT
    assert any("webcam analysis" in reason.lower() for reason in data["drift"]["reasons"])


def test_update_narrowing_scope_is_minor_drift():
    _grant("sess-5")
    r = client.post("/api/consent/sess-5/update", json={
        "data_categories": ["keystroke_timing", "mouse_movement"],  # dropped tab_switching
    })
    data = r.json()
    assert data["drift"]["status"] == DRIFT_MINOR


def test_update_version_only_is_minor_drift():
    _grant("sess-6")
    r = client.post("/api/consent/sess-6/update", json={"version": "1.1"})
    data = r.json()
    assert data["drift"]["status"] == DRIFT_MINOR


def test_original_context_preserved_after_change():
    granted = _grant("sess-7")
    client.post("/api/consent/sess-7/update", json={"purpose": ["examination_integrity", "marketing"]})
    r = client.get("/api/consent/sess-7")
    data = r.json()
    assert data["original_context"] == granted["original_context"]
    assert data["current_context"]["purpose"] == ["examination_integrity", "marketing"]


# ─── 3. Consent expiry ──────────────────────────────────────────────────────

def test_expired_consent_is_invalid():
    _grant("sess-8", duration_days=30)
    record = consent_store.get("sess-8")
    record.expires_at = time.time() * 1000 - 1000  # backdate
    r = client.get("/api/consent/sess-8")
    data = r.json()
    assert data["drift"]["status"] == DRIFT_INVALID
    assert "expired" in data["drift"]["reasons"][0].lower()
    assert data["drift"]["score"] == 0


def test_simulate_expire_endpoint():
    _grant("sess-9")
    r = client.post("/api/consent/sess-9/simulate", json={"scenario": "expire"})
    data = r.json()
    assert data["drift"]["status"] == DRIFT_INVALID
    assert any(e["event"] == "consent_expired" for e in data["audit"])


# ─── 4. Consent withdrawal ──────────────────────────────────────────────────

def test_withdraw_marks_invalid_and_stops_treating_as_active():
    _grant("sess-10")
    r = client.post("/api/consent/sess-10/withdraw", json={"reason": "changed my mind"})
    data = r.json()
    assert data["status"] == "withdrawn"
    assert data["withdrawn_at"] is not None
    assert data["drift"]["status"] == DRIFT_INVALID

    # Further updates must be rejected — withdrawn consent cannot be silently reactivated.
    r2 = client.post("/api/consent/sess-10/update", json={"purpose": ["x"]})
    assert r2.status_code == 409


def test_withdraw_twice_is_rejected_not_duplicated():
    _grant("sess-10b")
    client.post("/api/consent/sess-10b/withdraw", json={})
    r = client.post("/api/consent/sess-10b/withdraw", json={})
    assert r.status_code == 409
    timeline = client.get("/api/consent/sess-10b/timeline").json()["audit"]
    assert [e["event"] for e in timeline].count("consent_withdrawn") == 1


def test_update_after_expiry_is_rejected():
    _grant("sess-10c")
    record = consent_store.get("sess-10c")
    record.expires_at = time.time() * 1000 - 1000  # backdate, status field is still "active"
    r = client.post("/api/consent/sess-10c/update", json={"version": "2.0"})
    assert r.status_code == 409
    # the expired consent's context must not have been silently changed
    assert consent_store.get("sess-10c").current_context.version == "1.0"


def test_regrant_after_withdrawal_preserves_full_audit_history():
    _grant("sess-10d")
    client.post("/api/consent/sess-10d/withdraw", json={"reason": "no longer needed"})
    second = _grant("sess-10d")  # renewal — same subject, new consent period
    events = [e["event"] for e in second["audit"]]
    assert events == ["consent_granted", "consent_withdrawn", "consent_granted"]
    assert second["status"] == "active"
    assert second["drift"]["status"] == DRIFT_ALIGNED


def test_withdrawal_preserves_audit_history():
    _grant("sess-11")
    client.post("/api/consent/sess-11/update", json={"version": "1.2"})
    client.post("/api/consent/sess-11/withdraw", json={})
    r = client.get("/api/consent/sess-11/timeline")
    events = [e["event"] for e in r.json()["audit"]]
    # version bump is a minor drift, so both the change and its detection are logged
    assert events == ["consent_granted", "processing_scope_changed", "drift_detected", "consent_withdrawn"]


# ─── 5. Drift detection engine (unit-level, explainability) ────────────────

def test_aligned_context_has_no_drift():
    context = ConsentContext(purpose=["examination_integrity"], data_categories=["keystroke_timing"])
    record = ConsentRecord(
        consent_id="c1", subject_id="s1", owner_user_id="test-user",
        subject_type="exam_session", consent_type="behavioral_monitoring",
        granted_at=time.time() * 1000, expires_at=time.time() * 1000 + 1_000_000,
        status="active", original_context=context, current_context=context.clone(),
    )
    result = detector.evaluate(record)
    assert result.status == DRIFT_ALIGNED
    assert all(c.passed for c in result.checks)


def test_drift_result_always_explains_why():
    _grant("sess-12")
    client.post("/api/consent/sess-12/update", json={"purpose": ["examination_integrity", "ads"]})
    data = client.get("/api/consent/sess-12").json()
    drift = data["drift"]
    assert drift["status"] != DRIFT_ALIGNED
    assert len(drift["reasons"]) > 0
    assert drift["recommended_action"]
    assert any(not c["passed"] for c in drift["checks"])


def test_multiple_simultaneous_drift_reasons_are_all_reported():
    _grant("sess-14", purpose=["examination_integrity"], data_categories=["keystroke_timing"])
    r = client.post("/api/consent/sess-14/update", json={
        "purpose": ["examination_integrity", "marketing"],
        "data_categories": ["keystroke_timing", "webcam_analysis"],
        "processing_scope": "cross_session_profiling",
    })
    drift = r.json()["drift"]
    assert drift["status"] == DRIFT_SIGNIFICANT
    assert len(drift["reasons"]) == 3
    joined = " ".join(drift["reasons"]).lower()
    assert "marketing" in joined and "webcam analysis" in joined and "processing scope changed" in joined


def test_invalid_scenario_value_is_rejected_with_422():
    _grant("sess-15")
    r = client.post("/api/consent/sess-15/simulate", json={"scenario": "not_a_real_scenario"})
    assert r.status_code == 422


def test_missing_subject_id_is_rejected_with_422():
    r = client.post("/api/consent/grant", json={"purpose": ["x"]})
    assert r.status_code == 422


def test_simulate_full_demo_flow():
    _grant("sess-13")
    assert client.get("/api/consent/sess-13").json()["drift"]["status"] == DRIFT_ALIGNED

    r = client.post("/api/consent/sess-13/simulate", json={"scenario": "purpose_expansion"})
    assert r.json()["drift"]["status"] == DRIFT_SIGNIFICANT

    r = client.post("/api/consent/sess-13/simulate", json={"scenario": "withdraw"})
    assert r.json()["drift"]["status"] == DRIFT_INVALID

    r = client.post("/api/consent/sess-13/simulate", json={"scenario": "reset"})
    assert r.json()["drift"]["status"] == DRIFT_ALIGNED
    assert r.json()["status"] == "active"
