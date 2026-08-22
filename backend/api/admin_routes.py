"""Admin user management routes.

SECURITY: The Supabase service-role key is read exclusively from the server
environment variable SUPABASE_SERVICE_ROLE_KEY. It is never returned to the
client, never logged, and never stored. These endpoints require
app_metadata.role == 'admin' via the existing require_admin dependency.
"""

import os
from typing import Any, Dict, List

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from auth import require_admin

router = APIRouter()


# ── Internal helpers (patched in tests to avoid real network calls) ──────────

def _service_role_key() -> str:
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not key:
        raise HTTPException(
            status_code=503,
            detail=(
                "Admin user management is not configured on this server. "
                "Set SUPABASE_SERVICE_ROLE_KEY in the backend environment."
            ),
        )
    return key


def _base_url() -> str:
    return os.environ.get("SUPABASE_URL", "").rstrip("/")


def _admin_headers(service_key: str) -> Dict[str, str]:
    return {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
    }


async def _list_users_from_supabase(base_url: str, headers: Dict[str, str]) -> List[Dict[str, Any]]:
    """Call Supabase Auth Admin API to list all users. Extracted for test patching."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{base_url}/auth/v1/admin/users",
            headers=headers,
            params={"per_page": 200},
            timeout=15.0,
        )
    if resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Supabase returned {resp.status_code} when listing users",
        )
    data = resp.json()
    # Supabase returns {"users": [...]} or plain [...] depending on version
    return data.get("users", []) if isinstance(data, dict) else data


async def _create_user_in_supabase(
    base_url: str, headers: Dict[str, str], payload: Dict[str, Any]
) -> Dict[str, Any]:
    """Call Supabase Auth Admin API to create a user. Extracted for test patching."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{base_url}/auth/v1/admin/users",
            headers=headers,
            json=payload,
            timeout=15.0,
        )

    if resp.status_code in (400, 422):
        body = resp.json()
        detail = body.get("msg") or body.get("message") or body.get("error_description") or "Invalid request"
        raise HTTPException(status_code=422, detail=detail)
    if resp.status_code == 409 or (
        resp.status_code == 422 and "already" in resp.text.lower()
    ):
        raise HTTPException(status_code=409, detail="A user with that email already exists")
    if resp.status_code not in (200, 201):
        raise HTTPException(
            status_code=502,
            detail=f"Supabase returned {resp.status_code} when creating user",
        )
    return resp.json()


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/api/admin/users")
async def list_admin_users(_caller: str = Depends(require_admin)) -> JSONResponse:
    """Return all accounts with app_metadata.role == 'admin'.

    Only safe fields are returned (email, dates, role). No passwords,
    tokens, or secrets are ever included in the response.
    """
    service_key = _service_role_key()
    base_url = _base_url()
    if not base_url:
        raise HTTPException(status_code=503, detail="SUPABASE_URL is not configured")

    all_users = await _list_users_from_supabase(base_url, _admin_headers(service_key))

    admins = [
        {
            "id": u.get("id"),
            "email": u.get("email"),
            "created_at": u.get("created_at"),
            "last_sign_in_at": u.get("last_sign_in_at"),
            "email_confirmed": u.get("email_confirmed_at") is not None,
            "role": u.get("app_metadata", {}).get("role", "student"),
        }
        for u in all_users
        if u.get("app_metadata", {}).get("role") == "admin"
    ]

    return JSONResponse(content={"admins": admins})


class CreateAdminRequest(BaseModel):
    email: str
    password: str


@router.post("/api/admin/users", status_code=201)
async def create_admin_user(
    body: CreateAdminRequest,
    _caller: str = Depends(require_admin),
) -> JSONResponse:
    """Create a new admin account via the Supabase Auth Admin API.

    The service-role key is used server-side only and never returned to the caller.
    The newly created account immediately has app_metadata.role == 'admin'.
    """
    if "@" not in body.email or len(body.email) > 254:
        raise HTTPException(status_code=422, detail="Invalid email address")
    if len(body.password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters")

    service_key = _service_role_key()
    base_url = _base_url()
    if not base_url:
        raise HTTPException(status_code=503, detail="SUPABASE_URL is not configured")

    created = await _create_user_in_supabase(
        base_url,
        _admin_headers(service_key),
        {
            "email": body.email,
            "password": body.password,
            "app_metadata": {"role": "admin"},
            "email_confirm": True,  # skip email verification for demo accounts
        },
    )

    # Return only safe fields — never include passwords or tokens
    return JSONResponse(
        content={
            "id": created.get("id"),
            "email": created.get("email"),
            "created_at": created.get("created_at"),
            "role": created.get("app_metadata", {}).get("role"),
            "email_confirmed": created.get("email_confirmed_at") is not None,
        },
        status_code=201,
    )
