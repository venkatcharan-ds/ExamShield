"""Shared auth setup for backend tests.

Production routes still require real Supabase JWTs. Unit tests use a
fixed identity so regression coverage can exercise business logic without
network authentication.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest

from main import app
from auth import require_user
import auth
import api.routes as routes


@pytest.fixture(autouse=True)
def _authenticated_by_default(monkeypatch):
    app.dependency_overrides[require_user] = lambda: "test-user-id"
    monkeypatch.setattr(routes, "verify_supabase_token", lambda token: "test-user-id")
    monkeypatch.setattr(
        auth,
        "verify_supabase_claims",
        lambda token: {"sub": "test-admin", "app_metadata": {"role": "admin"}},
    )
    yield
    app.dependency_overrides.pop(require_user, None)
