"""
ExamShield API routes.

WebSocket endpoints:
  /ws/{session_id}   — exam client (student browser)
  /ws-dashboard      — admin dashboard (separate prefix avoids param conflict)

REST endpoints:
  GET  /api/sessions
  GET  /api/sessions/{id}
  POST /api/sessions/{id}/end
  GET  /api/health
"""

import json
import time
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import JSONResponse

from ml.isolation_forest import engine
from ml.consent_firewall import firewall
from models.session import store
from models.consent import store as consent_store
from schemas.events import BehaviorSnapshot

# Data categories a behavior_snapshot always touches — this is ExamShield's
# own action naming; the firewall itself has no idea what these mean.
_BEHAVIOR_DATA_CATEGORIES = ["keystroke_timing", "mouse_movement", "tab_switching"]

router = APIRouter()

# session_id → active exam WebSocket
_connections: Dict[str, WebSocket] = {}

# All connected admin dashboard clients
_dashboard_listeners: Set[WebSocket] = set()


async def _broadcast_to_dashboard(data: dict) -> None:
    """Push a session update to every connected dashboard client."""
    dead: Set[WebSocket] = set()
    for ws in _dashboard_listeners:
        try:
            await ws.send_json({"type": "session_update", "payload": data})
        except Exception:
            dead.add(ws)
    _dashboard_listeners.difference_update(dead)


# ─── Exam Client WebSocket ────────────────────────────────────────────────────

@router.websocket("/ws/{session_id}")
async def exam_websocket(websocket: WebSocket, session_id: str):
    """
    Student exam portal WebSocket.
    Accepts behavioral snapshots → ML pipeline → returns risk assessment.
    Also broadcasts risk updates to all dashboard listeners.
    """
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
                session = store.get_or_create(sid, cand_name)
                exam_name = payload.get("exam_name")
                if exam_name:
                    session.exam_name = exam_name
                questions_total = payload.get("questions_total")
                if questions_total:
                    session.questions_total = questions_total
                await websocket.send_json({
                    "type": "session_ack",
                    "payload": {"session_id": sid},
                })
                await _broadcast_to_dashboard(session.to_dict())

            elif msg_type == "exam_progress":
                payload = data.get("payload", {})
                sid = payload.get("session_id", session_id)
                session = store.get(sid)
                if session:
                    if payload.get("questions_answered") is not None:
                        session.questions_answered = payload["questions_answered"]
                    if payload.get("questions_total") is not None:
                        session.questions_total = payload["questions_total"]
                    await _broadcast_to_dashboard(session.to_dict())

            elif msg_type == "behavior_snapshot":
                try:
                    snapshot = BehaviorSnapshot(**data["payload"])
                    session = store.get_or_create(
                        snapshot.session_id, snapshot.candidate_name
                    )

                    # Consent Firewall — real enforcement, not a UI-only check.
                    # If this session's consent has been withdrawn or expired,
                    # the ML engine genuinely does not run: no risk_update is
                    # produced and current_risk_score stops moving.
                    consent_record = consent_store.get(snapshot.session_id)
                    if consent_record is not None:
                        decision = firewall.authorize(
                            consent_record,
                            action_name="analyze_behavior_for_exam_integrity",
                            purpose="examination_integrity",
                            data_categories=_BEHAVIOR_DATA_CATEGORIES,
                        )
                        if decision.decision == "BLOCK":
                            session.add_timeline_entry(
                                "consent_boundary_blocked", decision.reasons[0], "critical",
                            )
                            await websocket.send_json({
                                "type": "consent_blocked",
                                "payload": decision.to_dict(),
                            })
                            await _broadcast_to_dashboard(session.to_dict())
                            continue

                    assessment = engine.assess(snapshot)

                    session.add_risk_event(
                        risk_score=assessment.risk_score,
                        risk_level=assessment.risk_level,
                        features=assessment.features.model_dump(),
                        flags=assessment.triggered_flags,
                    )

                    await websocket.send_json({
                        "type": "risk_update",
                        "payload": assessment.model_dump(),
                    })
                    await _broadcast_to_dashboard(session.to_dict())

                except Exception as exc:
                    # Log without crashing the loop
                    print(f"[WS exam] snapshot error: {exc}")

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong", "payload": None})

    except WebSocketDisconnect:
        _connections.pop(session_id, None)
        session = store.get(session_id)
        if session:
            session.is_active = False
            await _broadcast_to_dashboard(session.to_dict())


# ─── Dashboard WebSocket ──────────────────────────────────────────────────────
# NOTE: uses /ws-dashboard prefix (not /ws/dashboard) to avoid being captured
# by the /ws/{session_id} parameterized route above.

@router.websocket("/ws-dashboard")
async def dashboard_websocket(websocket: WebSocket):
    """
    Admin dashboard WebSocket.
    On connect: sends full current state of all sessions.
    Ongoing: receives push updates whenever any session changes.
    """
    await websocket.accept()
    _dashboard_listeners.add(websocket)

    try:
        # Send full current state immediately on connect
        await websocket.send_json({
            "type": "initial_state",
            "payload": store.get_all(),
        })

        # Keep alive — dashboard is push-only from server side
        while True:
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_text("pong")

    except WebSocketDisconnect:
        _dashboard_listeners.discard(websocket)
    except Exception:
        _dashboard_listeners.discard(websocket)


# ─── REST Endpoints ───────────────────────────────────────────────────────────

@router.get("/api/sessions")
async def get_all_sessions():
    return JSONResponse(content={"sessions": store.get_all()})


@router.get("/api/sessions/{session_id}")
async def get_session(session_id: str):
    session = store.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return JSONResponse(content=session.to_dict())


@router.post("/api/sessions/{session_id}/end")
async def end_session(session_id: str):
    session = store.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.is_active = False
    return JSONResponse(content={"status": "ended", "session_id": session_id})


@router.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "model_trained": engine._is_trained,
        "active_sessions": len(store.get_all()),
        "dashboard_listeners": len(_dashboard_listeners),
    }
