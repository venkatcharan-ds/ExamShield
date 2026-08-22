"""
Consent Firewall — turns a consent record's original context into an
enforceable boundary, and decides whether a named processing action may
proceed against it.

Generic and reusable, exactly like ml/drift_detector.py: authorize() takes
a ConsentRecord plus a caller-described action (a name, a purpose, and the
data categories it touches) and returns a FirewallDecision. Nothing here
knows what "webcam" or "exam" mean — those are just tags a caller passes
in. ExamShield's own action catalog lives in the frontend, not here.

The boundary being enforced is `record.original_context` — the immutable
snapshot frozen at grant time (the "Consent Shadow": what the subject
actually agreed to). `record.current_context` is deliberately NOT what
gets checked — it's the system's self-reported *current* processing state
(mutated by /update), and treating it as authoritative would let a system
grant itself new permissions just by claiming to already be using them.
Only a fresh call to store.grant() — an explicit new consent period —
ever moves the boundary. That is what distinguishes "the system changed"
from "the subject explicitly approved a new scope."

Decisions:
  ALLOW              — the action is inside the active consent boundary.
  REQUEST_RECONSENT   — the action may be legitimate but touches purpose,
                        data, or an action name outside the current
                        boundary; nothing about it is explicitly forbidden.
  BLOCK               — consent is invalid (expired/withdrawn), or the
                        action touches something the subject explicitly
                        ruled out via `prohibited_data`.
"""

from dataclasses import dataclass
from typing import List

from models.consent import ConsentRecord
from ml.drift_detector import detector, DRIFT_INVALID

FIREWALL_ALLOW = "ALLOW"
FIREWALL_RECONSENT = "REQUEST_RECONSENT"
FIREWALL_BLOCK = "BLOCK"

_SEVERITY = {FIREWALL_ALLOW: 0, FIREWALL_RECONSENT: 1, FIREWALL_BLOCK: 2}


@dataclass
class FirewallDecision:
    decision: str
    reasons: List[str]
    required_action: str | None

    def to_dict(self) -> dict:
        return {
            "decision": self.decision,
            "reasons": self.reasons,
            "required_action": self.required_action,
        }


class ConsentFirewall:
    """Stateless — authorize() takes a record + action, returns a decision."""

    def authorize(
        self,
        record: ConsentRecord | None,
        action_name: str,
        purpose: str,
        data_categories: List[str],
    ) -> FirewallDecision:
        if record is None:
            return FirewallDecision(
                FIREWALL_BLOCK,
                ["No consent record exists for this subject."],
                "REQUEST_UPDATED_CONSENT",
            )

        drift = detector.evaluate(record)
        if drift.status == DRIFT_INVALID:
            return FirewallDecision(FIREWALL_BLOCK, drift.reasons, "REQUEST_UPDATED_CONSENT")

        boundary = record.original_context  # the Consent Shadow
        requested_tags = set(data_categories) | {purpose, action_name}
        prohibited_hit = sorted(requested_tags & set(boundary.prohibited_data))

        reasons: List[str] = []
        worst = FIREWALL_ALLOW

        if prohibited_hit:
            reasons.append(
                f"{_join(prohibited_hit)} {'is' if len(prohibited_hit) == 1 else 'are'} "
                f"explicitly outside the consent boundary."
            )
            worst = FIREWALL_BLOCK

        ungranted_data = sorted(set(data_categories) - set(boundary.data_categories) - set(prohibited_hit))
        if ungranted_data:
            reasons.append(f"{_join(ungranted_data)} was not part of the original consent boundary.")
            worst = _worse(worst, FIREWALL_RECONSENT)

        if purpose not in boundary.purpose and purpose not in prohibited_hit:
            reasons.append(f"Purpose \"{_label(purpose)}\" is not covered by the original consent boundary.")
            worst = _worse(worst, FIREWALL_RECONSENT)

        if boundary.allowed_actions and action_name not in boundary.allowed_actions and action_name not in prohibited_hit:
            reasons.append(f"Action \"{_label(action_name)}\" is not declared in the boundary's allowed actions.")
            worst = _worse(worst, FIREWALL_RECONSENT)

        if worst == FIREWALL_ALLOW:
            return FirewallDecision(FIREWALL_ALLOW, ["Action matches the active consent boundary."], None)

        return FirewallDecision(worst, reasons, "REQUEST_UPDATED_CONSENT")

    def boundary_impact(self, data_category: str) -> dict:
        """Live aggregate — NOT a prediction. Counts, over currently-active
        consent records, how many boundaries do not already cover a given
        data category. Plain arithmetic over real records; no model."""
        from models.consent import store as consent_store

        active = consent_store.all_active()
        total = len(active)
        if total == 0:
            return {"data_category": data_category, "active_consents": 0, "unauthorized_count": 0, "unauthorized_pct": 0}

        unauthorized = sum(
            1 for r in active
            if data_category not in r.original_context.data_categories
            or data_category in r.original_context.prohibited_data
        )
        return {
            "data_category": data_category,
            "active_consents": total,
            "unauthorized_count": unauthorized,
            "unauthorized_pct": round(100 * unauthorized / total, 1),
        }


def _worse(a: str, b: str) -> str:
    return a if _SEVERITY[a] >= _SEVERITY[b] else b


def _join(items: List[str]) -> str:
    return ", ".join(_label(i) for i in items)


def _label(tag: str) -> str:
    return tag.replace("_", " ")


# Singleton — mirrors ml/drift_detector.py's `detector`
firewall = ConsentFirewall()
