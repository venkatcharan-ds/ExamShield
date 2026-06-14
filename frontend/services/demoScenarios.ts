import type { RiskAssessment, CandidateSession, TimelineEvent, BehaviorFeatures } from '@/types'

export type DemoScenario = 'normal' | 'suspicious' | 'cheating'

interface ScenarioStep {
  delay: number
  riskScore: number
  features: BehaviorFeatures
  events: Array<{ type: TimelineEvent['type']; description: string; severity: TimelineEvent['severity'] }>
}

const NORMAL_SCENARIO: ScenarioStep[] = [
  {
    delay: 0,
    riskScore: 8,
    features: { typing_speed: 62, average_key_interval: 145, key_variance: 18, mouse_activity: 3.2, idle_duration: 0.5, tab_switch_count: 0, copy_count: 0, paste_count: 0 },
    events: [{ type: 'exam_start', description: 'Exam session started', severity: 'info' }],
  },
  {
    delay: 2500,
    riskScore: 11,
    features: { typing_speed: 68, average_key_interval: 138, key_variance: 16, mouse_activity: 2.8, idle_duration: 0.3, tab_switch_count: 0, copy_count: 0, paste_count: 0 },
    events: [{ type: 'keydown', description: 'Steady typing rhythm detected', severity: 'info' }],
  },
  {
    delay: 5000,
    riskScore: 9,
    features: { typing_speed: 71, average_key_interval: 132, key_variance: 14, mouse_activity: 2.5, idle_duration: 0.2, tab_switch_count: 0, copy_count: 0, paste_count: 0 },
    events: [{ type: 'keydown', description: 'Consistent typing pattern — normal behavior', severity: 'info' }],
  },
  {
    delay: 8000,
    riskScore: 7,
    features: { typing_speed: 65, average_key_interval: 148, key_variance: 20, mouse_activity: 3.0, idle_duration: 1.2, tab_switch_count: 0, copy_count: 0, paste_count: 0 },
    events: [{ type: 'idle_start', description: 'Brief pause — reading question', severity: 'info' }],
  },
  {
    delay: 11000,
    riskScore: 12,
    features: { typing_speed: 60, average_key_interval: 155, key_variance: 22, mouse_activity: 2.9, idle_duration: 0.4, tab_switch_count: 0, copy_count: 0, paste_count: 0 },
    events: [{ type: 'idle_end', description: 'Resumed typing — all clear', severity: 'info' }],
  },
]

const SUSPICIOUS_SCENARIO: ScenarioStep[] = [
  {
    delay: 0,
    riskScore: 12,
    features: { typing_speed: 55, average_key_interval: 168, key_variance: 28, mouse_activity: 2.1, idle_duration: 0.8, tab_switch_count: 0, copy_count: 0, paste_count: 0 },
    events: [{ type: 'exam_start', description: 'Exam session started', severity: 'info' }],
  },
  {
    delay: 2000,
    riskScore: 28,
    features: { typing_speed: 22, average_key_interval: 380, key_variance: 94, mouse_activity: 1.2, idle_duration: 4.5, tab_switch_count: 0, copy_count: 0, paste_count: 0 },
    events: [{ type: 'idle_start', description: 'Extended pause detected — 4.5s idle', severity: 'warning' }],
  },
  {
    delay: 4500,
    riskScore: 44,
    features: { typing_speed: 18, average_key_interval: 490, key_variance: 142, mouse_activity: 0.8, idle_duration: 8.2, tab_switch_count: 1, copy_count: 0, paste_count: 0 },
    events: [
      { type: 'tab_switch', description: 'Tab switched out of exam window', severity: 'warning' },
      { type: 'focus_loss', description: 'Window focus lost', severity: 'warning' },
    ],
  },
  {
    delay: 7000,
    riskScore: 61,
    features: { typing_speed: 14, average_key_interval: 610, key_variance: 188, mouse_activity: 0.5, idle_duration: 12.1, tab_switch_count: 2, copy_count: 0, paste_count: 0 },
    events: [
      { type: 'tab_switch', description: 'Second tab switch in 3 minutes', severity: 'warning' },
      { type: 'focus_gain', description: 'Returned to exam window', severity: 'warning' },
    ],
  },
  {
    delay: 10000,
    riskScore: 57,
    features: { typing_speed: 35, average_key_interval: 260, key_variance: 76, mouse_activity: 1.8, idle_duration: 3.2, tab_switch_count: 2, copy_count: 0, paste_count: 0 },
    events: [{ type: 'keydown', description: 'Typing resumed but rhythm disrupted', severity: 'warning' }],
  },
]

