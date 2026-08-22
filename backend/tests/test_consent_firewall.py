"""
Tests for the Consent Firewall — the enforcement layer on top of ConsentPulse.

Covers: allow/block/request-reconsent decisions, expiry/withdrawal as hard
invalidators, explicit-prohibition vs never-granted distinction, multiple
simultaneous violations, boundary immutability, audit logging of firewall
decisions, the real WS enforcement point, generic (non-exam) subjects, and
invalid input.
"""

import time
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient

from main import app
from models.consent import store as consent_store
from models.session import store as session_store
from ml.consent_firewall import FIREWALL_ALLOW, FIREWALL_RECONSENT, FIREWALL_BLOCK

client = TestClient(app)


def _grant(subject_id: str, **overrides) -> dict:
    body = {
        "subject_id": subject_id,
        "subject_type": "exam_session",
        "purpose": ["examination_integrity"],
        "data_categories": ["keystroke_timing", "mouse_movement", "tab_switching"],
        "prohibited_data": ["webcam", "facial_recognition", "behavioral_profiling"],
        "duration_days": 30,
    }
    body.update(overrides)
    r = client.post("/api/consent/grant", json=body)
    assert r.status_code == 200
    return r.json()


def _authorize(subject_id: str, action_name="analyze_keystrokes", purpose="examination_integrity",
               data_categories=None) -> dict:
    r = client.post(f"/api/consent/{subject_id}/authorize", json={
        "action_name": action_name,
        "purpose": purpose,
        "data_categories": data_categories if data_categories is not None else ["keystroke_timing"],
    })
    return r


@pytest.fixture(autouse=True)
def _clean_store():
    consent_store._records.clear()
    session_store._sessions.clear()
    yield
    consent_store._records.clear()
    session_store._sessions.clear()


# ─── Core decisions ─────────────────────────────────────────────────────────

def test_valid_consent_allows_matching_action():
    _grant("fw-1")
    r = _authorize("fw-1", data_categories=["keystroke_timing"])
    assert r.status_code == 200
    body = r.json()
    assert body["decision"] == FIREWALL_ALLOW
    assert body["reasons"] == ["Action matches the active consent boundary."]
    assert body["required_action"] is None


def test_explicitly_prohibited_data_is_blocked():
    _grant("fw-2")
    r = _authorize("fw-2", action_name="start_webcam_analysis", data_categories=["webcam"])
    body = r.json()
    assert body["decision"] == FIREWALL_BLOCK
    assert "webcam" in body["reasons"][0].lower()
    assert body["required_action"] == "REQUEST_UPDATED_CONSENT"


def test_never_granted_but_not_prohibited_data_requests_reconsent():
    _grant("fw-3", data_categories=["keystroke_timing"], prohibited_data=[])
    r = _authorize("fw-3", data_categories=["mouse_movement"])
    body = r.json()
    assert body["decision"] == FIREWALL_RECONSENT
    assert "mouse movement" in body["reasons"][0].lower()


def test_unauthorized_purpose_requests_reconsent():
    _grant("fw-4", purpose=["examination_integrity"])
    r = _authorize("fw-4", purpose="marketing", data_categories=["keystroke_timing"])
    body = r.json()
    assert body["decision"] == FIREWALL_RECONSENT
    assert "marketing" in body["reasons"][0].lower()


# ─── Hard invalidators ──────────────────────────────────────────────────────

def test_expired_consent_blocks_every_action():
    _grant("fw-5")
    record = consent_store.get("fw-5")
    record.expires_at = time.time() * 1000 - 1000
    r = _authorize("fw-5", data_categories=["keystroke_timing"])
    body = r.json()
    assert body["decision"] == FIREWALL_BLOCK
    assert "expired" in body["reasons"][0].lower()


def test_withdrawn_consent_blocks_every_action():
    _grant("fw-6")
    client.post("/api/consent/fw-6/withdraw", json={})
    r = _authorize("fw-6", data_categories=["keystroke_timing"])
    body = r.json()
    assert body["decision"] == FIREWALL_BLOCK
    assert "withdrawn" in body["reasons"][0].lower()


def test_no_consent_record_is_blocked():
    r = _authorize("fw-nonexistent", data_categories=["keystroke_timing"])
    body = r.json()
    assert body["decision"] == FIREWALL_BLOCK
    assert "no consent record" in body["reasons"][0].lower()


# ─── Multiple violations ────────────────────────────────────────────────────

def test_multiple_simultaneous_violations_are_all_explained():
    _grant("fw-7", purpose=["examination_integrity"], data_categories=["keystroke_timing"],
           prohibited_data=["webcam"])
    r = _authorize("fw-7", purpose="behavioral_profiling", data_categories=["mouse_movement", "webcam"])
    body = r.json()
    assert body["decision"] == FIREWALL_BLOCK  # prohibited data present -> worst case wins
    assert len(body["reasons"]) >= 2
    joined = " ".join(body["reasons"]).lower()
    assert "webcam" in joined
    assert "mouse movement" in joined
    assert "behavioral profiling" in joined


# ─── Boundary immutability + reconsent (system change vs user approval) ────

def test_update_never_moves_the_boundary_firewall_still_blocks():
    _grant("fw-8", prohibited_data=["webcam"])
    original_before = consent_store.get("fw-8").original_context.to_dict()

    # /update simulates "the system changed" — it must NOT expand what's authorized.
    client.post("/api/consent/fw-8/update", json={"data_categories": ["keystroke_timing", "webcam"]})
    assert consent_store.get("fw-8").original_context.to_dict() == original_before  # shadow untouched

    r = _authorize("fw-8", action_name="start_webcam_analysis", data_categories=["webcam"])
    assert r.json()["decision"] == FIREWALL_BLOCK  # still blocked — system claiming it isn't approval


