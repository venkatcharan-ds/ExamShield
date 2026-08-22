"""Tests for the Admin Management endpoints.

Security contract verified here:
  - Unauthenticated requests → 401
  - Student accounts (role != admin) → 403
  - Admin with missing SUPABASE_SERVICE_ROLE_KEY → 503
  - Admin with service key → correct response (Supabase call is mocked)
  - Newly created account receives role=admin in the response
  - Service-role key is never echoed back to the caller

All Supabase Admin API calls are replaced with in-process stubs so tests
run without a real Supabase project or internet connection.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient

import auth
import api.admin_routes as admin_routes
from main import app

client = TestClient(app)

ADMIN_BEARER = "Bearer fake-admin-token"
STUDENT_BEARER = "Bearer fake-student-token"

# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture()
def with_service_key(monkeypatch):
    """Provide a fake (non-empty) service role key so _service_role_key() passes."""
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
    monkeypatch.setenv("SUPABASE_URL", "https://fake-project.supabase.co")


@pytest.fixture()
def as_student(monkeypatch):
    """Override the global admin mock so this request looks like a student."""
    monkeypatch.setattr(
        auth,
        "verify_supabase_claims",
        lambda token: {"sub": "student-user-id", "app_metadata": {"role": "student"}},
    )


MOCK_USERS = [
    {
        "id": "uid-admin-1",
        "email": "venkatcharan.ds@gmail.com",
        "created_at": "2024-01-01T00:00:00Z",
        "last_sign_in_at": "2024-12-01T10:00:00Z",
        "email_confirmed_at": "2024-01-01T00:00:00Z",
        "app_metadata": {"role": "admin"},
    },
    {
        "id": "uid-student-1",
        "email": "student@example.com",
        "created_at": "2024-06-01T00:00:00Z",
        "last_sign_in_at": None,
        "email_confirmed_at": "2024-06-01T00:00:00Z",
        "app_metadata": {"role": "student"},
    },
]

MOCK_CREATED_USER = {
    "id": "uid-new-admin",
    "email": "newadmin@example.com",
    "created_at": "2025-01-01T00:00:00Z",
    "last_sign_in_at": None,
    "email_confirmed_at": "2025-01-01T00:00:00Z",
    "app_metadata": {"role": "admin"},
}


# ── GET /api/admin/users ──────────────────────────────────────────────────────

class TestListAdminUsers:
    def test_unauthenticated_returns_401(self):
        """No Authorization header → 401."""
        r = client.get("/api/admin/users")
        assert r.status_code == 401

    def test_student_returns_403(self, as_student):
        """Student role → 403 Forbidden."""
        r = client.get("/api/admin/users", headers={"Authorization": STUDENT_BEARER})
        assert r.status_code == 403

    def test_admin_without_service_key_returns_503(self, monkeypatch):
        """Admin role but SUPABASE_SERVICE_ROLE_KEY unset → 503 (not a security failure)."""
        monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
        r = client.get("/api/admin/users", headers={"Authorization": ADMIN_BEARER})
        assert r.status_code == 503
        assert "SUPABASE_SERVICE_ROLE_KEY" in r.json()["detail"]

    def test_admin_lists_only_admin_accounts(self, with_service_key, monkeypatch):
        """Admin request returns only accounts with role=admin, not student accounts."""
        async def _mock_list(base_url, headers):
            return MOCK_USERS

        monkeypatch.setattr(admin_routes, "_list_users_from_supabase", _mock_list)

        r = client.get("/api/admin/users", headers={"Authorization": ADMIN_BEARER})
        assert r.status_code == 200
        body = r.json()
        assert "admins" in body
        admins = body["admins"]
        assert len(admins) == 1
        assert admins[0]["email"] == "venkatcharan.ds@gmail.com"
        assert admins[0]["role"] == "admin"

    def test_response_never_includes_password_or_tokens(self, with_service_key, monkeypatch):
        """Verify the response schema contains no dangerous fields."""
        async def _mock_list(base_url, headers):
            return MOCK_USERS

        monkeypatch.setattr(admin_routes, "_list_users_from_supabase", _mock_list)

        r = client.get("/api/admin/users", headers={"Authorization": ADMIN_BEARER})
        assert r.status_code == 200
        body_text = r.text
        # Service role key must never appear in any response
        assert "test-service-role-key" not in body_text
        for admin in r.json()["admins"]:
            assert "password" not in admin
            assert "access_token" not in admin
            assert "refresh_token" not in admin

    def test_service_key_never_returned_to_caller(self, with_service_key, monkeypatch):
        """The SUPABASE_SERVICE_ROLE_KEY must not appear anywhere in the HTTP response."""
        async def _mock_list(base_url, headers):
            return []

        monkeypatch.setattr(admin_routes, "_list_users_from_supabase", _mock_list)
        r = client.get("/api/admin/users", headers={"Authorization": ADMIN_BEARER})
        assert "test-service-role-key" not in r.text


# ── POST /api/admin/users ─────────────────────────────────────────────────────

class TestCreateAdminUser:
    def test_unauthenticated_returns_401(self):
        """No Authorization header → 401."""
        r = client.post("/api/admin/users", json={"email": "x@example.com", "password": "password1"})
        assert r.status_code == 401

    def test_student_returns_403(self, as_student):
        """Student cannot create an admin account."""
        r = client.post(
            "/api/admin/users",
            headers={"Authorization": STUDENT_BEARER},
            json={"email": "x@example.com", "password": "password1"},
        )
        assert r.status_code == 403

    def test_admin_without_service_key_returns_503(self, monkeypatch):
        """Missing service key blocks creation cleanly with 503."""
        monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
        r = client.post(
            "/api/admin/users",
            headers={"Authorization": ADMIN_BEARER},
            json={"email": "x@example.com", "password": "password1"},
        )
        assert r.status_code == 503

    def test_newly_created_admin_receives_role_admin(self, with_service_key, monkeypatch):
        """Created user's response must confirm role=admin."""
        async def _mock_create(base_url, headers, payload):
            assert payload["app_metadata"]["role"] == "admin"
            assert payload["email_confirm"] is True
            return MOCK_CREATED_USER

        monkeypatch.setattr(admin_routes, "_create_user_in_supabase", _mock_create)

        r = client.post(
            "/api/admin/users",
            headers={"Authorization": ADMIN_BEARER},
            json={"email": "newadmin@example.com", "password": "SecurePass1!"},
        )
        assert r.status_code == 201
        body = r.json()
        assert body["email"] == "newadmin@example.com"
        assert body["role"] == "admin"

    def test_create_payload_always_sets_admin_role(self, with_service_key, monkeypatch):
        """The app_metadata sent to Supabase must always contain role=admin."""
        captured = {}

        async def _mock_create(base_url, headers, payload):
            captured["payload"] = payload
            return MOCK_CREATED_USER

        monkeypatch.setattr(admin_routes, "_create_user_in_supabase", _mock_create)

        client.post(
            "/api/admin/users",
            headers={"Authorization": ADMIN_BEARER},
            json={"email": "newadmin@example.com", "password": "SecurePass1!"},
        )
        assert captured["payload"]["app_metadata"]["role"] == "admin"

    def test_invalid_email_returns_422(self, with_service_key):
        """Malformed email is rejected before hitting Supabase."""
        r = client.post(
            "/api/admin/users",
            headers={"Authorization": ADMIN_BEARER},
            json={"email": "not-an-email", "password": "SecurePass1!"},
        )
        assert r.status_code == 422

    def test_short_password_returns_422(self, with_service_key):
        """Password shorter than 8 chars is rejected."""
        r = client.post(
            "/api/admin/users",
            headers={"Authorization": ADMIN_BEARER},
            json={"email": "ok@example.com", "password": "short"},
        )
        assert r.status_code == 422

    def test_response_never_includes_password(self, with_service_key, monkeypatch):
        """The plaintext password must never appear in the response."""
        async def _mock_create(base_url, headers, payload):
            return MOCK_CREATED_USER

        monkeypatch.setattr(admin_routes, "_create_user_in_supabase", _mock_create)

        r = client.post(
            "/api/admin/users",
            headers={"Authorization": ADMIN_BEARER},
            json={"email": "newadmin@example.com", "password": "SuperSecret99"},
        )
        assert r.status_code == 201
        body_text = r.text
        assert "SuperSecret99" not in body_text
        assert "test-service-role-key" not in body_text
        body = r.json()
        assert "password" not in body
        assert "access_token" not in body
        assert "refresh_token" not in body

    def test_existing_email_bubbles_409_from_supabase(self, with_service_key, monkeypatch):
        """Duplicate email → 409 from Supabase is surfaced as 409."""
        from fastapi import HTTPException as FastAPIHTTPException

        async def _mock_create(base_url, headers, payload):
            raise FastAPIHTTPException(status_code=409, detail="A user with that email already exists")

        monkeypatch.setattr(admin_routes, "_create_user_in_supabase", _mock_create)

        r = client.post(
            "/api/admin/users",
            headers={"Authorization": ADMIN_BEARER},
            json={"email": "existing@example.com", "password": "SecurePass1!"},
        )
        assert r.status_code == 409
