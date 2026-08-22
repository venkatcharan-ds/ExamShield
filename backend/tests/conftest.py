"""
Shared test setup. Consent mutation endpoints now require a Supabase
bearer token (see ../auth.py) — the lifecycle/firewall tests in this
directory are testing business logic, not authentication, so they run as
an authenticated caller by default via a FastAPI dependency override.

test_consent_auth.py explicitly removes this override to exercise the
real, unmocked authentication dependency.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest

from main import app
from auth import require_user


@pytest.fixture(autouse=True)
def _authenticated_by_default():
    app.dependency_overrides[require_user] = lambda: "test-user-id"
    yield
    app.dependency_overrides.pop(require_user, None)
