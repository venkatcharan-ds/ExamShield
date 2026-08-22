"""
Consent Lifecycle & Drift Detection REST API.

Generic, not exam-specific: subject_id is any string identifier (an exam
session id today, but could be a user id or device id elsewhere). Mounted
onto the same FastAPI app as the exam-monitoring routes in api/routes.py.

  POST /api/consent/grant                    — record original consent context
  GET  /api/consent/{subject_id}              — current record + live drift result
  POST /api/consent/{subject_id}/update        — change purpose/scope/data/version
  POST /api/consent/{subject_id}/withdraw       — withdraw consent
  POST /api/consent/{subject_id}/simulate       — demo control: canned drift scenarios
  GET  /api/consent/{subject_id}/timeline       — audit trail
  POST /api/consent/{subject_id}/authorize      — consent firewall: ALLOW / BLOCK / REQUEST_RECONSENT
  GET  /api/consent/_boundary-impact            — live aggregate: how many active boundaries lack a data category
"""

import time
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse

from models.consent import store, ConsentContext
from ml.drift_detector import detector
from ml.consent_firewall import firewall
from schemas.consent import (
    ConsentGrantRequest,
    ConsentUpdateRequest,
    ConsentWithdrawRequest,
    ConsentSimulateRequest,
    ConsentReconsentRequest,
    ProcessingActionRequest,
)

router = APIRouter(prefix="/api/consent")


def _record_response(record) -> dict:
    result = detector.evaluate(record)
    payload = record.to_dict()
    payload["drift"] = result.to_dict()
    return payload


def _assert_modifiable(record) -> None:
    """Withdrawn or expired consent must never be silently treated as valid —
    reject any attempt to change its context until it is renewed."""
    if record.status != "active":
        raise HTTPException(status_code=409, detail=f"Consent is {record.status}; it cannot be modified")
    if time.time() * 1000 > record.expires_at:
        raise HTTPException(status_code=409, detail="Consent has expired; it cannot be modified until renewed")


@router.post("/grant")
async def grant_consent(body: ConsentGrantRequest):
    existing = store.get(body.subject_id)
    if existing and existing.status == "active":
        return JSONResponse(content=_record_response(existing))

    record = store.grant(
        subject_id=body.subject_id,
        subject_type=body.subject_type,
        consent_type=body.consent_type,
        purpose=body.purpose,
        data_categories=body.data_categories,
        collection_scope=body.collection_scope,
        processing_scope=body.processing_scope,
        duration_days=body.duration_days,
        version=body.version,
        prohibited_data=body.prohibited_data,
        allowed_actions=body.allowed_actions,
    )
    return JSONResponse(content=_record_response(record))


@router.get("/_boundary-impact")
async def boundary_impact(data_category: str = Query(..., min_length=1, max_length=64)):
    """Live aggregate over currently-active consent records — not a
    prediction, just a count of how many boundaries don't already cover
    the given data category. Registered before /{subject_id} so the
    literal path wins the match."""
    return JSONResponse(content=firewall.boundary_impact(data_category))


@router.get("/{subject_id}")
async def get_consent(subject_id: str):
    record = store.get(subject_id)
    if not record:
        raise HTTPException(status_code=404, detail="No consent record for this subject")
    return JSONResponse(content=_record_response(record))


@router.get("/{subject_id}/timeline")
async def get_consent_timeline(subject_id: str):
    record = store.get(subject_id)
    if not record:
        raise HTTPException(status_code=404, detail="No consent record for this subject")
    return JSONResponse(content={"subject_id": subject_id, "audit": [e.to_dict() for e in record.audit]})


@router.post("/{subject_id}/update")
async def update_consent(subject_id: str, body: ConsentUpdateRequest):
    record = store.get(subject_id)
    if not record:
        raise HTTPException(status_code=404, detail="No consent record for this subject")
    _assert_modifiable(record)

    previous = record.current_context.to_dict()
    cur = record.current_context
    if body.purpose is not None:
        cur.purpose = body.purpose
    if body.data_categories is not None:
        cur.data_categories = body.data_categories
    if body.collection_scope is not None:
        cur.collection_scope = body.collection_scope
    if body.processing_scope is not None:
        cur.processing_scope = body.processing_scope
    if body.version is not None:
        cur.version = body.version

    record.log(
        "processing_scope_changed",
        "Consent context changed",
        previous_state=previous,
        new_state=cur.to_dict(),
        reason=body.reason,
    )

    result = detector.evaluate(record)
    if result.status != "ALIGNED":
        record.log(
            "drift_detected",
            f"Drift detected: {result.status.replace('_', ' ').title()}",
            new_state={"status": result.status, "reasons": result.reasons},
        )

    return JSONResponse(content=_record_response(record))


