"""
Regression tests proving ConsentPulse's mutation endpoints actually
enforce authorization — not just that a dependency exists on paper.

These tests deliberately remove the "always authenticated" override that
conftest.py's autouse fixture installs for every other test file, so the
real, unmocked `require_user` dependency runs against each request.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient

from main import app
from auth import require_user
from models.consent import store as consent_store

client = TestClient(app)

_REAL_SUPABASE_URL = "https://gimsfuhxlwkjtiytlyql.supabase.co"  # public project URL, not a secret


@pytest.fixture(autouse=True)
def _use_real_auth_dependency():
    """Undo conftest's default override so these tests hit the real check."""
    app.dependency_overrides.pop(require_user, None)
    os.environ["SUPABASE_URL"] = _REAL_SUPABASE_URL
    yield
    app.dependency_overrides[require_user] = lambda: "test-user-id"


@pytest.fixture(autouse=True)
def _clean_store():
    consent_store._records.clear()
    yield
    consent_store._records.clear()


# ─── Unauthorized requests are rejected ─────────────────────────────────────

def test_grant_without_token_is_rejected():
    r = client.post("/api/consent/grant", json={"subject_id": "auth-1"})
    assert r.status_code == 401


def test_grant_with_garbage_token_is_rejected():
    r = client.post(
        "/api/consent/grant", json={"subject_id": "auth-2"},
        headers={"Authorization": "Bearer not-a-real-jwt"},
    )
    assert r.status_code == 401


def test_grant_with_malformed_header_is_rejected():
    r = client.post(
        "/api/consent/grant", json={"subject_id": "auth-3"},
        headers={"Authorization": "not-even-a-bearer-token"},
    )
    assert r.status_code == 401


@pytest.mark.parametrize("path,body", [
    ("/api/consent/some-subject/update", {}),
    ("/api/consent/some-subject/withdraw", {}),
    ("/api/consent/some-subject/simulate", {"scenario": "reset"}),
    ("/api/consent/some-subject/reconsent", {}),
])
def test_every_mutation_endpoint_requires_auth(path, body):
    r = client.post(path, json=body)
    assert r.status_code == 401, f"{path} did not reject an unauthenticated request"


def test_missing_supabase_url_fails_closed_not_open():
    """If this deployment forgot to configure SUPABASE_URL, mutation
    endpoints must refuse everything (503) rather than silently accept
    requests as if they were authenticated."""
    del os.environ["SUPABASE_URL"]
    r = client.post("/api/consent/grant", json={"subject_id": "auth-4"})
    assert r.status_code == 503


# ─── Authorized requests succeed ────────────────────────────────────────────

def test_authorized_grant_succeeds():
    app.dependency_overrides[require_user] = lambda: "test-user-id"
    try:
        r = client.post("/api/consent/grant", json={"subject_id": "auth-5"})
        assert r.status_code == 200
        assert r.json()["status"] == "active"
    finally:
        app.dependency_overrides.pop(require_user, None)


def test_authorized_full_mutation_lifecycle_succeeds():
    app.dependency_overrides[require_user] = lambda: "test-user-id"
    try:
        assert client.post("/api/consent/grant", json={"subject_id": "auth-6"}).status_code == 200
        assert client.post("/api/consent/auth-6/update", json={"version": "1.1"}).status_code == 200
        assert client.post("/api/consent/auth-6/simulate", json={"scenario": "reset"}).status_code == 200
        assert client.post("/api/consent/auth-6/reconsent", json={"version": "2.0"}).status_code == 200
        assert client.post("/api/consent/auth-6/withdraw", json={}).status_code == 200
    finally:
        app.dependency_overrides.pop(require_user, None)


# ─── Read-only / decision endpoints stay open (documented, not an oversight) ─

def test_read_endpoints_do_not_require_auth():
    app.dependency_overrides[require_user] = lambda: "test-user-id"
    try:
        client.post("/api/consent/grant", json={"subject_id": "auth-7"})
    finally:
        app.dependency_overrides.pop(require_user, None)

    assert client.get("/api/consent/auth-7").status_code == 200
    assert client.get("/api/consent/auth-7/timeline").status_code == 200


def test_authorize_decision_endpoint_does_not_require_auth():
    r = client.post("/api/consent/auth-8/authorize", json={
        "action_name": "x", "purpose": "y", "data_categories": [],
    })
    assert r.status_code == 200  # a decision (BLOCK, since no consent exists), not a 401
    assert r.json()["decision"] == "BLOCK"
