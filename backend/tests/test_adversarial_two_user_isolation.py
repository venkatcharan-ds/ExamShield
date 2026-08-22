"""
Adversarial two-user isolation — proves A/B ownership boundaries with
real HTTP and WebSocket layer tests, not just store-model unit tests.

USER A  user_id=user-a   session_id=session-a   token=token-a
USER B  user_id=user-b   session_id=session-b   token=token-b

Every property below is backed by an actual API call or WebSocket exchange.
No test here is satisfied by the store model returning the right value in
isolation — they all go through the full request stack.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient

from main import app
from auth import require_user
import api.routes as routes
from models.session import store as session_store
from models.consent import store as consent_store

client = TestClient(app)

# ─── Identity constants ───────────────────────────────────────────────────────
USER_A     = "user-a"
USER_B     = "user-b"
SESSION_A  = "session-a"
SESSION_B  = "session-b"
TOKEN_A    = "token-for-user-a"
TOKEN_B    = "token-for-user-b"

_TOKEN_MAP = {TOKEN_A: USER_A, TOKEN_B: USER_B}


def _token_to_user(token: str) -> str:
    """WS-layer auth shim: maps test tokens to their user IDs."""
    if token in _TOKEN_MAP:
        return _TOKEN_MAP[token]
    raise ValueError(f"Unknown test token: {token!r}")


# ─── Fixtures ────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def _clean():
    """Start every test with empty stores."""
    session_store._sessions.clear()
    consent_store._records.clear()
    yield
    session_store._sessions.clear()
    consent_store._records.clear()


@pytest.fixture
def as_user_a():
    """Make all REST calls in this test authenticate as user-a."""
    app.dependency_overrides[require_user] = lambda: USER_A
    yield
    # conftest's _authenticated_by_default teardown pops this after yield


@pytest.fixture
def as_user_b():
    """Make all REST calls in this test authenticate as user-b."""
    app.dependency_overrides[require_user] = lambda: USER_B
    yield


@pytest.fixture
def two_user_ws(monkeypatch):
    """
    Patch routes.verify_supabase_token so TOKEN_A→user-a, TOKEN_B→user-b.
    Any other token raises ValueError (auth failure).

    Conftest patches this to lambda token: "test-user-id"; we override that
    patch here using the same monkeypatch instance, which wins because it runs
    after conftest's setup (via fixture dependency ordering).
    """
    monkeypatch.setattr(routes, "verify_supabase_token", _token_to_user)
    yield


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _grant_consent(subject_id: str, owner: str) -> None:
    consent_store.grant(
        subject_id=subject_id, owner_user_id=owner,
        subject_type="exam_session", consent_type="behavioral_monitoring",
        purpose=["examination_integrity"],
        data_categories=["keystroke_timing", "mouse_movement", "tab_switching"],
        collection_scope="session_only", processing_scope="real_time_risk_scoring",
        duration_days=1,
    )


def _behavior_payload(session_id: str, candidate_name: str, events=None):
    return {
        "session_id": session_id,
        "candidate_name": candidate_name,
        "events": events or [{"type": "keydown", "timestamp": 1.0,
                               "metadata": {"key": "char", "interval_since_last": 200}}],
        "window_start": 0,
        "window_end": 2000,
    }


# ════════════════════════════════════════════════════════════════════════════
# 1–4  REST SESSION READ ISOLATION
# ════════════════════════════════════════════════════════════════════════════

def test_1_user_a_can_read_own_session(as_user_a):
    session_store.create(SESSION_A, "Alice", USER_A)
    r = client.get(f"/api/sessions/{SESSION_A}")
    assert r.status_code == 200
    assert r.json()["session_id"] == SESSION_A


def test_2_user_a_cannot_read_user_b_session(as_user_a):
    session_store.create(SESSION_B, "Bob", USER_B)
    r = client.get(f"/api/sessions/{SESSION_B}")
    assert r.status_code == 404, "REST: User A must receive 404 for User B's session"


def test_3_user_b_can_read_own_session(as_user_b):
    session_store.create(SESSION_B, "Bob", USER_B)
    r = client.get(f"/api/sessions/{SESSION_B}")
    assert r.status_code == 200
    assert r.json()["session_id"] == SESSION_B


def test_4_user_b_cannot_read_user_a_session(as_user_b):
    session_store.create(SESSION_A, "Alice", USER_A)
    r = client.get(f"/api/sessions/{SESSION_A}")
    assert r.status_code == 404, "REST: User B must receive 404 for User A's session"


# ════════════════════════════════════════════════════════════════════════════
# Session list is owner-scoped
# ════════════════════════════════════════════════════════════════════════════

def test_session_list_scoped_to_caller(as_user_a):
    session_store.create(SESSION_A, "Alice", USER_A)
    session_store.create(SESSION_B, "Bob",   USER_B)
    data = client.get("/api/sessions").json()["sessions"]
    ids = [s["session_id"] for s in data]
    assert SESSION_A in ids
    assert SESSION_B not in ids, "Session list must not leak other users' sessions"


# ════════════════════════════════════════════════════════════════════════════
# 5–6  REST SESSION END/UPDATE ISOLATION
# ════════════════════════════════════════════════════════════════════════════

def test_5_user_a_cannot_end_user_b_session(as_user_a):
    session_store.create(SESSION_B, "Bob", USER_B)
    r = client.post(f"/api/sessions/{SESSION_B}/end")
    assert r.status_code == 404, "REST: User A must not be able to end User B's session"
    assert session_store.get(SESSION_B).is_active is True


def test_6_user_b_cannot_end_user_a_session(as_user_b):
    session_store.create(SESSION_A, "Alice", USER_A)
    r = client.post(f"/api/sessions/{SESSION_A}/end")
    assert r.status_code == 404, "REST: User B must not be able to end User A's session"
    assert session_store.get(SESSION_A).is_active is True


# ════════════════════════════════════════════════════════════════════════════
# 7–8  WEBSOCKET SESSION OWNERSHIP
# ════════════════════════════════════════════════════════════════════════════

def test_7_ws_user_a_can_start_own_session(two_user_ws):
    with client.websocket_connect(f"/ws/{SESSION_A}?token={TOKEN_A}") as ws:
        ws.send_json({"type": "session_start", "payload": {
            "session_id": SESSION_A, "candidate_name": "Alice",
        }})
        ack = ws.receive_json()
    assert ack == {"type": "session_ack", "payload": {"session_id": SESSION_A}}
    assert session_store.get(SESSION_A).user_id == USER_A


def test_8_ws_user_b_cannot_take_over_session_owned_by_a(two_user_ws):
    """User B connecting to /ws/session-a and sending session_start must be rejected."""
    session_store.create(SESSION_A, "Alice", USER_A)
    closed = False
    try:
        with client.websocket_connect(f"/ws/{SESSION_A}?token={TOKEN_B}") as ws:
            ws.send_json({"type": "session_start", "payload": {
                "session_id": SESSION_A, "candidate_name": "Bob takeover attempt",
            }})
            ws.receive_json()  # must raise — server closes 1008
    except Exception:
        closed = True
    assert closed, "WS: User B must not receive ack for session-a owned by User A"
    # The session still belongs to User A
    assert session_store.get(SESSION_A).user_id == USER_A


# ════════════════════════════════════════════════════════════════════════════
# ID SUBSTITUTION ATTACKS
# ════════════════════════════════════════════════════════════════════════════

def test_ws_session_start_payload_id_mismatch_is_rejected(two_user_ws):
    """User A connected to /ws/session-a must not forge payload session_id=session-b."""
    closed = False
    try:
        with client.websocket_connect(f"/ws/{SESSION_A}?token={TOKEN_A}") as ws:
            ws.send_json({"type": "session_start", "payload": {
                "session_id": SESSION_B,  # <-- substitution attack
                "candidate_name": "Alice claiming session-b",
            }})
            ws.receive_json()
    except Exception:
        closed = True
    assert closed, "WS: session_start with mismatched session_id must close connection"
    assert session_store.get(SESSION_B) is None, "No session must be created for session-b"


def test_ws_behavior_snapshot_id_substitution_rejected(two_user_ws):
    """User A must not inject a behavior_snapshot that claims session_id=session-b."""
    # Start A's own session first
    session_store.create(SESSION_A, "Alice", USER_A)
    # Also create B's session so there's a target to hijack
    session_store.create(SESSION_B, "Bob", USER_B)
    initial_b_score = session_store.get(SESSION_B).current_risk_score

    closed = False
    try:
        with client.websocket_connect(f"/ws/{SESSION_A}?token={TOKEN_A}") as ws:
            ws.send_json({"type": "session_start", "payload": {
                "session_id": SESSION_A, "candidate_name": "Alice",
            }})
            ws.receive_json()  # ack
            # Attempt: send behavior snapshot claiming to belong to session-b
            ws.send_json({"type": "behavior_snapshot", "payload": {
                "session_id": SESSION_B,  # <-- substitution attack
                "candidate_name": "Alice as Bob",
                "events": [{"type": "paste", "timestamp": 1.0}],
                "window_start": 0, "window_end": 2000,
            }})
            ws.receive_json()  # server must close, this should raise
    except Exception:
        closed = True
    assert closed, "WS: behavior_snapshot with wrong session_id must close connection"
    # B's risk must be unchanged
    assert session_store.get(SESSION_B).current_risk_score == initial_b_score, \
        "B's risk must not change from A's substitution attack"


def test_ws_exam_progress_id_substitution_rejected(two_user_ws):
    """User A must not send exam_progress that updates session-b's progress counter."""
    session_store.create(SESSION_A, "Alice", USER_A)
    session_store.create(SESSION_B, "Bob",   USER_B)

    closed = False
    try:
        with client.websocket_connect(f"/ws/{SESSION_A}?token={TOKEN_A}") as ws:
            ws.send_json({"type": "session_start", "payload": {
                "session_id": SESSION_A, "candidate_name": "Alice",
            }})
            ws.receive_json()  # ack
            # Try to update session-b's progress through user-a's connection
            ws.send_json({"type": "exam_progress", "payload": {
                "session_id": SESSION_B,  # <-- substitution attack
                "questions_answered": 29,
            }})
            ws.receive_json()  # must raise
    except Exception:
        closed = True
    assert closed, "WS: exam_progress substitution must close connection"
    assert session_store.get(SESSION_B).questions_answered == 0, \
        "B's exam progress must not be modified by A's substitution attack"


