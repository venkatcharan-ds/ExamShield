// Thin REST client for the generic Consent Lifecycle + Drift Detection API.
// Talks to the same FastAPI backend as the WebSocket connections
// (NEXT_PUBLIC_API_URL). Every call can fail (backend asleep / demo-only
// mode) — callers are expected to handle rejection gracefully, same as the
// dashboard's WS connection already does.

import type { ConsentRecord, DriftSimulationScenario, FirewallDecision, BoundaryImpact, ProcessingAction } from '@/types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

async function req<T = ConsentRecord>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!res.ok) throw new Error(`consent api ${path} → ${res.status}`)
  return res.json()
}

// Default boundary used for the ExamShield demo — what a candidate is
// asked to agree to, and what's explicitly ruled out. This list lives
// here (the frontend), not in the generic engine, on purpose.
const DEFAULT_PROHIBITED_DATA = ['webcam', 'facial_recognition', 'behavioral_profiling', 'recruitment_profiling']

export function grantConsent(
  subjectId: string,
  opts?: Partial<{
    purpose: string[]
    data_categories: string[]
    collection_scope: string
    processing_scope: string
    duration_days: number
    version: string
    prohibited_data: string[]
    allowed_actions: string[]
  }>
): Promise<ConsentRecord> {
  return req('/api/consent/grant', {
    method: 'POST',
    body: JSON.stringify({
      subject_id: subjectId,
      subject_type: 'exam_session',
      consent_type: 'behavioral_monitoring',
      purpose: ['examination_integrity'],
      data_categories: ['keystroke_timing', 'mouse_movement', 'tab_switching'],
      collection_scope: 'session_only',
      processing_scope: 'real_time_risk_scoring',
      duration_days: 30,
      version: '1.0',
      prohibited_data: DEFAULT_PROHIBITED_DATA,
      allowed_actions: [],
      ...opts,
    }),
  })
}

export function getConsent(subjectId: string): Promise<ConsentRecord> {
  return req(`/api/consent/${encodeURIComponent(subjectId)}`)
}

export function simulateDrift(subjectId: string, scenario: DriftSimulationScenario): Promise<ConsentRecord> {
  return req(`/api/consent/${encodeURIComponent(subjectId)}/simulate`, {
    method: 'POST',
    body: JSON.stringify({ scenario }),
  })
}

export function withdrawConsent(subjectId: string, reason?: string): Promise<ConsentRecord> {
  return req(`/api/consent/${encodeURIComponent(subjectId)}/withdraw`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export function reconsent(
  subjectId: string,
  opts: Partial<{
    purpose: string[]
    data_categories: string[]
    prohibited_data: string[]
    allowed_actions: string[]
    version: string
  }>
): Promise<ConsentRecord> {
  return req('/api/consent/' + encodeURIComponent(subjectId) + '/reconsent', {
    method: 'POST',
    body: JSON.stringify(opts),
  })
}

export function authorizeAction(
  subjectId: string,
  action: { action_name: string; purpose: string; data_categories: string[] }
): Promise<FirewallDecision> {
  return req<FirewallDecision>(`/api/consent/${encodeURIComponent(subjectId)}/authorize`, {
    method: 'POST',
    body: JSON.stringify(action),
  })
}

export function getBoundaryImpact(dataCategory: string): Promise<BoundaryImpact> {
  return req<BoundaryImpact>(`/api/consent/_boundary-impact?data_category=${encodeURIComponent(dataCategory)}`)
}

// The demo action catalog — ExamShield-specific, lives entirely outside the
// generic firewall engine. Each entry is just a caller-supplied action the
// firewall evaluates against whatever consent boundary currently exists.
export const DEMO_ACTIONS: ProcessingAction[] = [
  { action_name: 'analyze_keystrokes', label: 'Analyze Keystrokes', purpose: 'examination_integrity', data_categories: ['keystroke_timing'] },
  { action_name: 'monitor_mouse', label: 'Monitor Mouse', purpose: 'examination_integrity', data_categories: ['mouse_movement'] },
  { action_name: 'detect_tab_switch', label: 'Detect Tab Switch', purpose: 'examination_integrity', data_categories: ['tab_switching'] },
  { action_name: 'start_webcam_analysis', label: 'Start Webcam Analysis', purpose: 'examination_integrity', data_categories: ['webcam'] },
  { action_name: 'behavioral_profiling', label: 'Behavioral Profiling', purpose: 'behavioral_profiling', data_categories: ['keystroke_timing', 'mouse_movement'] },
]

export const FIREWALL_META: Record<FirewallDecision['decision'], { emoji: string; label: string; color: string }> = {
  ALLOW: { emoji: '🟢', label: 'Allowed', color: '#22C55E' },
  REQUEST_RECONSENT: { emoji: '🟠', label: 'Needs Updated Consent', color: '#FB923C' },
  BLOCK: { emoji: '🔴', label: 'Blocked', color: '#EF4444' },
}

export const DRIFT_META: Record<
  ConsentRecord['drift']['status'],
  { emoji: string; label: string; color: string; glow: string }
> = {
  ALIGNED: { emoji: '🟢', label: 'Aligned', color: '#22C55E', glow: 'rgba(34,197,94,0.28)' },
  MINOR_DRIFT: { emoji: '🟡', label: 'Minor Drift', color: '#F59E0B', glow: 'rgba(245,158,11,0.26)' },
  SIGNIFICANT_DRIFT: { emoji: '🟠', label: 'Significant Drift', color: '#FB923C', glow: 'rgba(251,146,60,0.28)' },
  CONSENT_INVALID: { emoji: '🔴', label: 'Consent Invalid', color: '#EF4444', glow: 'rgba(239,68,68,0.30)' },
}
