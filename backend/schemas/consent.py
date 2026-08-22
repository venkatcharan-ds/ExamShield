from pydantic import BaseModel, Field
from typing import List, Literal, Optional, Annotated

_Tag = Annotated[str, Field(min_length=1, max_length=64)]
_TagList = Annotated[List[_Tag], Field(max_length=20)]
_Reason = Annotated[str, Field(max_length=500)]


class ConsentGrantRequest(BaseModel):
    subject_id: str = Field(min_length=1, max_length=128)
    subject_type: str = Field(default="exam_session", max_length=64)
    consent_type: str = Field(default="behavioral_monitoring", max_length=64)
    purpose: _TagList = Field(default_factory=lambda: ["examination_integrity"])
    data_categories: _TagList = Field(
        default_factory=lambda: ["keystroke_timing", "mouse_movement", "tab_switching"]
    )
    collection_scope: str = Field(default="session_only", max_length=64)
    processing_scope: str = Field(default="real_time_risk_scoring", max_length=64)
    duration_days: float = Field(default=30, gt=0, le=3650)
    version: str = Field(default="1.0", max_length=32)
    prohibited_data: _TagList = Field(default_factory=list)
    allowed_actions: _TagList = Field(default_factory=list)


class ConsentUpdateRequest(BaseModel):
    purpose: Optional[_TagList] = None
    data_categories: Optional[_TagList] = None
    collection_scope: Optional[str] = Field(default=None, max_length=64)
    processing_scope: Optional[str] = Field(default=None, max_length=64)
    version: Optional[str] = Field(default=None, max_length=32)
    reason: Optional[_Reason] = None


class ConsentWithdrawRequest(BaseModel):
    reason: Optional[_Reason] = None


SimulateScenario = Literal[
    "purpose_expansion", "data_expansion", "scope_change", "expire", "withdraw", "reset"
]


class ConsentSimulateRequest(BaseModel):
    scenario: SimulateScenario


class ConsentReconsentRequest(BaseModel):
    """An explicit, user-approved boundary change — distinct from
    ConsentUpdateRequest, which only records what the system *claims* it's
    now doing. Only fields given here are changed; everything else carries
    forward from the current boundary."""
    purpose: Optional[_TagList] = None
    data_categories: Optional[_TagList] = None
    prohibited_data: Optional[_TagList] = None
    allowed_actions: Optional[_TagList] = None
    collection_scope: Optional[str] = Field(default=None, max_length=64)
    processing_scope: Optional[str] = Field(default=None, max_length=64)
    duration_days: Optional[float] = Field(default=None, gt=0, le=3650)
    version: Optional[str] = Field(default=None, max_length=32)


class ProcessingActionRequest(BaseModel):
    """A processing action a caller wants authorized against a subject's
    consent boundary. Fully generic — the engine has no idea what these
    strings mean; ExamShield's demo action catalog lives in the frontend."""
    action_name: str = Field(min_length=1, max_length=64)
    purpose: str = Field(min_length=1, max_length=64)
    data_categories: _TagList = Field(default_factory=list)
