"""
Generic Consent Lifecycle store.

Consent records are scoped to an authenticated owner. subject_id remains a
separate generic identifier, but an owner can only read or mutate records
that belong to their user account (unless an authorized admin is acting).
"""

from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional
import time
import uuid


@dataclass
class ConsentContext:
    purpose: List[str] = field(default_factory=list)
    data_categories: List[str] = field(default_factory=list)
    collection_scope: str = "session_only"
    processing_scope: str = "real_time_risk_scoring"
    version: str = "1.0"
    prohibited_data: List[str] = field(default_factory=list)
    allowed_actions: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)

    def clone(self) -> "ConsentContext":
        return ConsentContext(
            purpose=list(self.purpose),
            data_categories=list(self.data_categories),
            collection_scope=self.collection_scope,
            processing_scope=self.processing_scope,
            version=self.version,
            prohibited_data=list(self.prohibited_data),
            allowed_actions=list(self.allowed_actions),
        )


@dataclass
class ConsentAuditEvent:
    id: str
    timestamp: float
    event: str
    description: str
    previous_state: Optional[dict] = None
    new_state: Optional[dict] = None
    reason: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class ConsentRecord:
    consent_id: str
    subject_id: str
    owner_user_id: str
    subject_type: str
    consent_type: str
    granted_at: float
    expires_at: float
    status: str
    original_context: ConsentContext
    current_context: ConsentContext
    withdrawn_at: Optional[float] = None
    audit: List[ConsentAuditEvent] = field(default_factory=list)

    def log(self, event: str, description: str, previous_state=None, new_state=None, reason=None) -> None:
        self.audit.append(ConsentAuditEvent(
            id=f"{time.time()*1000:.0f}-{event}",
            timestamp=time.time() * 1000,
            event=event,
            description=description,
            previous_state=previous_state,
            new_state=new_state,
            reason=reason,
        ))

    def to_dict(self) -> dict:
        return {
            "consent_id": self.consent_id,
            "subject_id": self.subject_id,
            "owner_user_id": self.owner_user_id,
            "subject_type": self.subject_type,
            "consent_type": self.consent_type,
            "granted_at": self.granted_at,
            "expires_at": self.expires_at,
            "status": self.status,
            "withdrawn_at": self.withdrawn_at,
            "original_context": self.original_context.to_dict(),
            "current_context": self.current_context.to_dict(),
            "audit": [e.to_dict() for e in self.audit[-50:]],
        }


class ConsentStore:
    """In-memory store keyed by subject_id, with immutable owner_user_id."""

    def __init__(self):
        self._records: Dict[str, ConsentRecord] = {}

    def grant(
        self,
        subject_id: str,
        owner_user_id: str,
        subject_type: str,
        consent_type: str,
        purpose: List[str],
        data_categories: List[str],
        collection_scope: str,
        processing_scope: str,
        duration_days: float,
        version: str = "1.0",
        prohibited_data: Optional[List[str]] = None,
        allowed_actions: Optional[List[str]] = None,
        event: str = "consent_granted",
        description: Optional[str] = None,
    ) -> ConsentRecord:
        now = time.time() * 1000
        existing = self._records.get(subject_id)
        if existing and existing.owner_user_id != owner_user_id:
            raise ValueError("consent ownership mismatch")
        context = ConsentContext(
            purpose=list(purpose), data_categories=list(data_categories),
            collection_scope=collection_scope, processing_scope=processing_scope,
            version=version, prohibited_data=list(prohibited_data or []),
            allowed_actions=list(allowed_actions or []),
        )
        record = ConsentRecord(
            consent_id=str(uuid.uuid4()), subject_id=subject_id,
            owner_user_id=owner_user_id, subject_type=subject_type,
            consent_type=consent_type, granted_at=now,
            expires_at=now + duration_days * 24 * 60 * 60 * 1000,
            status="active", original_context=context,
            current_context=context.clone(),
            audit=existing.audit if existing else [],
        )
        record.log(event, description or ("Consent renewed" if existing else "Consent granted"),
                   previous_state={"status": existing.status} if existing else None,
                   new_state=context.to_dict())
        self._records[subject_id] = record
        return record

    def get(self, subject_id: str) -> Optional[ConsentRecord]:
        return self._records.get(subject_id)

    def get_for_user(self, subject_id: str, owner_user_id: str) -> Optional[ConsentRecord]:
        record = self._records.get(subject_id)
        if record and record.owner_user_id == owner_user_id:
            return record
        return None

    def all_active(self) -> List[ConsentRecord]:
        return [r for r in self._records.values() if r.status == "active"]


store = ConsentStore()