@router.post("/{subject_id}/reconsent")
async def reconsent(subject_id: str, body: ConsentReconsentRequest):
    """Explicit, user-approved boundary change. Unlike /update (which only
    edits current_context — the system's self-reported state, and never
    moves the firewall's boundary), this opens a *new* consent period with
    a new original_context, exactly like /grant, but always applies even
    while the existing consent is still active — because a real re-consent
    action isn't idempotent the way an initial provisioning call is.
    A version is required to actually move the boundary: silently reusing
    the old version here would make "the system changed" indistinguishable
    from "the user approved a new version," so we require the caller to
    name one explicitly when anything about the boundary changes."""
    existing = store.get(subject_id)
    if not existing:
        raise HTTPException(status_code=404, detail="No consent record for this subject; grant consent first")

    base = existing.original_context
    new_purpose = body.purpose if body.purpose is not None else base.purpose
    new_data = body.data_categories if body.data_categories is not None else base.data_categories
    new_prohibited = body.prohibited_data if body.prohibited_data is not None else base.prohibited_data
    new_actions = body.allowed_actions if body.allowed_actions is not None else base.allowed_actions
    new_version = body.version or base.version

    if (new_purpose, new_data, new_prohibited, new_actions) != (base.purpose, base.data_categories, base.prohibited_data, base.allowed_actions) and new_version == base.version:
        raise HTTPException(status_code=422, detail="Boundary changed but version was not — pass a new `version` to record the update explicitly")

    record = store.grant(
        subject_id=subject_id,
        subject_type=existing.subject_type,
        consent_type=existing.consent_type,
        purpose=new_purpose,
        data_categories=new_data,
        collection_scope=body.collection_scope or base.collection_scope,
        processing_scope=body.processing_scope or base.processing_scope,
        duration_days=body.duration_days or 30,
        version=new_version,
        prohibited_data=new_prohibited,
        allowed_actions=new_actions,
        event="consent_updated_by_user",
        description=f"Consent boundary explicitly updated by user (v{base.version} → v{new_version})",
    )
    return JSONResponse(content=_record_response(record))


@router.post("/{subject_id}/withdraw")
async def withdraw_consent(subject_id: str, body: ConsentWithdrawRequest):
    record = store.get(subject_id)
    if not record:
        raise HTTPException(status_code=404, detail="No consent record for this subject")
    if record.status == "withdrawn":
        raise HTTPException(status_code=409, detail="Consent has already been withdrawn")

    record.status = "withdrawn"
    record.withdrawn_at = time.time() * 1000
    record.log(
        "consent_withdrawn",
        "Consent withdrawn by subject",
        previous_state={"status": "active"},
        new_state={"status": "withdrawn"},
        reason=body.reason,
    )
    return JSONResponse(content=_record_response(record))


@router.post("/{subject_id}/simulate")
async def simulate_consent(subject_id: str, body: ConsentSimulateRequest):
    """Demo/dev control — deterministically drives a canned drift scenario
    so the lifecycle can be demonstrated without waiting for real drift."""
    record = store.get(subject_id)
    if not record:
        raise HTTPException(status_code=404, detail="No consent record for this subject")

    scenario = body.scenario

    if scenario == "reset":
        record.status = "active"
        record.withdrawn_at = None
        record.expires_at = time.time() * 1000 + 30 * 24 * 60 * 60 * 1000
        record.current_context = record.original_context.clone()
        record.log("consent_reset", "Consent reset to original state for demo purposes")
        return JSONResponse(content=_record_response(record))

    _assert_modifiable(record)

    if scenario == "purpose_expansion":
        previous = record.current_context.to_dict()
        if "behavioral_analytics" not in record.current_context.purpose:
            record.current_context.purpose.append("behavioral_analytics")
        record.log(
            "processing_scope_changed", "Purpose expanded (simulated)",
            previous_state=previous, new_state=record.current_context.to_dict(),
            reason="Demo: purpose expansion",
        )

    elif scenario == "data_expansion":
        previous = record.current_context.to_dict()
        if "webcam_analysis" not in record.current_context.data_categories:
            record.current_context.data_categories.append("webcam_analysis")
        record.log(
            "processing_scope_changed", "Data collection expanded (simulated)",
            previous_state=previous, new_state=record.current_context.to_dict(),
            reason="Demo: additional data category",
        )

    elif scenario == "scope_change":
        previous = record.current_context.to_dict()
        record.current_context.processing_scope = "cross_session_profiling"
        record.log(
            "processing_scope_changed", "Processing scope changed (simulated)",
            previous_state=previous, new_state=record.current_context.to_dict(),
            reason="Demo: processing scope change",
        )

    elif scenario == "expire":
        record.expires_at = time.time() * 1000 - 1000
        record.log("consent_expired", "Consent expired (simulated)", reason="Demo: backdated expiry")
        return JSONResponse(content=_record_response(record))

    elif scenario == "withdraw":
        record.status = "withdrawn"
        record.withdrawn_at = time.time() * 1000
        record.log("consent_withdrawn", "Consent withdrawn (simulated)", reason="Demo: withdrawal")
        return JSONResponse(content=_record_response(record))

    result = detector.evaluate(record)
    if result.status != "ALIGNED":
        record.log(
            "drift_detected",
            f"Drift detected: {result.status.replace('_', ' ').title()}",
            new_state={"status": result.status, "reasons": result.reasons},
        )

    return JSONResponse(content=_record_response(record))


@router.post("/{subject_id}/authorize")
async def authorize_action(subject_id: str, body: ProcessingActionRequest):
    """Consent Firewall — ask whether a named processing action is allowed
    to proceed against this subject's consent boundary. Fully generic: the
    action name, purpose, and data categories are all caller-supplied."""
    record = store.get(subject_id)
    result = firewall.authorize(
        record,
        action_name=body.action_name,
        purpose=body.purpose,
        data_categories=body.data_categories,
    )

    if record and result.decision != "ALLOW":
        verb = "blocked" if result.decision == "BLOCK" else "flagged as needing updated consent"
        record.log(
            "firewall_blocked" if result.decision == "BLOCK" else "firewall_reconsent_required",
            f"Processing action \"{body.action_name}\" was {verb}",
            new_state=result.to_dict(),
            reason=result.reasons[0] if result.reasons else None,
        )

    return JSONResponse(content={
        "subject_id": subject_id,
        "action_name": body.action_name,
        **result.to_dict(),
    })
