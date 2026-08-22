"""
Regression tests for pre-existing ExamShield functionality — proving the
Consent Lifecycle / Firewall additions didn't change behavior for sessions
that never touch the consent API at all (the exact path every session used
before this feature existed, and still the default path today).
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient

from main import app
from models.session import store as session_store
from models.consent import store as consent_store

client = TestClient(app)


@pytest.fixture(autouse=True)
def _clean_store():
    session_store._sessions.clear()
    consent_store._records.clear()
    yield
    session_store._sessions.clear()
    consent_store._records.clear()


def test_health_endpoint():
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["model_trained"] is True


def test_root_endpoint():
    r = client.get("/")
    assert r.status_code == 200
    assert r.json()["product"] == "ExamShield"


def test_sessions_list_and_get():
    assert client.get("/api/sessions").json() == {"sessions": []}
    r = client.get("/api/sessions/does-not-exist")
    assert r.status_code == 404


def test_ws_session_start_and_ping_unaffected_by_consent_feature():
    with client.websocket_connect("/ws/reg-session-1") as ws:
        ws.send_json({"type": "session_start", "payload": {"session_id": "reg-session-1", "candidate_name": "Reg Test"}})
        ack = ws.receive_json()
        assert ack == {"type": "session_ack", "payload": {"session_id": "reg-session-1"}}

        ws.send_json({"type": "ping"})
        pong = ws.receive_json()
        assert pong == {"type": "pong", "payload": None}

    session = session_store.get("reg-session-1")
    assert session is not None
    assert session.candidate_name == "Reg Test"


def test_behavior_snapshot_without_consent_record_behaves_exactly_as_before():
    """The critical non-regression guarantee: a session that never touches
    the consent API (still the default/common case) must produce a normal
    risk_update — the firewall must be a no-op when there's nothing to check."""
    session_id = "reg-session-2"
    assert consent_store.get(session_id) is None  # sanity: no consent record exists

    with client.websocket_connect(f"/ws/{session_id}") as ws:
        ws.send_json({"type": "session_start", "payload": {"session_id": session_id, "candidate_name": "No Consent"}})
        ws.receive_json()

        ws.send_json({"type": "behavior_snapshot", "payload": {
            "session_id": session_id, "candidate_name": "No Consent",
            "events": [{"type": "keydown", "timestamp": 1.0}],
            "window_start": 0, "window_end": 1,
        }})
        msg = ws.receive_json()

    assert msg["type"] == "risk_update"
    assert "risk_score" in msg["payload"]
    session = session_store.get(session_id)
    assert session.current_risk_score == msg["payload"]["risk_score"]
    assert len(session.risk_history) == 1
    assert consent_store.get(session_id) is None  # firewall check never created one


def test_end_session_endpoint():
    session_store.create("reg-session-3", "End Test")
    r = client.post("/api/sessions/reg-session-3/end")
    assert r.status_code == 200
    assert session_store.get("reg-session-3").is_active is False


def test_dashboard_websocket_initial_state():
    with client.websocket_connect("/ws-dashboard") as ws:
        msg = ws.receive_json()
        assert msg["type"] == "initial_state"
        assert msg["payload"] == []


def test_session_start_records_exam_name_and_question_total():
    """Real exam sessions report which exam they're taking and how many
    questions it has, so the admin dashboard can show genuine progress
    instead of a generic 'Demo Candidate' placeholder."""
    session_id = "reg-session-exam-1"
    with client.websocket_connect(f"/ws/{session_id}") as ws:
        ws.send_json({"type": "session_start", "payload": {
            "session_id": session_id, "candidate_name": "Real Candidate",
            "exam_name": "Computer Science & Data Science Assessment",
            "questions_total": 30,
        }})
        ws.receive_json()

    session = session_store.get(session_id)
    assert session.exam_name == "Computer Science & Data Science Assessment"
    assert session.questions_total == 30
    assert session.questions_answered == 0
    assert session.to_dict()["exam_name"] == "Computer Science & Data Science Assessment"


def test_session_start_without_exam_name_leaves_it_none():
    """Non-exam callers (e.g. anything hitting /ws directly without exam
    metadata) must not be forced into the new fields — they stay None,
    exactly as before this feature existed."""
    session_id = "reg-session-no-exam"
    with client.websocket_connect(f"/ws/{session_id}") as ws:
        ws.send_json({"type": "session_start", "payload": {"session_id": session_id, "candidate_name": "Plain"}})
        ws.receive_json()

    session = session_store.get(session_id)
    assert session.exam_name is None
    assert session.questions_total is None
    assert session.to_dict()["exam_name"] is None


def test_exam_progress_updates_session_and_broadcasts():
    session_id = "reg-session-progress"
    with client.websocket_connect(f"/ws/{session_id}") as ws:
        ws.send_json({"type": "session_start", "payload": {
            "session_id": session_id, "candidate_name": "Progress Test", "questions_total": 30,
        }})
        ws.receive_json()

        ws.send_json({"type": "exam_progress", "payload": {
            "session_id": session_id, "questions_answered": 12, "questions_total": 30,
        }})
        # exam_progress has no direct client ack — assert via store state instead.

    session = session_store.get(session_id)
    assert session.questions_answered == 12
    assert session.questions_total == 30


def test_exam_progress_for_unknown_session_does_not_crash():
    with client.websocket_connect("/ws/reg-session-ghost") as ws:
        ws.send_json({"type": "exam_progress", "payload": {
            "session_id": "session-that-was-never-started", "questions_answered": 5, "questions_total": 30,
        }})
        # Should not raise or close the connection — send a ping to prove the socket is still alive.
        ws.send_json({"type": "ping"})
        pong = ws.receive_json()
    assert pong == {"type": "pong", "payload": None}
