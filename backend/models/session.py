"""
In-memory session store.
Keeps state for all active exam sessions and their risk histories.
Each session is explicitly owned by one authenticated user so concurrent
candidates can never be confused at the application data layer.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional
import time


def _flag_type(flag: str) -> str:
    lower = flag.lower()
    if "paste" in lower:
        return "paste"
    if "copy" in lower:
        return "copy"
    if "tab switch" in lower:
        return "tab_switch"
    return "risk_update"


@dataclass
class SessionState:
    session_id: str
    candidate_name: str
    user_id: Optional[str] = None
    started_at: float = field(default_factory=lambda: time.time() * 1000)
    current_risk_score: float = 0.0
    risk_level: str = "low"
    risk_history: List[Dict] = field(default_factory=list)
    timeline: List[Dict] = field(default_factory=list)
    features_snapshot: Optional[Dict] = None
    is_active: bool = True
    exam_name: Optional[str] = None
    questions_total: Optional[int] = None
    questions_answered: int = 0

    # Session-wide telemetry accumulators. The previous implementation stored
    # only the latest 3-second window, which made dashboard metrics fall back
    # to zero as soon as that window contained no events.
    telemetry_window_seconds: float = 0.0
    telemetry_keydowns: int = 0
    telemetry_key_interval_sum: float = 0.0
    telemetry_key_interval_count: int = 0
    telemetry_key_variance_sum: float = 0.0
    telemetry_key_variance_weight: int = 0
    telemetry_mouse_events: int = 0
    telemetry_idle_seconds: float = 0.0
    telemetry_tab_switches: int = 0
    telemetry_copy_events: int = 0
    telemetry_paste_events: int = 0

    def accumulate_features(self, features: dict, window_seconds: float) -> dict:
        """Merge one telemetry window into authoritative session metrics."""
        window_seconds = max(float(window_seconds), 0.0)
        self.telemetry_window_seconds += window_seconds

        # typing_speed is keys/minute, so recover the approximate key count for
        # this window and use it to build a session-wide rate.
        keydowns = max(0, round(float(features.get("typing_speed", 0.0)) * window_seconds / 60.0))
        self.telemetry_keydowns += keydowns

        interval_samples = max(0, keydowns - 1)
        if interval_samples > 0:
            avg_interval = max(0.0, float(features.get("average_key_interval", 0.0)))
            self.telemetry_key_interval_sum += avg_interval * interval_samples
            self.telemetry_key_interval_count += interval_samples
            self.telemetry_key_variance_sum += max(0.0, float(features.get("key_variance", 0.0))) * interval_samples
            self.telemetry_key_variance_weight += interval_samples

        mouse_events = max(0, round(float(features.get("mouse_activity", 0.0)) * window_seconds))
        self.telemetry_mouse_events += mouse_events
        self.telemetry_idle_seconds += max(0.0, float(features.get("idle_duration", 0.0)))
        self.telemetry_tab_switches += max(0, int(features.get("tab_switch_count", 0)))
        self.telemetry_copy_events += max(0, int(features.get("copy_count", 0)))
        self.telemetry_paste_events += max(0, int(features.get("paste_count", 0)))

        total_seconds = max(self.telemetry_window_seconds, 0.1)
        return {
            "typing_speed": round((self.telemetry_keydowns / total_seconds) * 60.0, 2),
            "average_key_interval": round(
                self.telemetry_key_interval_sum / self.telemetry_key_interval_count,
                2,
            ) if self.telemetry_key_interval_count else float(features.get("average_key_interval", 300.0)),
            "key_variance": round(
                self.telemetry_key_variance_sum / self.telemetry_key_variance_weight,
                2,
            ) if self.telemetry_key_variance_weight else float(features.get("key_variance", 1000.0)),
            "mouse_activity": round(self.telemetry_mouse_events / total_seconds, 2),
            "idle_duration": round(self.telemetry_idle_seconds, 2),
            # These are intentionally cumulative for the candidate card and
            # risk scoring. The forensic timeline remains event-by-event.
            "tab_switch_count": min(100, self.telemetry_tab_switches),
            "copy_count": min(100, self.telemetry_copy_events),
            "paste_count": min(100, self.telemetry_paste_events),
        }

    def add_risk_event(self, risk_score: float, risk_level: str, features: dict, flags: List[str]) -> None:
        now = time.time() * 1000
        self.current_risk_score = risk_score
        self.risk_level = risk_level
        self.features_snapshot = features
        self.risk_history.append({"time": now, "score": risk_score})

        # Flags are generated from the current telemetry window, so each
        # forensic entry represents a real event observed at that time rather
        # than re-emitting all historical flags on every snapshot.
        for flag in flags:
            severity = "critical" if risk_score > 70 else "warning" if risk_score > 30 else "info"
            self.timeline.append({
                "id": f"{now}-{flag[:8]}",
                "timestamp": now,
                "type": _flag_type(flag),
                "description": flag,
                "severity": severity,
            })

        if len(self.timeline) > 50:
            self.timeline = self.timeline[-50:]

    def add_timeline_entry(self, event_type: str, description: str, severity: str = "info") -> None:
        now = time.time() * 1000
        self.timeline.append({
            "id": f"{now}-{event_type}",
            "timestamp": now,
            "type": event_type,
            "description": description,
            "severity": severity,
        })

    def to_dict(self) -> dict:
        return {
            "session_id": self.session_id,
            "user_id": self.user_id,
            "candidate_name": self.candidate_name,
            "exam_status": "active" if self.is_active else "completed",
            "current_risk_score": self.current_risk_score,
            "risk_level": self.risk_level,
            "risk_history": self.risk_history[-60:],
            "timeline": self.timeline[-20:],
            "features": self.features_snapshot,
            "started_at": self.started_at,
            "exam_name": self.exam_name,
            "questions_total": self.questions_total,
            "questions_answered": self.questions_answered,
        }


class SessionStore:
    def __init__(self):
        self._sessions: Dict[str, SessionState] = {}

    def create(self, session_id: str, candidate_name: str, user_id: Optional[str] = None) -> SessionState:
        session = SessionState(
            session_id=session_id,
            candidate_name=candidate_name,
            user_id=user_id,
        )
        session.add_timeline_entry("exam_start", "Exam session started", "info")
        self._sessions[session_id] = session
        return session

    def get(self, session_id: str) -> Optional[SessionState]:
        return self._sessions.get(session_id)

    def get_or_create(
        self,
        session_id: str,
        candidate_name: str,
        user_id: Optional[str] = None,
    ) -> SessionState:
        existing = self._sessions.get(session_id)
        if existing is None:
            return self.create(session_id, candidate_name, user_id)

        # Never allow a reused session id to silently change ownership.
        if user_id and existing.user_id and existing.user_id != user_id:
            raise ValueError("session ownership mismatch")
        if user_id and not existing.user_id:
            existing.user_id = user_id
        return existing

    def get_all(self) -> List[dict]:
        return [s.to_dict() for s in self._sessions.values()]

    def get_for_user(self, user_id: str) -> List[dict]:
        return [s.to_dict() for s in self._sessions.values() if s.user_id == user_id]

    def delete(self, session_id: str) -> None:
        self._sessions.pop(session_id, None)


store = SessionStore()