def test_reconsent_moves_the_boundary_and_then_allows():
    _grant("fw-9", prohibited_data=["webcam"], version="1.0")
    blocked = _authorize("fw-9", action_name="start_webcam_analysis", data_categories=["webcam"])
    assert blocked.json()["decision"] == FIREWALL_BLOCK

    r = client.post("/api/consent/fw-9/reconsent", json={
        "data_categories": ["keystroke_timing", "mouse_movement", "tab_switching", "webcam"],
        "prohibited_data": [],
        "version": "2.0",
    })
    assert r.status_code == 200
    data = r.json()
    assert data["original_context"]["version"] == "2.0"
    assert "webcam" in data["original_context"]["data_categories"]

    allowed = _authorize("fw-9", action_name="start_webcam_analysis", data_categories=["webcam"])
    assert allowed.json()["decision"] == FIREWALL_ALLOW


def test_reconsent_requires_a_version_bump_when_boundary_changes():
    _grant("fw-10", version="1.0")
    r = client.post("/api/consent/fw-10/reconsent", json={"data_categories": ["keystroke_timing", "webcam"]})
    assert r.status_code == 422  # boundary changed but version didn't — rejected, not silently accepted


def test_reconsent_is_distinct_event_from_plain_grant_in_audit():
    _grant("fw-11", version="1.0")
    client.post("/api/consent/fw-11/reconsent", json={"version": "2.0", "data_categories": ["keystroke_timing", "webcam"]})
    events = [e["event"] for e in client.get("/api/consent/fw-11/timeline").json()["audit"]]
    assert events == ["consent_granted", "consent_updated_by_user"]


# ─── Audit trail ────────────────────────────────────────────────────────────

def test_blocked_action_is_logged_to_audit_trail():
    _grant("fw-12", prohibited_data=["webcam"])
    _authorize("fw-12", action_name="start_webcam_analysis", data_categories=["webcam"])
    events = [e["event"] for e in client.get("/api/consent/fw-12/timeline").json()["audit"]]
    assert "firewall_blocked" in events


def test_allowed_action_does_not_spam_audit_trail():
    _grant("fw-13")
    _authorize("fw-13", data_categories=["keystroke_timing"])
    _authorize("fw-13", data_categories=["keystroke_timing"])
    events = [e["event"] for e in client.get("/api/consent/fw-13/timeline").json()["audit"]]
    assert events == ["consent_granted"]  # ALLOW is not logged — only state changes and violations are


# ─── Generic (non-exam) subjects ────────────────────────────────────────────

def test_firewall_is_generic_across_domains():
    _grant("patient-42", subject_type="healthcare_patient", consent_type="data_sharing",
           purpose=["treatment_coordination"], data_categories=["diagnosis_codes"],
           prohibited_data=["genetic_data"])
    r = _authorize("patient-42", action_name="share_with_insurer", purpose="treatment_coordination",
                    data_categories=["genetic_data"])
    assert r.json()["decision"] == FIREWALL_BLOCK
    assert "genetic data" in r.json()["reasons"][0].lower()


# ─── Invalid input ──────────────────────────────────────────────────────────

def test_authorize_missing_action_name_is_422():
    _grant("fw-14")
    r = client.post("/api/consent/fw-14/authorize", json={"purpose": "x", "data_categories": []})
    assert r.status_code == 422


def test_boundary_impact_aggregate():
    _grant("fw-15a", data_categories=["keystroke_timing"])
    _grant("fw-15b", data_categories=["keystroke_timing", "webcam"])
    r = client.get("/api/consent/_boundary-impact?data_category=webcam")
    body = r.json()
    assert body["active_consents"] >= 2
    assert 0 <= body["unauthorized_pct"] <= 100


# ─── Real enforcement point: the exam WebSocket pipeline ───────────────────

def test_real_enforcement_blocks_risk_engine_after_withdrawal():
    """This is the genuine enforcement check: once consent is withdrawn,
    the ML engine must actually stop being invoked for that session — not
    just show an invalid badge in the UI."""
    session_id = "ws-fw-session"
    _grant(session_id)

    with client.websocket_connect(f"/ws/{session_id}") as ws:
        ws.send_json({"type": "session_start", "payload": {"session_id": session_id, "candidate_name": "Test"}})
        ws.receive_json()  # session_ack

        ws.send_json({"type": "behavior_snapshot", "payload": {
            "session_id": session_id, "candidate_name": "Test",
            "events": [{"type": "keydown", "timestamp": 1.0}],
            "window_start": 0, "window_end": 1,
        }})
        first = ws.receive_json()
        assert first["type"] == "risk_update"

        client.post(f"/api/consent/{session_id}/withdraw", json={})

        ws.send_json({"type": "behavior_snapshot", "payload": {
            "session_id": session_id, "candidate_name": "Test",
            "events": [{"type": "keydown", "timestamp": 2.0}],
            "window_start": 1, "window_end": 2,
        }})
        second = ws.receive_json()
        assert second["type"] == "consent_blocked"
        assert second["payload"]["decision"] == FIREWALL_BLOCK

    session = session_store.get(session_id)
    assert session.current_risk_score == first["payload"]["risk_score"]  # risk score genuinely stopped updating
    assert any(e["type"] == "consent_boundary_blocked" for e in session.timeline)
