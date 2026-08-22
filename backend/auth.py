"""
Supabase authentication helpers shared by REST and WebSocket routes.
"""

import os
from functools import lru_cache

import jwt
from jwt import PyJWKClient
from fastapi import Header, HTTPException


def _supabase_url() -> str:
    return os.environ.get("SUPABASE_URL", "").rstrip("/")


@lru_cache(maxsize=8)
def _jwk_client_for(url: str) -> PyJWKClient:
    return PyJWKClient(f"{url}/auth/v1/.well-known/jwks.json")


def verify_supabase_token(token: str) -> str:
    """Verify a Supabase access token and return its authenticated user id."""
    url = _supabase_url()
    if not url:
        raise ValueError("Auth is not configured on this server")
    if not token:
        raise ValueError("Missing bearer token")
    try:
        signing_key = _jwk_client_for(url).get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            audience="authenticated",
            options={"require": ["exp", "sub"]},
        )
        return payload["sub"]
    except Exception as exc:
        raise ValueError("Invalid or expired token") from exc


async def require_user(authorization: str = Header(default=None)) -> str:
    token = authorization[len("Bearer "):].strip() if authorization and authorization.startswith("Bearer ") else ""
    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token")
    try:
        return verify_supabase_token(token)
    except ValueError as exc:
        if "not configured" in str(exc):
            raise HTTPException(status_code=503, detail=str(exc))
        raise HTTPException(status_code=401, detail=str(exc))