# ════════════════════════════════════════════════════════════════════════════
# 9–12  RISK SCORE ISOLATION
# ════════════════════════════════════════════════════════════════════════════

def test_9_10_risk_updates_for_a_do_not_touch_b(two_user_ws):
    """A's high-risk behavior snapshot must update ONLY A's risk score."""
    with client.websocket_connect(f"/ws/{SESSION_A}?token={TOKEN_A}") as ws_a:
        ws_a.send_json({"type": "session_start", "payload": {
            "session_id": SESSION_A, "candidate_name": "Alice",
        }})
        ws_a.receive_json()

    with client.websocket_connect(f"/ws/{SESSION_B}?token={TOKEN_B}") as ws_b:
        ws_b.send_json({"type": "session_start", "payload": {
            "session_id": SESSION_B, "candidate_name": "Bob",
        }})
        ws_b.receive_json()

    initial_b_risk = session_store.get(SESSION_B).current_risk_score

    # A sends a high-risk snapshot (paste + tab switch)
    with client.websocket_connect(f"/ws/{SESSION_A}?token={TOKEN_A}") as ws_a:
        ws_a.send_json({"type": "session_start", "payload": {
            "session_id": SESSION_A, "candidate_name": "Alice",
        }})
        ws_a.receive_json()
        ws_a.send_json({"type": "behavior_snapshot", "payload": {
            "session_id": SESSION_A, "candidate_name": "Alice",
            "events": [
                {"type": "paste",      "timestamp": 1.0},
                {"type": "tab_switch", "timestamp": 2.0},
                {"type": "copy",       "timestamp": 2.5},
            ],
            "window_start": 0, "window_end": 3000,
        }})
        risk_msg = ws_a.receive_json()

    assert risk_msg["type"] == "risk_update"

    a_risk = session_store.get(SESSION_A).current_risk_score
    b_risk = session_store.get(SESSION_B).current_risk_score

    assert a_risk > 30, f"session-a must show elevated risk, got {a_risk}"
    assert b_risk == initial_b_risk, \
        f"session-b risk must be unchanged; was {initial_b_risk}, is now {b_risk}"


