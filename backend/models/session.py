"""
In-memory session store.
Keeps state for all active exam sessions and their risk histories.
For production: replace with PostgreSQL via Supabase.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional
import time


@dataclass
class SessionState:
    session_id: str
    candidate_name: str
    started_at: float = field(default_factory=lambda: time.time() * 1000)
    current_risk_score: float = 0.0
    risk_level: str = "low"
    risk_history: List[Dict] = field(default_factory=list)
    timeline: List[Dict] = field(default_factory=list)
    features_snapshot: Optional[Dict] = None
    is_active: bool = True

    def add_risk_event(self, risk_score: float, risk_level: str, features: dict, flags: List[str]) -> None:
        now = time.time() * 1000
        self.current_risk_score = risk_score
        self.risk_level = risk_level
        self.features_snapshot = features
        self.risk_history.append({"time": now, "score": risk_score})

        # Add timeline entries for significant flags
        for flag in flags:
            severity = "critical" if risk_score > 70 else "warning" if risk_score > 30 else "info"
            self.timeline.append({
                "id": f"{now}-{flag[:8]}",
                "timestamp": now,
                "type": "risk_update",
                "description": flag,
                "severity": severity,
            })

        # Cap timeline at 50 entries
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
            "candidate_name": self.candidate_name,
            "exam_status": "active" if self.is_active else "completed",
            "current_risk_score": self.current_risk_score,
            "risk_level": self.risk_level,
            "risk_history": self.risk_history[-60:],  # last 60 data points
            "timeline": self.timeline[-20:],           # last 20 events
            "features": self.features_snapshot,
            "started_at": self.started_at,
        }


class SessionStore:
    def __init__(self):
        self._sessions: Dict[str, SessionState] = {}

    def create(self, session_id: str, candidate_name: str) -> SessionState:
        session = SessionState(session_id=session_id, candidate_name=candidate_name)
        session.add_timeline_entry("exam_start", "Exam session started", "info")
        self._sessions[session_id] = session
        return session

    def get(self, session_id: str) -> Optional[SessionState]:
        return self._sessions.get(session_id)

    def get_or_create(self, session_id: str, candidate_name: str) -> SessionState:
        if session_id not in self._sessions:
            return self.create(session_id, candidate_name)
        return self._sessions[session_id]

    def get_all(self) -> List[dict]:
        return [s.to_dict() for s in self._sessions.values()]

    def delete(self, session_id: str) -> None:
        self._sessions.pop(session_id, None)


# Singleton
store = SessionStore()
