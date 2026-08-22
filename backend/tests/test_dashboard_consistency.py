"""
Regression tests for the dashboard risk/timeline consistency bug:

  "Alerts: 2 (paste events) + Behavior Analysis flags an interaction-
   pattern change, but Risk Score/Level and Overall Assessment say
   Low Risk / No significant concerns."

Root cause: `session.features` and `current_risk_score` reflect ONLY the
most recent ~3s window (the risk engine is intentionally stateless per
snapshot). A paste event that pushed the score up a window ago has
scrolled out of `features` by the time a later, calmer window arrives —
but it's still real history, correctly kept in `session.timeline`. The
frontend's Behavior Analysis Report is meant to reconcile stale/decayed
`features` against timeline history for exactly this reason, but that
reconciliation matched on `timeline_event.type === 'paste'`, while the
backend was tagging every flag-derived timeline entry with the generic
type "risk_update" — so the reconciliation was silently dead code for
every real (non-demo) session.

These tests cover the backend half of the fix: timeline entries must
carry the *specific* type (paste/copy/tab_switch) the frontend already
expects, not a generic label — and that history must survive into a
later, lower-risk window instead of being overwritten.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient

from main import app
from models.session import store as session_store, _flag_type

client = TestClient(app)


@pytest.fixture(autouse=True)
def _clean_store():
    session_store._sessions.clear()
    yield
    session_store._sessions.clear()


# ─── _flag_type mapping ──────────────────────────────────────────────────────

@pytest.mark.parametrize("flag,expected_type", [
    ("Paste event detected", "paste"),
    ("Copy event detected", "copy"),
    ("Tab switched out of exam window", "tab_switch"),
    ("Repeated tab switching (2×)", "tab_switch"),
    ("Excessive tab switching (4×)", "tab_switch"),
    ("Anomalous typing speed: 650 kpm", "risk_update"),
    ("Extended idle: 12.0s", "risk_update"),
])
def test_flag_type_mapping(flag, expected_type):
    assert _flag_type(flag) == expected_type


# ─── The exact reported contradiction, reproduced end-to-end ───────────────

def _snapshot(session_id, events, window=(0, 3000)):
    return {
        "session_id": session_id,
        "candidate_name": "Regression Candidate",
        "events": events,
        "window_start": window[0],
        "window_end": window[1],
    }


def test_paste_flags_survive_into_a_later_calm_window_with_correct_type():
    """Reproduces the exact reported dashboard state: two separate paste
    events (in two separate 3s windows, as they would happen in a real
    session), then behavior calms down. Assert the timeline still
    explains what happened, tagged so the frontend can reconcile it
    against a decayed current score, instead of the two events silently
    disappearing once their windows pass."""
    session_id = "consistency-check-1"

    with client.websocket_connect(f"/ws/{session_id}") as ws:
        ws.send_json({"type": "session_start", "payload": {"session_id": session_id, "candidate_name": "Regression Candidate"}})
        ws.receive_json()

        # Window 1 — a paste event.
        ws.send_json({"type": "behavior_snapshot", "payload": _snapshot(
            session_id, [{"type": "paste", "timestamp": 500}], window=(0, 3000),
        )})
        first = ws.receive_json()
        assert first["type"] == "risk_update"
        first_score = first["payload"]["risk_score"]
        assert first_score > 30, "a paste event should raise risk noticeably"

        # Window 2 — another paste event, a few seconds later.
        ws.send_json({"type": "behavior_snapshot", "payload": _snapshot(
            session_id, [{"type": "paste", "timestamp": 500}], window=(3000, 6000),
        )})
        second = ws.receive_json()
        assert second["type"] == "risk_update"

        # Window 3 — calm typing only, no more paste events.
        keydowns = [{"type": "keydown", "timestamp": 6000 + i * 200, "metadata": {"interval_since_last": 200}} for i in range(10)]
        ws.send_json({"type": "behavior_snapshot", "payload": _snapshot(
            session_id, keydowns, window=(6000, 9000),
        )})
        third = ws.receive_json()
        assert third["type"] == "risk_update"
        third_score = third["payload"]["risk_score"]

    session = session_store.get(session_id)

    # Under cumulative scoring, risk is non-decreasing: two accumulated paste
    # events produce a score >= the score from the first paste alone.
    assert third_score >= first_score

    # Both paste flags must still be in the session's real history, correctly
    # typed so the dashboard's Behavior Analysis Report shows all events.
    paste_events = [e for e in session.timeline if e["type"] == "paste"]
    assert len(paste_events) == 2, "both paste flags must be preserved in the timeline"
    assert all(e["severity"] != "info" for e in paste_events), "paste flags must not be demoted to info"

    # features_snapshot stores the cumulative features dict; after 2 paste
    # events the paste_count reflects the session-lifetime total.
    assert session.features_snapshot["paste_count"] == 2


def test_single_paste_is_warning_not_critical():
    """A lone paste event is a low-signal warning, not an automatic
    high-severity flag — matches the "don't treat 2 pastes as cheating"
    design principle; severity should scale with the actual score."""
    session_id = "consistency-check-2"
    with client.websocket_connect(f"/ws/{session_id}") as ws:
        ws.send_json({"type": "session_start", "payload": {"session_id": session_id, "candidate_name": "Solo Paste"}})
        ws.receive_json()
        ws.send_json({"type": "behavior_snapshot", "payload": _snapshot(
            session_id, [{"type": "paste", "timestamp": 500}],
        )})
        msg = ws.receive_json()

    assert msg["payload"]["risk_level"] in ("medium",)  # single paste ~68 -> medium, not high
    session = session_store.get(session_id)
    paste_entries = [e for e in session.timeline if e["type"] == "paste"]
    assert len(paste_entries) == 1
    assert paste_entries[0]["severity"] == "warning"


def test_tab_switch_and_copy_flags_are_also_correctly_typed():
    session_id = "consistency-check-3"
    with client.websocket_connect(f"/ws/{session_id}") as ws:
        ws.send_json({"type": "session_start", "payload": {"session_id": session_id, "candidate_name": "Multi Signal"}})
        ws.receive_json()
        ws.send_json({"type": "behavior_snapshot", "payload": _snapshot(
            session_id, [
                {"type": "tab_switch", "timestamp": 100},
                {"type": "copy", "timestamp": 200},
            ],
        )})
        ws.receive_json()

    session = session_store.get(session_id)
    types = {e["type"] for e in session.timeline}
    assert "tab_switch" in types
    assert "copy" in types
