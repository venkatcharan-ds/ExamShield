"""Supabase authentication helpers shared by REST and WebSocket routes."""

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


def verify_supabase_claims(token: str) -> dict:
    url = _supabase_url()
    if not url:
        raise ValueError("Auth is not configured on this server")
    if not token:
        raise ValueError("Missing bearer token")
    try:
        signing_key = _jwk_client_for(url).get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            audience="authenticated",
            options={"require": ["exp", "sub"]},
        )
    except Exception as exc:
        raise ValueError("Invalid or expired token") from exc


def verify_supabase_token(token: str) -> str:
    return verify_supabase_claims(token)["sub"]


def is_admin_claims(claims: dict) -> bool:
    """Only server-controlled app_metadata can grant admin access."""
    return claims.get("app_metadata", {}).get("role") == "admin"


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


async def require_admin(authorization: str = Header(default=None)) -> str:
    token = authorization[len("Bearer "):].strip() if authorization and authorization.startswith("Bearer ") else ""
    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token")
    try:
        claims = verify_supabase_claims(token)
    except ValueError as exc:
        if "not configured" in str(exc):
            raise HTTPException(status_code=503, detail=str(exc))
        raise HTTPException(status_code=401, detail=str(exc))
    if not is_admin_claims(claims):
        raise HTTPException(status_code=403, detail="Admin access required")
    return claims["sub"]
