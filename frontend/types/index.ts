// All shared types across the ExamShield application

export type RiskLevel = 'low' | 'medium' | 'high'

export interface BehaviorEvent {
  type:
    | 'keydown'
    | 'keyup'
    | 'mouse_move'
    | 'tab_switch'
    | 'copy'
    | 'paste'
    | 'idle_start'
    | 'idle_end'
    | 'focus_loss'
    | 'focus_gain'
  timestamp: number
  metadata?: Record<string, unknown>
}

export interface BehaviorSnapshot {
  session_id: string
  candidate_name: string
  events: BehaviorEvent[]
  window_start: number
  window_end: number
}

export interface BehaviorFeatures {
  typing_speed: number          // keystrokes per minute
  average_key_interval: number  // ms between keystrokes
  key_variance: number          // variance in keystroke intervals
  mouse_activity: number        // mouse events per second
  idle_duration: number         // seconds idle in last window
  tab_switch_count: number      // tab switches in last window
  copy_count: number            // copy events in last window
  paste_count: number           // paste events in last window
}

export interface RiskAssessment {
  session_id: string
  candidate_name: string
  risk_score: number            // 0–100
  risk_level: RiskLevel
  anomaly_score: number         // raw Isolation Forest output
  features: BehaviorFeatures
  timestamp: number
  triggered_flags: string[]
}

export interface TimelineEvent {
  id: string
  timestamp: number
  type: BehaviorEvent['type'] | 'risk_update' | 'exam_start'
  description: string
  severity: 'info' | 'warning' | 'critical'
}

export interface CandidateSession {
  session_id: string
  candidate_name: string
  exam_status: 'active' | 'completed' | 'flagged'
  current_risk_score: number
  risk_level: RiskLevel
  risk_history: { time: number; score: number }[]
  timeline: TimelineEvent[]
  features: BehaviorFeatures | null
  started_at: number
}

export type DemoScenario = 'normal' | 'suspicious' | 'cheating'

export interface WebSocketMessage {
  type: 'behavior_snapshot' | 'risk_update' | 'session_start' | 'ping'
  payload: BehaviorSnapshot | RiskAssessment | { session_id: string; candidate_name: string } | null
}

/* ─── Consent Lifecycle & Drift Detection ───────────────────────────────── */

export interface ConsentContext {
  purpose: string[]
  data_categories: string[]
  collection_scope: string
  processing_scope: string
  version: string
  prohibited_data: string[]
  allowed_actions: string[]
}

export type ConsentStatus = 'active' | 'withdrawn'

export interface ConsentAuditEvent {
  id: string
  timestamp: number
  event: string
  description: string
  previous_state: Record<string, unknown> | null
  new_state: Record<string, unknown> | null
  reason: string | null
}

export type DriftStatus = 'ALIGNED' | 'MINOR_DRIFT' | 'SIGNIFICANT_DRIFT' | 'CONSENT_INVALID'

export interface DriftCheck {
  label: string
  passed: boolean
}

export interface DriftResult {
  status: DriftStatus
  score: number
  reasons: string[]
  recommended_action: string
  checks: DriftCheck[]
  original_context: ConsentContext
  current_context: ConsentContext
}

export interface ConsentRecord {
  consent_id: string
  subject_id: string
  subject_type: string
  consent_type: string
  granted_at: number
  expires_at: number
  status: ConsentStatus
  withdrawn_at: number | null
  original_context: ConsentContext
  current_context: ConsentContext
  audit: ConsentAuditEvent[]
  drift: DriftResult
}

export type DriftSimulationScenario =
  | 'purpose_expansion'
  | 'data_expansion'
  | 'scope_change'
  | 'expire'
  | 'withdraw'
  | 'reset'

/* ─── Consent Firewall (boundary enforcement) ───────────────────────────── */

export type FirewallDecisionType = 'ALLOW' | 'REQUEST_RECONSENT' | 'BLOCK'

export interface FirewallDecision {
  subject_id: string
  action_name: string
  decision: FirewallDecisionType
  reasons: string[]
  required_action: string | null
}

export interface ProcessingAction {
  action_name: string
  label: string
  purpose: string
  data_categories: string[]
}

export interface BoundaryImpact {
  data_category: string
  active_consents: number
  unauthorized_count: number
  unauthorized_pct: number
}
