"""
Authentication for ConsentPulse's mutation endpoints.

ExamShield already gates its /dashboard route behind Supabase Auth on the
frontend, but the backend never verified anything — every REST endpoint
was reachable by anyone who knew the URL. This module closes that gap for
consent-mutating endpoints specifically, without introducing a second auth
system: it verifies the same Supabase-issued access token the dashboard
already holds.

Verification is against Supabase's public JWKS (asymmetric ES256) at
`{SUPABASE_URL}/auth/v1/.well-known/jwks.json` — there is no shared
secret to store or leak. `SUPABASE_URL` is not sensitive (it's the same
value already public in the frontend's NEXT_PUBLIC_SUPABASE_URL); it must
be set as a backend env var for this to work. If it's missing, protected
endpoints fail closed with 503 rather than silently accepting requests.
"""

import os
from functools import lru_cache

import jwt
from jwt import PyJWKClient
from fastapi import Header, HTTPException


def _supabase_url() -> str:
    # Read lazily (not at import time) so it reflects the current
    # environment — matters for tests, harmless in production where the
    # env var is fixed for the life of the process anyway.
    return os.environ.get("SUPABASE_URL", "").rstrip("/")


@lru_cache(maxsize=8)
def _jwk_client_for(url: str) -> PyJWKClient:
    return PyJWKClient(f"{url}/auth/v1/.well-known/jwks.json")


async def require_user(authorization: str = Header(default=None)) -> str:
    """FastAPI dependency — verifies a Supabase-issued bearer token.

    Returns the authenticated user's id (`sub` claim) on success. Raises
    401 for any missing/invalid/expired token, or 503 if this deployment
    has no SUPABASE_URL configured (fails closed, never open)."""
    url = _supabase_url()
    if not url:
        raise HTTPException(status_code=503, detail="Auth is not configured on this server")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization[len("Bearer "):].strip()
    try:
        client = _jwk_client_for(url)
        signing_key = client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            audience="authenticated",
            options={"require": ["exp", "sub"]},
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return payload["sub"]