def test_11_12_concurrent_sessions_have_independent_risk(two_user_ws):
    """Both sessions running simultaneously; B's normal behavior must stay low
    even while A is being flagged as high-risk."""
    with client.websocket_connect(f"/ws/{SESSION_A}?token={TOKEN_A}") as ws_a, \
         client.websocket_connect(f"/ws/{SESSION_B}?token={TOKEN_B}") as ws_b:

        ws_a.send_json({"type": "session_start", "payload": {
            "session_id": SESSION_A, "candidate_name": "Alice",
        }})
        ws_b.send_json({"type": "session_start", "payload": {
            "session_id": SESSION_B, "candidate_name": "Bob",
        }})
        ws_a.receive_json()  # ack
        ws_b.receive_json()  # ack

        # A: paste + copy (high-risk)
        ws_a.send_json({"type": "behavior_snapshot", "payload": {
            "session_id": SESSION_A, "candidate_name": "Alice",
            "events": [
                {"type": "paste", "timestamp": 1.0},
                {"type": "copy",  "timestamp": 1.5},
            ],
            "window_start": 0, "window_end": 2000,
        }})
        a_risk_msg = ws_a.receive_json()

        # B: normal typing — multiple keystrokes with realistic intervals and mouse movement
        ws_b.send_json({"type": "behavior_snapshot", "payload": {
            "session_id": SESSION_B, "candidate_name": "Bob",
            "events": [
                {"type": "mouse_move", "timestamp": 0.1},
                {"type": "keydown", "timestamp": 1.0,
                 "metadata": {"key": "char", "interval_since_last": 230}},
                {"type": "keydown", "timestamp": 1.24,
                 "metadata": {"key": "char", "interval_since_last": 240}},
                {"type": "mouse_move", "timestamp": 1.5},
                {"type": "keydown", "timestamp": 1.48,
                 "metadata": {"key": "char", "interval_since_last": 235}},
                {"type": "keydown", "timestamp": 1.72,
                 "metadata": {"key": "char", "interval_since_last": 245}},
                {"type": "mouse_move", "timestamp": 2.0},
                {"type": "keydown", "timestamp": 1.96,
                 "metadata": {"key": "char", "interval_since_last": 228}},
            ],
            "window_start": 0, "window_end": 3000,
        }})
        b_risk_msg = ws_b.receive_json()

    assert a_risk_msg["type"] == "risk_update"
    assert b_risk_msg["type"] == "risk_update"

    a_score = session_store.get(SESSION_A).current_risk_score
    b_score = session_store.get(SESSION_B).current_risk_score

    # paste+copy triggers rule boost ≥ 75; A must be high risk
    assert a_score > 60, f"session-a (paste+copy) must be elevated; got {a_score}"
    # B's score must be independently computed and much lower than A's cheating score
    # (proves isolation: if scores shared state, they'd converge)
    assert b_score < a_score - 30, \
        f"B's normal-typing score must be much lower than A's cheating score; A={a_score}, B={b_score}"
    assert a_score != b_score, "Scores must not be identical — would indicate shared state"


