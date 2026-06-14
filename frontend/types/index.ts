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
