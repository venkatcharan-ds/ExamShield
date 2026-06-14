from pydantic import BaseModel, Field
from typing import Optional, Literal, List, Any, Dict, Annotated


class BehaviorEvent(BaseModel):
    type: str
    timestamp: float
    metadata: Optional[Dict[str, Any]] = None


class BehaviorSnapshot(BaseModel):
    session_id:     Annotated[str, Field(max_length=128)]
    candidate_name: Annotated[str, Field(max_length=200)]
    events:         Annotated[List[BehaviorEvent], Field(max_length=500)]
    window_start:   float
    window_end:     float


class BehaviorFeatures(BaseModel):
    typing_speed:         float = Field(ge=0, le=2000,       description="Keystrokes per minute")
    average_key_interval: float = Field(ge=0, le=10_000,     description="Mean ms between keystrokes")
    key_variance:         float = Field(ge=0, le=1_000_000,  description="Variance in keystroke intervals")
    mouse_activity:       float = Field(ge=0, le=100,        description="Mouse events per second")
    idle_duration:        float = Field(ge=0, le=3_600,      description="Seconds idle in window")
    tab_switch_count:     int   = Field(ge=0, le=100,        description="Tab switches in window")
    copy_count:           int   = Field(ge=0, le=100,        description="Copy events in window")
    paste_count:          int   = Field(ge=0, le=100,        description="Paste events in window")


class RiskAssessment(BaseModel):
    session_id: str
    candidate_name: str
    risk_score: float = Field(ge=0, le=100)
    risk_level: Literal["low", "medium", "high"]
    anomaly_score: float
    features: BehaviorFeatures
    timestamp: float
    triggered_flags: List[str]


class SessionStart(BaseModel):
    session_id: str
    candidate_name: str


class WebSocketMessage(BaseModel):
    type: Literal["behavior_snapshot", "risk_update", "session_start", "ping"]
    payload: Optional[Any] = None
