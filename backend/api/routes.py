"""ExamShield API routes with authenticated per-user session isolation."""

import json
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Query, Depends
from fastapi.responses import JSONResponse

from auth import verify_supabase_token, require_user
from ml.isolation_forest import engine
from ml.consent_firewall import firewall
from models.session import store
from models.consent import store as consent_store
from schemas.events import BehaviorSnapshot

_BEHAVIOR_DATA_CATEGORIES = ["keystroke_timing", "mouse_movement", "tab_switching"]
router = APIRouter()
_connections: Dict[str, WebSocket] = {}
_dashboard_listeners: Set[WebSocket] = set()


async def _broadcast_to_dashboard(data: dict) -> None:
    dead: Set[WebSocket] = set()
    for ws in _dashboard_listeners:
        try:
            await ws.send_json({"type": "session_update", "payload": data})
        except Exception:
            dead.add(ws)
    _dashboard_listeners.difference_update(dead)


@router.websocket("/ws/{session_id}")
async def exam_websocket(websocket: WebSocket, session_id: str, token: str = Query(default="")):
    """Authenticated student exam WebSocket. Every session is bound to the Supabase user."""
    try:
        user_id = verify_supabase_token(token)
    except ValueError:
        await websocket.close(code=1008, reason="Authentication required")
        return

    await websocket.accept()
    _connections[session_id] = websocket

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue

            msg_type = data.get("type")

            if msg_type == "session_start":
                payload = data.get("payload", {})
                cand_name = payload.get("candidate_name", "Unknown Candidate")
                sid = payload.get("session_id", session_id)
                if sid != session_id:
                    await websocket.close(code=1008, reason="Session id mismatch")
                    return
                try:
                    session = store.get_or_create(sid, cand_name, user_id=user_id)
                except ValueError:
                    await websocket.close(code=1008, reason="Session belongs to another user")
                    return
                if session.user_id != user_id:
                    await websocket.close(code=1008, reason="Session belongs to another user")
                    return
                exam_name = payload.get("exam_name")
                if exam_name:
                    session.exam_name = exam_name
                questions_total = payload.get("questions_total")
                if questions_total:
                    session.questions_total = questions_total
                await websocket.send_json({"type": "session_ack", "payload": {"session_id": sid}})
                await _broadcast_to_dashboard(session.to_dict())

            elif msg_type == "exam_progress":
                payload = data.get("payload", {})
                sid = payload.get("session_id", session_id)
                session = store.get(sid)
                if not session or session.user_id != user_id:
                    await websocket.close(code=1008, reason="Session ownership mismatch")
                    return
                if payload.get("questions_answered") is not None:
                    session.questions_answered = max(0, min(int(payload["questions_answered"]), session.questions_total or 999999))
                if payload.get("questions_total") is not None:
                    session.questions_total = int(payload["questions_total"])
                await _broadcast_to_dashboard(session.to_dict())

            elif msg_type == "behavior_snapshot":
                try:
                    snapshot = BehaviorSnapshot(**data["payload"])
                    if snapshot.session_id != session_id:
                        await websocket.close(code=1008, reason="Session id mismatch")
                        return
                    session = store.get(snapshot.session_id)
                    if not session or session.user_id != user_id:
                        await websocket.close(code=1008, reason="Session ownership mismatch")
                        return

                    consent_record = consent_store.get(snapshot.session_id)
                    if consent_record is not None:
                        decision = firewall.authorize(
                            consent_record,
                            action_name="analyze_behavior_for_exam_integrity",
                            purpose="examination_integrity",
                            data_categories=_BEHAVIOR_DATA_CATEGORIES,
                        )
                        if decision.decision == "BLOCK":
                            session.add_timeline_entry("consent_boundary_blocked", decision.reasons[0], "critical")
                            await websocket.send_json({"type": "consent_blocked", "payload": decision.to_dict()})
                            await _broadcast_to_dashboard(session.to_dict())
                            continue

                    assessment = engine.assess(snapshot)
                    session.add_risk_event(
                        risk_score=assessment.risk_score,
                        risk_level=assessment.risk_level,
                        features=assessment.features.model_dump(),
                        flags=assessment.triggered_flags,
                    )
                    await websocket.send_json({"type": "risk_update", "payload": assessment.model_dump()})
                    await _broadcast_to_dashboard(session.to_dict())
                except Exception as exc:
                    print(f"[WS exam] snapshot error: {exc}")

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong", "payload": None})

    except WebSocketDisconnect:
        _connections.pop(session_id, None)
        session = store.get(session_id)
        if session and session.user_id == user_id:
            session.is_active = False
            await _broadcast_to_dashboard(session.to_dict())


@router.websocket("/ws-dashboard")
async def dashboard_websocket(websocket: WebSocket, token: str = Query(default="")):
    """Admin-only dashboard stream. Students cannot subscribe to all candidates."""
    try:
        from auth import verify_supabase_claims, is_admin_claims
        if not token:
            raise ValueError("Missing token")
        if not is_admin_claims(verify_supabase_claims(token)):
            await websocket.close(code=1008, reason="Admin access required")
            return
    except ValueError:
        await websocket.close(code=1008, reason="Authentication required")
        return

    await websocket.accept()
    _dashboard_listeners.add(websocket)
    try:
        await websocket.send_json({"type": "initial_state", "payload": store.get_all()})
        while True:
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        _dashboard_listeners.discard(websocket)
    except Exception:
        _dashboard_listeners.discard(websocket)


@router.get("/api/sessions")
async def get_all_sessions(user_id: str = Depends(require_user)):
    """Authenticated users receive only their own sessions."""
    return JSONResponse(content={"sessions": store.get_for_user(user_id)})


@router.get("/api/sessions/{session_id}")
async def get_session(session_id: str, user_id: str = Depends(require_user)):
    session = store.get(session_id)
    if not session or session.user_id != user_id:
        raise HTTPException(status_code=404, detail="Session not found")
    return JSONResponse(content=session.to_dict())


@router.post("/api/sessions/{session_id}/end")
async def end_session(session_id: str, user_id: str = Depends(require_user)):
    session = store.get(session_id)
    if not session or session.user_id != user_id:
        raise HTTPException(status_code=404, detail="Session not found")
    session.is_active = False
    return JSONResponse(content={"status": "ended", "session_id": session_id})


@router.get("/api/health")
async def health_check():
    return {"status": "ok", "model_trained": engine._is_trained, "active_sessions": len(store.get_all()), "dashboard_listeners": len(_dashboard_listeners)}
