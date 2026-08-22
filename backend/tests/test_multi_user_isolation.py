import pytest

from models.session import SessionStore
from models.consent import ConsentStore


def test_sessions_are_isolated_by_owner():
    store = SessionStore()
    a = store.create("a-session", "Alice", "user-a")
    b = store.create("b-session", "Bob", "user-b")

    assert [s["session_id"] for s in store.get_for_user("user-a")] == ["a-session"]
    assert [s["session_id"] for s in store.get_for_user("user-b")] == ["b-session"]
    assert a.user_id != b.user_id


def test_session_id_cannot_change_owner():
    store = SessionStore()
    store.create("same-session", "Alice", "user-a")
    with pytest.raises(ValueError):
        store.get_or_create("same-session", "Bob", "user-b")


def test_consent_isolated_by_owner():
    store = ConsentStore()
    store.grant(
        subject_id="session-a", owner_user_id="user-a", subject_type="exam_session",
        consent_type="behavioral_monitoring", purpose=["examination_integrity"],
        data_categories=["keystroke_timing"], collection_scope="session_only",
        processing_scope="real_time_risk_scoring", duration_days=1,
    )
    assert store.get_for_user("session-a", "user-a") is not None
    assert store.get_for_user("session-a", "user-b") is None


def test_consent_cannot_be_reassigned():
    store = ConsentStore()
    store.grant(
        subject_id="session-a", owner_user_id="user-a", subject_type="exam_session",
        consent_type="behavioral_monitoring", purpose=[], data_categories=[],
        collection_scope="session_only", processing_scope="real_time_risk_scoring",
        duration_days=1,
    )
    with pytest.raises(ValueError):
        store.grant(
            subject_id="session-a", owner_user_id="user-b", subject_type="exam_session",
            consent_type="behavioral_monitoring", purpose=[], data_categories=[],
            collection_scope="session_only", processing_scope="real_time_risk_scoring",
            duration_days=1,
        )