const CHEATING_SCENARIO: ScenarioStep[] = [
  {
    delay: 0,
    riskScore: 14,
    features: { typing_speed: 58, average_key_interval: 160, key_variance: 24, mouse_activity: 2.8, idle_duration: 0.6, tab_switch_count: 0, copy_count: 0, paste_count: 0 },
    events: [{ type: 'exam_start', description: 'Exam session started', severity: 'info' }],
  },
  {
    delay: 2000,
    riskScore: 38,
    features: { typing_speed: 10, average_key_interval: 820, key_variance: 310, mouse_activity: 0.4, idle_duration: 14.8, tab_switch_count: 1, copy_count: 0, paste_count: 0 },
    events: [
      { type: 'tab_switch', description: 'Tab left exam window', severity: 'warning' },
      { type: 'idle_start', description: 'Typing completely stopped — 14.8s idle', severity: 'warning' },
    ],
  },
  {
    delay: 4000,
    riskScore: 67,
    features: { typing_speed: 8, average_key_interval: 1100, key_variance: 480, mouse_activity: 0.2, idle_duration: 22.3, tab_switch_count: 2, copy_count: 1, paste_count: 0 },
    events: [
      { type: 'copy', description: 'Copy event detected outside answer field', severity: 'critical' },
      { type: 'tab_switch', description: 'Multiple rapid tab switches', severity: 'critical' },
    ],
  },
  {
    delay: 6000,
    riskScore: 89,
    features: { typing_speed: 148, average_key_interval: 22, key_variance: 4, mouse_activity: 0.3, idle_duration: 0.1, tab_switch_count: 3, copy_count: 1, paste_count: 1 },
    events: [
      { type: 'paste', description: 'PASTE EVENT — Large text block inserted instantly', severity: 'critical' },
      { type: 'keydown', description: 'Typing speed spiked: 148 WPM (anomaly)', severity: 'critical' },
    ],
  },
  {
    delay: 9000,
    riskScore: 94,
    features: { typing_speed: 162, average_key_interval: 18, key_variance: 3, mouse_activity: 0.2, idle_duration: 0.0, tab_switch_count: 4, copy_count: 2, paste_count: 2 },
    events: [
      { type: 'paste', description: 'Second paste event — answer pattern inconsistent with prior writing', severity: 'critical' },
      { type: 'copy', description: 'Copy-paste pattern confirms external source', severity: 'critical' },
    ],
  },
]

export const SCENARIOS: Record<DemoScenario, ScenarioStep[]> = {
  normal: NORMAL_SCENARIO,
  suspicious: SUSPICIOUS_SCENARIO,
  cheating: CHEATING_SCENARIO,
}

export function getScenarioMeta(scenario: DemoScenario) {
  return {
    normal: {
      label: 'Normal Candidate',
      description: 'Steady typing, no suspicious behavior',
      color: '#22c55e',
      expectedRisk: '< 20',
    },
    suspicious: {
      label: 'Suspicious Candidate',
      description: 'Long pauses, tab switching detected',
      color: '#f59e0b',
      expectedRisk: '40–65',
    },
    cheating: {
      label: 'Cheating Candidate',
      description: 'Copy-paste, tab switch, typing anomaly',
      color: '#ef4444',
      expectedRisk: '85–95',
    },
  }[scenario]
}

export function buildInitialSession(
  scenarioType: DemoScenario,
  sessionId: string
): CandidateSession {
  const names: Record<DemoScenario, string> = {
    normal: 'Priya Sharma',
    suspicious: 'Rohan Mehta',
    cheating: 'Aditya Kumar',
  }
  return {
    session_id: sessionId,
    candidate_name: names[scenarioType],
    exam_status: 'active',
    current_risk_score: 0,
    risk_level: 'low',
    risk_history: [],
    timeline: [],
    features: null,
    started_at: Date.now(),
  }
}

export function getRiskLevel(score: number): 'low' | 'medium' | 'high' {
  if (score <= 30) return 'low'
  if (score <= 70) return 'medium'
  return 'high'
}

export function getRiskColor(score: number): string {
  if (score <= 30) return '#22c55e'
  if (score <= 70) return '#f59e0b'
  return '#ef4444'
}

export function getRiskLabel(score: number): string {
  if (score <= 30) return 'Low Risk'
  if (score <= 70) return 'Suspicious'
  return 'High Risk'
}