# ════════════════════════════════════════════════════════════════════════════
# 13  TIMELINE ISOLATION
# ════════════════════════════════════════════════════════════════════════════

def test_13_timeline_events_isolated(two_user_ws):
    """Paste event from session-a must appear in A's timeline, never in B's."""
    with client.websocket_connect(f"/ws/{SESSION_A}?token={TOKEN_A}") as ws_a:
        ws_a.send_json({"type": "session_start", "payload": {
            "session_id": SESSION_A, "candidate_name": "Alice",
        }})
        ws_a.receive_json()
        ws_a.send_json({"type": "behavior_snapshot", "payload": {
            "session_id": SESSION_A, "candidate_name": "Alice",
            "events": [{"type": "paste", "timestamp": 1.0}],
            "window_start": 0, "window_end": 2000,
        }})
        ws_a.receive_json()

    with client.websocket_connect(f"/ws/{SESSION_B}?token={TOKEN_B}") as ws_b:
        ws_b.send_json({"type": "session_start", "payload": {
            "session_id": SESSION_B, "candidate_name": "Bob",
        }})
        ws_b.receive_json()

    a_types = {e["type"] for e in session_store.get(SESSION_A).timeline}
    b_types = {e["type"] for e in session_store.get(SESSION_B).timeline}

    assert "paste" in a_types, "A's paste event must appear in A's timeline"
    assert "paste" not in b_types, "A's paste event must NOT appear in B's timeline"


# ════════════════════════════════════════════════════════════════════════════
# 14  ALERTS / FLAGS ISOLATED
# ════════════════════════════════════════════════════════════════════════════

