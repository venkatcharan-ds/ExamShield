'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck, ShieldAlert, ShieldOff, Shield,
  CheckCircle2, XCircle, History, RotateCcw, Loader2,
  ChevronDown, ChevronUp, Ban,
} from 'lucide-react'
import type { ConsentRecord, DriftSimulationScenario, DriftStatus, ProcessingAction, FirewallDecision } from '@/types'
import {
  grantConsent, getConsent, simulateDrift, reconsent, authorizeAction,
  DRIFT_META, DEMO_ACTIONS, FIREWALL_META,
} from '@/services/consentApi'

const EASE = [0.22, 1, 0.36, 1] as const

function humanize(token: string): string {
  return token.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function bumpVersion(v: string): string {
  const n = parseFloat(v)
  return Number.isNaN(n) ? `${v}.1` : `${Math.floor(n) + 1}.0`
}

function fmtDateTime(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

const STATUS_ICON: Record<DriftStatus, typeof ShieldCheck> = {
  ALIGNED: ShieldCheck,
  MINOR_DRIFT: ShieldAlert,
  SIGNIFICANT_DRIFT: ShieldAlert,
  CONSENT_INVALID: ShieldOff,
}

/* ─── Context list (Original / Current) ─────────────────────────────────── */
function ContextList({ label, record, which }: {
  label: string
  record: ConsentRecord
  which: 'original' | 'current'
}) {
  const ctx = which === 'original' ? record.original_context : record.current_context
  const changedPurpose = which === 'current'
    ? ctx.purpose.filter(p => !record.original_context.purpose.includes(p))
    : []
  const changedData = which === 'current'
    ? ctx.data_categories.filter(d => !record.original_context.data_categories.includes(d))
    : []

  return (
    <div className="flex-1 min-w-0">
      <div className="label mb-2.5">{label}</div>
      <ul className="space-y-1.5">
        {ctx.purpose.map(p => (
          <li key={`p-${p}`} className="flex items-start gap-2 text-[13px]" style={{ color: 'var(--text-1)' }}>
            <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{
              background: changedPurpose.includes(p) ? '#FB923C' : 'var(--text-3)',
            }} />
            <span>
              <span style={{ color: 'var(--text-3)' }}>Purpose: </span>
              <span style={{ color: changedPurpose.includes(p) ? '#FDBA74' : 'var(--text-1)' }}>{humanize(p)}</span>
            </span>
          </li>
        ))}
        {ctx.data_categories.map(d => (
          <li key={`d-${d}`} className="flex items-start gap-2 text-[13px]" style={{ color: 'var(--text-1)' }}>
            <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{
              background: changedData.includes(d) ? '#FB923C' : 'var(--text-3)',
            }} />
            <span>
              <span style={{ color: 'var(--text-3)' }}>Data: </span>
              <span style={{ color: changedData.includes(d) ? '#FDBA74' : 'var(--text-1)' }}>{humanize(d)}</span>
            </span>
          </li>
        ))}
        <li className="flex items-start gap-2 text-[13px]" style={{ color: 'var(--text-1)' }}>
          <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: 'var(--text-3)' }} />
          <span>
            <span style={{ color: 'var(--text-3)' }}>Scope: </span>
            {humanize(ctx.collection_scope)} · {humanize(ctx.processing_scope)}
          </span>
        </li>
        {which === 'original' ? (
          <>
            <li className="flex items-start gap-2 text-[13px]" style={{ color: 'var(--text-1)' }}>
              <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: 'var(--text-3)' }} />
              <span><span style={{ color: 'var(--text-3)' }}>Granted: </span>{fmtDate(record.granted_at)}</span>
            </li>
            <li className="flex items-start gap-2 text-[13px]" style={{ color: 'var(--text-1)' }}>
              <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: 'var(--text-3)' }} />
              <span><span style={{ color: 'var(--text-3)' }}>Expires: </span>{fmtDate(record.expires_at)}</span>
            </li>
          </>
        ) : null}
      </ul>
    </div>
  )
}

