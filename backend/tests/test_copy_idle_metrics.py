"""
Tests for the COPY EVENTS and IDLE DURATION session-level accumulation fix.

Root cause (now fixed): features_snapshot was overwritten on every behavior
window, so copy_count and idle_duration reset to 0 after any quiet window.
SessionState now maintains session-wide telemetry accumulators (telemetry_*
fields) via accumulate_features(), which is called from _cumulative_assessment()
in routes.py. features_snapshot stores the cumulative features dict so that
to_dict() exposes session-lifetime totals to the dashboard at all times.

Test coverage:
  1. Single copy event increments exactly once
  2. Multiple copy events accumulate across separate windows
  3. idle_start + idle_end produces correct per-window duration
  4. Multiple idle periods accumulate across windows
  5. Active idle period is finalized via window_end (session ends mid-idle)
  6. to_dict() features dict carries accumulated totals, not per-window values
  7. Reconnect / repeated session_start does NOT double-count
  8. Copy-only (no paste) does not increment paste_count
  9. Paste events do not increment copy_count
 10. A quiet window after copies does not reset the copy count
 11. A quiet window after idle does not reset idle_duration
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient

from main import app
from models.session import store as session_store

client = TestClient(app)


# --- Fixtures ----------------------------------------------------------------

@pytest.fixture(autouse=True)
def _clean_store():
    session_store._sessions.clear()
    yield
    session_store._sessions.clear()


def _ws_start(ws, session_id: str, name: str = "Test Candidate"):
    ws.send_json({
        "type": "session_start",
        "payload": {"session_id": session_id, "candidate_name": name},
    })
    ack = ws.receive_json()
    assert ack["type"] == "session_ack"


def _ws_snapshot(ws, session_id: str, events: list,
                 window_start: float = 0, window_end: float = 3000):
    ws.send_json({
        "type": "behavior_snapshot",
        "payload": {
            "session_id": session_id,
            "candidate_name": "Test Candidate",
            "events": events,
            "window_start": window_start,
            "window_end": window_end,
        },
    })
    msg = ws.receive_json()
    assert msg["type"] == "risk_update"
    return msg


def _copy_event(ts: float = 500.0):
    return {"type": "copy", "timestamp": ts}


def _paste_event(ts: float = 500.0):
    return {"type": "paste", "timestamp": ts}


def _idle_start(ts: float):
    return {"type": "idle_start", "timestamp": ts}


def _idle_end(ts: float):
    return {"type": "idle_end", "timestamp": ts}


def _keydown(ts: float):
    return {"type": "keydown", "timestamp": ts, "metadata": {"interval_since_last": 200}}


# --- COPY EVENTS -------------------------------------------------------------

def test_single_copy_event_increments_exactly_once():
    """One browser copy action -> copy_count = 1 in dashboard serialization."""
    sid = "copy-single"
    with client.websocket_connect(f"/ws/{sid}") as ws:
        _ws_start(ws, sid)
        _ws_snapshot(ws, sid, [_copy_event(500)], 0, 3000)

    session = session_store.get(sid)
    assert session.telemetry_copy_events == 1
    d = session.to_dict()
    assert d["features"]["copy_count"] == 1


def test_three_copy_events_accumulate_to_three():
    """3 copies in the same window -> copy_count = 3."""
    sid = "copy-three"
    with client.websocket_connect(f"/ws/{sid}") as ws:
        _ws_start(ws, sid)
        _ws_snapshot(ws, sid, [_copy_event(100), _copy_event(200), _copy_event(300)], 0, 3000)

    session = session_store.get(sid)
    assert session.telemetry_copy_events == 3
    assert session.to_dict()["features"]["copy_count"] == 3


def test_copy_events_accumulate_across_multiple_windows():
    """2 copies in window 1, 1 copy in window 2 -> cumulative total = 3."""
    sid = "copy-multi-window"
    with client.websocket_connect(f"/ws/{sid}") as ws:
        _ws_start(ws, sid)
        _ws_snapshot(ws, sid, [_copy_event(500), _copy_event(1500)], 0, 3000)
        _ws_snapshot(ws, sid, [_copy_event(3500)], 3000, 6000)

    session = session_store.get(sid)
    assert session.telemetry_copy_events == 3
    assert session.to_dict()["features"]["copy_count"] == 3


def test_quiet_window_does_not_reset_copy_count():
    """After a window with copies, a quiet window must NOT reset copy_count to 0."""
    sid = "copy-quiet-after"
    with client.websocket_connect(f"/ws/{sid}") as ws:
        _ws_start(ws, sid)
        # Window 1: 2 copies
        _ws_snapshot(ws, sid, [_copy_event(500), _copy_event(1000)], 0, 3000)
        # Window 2: no copies - this should NOT reset the accumulated count
        _ws_snapshot(ws, sid, [_keydown(3200), _keydown(3400)], 3000, 6000)

    session = session_store.get(sid)
    assert session.telemetry_copy_events == 2
    d = session.to_dict()
    assert d["features"]["copy_count"] == 2


def test_copy_events_do_not_increment_paste_count():
    """Copy actions must never bleed into paste_count."""
    sid = "copy-no-paste"
    with client.websocket_connect(f"/ws/{sid}") as ws:
        _ws_start(ws, sid)
        _ws_snapshot(ws, sid, [_copy_event(100), _copy_event(200)], 0, 3000)

    session = session_store.get(sid)
    assert session.telemetry_copy_events == 2
    assert session.features_snapshot["paste_count"] == 0


def test_paste_events_do_not_increment_copy_count():
    """Paste actions must never bleed into copy_count."""
    sid = "paste-no-copy"
    with client.websocket_connect(f"/ws/{sid}") as ws:
        _ws_start(ws, sid)
        _ws_snapshot(ws, sid, [_paste_event(100), _paste_event(200)], 0, 3000)

    session = session_store.get(sid)
    assert session.telemetry_copy_events == 0
    d = session.to_dict()
    assert d["features"]["copy_count"] == 0


# --- IDLE DURATION -----------------------------------------------------------

def test_idle_start_end_pair_produces_correct_duration():
    """
    idle_start at t=1000, idle_end at t=9000 within window 0-15000 ms.
    ML engine: (9000 - 1000) / 1000 = 8.0 s.
    Session accumulator must reflect 8.0 s.
    """
    sid = "idle-single"
    with client.websocket_connect(f"/ws/{sid}") as ws:
        _ws_start(ws, sid)
        _ws_snapshot(ws, sid,
                     [_idle_start(1000), _idle_end(9000)],
                     window_start=0, window_end=15000)

    session = session_store.get(sid)
    assert abs(session.telemetry_idle_seconds - 8.0) < 0.05
    d = session.to_dict()
    assert abs(d["features"]["idle_duration"] - 8.0) < 0.05


def test_multiple_idle_periods_accumulate():
    """
    Window 1: idle 5 s (1000->6000)
    Window 2: idle 8 s (18000->26000)
    -> telemetry_idle_seconds ~= 13.0 s
    """
    sid = "idle-multi"
    with client.websocket_connect(f"/ws/{sid}") as ws:
        _ws_start(ws, sid)
        _ws_snapshot(ws, sid,
                     [_idle_start(1000), _idle_end(6000)],
                     window_start=0, window_end=15000)
        _ws_snapshot(ws, sid,
                     [_idle_start(18000), _idle_end(26000)],
                     window_start=15000, window_end=30000)

    session = session_store.get(sid)
    assert abs(session.telemetry_idle_seconds - 13.0) < 0.2
    d = session.to_dict()
    assert abs(d["features"]["idle_duration"] - 13.0) < 0.2


def test_active_idle_uses_window_end_when_no_idle_end_event():
    """
    Student becomes idle mid-window with no idle_end before window flush.
    The ML engine uses window_end as close timestamp.
    idle_start at 2000, window_end at 7000 -> 5.0 s accrued.
    """
    sid = "idle-no-end"
    with client.websocket_connect(f"/ws/{sid}") as ws:
        _ws_start(ws, sid)
        _ws_snapshot(ws, sid,
                     [_idle_start(2000)],
                     window_start=0, window_end=7000)

    session = session_store.get(sid)
    assert abs(session.telemetry_idle_seconds - 5.0) < 0.05
    d = session.to_dict()
    assert abs(d["features"]["idle_duration"] - 5.0) < 0.05


def test_quiet_window_does_not_reset_idle_duration():
    """After a window with idle, a fully active window must NOT reset idle to 0."""
    sid = "idle-quiet-after"
    with client.websocket_connect(f"/ws/{sid}") as ws:
        _ws_start(ws, sid)
        # Window 1: 3 s idle
        _ws_snapshot(ws, sid,
                     [_idle_start(1000), _idle_end(4000)],
                     window_start=0, window_end=10000)
        # Window 2: purely active typing - 0 idle in this window
        keydowns = [_keydown(10000 + i * 200) for i in range(8)]
        _ws_snapshot(ws, sid, keydowns, window_start=10000, window_end=13000)

    session = session_store.get(sid)
    assert abs(session.telemetry_idle_seconds - 3.0) < 0.05
    d = session.to_dict()
    assert abs(d["features"]["idle_duration"] - 3.0) < 0.05


# --- to_dict() serialization -------------------------------------------------

def test_to_dict_before_any_behavior_snapshot_returns_none_features():
    """Before the first behavior snapshot, features must be None (no mock data)."""
    sid = "todict-no-snap"
    with client.websocket_connect(f"/ws/{sid}") as ws:
        _ws_start(ws, sid)

    session = session_store.get(sid)
    d = session.to_dict()
    assert d["features"] is None


def test_to_dict_features_copy_count_reflects_accumulated_total():
    """to_dict() features copy_count reflects session-wide cumulative total."""
    sid = "todict-copy"
    with client.websocket_connect(f"/ws/{sid}") as ws:
        _ws_start(ws, sid)
        # Window 1: 2 copies
        _ws_snapshot(ws, sid, [_copy_event(100), _copy_event(200)], 0, 3000)
        # Window 2: 0 copies — telemetry accumulator stays at 2
        _ws_snapshot(ws, sid, [_keydown(3500)], 3000, 6000)

    session = session_store.get(sid)
    assert session.telemetry_copy_events == 2
    d = session.to_dict()
    assert d["features"]["copy_count"] == 2


def test_to_dict_features_idle_duration_reflects_accumulated_total():
    """to_dict() features idle_duration reflects session-wide cumulative total."""
    sid = "todict-idle"
    with client.websocket_connect(f"/ws/{sid}") as ws:
        _ws_start(ws, sid)
        # Window 1: 6 s idle
        _ws_snapshot(ws, sid,
                     [_idle_start(1000), _idle_end(7000)],
                     window_start=0, window_end=12000)
        # Window 2: no idle — telemetry accumulator stays at 6 s
        _ws_snapshot(ws, sid, [_keydown(12200)], 12000, 15000)

    session = session_store.get(sid)
    assert abs(session.telemetry_idle_seconds - 6.0) < 0.05
    d = session.to_dict()
    assert abs(d["features"]["idle_duration"] - 6.0) < 0.05


# --- Reconnect / no double-count ---------------------------------------------

def test_reconnect_does_not_double_count_copies():
    """
    Simulate a WebSocket reconnect: session_start is sent again on the same
    session_id. Existing session returned via get_or_create; accumulated
    totals must not be reset or double-counted.
    """
    sid = "copy-reconnect"
    # First connection: 2 copies
    with client.websocket_connect(f"/ws/{sid}") as ws:
        _ws_start(ws, sid)
        _ws_snapshot(ws, sid, [_copy_event(100), _copy_event(200)], 0, 3000)

    session = session_store.get(sid)
    assert session.telemetry_copy_events == 2

    # Reconnect (new WebSocket, same session_id)
    with client.websocket_connect(f"/ws/{sid}") as ws:
        _ws_start(ws, sid)  # session_start again - must not reset the counter
        # 1 more copy
        _ws_snapshot(ws, sid, [_copy_event(3500)], 3000, 6000)

    session = session_store.get(sid)
    # Should be 2 + 1 = 3, not 1 (reset) or 4 (double-count)
    assert session.telemetry_copy_events == 3
    assert session.to_dict()["features"]["copy_count"] == 3


def test_reconnect_does_not_double_count_idle():
    """Same reconnect guarantee for idle_duration."""
    sid = "idle-reconnect"
    with client.websocket_connect(f"/ws/{sid}") as ws:
        _ws_start(ws, sid)
        _ws_snapshot(ws, sid,
                     [_idle_start(1000), _idle_end(5000)],
                     window_start=0, window_end=8000)  # 4 s

    # Reconnect
    with client.websocket_connect(f"/ws/{sid}") as ws:
        _ws_start(ws, sid)
        _ws_snapshot(ws, sid,
                     [_idle_start(8000), _idle_end(11000)],
                     window_start=8000, window_end=14000)  # 3 s

    session = session_store.get(sid)
    assert abs(session.telemetry_idle_seconds - 7.0) < 0.1
    assert abs(session.to_dict()["features"]["idle_duration"] - 7.0) < 0.1