def test_14_alerts_isolated(two_user_ws):
    """Risk flags generated by A's events must not appear in B's timeline."""
    with client.websocket_connect(f"/ws/{SESSION_A}?token={TOKEN_A}") as ws_a:
        ws_a.send_json({"type": "session_start", "payload": {
            "session_id": SESSION_A, "candidate_name": "Alice",
        }})
        ws_a.receive_json()
        # send high-severity events for A
        ws_a.send_json({"type": "behavior_snapshot", "payload": {
            "session_id": SESSION_A, "candidate_name": "Alice",
            "events": [
                {"type": "paste",      "timestamp": 1.0},
                {"type": "tab_switch", "timestamp": 1.5},
            ],
            "window_start": 0, "window_end": 2000,
        }})
        ws_a.receive_json()

    with client.websocket_connect(f"/ws/{SESSION_B}?token={TOKEN_B}") as ws_b:
        ws_b.send_json({"type": "session_start", "payload": {
            "session_id": SESSION_B, "candidate_name": "Bob",
        }})
        ws_b.receive_json()
        ws_b.send_json({"type": "behavior_snapshot", "payload": _behavior_payload(
            SESSION_B, "Bob",
        )})
        ws_b.receive_json()

    b_critical = [e for e in session_store.get(SESSION_B).timeline if e["severity"] == "critical"]
    assert b_critical == [], f"B must have no critical alerts from A's events; found {b_critical}"


# ════════════════════════════════════════════════════════════════════════════
# 15  EXAM PROGRESS ISOLATION
# ════════════════════════════════════════════════════════════════════════════

def test_15_exam_progress_isolated(two_user_ws):
    with client.websocket_connect(f"/ws/{SESSION_A}?token={TOKEN_A}") as ws_a:
        ws_a.send_json({"type": "session_start", "payload": {
            "session_id": SESSION_A, "candidate_name": "Alice", "questions_total": 30,
        }})
        ws_a.receive_json()
        ws_a.send_json({"type": "exam_progress", "payload": {
            "session_id": SESSION_A, "questions_answered": 20,
        }})

    with client.websocket_connect(f"/ws/{SESSION_B}?token={TOKEN_B}") as ws_b:
        ws_b.send_json({"type": "session_start", "payload": {
            "session_id": SESSION_B, "candidate_name": "Bob", "questions_total": 30,
        }})
        ws_b.receive_json()

    assert session_store.get(SESSION_A).questions_answered == 20
    assert session_store.get(SESSION_B).questions_answered == 0, \
        "B's exam progress must be unaffected by A's updates"


# ════════════════════════════════════════════════════════════════════════════
# 16  EXAM RESULTS ISOLATED (exam end)
# ════════════════════════════════════════════════════════════════════════════

def test_16_exam_results_isolated(as_user_a):
    """Ending session-a must not affect session-b's active state."""
    session_store.create(SESSION_A, "Alice", USER_A)
    session_store.create(SESSION_B, "Bob",   USER_B)

    r = client.post(f"/api/sessions/{SESSION_A}/end")
    assert r.status_code == 200

    assert session_store.get(SESSION_A).is_active is False
    assert session_store.get(SESSION_B).is_active is True, \
        "Ending session-a must not deactivate session-b"


# ════════════════════════════════════════════════════════════════════════════
# 17–19  CONSENT ISOLATION
# ════════════════════════════════════════════════════════════════════════════

def test_17_consent_records_isolated_by_owner(as_user_a):
    _grant_consent(SESSION_B, USER_B)
    r = client.get(f"/api/consent/{SESSION_B}")
    assert r.status_code == 404, "User A must not read User B's consent record"


def test_18_user_a_cannot_withdraw_user_b_consent(as_user_a):
    _grant_consent(SESSION_B, USER_B)
    r = client.post(f"/api/consent/{SESSION_B}/withdraw", json={"reason": "attack"})
    assert r.status_code == 404, "User A must not be able to withdraw User B's consent"
    assert consent_store.get(SESSION_B).status == "active", \
        "User B's consent must remain active after User A's attack attempt"


def test_19_user_b_cannot_update_user_a_consent(as_user_b):
    _grant_consent(SESSION_A, USER_A)
    r = client.post(f"/api/consent/{SESSION_A}/update", json={"version": "evil-2.0"})
    assert r.status_code == 404, "User B must not be able to update User A's consent"
    assert consent_store.get(SESSION_A).current_context.version == "1.0", \
        "User A's consent version must be unchanged after User B's attack"


def test_consent_timeline_isolated(as_user_a):
    """User A must not read User B's consent audit timeline."""
    _grant_consent(SESSION_B, USER_B)
    r = client.get(f"/api/consent/{SESSION_B}/timeline")
    assert r.status_code == 404, "User A must not read User B's consent timeline"


