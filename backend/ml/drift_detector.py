"""
Consent Drift Detection Engine.

Generic and reusable: compares a ConsentRecord's original_context against
its current_context (plus expiry/withdrawal status) and produces an
explainable DriftResult. Every reported drift status is backed by a list of
human-readable reasons — there is no unexplained black-box score.

Drift states:
  ALIGNED            — current context matches what was originally granted.
  MINOR_DRIFT         — a small, likely-benign change (e.g. version bump,
                         scope narrowed) that may still warrant review.
  SIGNIFICANT_DRIFT   — processing now meaningfully exceeds what was
                         consented to (new purpose, new data category,
                         expanded scope). Fresh consent should be obtained.
  CONSENT_INVALID     — consent has expired or been withdrawn; it must not
                         be treated as authorizing any further processing.
"""

from dataclasses import dataclass, field
from typing import List, Dict
import time

from models.consent import ConsentRecord

DRIFT_ALIGNED = "ALIGNED"
DRIFT_MINOR = "MINOR_DRIFT"
DRIFT_SIGNIFICANT = "SIGNIFICANT_DRIFT"
DRIFT_INVALID = "CONSENT_INVALID"


@dataclass
class DriftCheck:
    label: str
    passed: bool


@dataclass
class DriftResult:
    status: str
    score: int
    reasons: List[str]
    recommended_action: str
    checks: List[DriftCheck]
    original_context: dict
    current_context: dict

    def to_dict(self) -> dict:
        return {
            "status": self.status,
            "score": self.score,
            "reasons": self.reasons,
            "recommended_action": self.recommended_action,
            "checks": [{"label": c.label, "passed": c.passed} for c in self.checks],
            "original_context": self.original_context,
            "current_context": self.current_context,
        }


class DriftDetector:
    """Stateless — evaluate() takes a ConsentRecord and returns a DriftResult."""

    def evaluate(self, record: ConsentRecord) -> DriftResult:
        now = time.time() * 1000
        original = record.original_context
        current = record.current_context

        orig_purpose, cur_purpose = set(original.purpose), set(current.purpose)
        orig_data, cur_data = set(original.data_categories), set(current.data_categories)

        added_purpose = sorted(cur_purpose - orig_purpose)
        removed_purpose = sorted(orig_purpose - cur_purpose)
        added_data = sorted(cur_data - orig_data)
        removed_data = sorted(orig_data - cur_data)
        collection_changed = original.collection_scope != current.collection_scope
        processing_changed = original.processing_scope != current.processing_scope
        version_changed = original.version != current.version

        checks = [
            DriftCheck("Purpose matches", not added_purpose and not removed_purpose),
            DriftCheck("Data collection matches", not added_data and not removed_data),
            DriftCheck("Processing scope matches", not processing_changed and not collection_changed),
            DriftCheck("Consent is active", record.status == "active"),
            DriftCheck("Consent has not expired", now <= record.expires_at),
        ]

        # ── Invalid: withdrawal / expiry always win, regardless of context drift ──
        if record.status == "withdrawn":
            when = _fmt(record.withdrawn_at or now)
            return DriftResult(
                status=DRIFT_INVALID,
                score=0,
                reasons=[f"Consent was withdrawn on {when}. Processing must stop immediately."],
                recommended_action="Halt all data processing for this subject. Fresh consent is required before resuming.",
                checks=checks,
                original_context=original.to_dict(),
                current_context=current.to_dict(),
            )

        if now > record.expires_at:
            return DriftResult(
                status=DRIFT_INVALID,
                score=0,
                reasons=[f"Consent expired on {_fmt(record.expires_at)}. Renewed consent is required."],
                recommended_action="Prompt the subject to renew consent before continuing to process data.",
                checks=checks,
                original_context=original.to_dict(),
                current_context=current.to_dict(),
            )

        # ── Compare context ──────────────────────────────────────────────────
        reasons: List[str] = []
        significant = False
        minor = False

        if added_purpose:
            reasons.append(
                f"Processing purpose has expanded to include {_join(added_purpose)}, "
                f"which was not part of the original consent."
            )
            significant = True

        if added_data:
            reasons.append(
                f"Current data collection includes {_join(added_data)}, "
                f"which was not present in the original consent."
            )
            significant = True

        if collection_changed:
            reasons.append(
                f"Collection scope changed from \"{original.collection_scope}\" "
                f"to \"{current.collection_scope}\"."
            )
            significant = True

        if processing_changed:
            reasons.append(
                f"Processing scope changed from \"{original.processing_scope}\" "
                f"to \"{current.processing_scope}\"."
            )
            significant = True

        if removed_purpose:
            reasons.append(f"Purpose(s) {_join(removed_purpose)} are no longer being processed (scope reduced).")
            minor = True

        if removed_data:
            reasons.append(f"Data categories {_join(removed_data)} are no longer being collected (scope reduced).")
            minor = True

        if version_changed and not significant:
            reasons.append(f"Consent version changed from {original.version} to {current.version}.")
            minor = True

        if significant:
            penalty = 15 * len(added_purpose) + 15 * len(added_data) + (10 if collection_changed else 0) + (10 if processing_changed else 0)
            score = max(15, 70 - penalty)
            return DriftResult(
                status=DRIFT_SIGNIFICANT,
                score=score,
                reasons=reasons,
                recommended_action="Obtain updated, explicit consent before continuing to process data under the new terms.",
                checks=checks,
                original_context=original.to_dict(),
                current_context=current.to_dict(),
            )

        if minor:
            return DriftResult(
                status=DRIFT_MINOR,
                score=85,
                reasons=reasons,
                recommended_action="Review the change. No new consent is strictly required, but the subject should be notified.",
                checks=checks,
                original_context=original.to_dict(),
                current_context=current.to_dict(),
            )

        return DriftResult(
            status=DRIFT_ALIGNED,
            score=100,
            reasons=["Current data processing matches the original consent."],
            recommended_action="No action required.",
            checks=checks,
            original_context=original.to_dict(),
            current_context=current.to_dict(),
        )


def _join(items: List[str]) -> str:
    labels = [item.replace("_", " ") for item in items]
    return ", ".join(labels)


def _fmt(epoch_ms: float) -> str:
    return time.strftime("%b %d, %Y", time.gmtime(epoch_ms / 1000))


# Singleton — mirrors ml/isolation_forest.py's `engine`
detector = DriftDetector()