/* ─── Consent Boundary ───────────────────────────────────────────────────── */
function ConsentBoundary({ record }: { record: ConsentRecord }) {
  const boundary = record.original_context // the Consent Shadow — what was actually agreed to
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2.5">
        <Shield className="w-3.5 h-3.5" style={{ color: 'var(--text-3)' }} />
        <div className="label">Consent Boundary</div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <div className="text-[10.5px] font-semibold tracking-wide uppercase mb-1.5" style={{ color: 'var(--risk-green)' }}>Allowed</div>
          <ul className="space-y-1">
            {boundary.purpose.map(p => (
              <li key={`bp-${p}`} className="flex items-center gap-1.5 text-[12.5px]" style={{ color: 'var(--text-1)' }}>
                <CheckCircle2 className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--risk-green)' }} />
                {humanize(p)}
              </li>
            ))}
            {boundary.data_categories.map(d => (
              <li key={`bd-${d}`} className="flex items-center gap-1.5 text-[12.5px]" style={{ color: 'var(--text-1)' }}>
                <CheckCircle2 className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--risk-green)' }} />
                {humanize(d)}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-[10.5px] font-semibold tracking-wide uppercase mb-1.5" style={{ color: 'var(--risk-red)' }}>Not Authorized</div>
          {boundary.prohibited_data.length === 0 ? (
            <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>No explicit exclusions on this boundary.</p>
          ) : (
            <ul className="space-y-1">
              {boundary.prohibited_data.map(d => (
                <li key={`nd-${d}`} className="flex items-center gap-1.5 text-[12.5px]" style={{ color: 'var(--text-2)' }}>
                  <XCircle className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--risk-red)' }} />
                  {humanize(d)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Consent Firewall — test processing actions ────────────────────────── */
function FirewallControls({
  results, testing, lastAction, onTest, onRequestConsent, requesting,
}: {
  results: Record<string, FirewallDecision>
  testing: boolean
  lastAction: ProcessingAction | null
  onTest: (a: ProcessingAction) => void
  onRequestConsent: () => void
  requesting: boolean
}) {
  const lastResult = lastAction ? results[lastAction.action_name] : null

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2.5">
        <Ban className="w-3.5 h-3.5" style={{ color: 'var(--text-3)' }} />
        <div className="label">Test Processing Action</div>
      </div>
      <p className="text-[11px] mb-3" style={{ color: 'var(--text-3)' }}>
        Ask the Consent Firewall whether ExamShield is actually allowed to run each action right now.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {DEMO_ACTIONS.map(a => {
          const r = results[a.action_name]
          const m = r ? FIREWALL_META[r.decision] : null
          return (
            <button key={a.action_name} onClick={() => onTest(a)} disabled={testing}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-[11px] font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'var(--surface-3)',
                border: `1px solid ${m ? `${m.color}40` : 'var(--border-1)'}`,
                color: 'var(--text-1)',
              }}>
              <span>{a.label}</span>
              {m && <span style={{ color: m.color, flexShrink: 0 }}>{m.emoji}</span>}
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {lastAction && lastResult && (
          <motion.div key={lastAction.action_name + lastResult.decision}
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-3 px-3 py-2.5 rounded-lg text-[12.5px]"
            style={{
              background: `${FIREWALL_META[lastResult.decision].color}0F`,
              border: `1px solid ${FIREWALL_META[lastResult.decision].color}28`,
            }}>
            <div className="flex items-center gap-1.5 font-semibold mb-1" style={{ color: FIREWALL_META[lastResult.decision].color }}>
              {FIREWALL_META[lastResult.decision].emoji} {FIREWALL_META[lastResult.decision].label.toUpperCase()}
            </div>
            {lastResult.reasons.map((reason, i) => (
              <p key={i} style={{ color: 'var(--text-1)' }} className="mb-0.5">{reason}</p>
            ))}
            {lastResult.decision !== 'ALLOW' && (
              <button onClick={onRequestConsent} disabled={requesting}
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium disabled:opacity-50"
                style={{ background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(99,102,241,0.30)', color: '#A5B4FC' }}>
                {requesting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Request Updated Consent
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Drift checklist ────────────────────────────────────────────────────── */
function DriftChecklist({ record }: { record: ConsentRecord }) {
  return (
    <div>
      <div className="label mb-2.5">Drift Analysis</div>
      <ul className="space-y-1.5">
        {record.drift.checks.map(c => (
          <li key={c.label} className="flex items-center gap-2 text-[13px]">
            {c.passed
              ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--risk-green)' }} />
              : <XCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#FB923C' }} />}
            <span style={{ color: c.passed ? 'var(--text-1)' : '#FDBA74' }}>{c.label}</span>
          </li>
        ))}
      </ul>
      {record.drift.reasons.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {record.drift.reasons.map((r, i) => (
            <p key={i} className="text-[12px] leading-relaxed pl-3" style={{
              color: 'var(--text-2)',
              borderLeft: `2px solid ${DRIFT_META[record.drift.status].color}40`,
            }}>
              {r}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Consent timeline (audit trail) ─────────────────────────────────────── */
function ConsentTimeline({ record }: { record: ConsentRecord }) {
  const [expanded, setExpanded] = useState(false)
  const events = [...record.audit].reverse()
  const shown = expanded ? events : events.slice(0, 4)

  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <History className="w-3.5 h-3.5" style={{ color: 'var(--text-3)' }} />
          <div className="label">Consent Timeline</div>
        </div>
        {events.length > 4 && (
          <button onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-3)' }}>
            {expanded ? 'Show less' : `+${events.length - 4} more`}
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>
      <ul className="space-y-2.5">
        {shown.map(e => (
          <li key={e.id} className="flex items-start gap-2.5 text-[12px]">
            <div className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0" style={{ background: 'var(--brand)' }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span style={{ color: 'var(--text-1)' }}>{e.description}</span>
                <span className="font-mono tabnum flex-shrink-0" style={{ color: 'var(--text-3)' }}>
                  {fmtDateTime(e.timestamp)}
                </span>
              </div>
              {e.reason && (
                <p className="mt-0.5" style={{ color: 'var(--text-3)' }}>Reason: {e.reason}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ─── Simulate controls ──────────────────────────────────────────────────── */
const SIMULATIONS: { scenario: DriftSimulationScenario; label: string; description: string }[] = [
  { scenario: 'purpose_expansion', label: 'Expand purpose', description: 'Adds Behavioral Analytics to processing purpose' },
  { scenario: 'data_expansion', label: 'Add data category', description: 'Starts collecting Webcam Analysis' },
  { scenario: 'scope_change', label: 'Change processing scope', description: 'Switches to cross-session profiling' },
  { scenario: 'expire', label: 'Expire consent', description: 'Backdates expiry to simulate a lapsed consent' },
  { scenario: 'withdraw', label: 'Withdraw consent', description: 'Subject revokes consent immediately' },
]

function SimulateControls({ onRun, onReset, busy, canReset, locked }: {
  onRun: (s: DriftSimulationScenario) => void
  onReset: () => void
  busy: boolean
  canReset: boolean
  locked: boolean
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <div className="label">Simulate change (demo)</div>
        {canReset && (
          <button onClick={onReset} disabled={busy}
            className="flex items-center gap-1 text-[11px] disabled:opacity-40"
            style={{ color: 'var(--text-3)' }}>
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {SIMULATIONS.map(s => (
          <button key={s.scenario} onClick={() => onRun(s.scenario)} disabled={busy || locked}
            title={locked ? 'Consent is invalid — reset it before simulating further changes' : s.description}
            className="px-3 py-2 rounded-lg text-left text-[11px] font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--surface-3)', border: '1px solid var(--border-1)', color: 'var(--text-1)' }}>
            {s.label}
          </button>
        ))}
      </div>
      {locked && (
        <p className="text-[11px] mt-2" style={{ color: 'var(--text-3)' }}>
          Consent is invalid — reset it to try another scenario.
        </p>
      )}
    </div>
  )
}

/* ─── Panel ──────────────────────────────────────────────────────────────── */
export function ConsentPanel({ subjectId }: { subjectId: string | null }) {
  const [record, setRecord] = useState<ConsentRecord | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle')
  const [busy, setBusy] = useState(false)
  const [firewallResults, setFirewallResults] = useState<Record<string, FirewallDecision>>({})
  const [lastAction, setLastAction] = useState<ProcessingAction | null>(null)
  const [testingAction, setTestingAction] = useState(false)
  const [requestingConsent, setRequestingConsent] = useState(false)
  const loadedFor = useRef<string | null>(null)

  const load = useCallback(async (id: string) => {
    setStatus('loading')
    try {
      let rec: ConsentRecord
      try {
        rec = await getConsent(id)
      } catch {
        rec = await grantConsent(id)
      }
      setRecord(rec)
      setStatus('ready')
    } catch {
      setStatus('unavailable')
    }
  }, [])

  useEffect(() => {
    if (!subjectId) { setRecord(null); setStatus('idle'); loadedFor.current = null; return }
    if (loadedFor.current === subjectId) return
    loadedFor.current = subjectId
    load(subjectId)
  }, [subjectId, load])

  const runSimulation = useCallback(async (scenario: DriftSimulationScenario) => {
    if (!subjectId) return
    setBusy(true)
    try {
      const rec = await simulateDrift(subjectId, scenario)
      setRecord(rec)
    } catch { /* backend unavailable — no-op */ }
    setBusy(false)
  }, [subjectId])

  const reset = useCallback(async () => {
    if (!subjectId) return
    setBusy(true)
    try {
      const rec = await simulateDrift(subjectId, 'reset')
      setRecord(rec)
      setFirewallResults({})
      setLastAction(null)
    } catch { /* ignore */ }
    setBusy(false)
  }, [subjectId])

  const testAction = useCallback(async (action: ProcessingAction) => {
    if (!subjectId) return
    setLastAction(action)
    setTestingAction(true)
    try {
      const result = await authorizeAction(subjectId, action)
      setFirewallResults(prev => ({ ...prev, [action.action_name]: result }))
    } catch { /* backend unavailable — no-op */ }
    setTestingAction(false)
  }, [subjectId])

  const requestUpdatedConsent = useCallback(async () => {
    if (!subjectId || !record || !lastAction) return
    setRequestingConsent(true)
    try {
      const boundary = record.original_context
      const nextPurpose = Array.from(new Set([...boundary.purpose, lastAction.purpose]))
      const nextData = Array.from(new Set([...boundary.data_categories, ...lastAction.data_categories]))
      const nextProhibited = boundary.prohibited_data.filter(d => !lastAction.data_categories.includes(d) && d !== lastAction.purpose)
      const rec = await reconsent(subjectId, {
        purpose: nextPurpose,
        data_categories: nextData,
        prohibited_data: nextProhibited,
        version: bumpVersion(boundary.version),
      })
      setRecord(rec)
      const result = await authorizeAction(subjectId, lastAction)
      setFirewallResults(prev => ({ ...prev, [lastAction.action_name]: result }))
    } catch { /* backend unavailable — no-op */ }
    setRequestingConsent(false)
  }, [subjectId, record, lastAction])

  const meta = record ? DRIFT_META[record.drift.status] : null
  const StatusIcon = record ? STATUS_ICON[record.drift.status] : ShieldCheck

  return (
    <div className="rounded-2xl p-5"
      style={{
        background: meta
          ? `radial-gradient(ellipse at 50% 0%, ${meta.glow} 0%, rgba(4,6,14,0) 70%), var(--surface-1)`
          : 'var(--surface-1)',
        border: meta ? `1px solid ${meta.color}28` : '1px solid var(--border-0)',
      }}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <StatusIcon className="w-4 h-4" style={{ color: meta?.color ?? 'var(--text-3)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-0)' }}>Consent Status</h3>
        </div>
        {record && meta && (
          <motion.span key={record.drift.status}
            initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
            style={{ background: `${meta.color}18`, color: meta.color, border: `1px solid ${meta.color}30` }}>
            {meta.emoji} {meta.label}
          </motion.span>
        )}
      </div>
      <p className="text-[11px] mb-4" style={{ color: 'var(--text-3)' }}>
        Consent is not a one-time checkbox — this tracks whether current processing still matches what was originally agreed.
      </p>

      {status === 'unavailable' && (
        <div className="py-6 text-center">
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            Consent API unavailable — start the backend to see live consent lifecycle &amp; drift detection.
          </p>
        </div>
      )}

      {(status === 'idle') && !record && (
        <div className="py-6 text-center">
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>Run a session to initialize consent.</p>
        </div>
      )}

      {status === 'loading' && !record && (
        <div className="py-8 flex items-center justify-center">
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--text-3)' }} />
        </div>
      )}

      <AnimatePresence mode="wait">
        {record && (
          <motion.div key={subjectId}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-5">

            <p className="text-[13px] leading-relaxed px-3 py-2.5 rounded-lg" style={{
              background: `${meta!.color}0F`, border: `1px solid ${meta!.color}22`, color: 'var(--text-1)',
            }}>
              {record.drift.status === 'ALIGNED'
                ? 'Current data processing matches the original consent.'
                : record.drift.reasons[0]}
            </p>

            <div className="flex flex-col sm:flex-row gap-5">
              <ContextList label="Original Consent" record={record} which="original" />
              <ContextList label="Current Context" record={record} which="current" />
            </div>

            <div className="pt-1" style={{ borderTop: '1px solid var(--border-0)' }}>
              <div className="pt-4">
                <ConsentBoundary record={record} />
              </div>
            </div>

            <div className="pt-1" style={{ borderTop: '1px solid var(--border-0)' }}>
              <div className="pt-4">
                <FirewallControls
                  results={firewallResults}
                  testing={testingAction}
                  lastAction={lastAction}
                  onTest={testAction}
                  onRequestConsent={requestUpdatedConsent}
                  requesting={requestingConsent}
                />
              </div>
            </div>

            <DriftChecklist record={record} />

            {record.drift.status !== 'ALIGNED' && (
              <div className="text-[12px] px-3 py-2 rounded-lg" style={{
                background: 'var(--surface-3)', border: '1px solid var(--border-1)', color: 'var(--text-2)',
              }}>
                <span style={{ color: 'var(--text-1)', fontWeight: 500 }}>Recommended action: </span>
                {record.drift.recommended_action}
              </div>
            )}

            <ConsentTimeline record={record} />

            <div className="pt-1" style={{ borderTop: '1px solid var(--border-0)' }}>
              <div className="pt-4">
                <SimulateControls
                  onRun={runSimulation}
                  onReset={reset}
                  busy={busy}
                  canReset={record.drift.status !== 'ALIGNED'}
                  locked={record.drift.status === 'CONSENT_INVALID'}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