def test_consent_grant_cannot_be_reassigned_via_api(as_user_a):
    """Granting consent for a subject_id already owned by B must be rejected."""
    _grant_consent(SESSION_B, USER_B)
    r = client.post("/api/consent/grant", json={
        "subject_id": SESSION_B,
        "purpose": ["examination_integrity"],
        "data_categories": ["keystroke_timing"],
    })
    assert r.status_code == 403, "User A must not be able to grant consent for User B's subject"


# ════════════════════════════════════════════════════════════════════════════
# UNAUTHENTICATED ACCESS — all endpoints must return 401
# ════════════════════════════════════════════════════════════════════════════

def test_unauthenticated_session_list_returns_401():
    app.dependency_overrides.pop(require_user, None)
    try:
        r = client.get("/api/sessions")
        assert r.status_code == 401
    finally:
        app.dependency_overrides[require_user] = lambda: "test-user-id"


def test_unauthenticated_session_get_returns_401():
    session_store.create(SESSION_A, "Alice", USER_A)
    app.dependency_overrides.pop(require_user, None)
    try:
        r = client.get(f"/api/sessions/{SESSION_A}")
        assert r.status_code == 401
    finally:
        app.dependency_overrides[require_user] = lambda: "test-user-id"


def test_unauthenticated_session_end_returns_401():
    session_store.create(SESSION_A, "Alice", USER_A)
    app.dependency_overrides.pop(require_user, None)
    try:
        r = client.post(f"/api/sessions/{SESSION_A}/end")
        assert r.status_code == 401
    finally:
        app.dependency_overrides[require_user] = lambda: "test-user-id"


def test_unauthenticated_websocket_rejected(two_user_ws):
    """With real token validation active, connecting without a token must fail."""
    closed = False
    try:
        with client.websocket_connect(f"/ws/{SESSION_A}") as ws:
            ws.receive_json()
    except Exception:
        closed = True
    assert closed, "WS without token must not be accepted"


def test_websocket_with_wrong_token_rejected(two_user_ws):
    """A token that maps to no user must close the WS with authentication error."""
    closed = False
    try:
        with client.websocket_connect(f"/ws/{SESSION_A}?token=garbage") as ws:
            ws.receive_json()
    except Exception:
        closed = True
    assert closed, "WS with garbage token must be rejected"


# ════════════════════════════════════════════════════════════════════════════
# RISK HISTORY ISOLATION
# ════════════════════════════════════════════════════════════════════════════

def test_risk_history_not_shared(two_user_ws):
    """A's risk history entries must never appear in B's risk_history list."""
    with client.websocket_connect(f"/ws/{SESSION_A}?token={TOKEN_A}") as ws_a, \
         client.websocket_connect(f"/ws/{SESSION_B}?token={TOKEN_B}") as ws_b:

        ws_a.send_json({"type": "session_start", "payload": {
            "session_id": SESSION_A, "candidate_name": "Alice",
        }})
        ws_b.send_json({"type": "session_start", "payload": {
            "session_id": SESSION_B, "candidate_name": "Bob",
        }})
        ws_a.receive_json()
        ws_b.receive_json()

        ws_a.send_json({"type": "behavior_snapshot", "payload": {
            "session_id": SESSION_A, "candidate_name": "Alice",
            "events": [{"type": "paste", "timestamp": 1.0}],
            "window_start": 0, "window_end": 2000,
        }})
        ws_a.receive_json()

    # B should have zero risk history (never sent a snapshot)
    b_history = session_store.get(SESSION_B).risk_history
    assert b_history == [], f"B's risk history must be empty; got {b_history}"

    # A should have exactly one entry
    a_history = session_store.get(SESSION_A).risk_history
    assert len(a_history) == 1


# ════════════════════════════════════════════════════════════════════════════
# CONSENT FIREWALL: no record returns BLOCK (not another user's record)
# ════════════════════════════════════════════════════════════════════════════

def test_authorize_returns_block_not_other_users_consent(as_user_a):
    """The /authorize endpoint must not use User B's consent to ALLOW
    a request made for User A's session when User A has no consent record."""
    _grant_consent(SESSION_B, USER_B)

    # Ask firewall about SESSION_A (user-a has no consent record)
    r = client.post(f"/api/consent/{SESSION_A}/authorize", json={
        "action_name": "analyze_behavior_for_exam_integrity",
        "purpose": "examination_integrity",
        "data_categories": ["keystroke_timing"],
    })
    assert r.status_code == 200
    assert r.json()["decision"] == "BLOCK", \
        "Authorize must return BLOCK for session-a; must not use session-b's consent"
