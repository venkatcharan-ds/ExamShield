'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import {
  Shield, Activity, AlertTriangle, CheckCircle, Clock,
  Users, WifiOff, Play, RotateCcw, ExternalLink, X,
  FileText, ChevronDown, ChevronUp, Pause, Search,
} from 'lucide-react'
import type { CandidateSession, TimelineEvent, DemoScenario } from '@/types'
import {
  SCENARIOS, buildInitialSession,
  getRiskColor, getRiskLabel, getRiskLevel, getScenarioMeta,
} from '@/services/demoScenarios'

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function toWsUrl(s: string) {
  return s.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://')
}
function mergeTimeline(a: TimelineEvent[], b: TimelineEvent[]) {
  const m = new Map<string, TimelineEvent>()
  ;[...a, ...b].forEach(e => m.set(e.id, e))
  return Array.from(m.values()).sort((x, y) => x.timestamp - y.timestamp).slice(-30)
}
function mergeHistory(
  a: { time: number; score: number }[],
  b: { time: number; score: number }[]
) {
  const m = new Map<number, { time: number; score: number }>()
  ;[...a, ...b].forEach(h => m.set(h.time, h))
  return Array.from(m.values()).sort((x, y) => x.time - y.time).slice(-60)
}

/* ─── Alert Banner ───────────────────────────────────────────────────────── */
function AlertBanner({
  score, name, onDismiss,
}: { score: number; name: string; onDismiss: () => void }) {
  return (
    /* pointer-events-none on wrapper so the banner shadow area doesn't block clicks below */
    <div className="pointer-events-none fixed top-16 inset-x-0 z-50 flex justify-center px-4">
      <motion.div
        className="pointer-events-auto alert-enter w-full max-w-lg"
        initial={{ opacity: 0, y: -16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.97, transition: { duration: 0.2 } }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{
            background: 'rgba(239,68,68,0.10)',
            border: '1px solid rgba(239,68,68,0.32)',
            boxShadow: '0 0 32px rgba(239,68,68,0.22)',
            backdropFilter: 'blur(16px)',
          }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(239,68,68,0.20)' }}>
            <AlertTriangle className="w-3.5 h-3.5" style={{ color: '#EF4444' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: '#FCA5A5' }}>
              High risk candidate detected
            </p>
            <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(252,165,165,0.60)' }}>
              {name} · Score {Math.round(score)} — immediate review recommended
            </p>
          </div>
          <button onClick={onDismiss}
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
            style={{ color: 'rgba(252,165,165,0.50)' }}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </div>
  )
}

/* ─── Risk Gauge ─────────────────────────────────────────────────────────── */
function RiskGauge({ score, level }: { score: number; level: string }) {
  const pct    = Math.min(100, Math.max(0, score))
  const color  = getRiskColor(score)
  const label  = getRiskLabel(score)
  const isHigh = level === 'high'
  const isMed  = level === 'medium'

  /* SVG semicircle geometry */
  const R  = 66
  const cx = 86
  const cy = 84
  const angleAt = (frac: number) => Math.PI * (1 - frac)
  const pt      = (frac: number) => ({
    x: cx + R * Math.cos(angleAt(frac)),
    y: cy - R * Math.sin(angleAt(frac)),
  })
  const start  = pt(0)
  const fillPt = pt(pct / 100)
  const large  = pct > 50 ? 1 : 0

  return (
    <div
      className={`rounded-2xl p-5 transition-all duration-700
                  ${isHigh ? 'risk-card-high' : isMed ? 'risk-card-medium glass' : 'glass'}`}
      style={isHigh ? { border: '1px solid rgba(239,68,68,0.22)' } : {}}>
      <div className="label mb-4">Risk level</div>
      <div className="flex flex-col items-center">
        <svg width="172" height="100" className="overflow-visible">
          {/* Track arc */}
          <path
            d={`M ${start.x} ${start.y} A ${R} ${R} 0 1 1 ${cx + R} ${cy}`}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="7"
            strokeLinecap="round"
          />
          {/* Fill arc — CSS transition handles color change */}
          {pct > 0 && (
            <path
              d={`M ${start.x} ${start.y} A ${R} ${R} 0 ${large} 1 ${fillPt.x} ${fillPt.y}`}
              fill="none"
              stroke={color}
              strokeWidth="7"
              strokeLinecap="round"
              style={{
                transition: 'stroke 0.6s ease, filter 0.6s ease',
                filter: `drop-shadow(0 0 ${isHigh ? 10 : 4}px ${color}${isHigh ? 'cc' : '66'})`,
              }}
            />
          )}
          {/* Score value */}
          <motion.text
            key={Math.round(pct / 3)}   /* trigger animation on meaningful score change */
            x={cx} y={cy - 5}
            textAnchor="middle"
            fill="white"
            fontSize="30"
            fontWeight="700"
            fontFamily="Inter"
            style={{ fontFeatureSettings: '"tnum" 1' }}
            initial={{ opacity: 0.4, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.30, ease: [0.22, 1, 0.36, 1] }}
          >
            {Math.round(pct)}
          </motion.text>
          <text x={cx} y={cy + 15}
            textAnchor="middle" fontSize="11" fontWeight="500"
            fill={color}
            style={{ transition: 'fill 0.5s ease' }}>
            {label}
          </text>
          {/* Scale labels */}
          <text x="14"       y={cy + 6} fill="rgba(255,255,255,0.18)" fontSize="9">0</text>
          <text x={cx*2-12}  y={cy + 6} fill="rgba(255,255,255,0.18)" fontSize="9">100</text>
        </svg>

        {/* Zone legend */}
        <div className="flex gap-3 mt-1.5">
          {[
            { c: 'var(--risk-green)', l: 'Normal (0–30)' },
            { c: 'var(--risk-amber)', l: 'Suspicious (31–70)' },
            { c: 'var(--risk-red)',   l: 'High Risk (71–100)' },
          ].map(z => (
            <div key={z.l} className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: z.c }} />
              <span className="text-[9px]" style={{ color: 'var(--text-3)' }}>{z.l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Event Timeline ─────────────────────────────────────────────────────── */
function Timeline({ events }: { events: TimelineEvent[] }) {
  const sorted = [...events].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10)

  if (!sorted.length) {
    return (
      <div className="text-center py-8 flex flex-col items-center gap-2">
        <Clock className="w-5 h-5" style={{ color: 'var(--text-3)', opacity: 0.5 }} />
        <p className="text-xs" style={{ color: 'var(--text-3)' }}>Run a scenario to see events</p>
      </div>
    )
  }

  const dotColor = (sev: string) =>
    ({ critical: 'var(--risk-red)', warning: 'var(--risk-amber)', info: 'var(--risk-green)' }[sev] ?? 'var(--text-3)')

  const bgBorder = (sev: string) => ({
    critical: { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.18)',  text: '#FCA5A5' },
    warning:  { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.18)', text: '#FCD34D' },
    info:     { bg: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.15)', text: '#6EE7B7' },
  }[sev] ?? { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)', text: 'var(--text-2)' })

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {sorted.map(ev => {
          const { bg, border, text } = bgBorder(ev.severity)
          const icon = ev.severity === 'critical'
            ? <AlertTriangle className="w-3 h-3" />
            : ev.severity === 'warning'
              ? <Activity className="w-3 h-3" />
              : <CheckCircle className="w-3 h-3" />
          return (
            <motion.div key={ev.id} layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="flex gap-2.5 items-start p-2.5 rounded-xl"
                style={{ background: bg, border: `1px solid ${border}` }}>
                <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ color: text, background: 'rgba(0,0,0,0.20)' }}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-snug" style={{ color: text }}>{ev.description}</p>
                  <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--text-3)' }}>
                    {new Date(ev.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

/* ─── Feature Stats ──────────────────────────────────────────────────────── */
function FeatureStats({ session }: { session: CandidateSession }) {
  const f = session.features
  if (!f) return (
    <div className="text-center py-5">
      <p className="text-xs" style={{ color: 'var(--text-3)' }}>Awaiting first 3-second window…</p>
    </div>
  )

  const rows = [
    { l: 'Typing speed',  v: `${Math.round(f.typing_speed)} kpm`, warn: f.typing_speed > 600 },
    { l: 'Key interval',  v: `${Math.round(f.average_key_interval)} ms`, warn: f.average_key_interval > 800 },
    { l: 'Tab switches',  v: String(f.tab_switch_count), warn: f.tab_switch_count >= 1 },
    { l: 'Paste events',  v: String(f.paste_count), warn: f.paste_count >= 1 },
    { l: 'Copy events',   v: String(f.copy_count), warn: f.copy_count >= 1 },
    { l: 'Idle time',     v: `${f.idle_duration.toFixed(1)} s`, warn: f.idle_duration > 8 },
  ]

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {rows.map(r => (
        <div key={r.l}
          className="px-3 py-2.5 rounded-xl flex items-center gap-2 transition-all duration-300"
          style={{
            background:  r.warn ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.025)',
            border:      `1px solid ${r.warn ? 'rgba(245,158,11,0.18)' : 'var(--border-0)'}`,
            borderLeft:  r.warn ? '2px solid rgba(245,158,11,0.55)' : undefined,
          }}>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] mb-0.5" style={{ color: 'var(--text-3)' }}>{r.l}</div>
            <div className="text-sm font-semibold font-mono tabnum"
              style={{ color: r.warn ? 'var(--risk-amber)' : 'var(--text-1)' }}>
              {r.v}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── Behavior Analysis Engine ───────────────────────────────────────────── */
interface AnalysisPattern {
  label: string
  detail: string
  severity: 'critical' | 'warning' | 'info'
}

function generateBehaviorAnalysis(session: CandidateSession): {
  patterns: AnalysisPattern[]
  assessment: string
  confidence: 'High' | 'Medium' | 'Low'
  status: string
} {
  const f = session.features
  const score = session.current_risk_score
  const timeline = session.timeline ?? []

  const patterns: AnalysisPattern[] = []

  if (f) {
    /* Tab switching */
    if (f.tab_switch_count >= 3) {
      patterns.push({
        label: 'Multiple exam window changes',
        detail: `Detected ${f.tab_switch_count} times during the session.`,
        severity: 'critical',
      })
    } else if (f.tab_switch_count >= 1) {
      patterns.push({
        label: 'Exam window change detected',
        detail: `Candidate left the exam window ${f.tab_switch_count} time${f.tab_switch_count > 1 ? 's' : ''}.`,
        severity: 'warning',
      })
    }

    /* Paste events */
    if (f.paste_count >= 2) {
      patterns.push({
        label: 'Repeated text insertion events',
        detail: `Detected ${f.paste_count} times. Large text blocks may indicate external content.`,
        severity: 'critical',
      })
    } else if (f.paste_count === 1) {
      patterns.push({
        label: 'Text insertion event detected',
        detail: 'A paste event was recorded during the session.',
        severity: 'warning',
      })
    }

    /* Copy events */
    if (f.copy_count >= 2) {
      patterns.push({
        label: 'Repeated copy operations',
        detail: `${f.copy_count} copy events suggest content extraction from the exam.`,
        severity: 'critical',
      })
    } else if (f.copy_count === 1) {
      patterns.push({
        label: 'Copy operation detected',
        detail: 'Content was copied during the examination session.',
        severity: 'warning',
      })
    }

    /* Typing speed anomaly — too fast (paste aftermath) */
    if (f.typing_speed > 120) {
      patterns.push({
        label: 'Abnormal typing velocity',
        detail: `Speed reached ${Math.round(f.typing_speed)} KPM — far above human baseline of 40–80 KPM.`,
        severity: 'critical',
      })
    }

    /* Extended idle */
    if (f.idle_duration > 15) {
      patterns.push({
        label: 'Prolonged inactivity period',
        detail: `Candidate was idle for ${f.idle_duration.toFixed(1)}s — may indicate off-screen activity.`,
        severity: 'warning',
      })
    } else if (f.idle_duration > 8) {
      patterns.push({
        label: 'Extended pause detected',
        detail: `${f.idle_duration.toFixed(1)}s idle period observed, above the normal threshold.`,
        severity: 'warning',
      })
    }

    /* Key interval anomaly */
    if (f.key_variance > 300) {
      patterns.push({
        label: 'Significant change in interaction pattern',
        detail: 'The recent activity differs markedly from the candidate\'s normal behavior.',
        severity: 'warning',
      })
    }
  }

  /* Timeline-derived patterns — deduplicate with feature patterns */
  const criticalTimelineEvents = timeline.filter(e => e.severity === 'critical')
  const hasPasteInTimeline     = criticalTimelineEvents.some(e => e.type === 'paste')
  if (hasPasteInTimeline && (!f || f.paste_count === 0)) {
    patterns.push({
      label: 'Text insertion event detected',
      detail: 'A paste event was recorded during the session.',
      severity: 'critical',
    })
  }

  /* If no anomalies, show normal pattern */
  if (patterns.length === 0) {
    patterns.push({
      label: 'Consistent interaction pattern',
      detail: 'Typing rhythm, pacing, and focus remain within expected ranges.',
      severity: 'info',
    })
  }

  /* Assessment and confidence */
  let assessment: string
  let confidence: 'High' | 'Medium' | 'Low'
  let status: string

  if (score >= 71) {
    assessment = 'This examination session contains multiple integrity concerns and should be reviewed by an examiner before results are accepted.'
    confidence = patterns.length >= 3 ? 'High' : 'Medium'
    status = 'Requires Immediate Review'
  } else if (score >= 31) {
    assessment = 'Some behavioral anomalies were detected. A secondary review is recommended before finalising the results.'
    confidence = 'Medium'
    status = 'Requires Review'
  } else {
    assessment = 'No significant integrity concerns were identified. The candidate\'s behavior aligns with expected examination patterns.'
    confidence = 'High'
    status = 'Session Cleared'
  }

  return { patterns, assessment, confidence, status }
}

/* ─── Behavior Analysis Report Card ─────────────────────────────────────── */
function BehaviorAnalysisReport({ session }: { session: CandidateSession | null }) {
  const [expanded, setExpanded] = useState(true)

  if (!session || !session.features) {
    return (
      <div className="rounded-2xl p-5"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border-0)' }}>
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-3.5 h-3.5" style={{ color: 'var(--text-3)' }} />
          <div className="label">Behavior Analysis Report</div>
        </div>
        <p className="text-xs mt-3 text-center py-4" style={{ color: 'var(--text-3)' }}>
          Run a scenario to generate the analysis report.
        </p>
      </div>
    )
  }

  const { patterns, assessment, confidence, status } = generateBehaviorAnalysis(session)
  const score = session.current_risk_score

  const statusColor =
    score >= 71 ? '#EF4444' :
    score >= 31 ? '#F59E0B' : '#22C55E'

  const confidenceBg =
    confidence === 'High'   ? 'rgba(34,197,94,0.10)'  :
    confidence === 'Medium' ? 'rgba(245,158,11,0.10)' : 'rgba(255,255,255,0.06)'
  const confidenceColor =
    confidence === 'High'   ? '#6EE7B7' :
    confidence === 'Medium' ? '#FCD34D' : 'var(--text-2)'

  const sevIcon = (sev: AnalysisPattern['severity']) =>
    sev === 'critical' ? '⛔' : sev === 'warning' ? '⚠' : '✓'

  const sevColor = (sev: AnalysisPattern['severity']) =>
    sev === 'critical' ? { bg: 'rgba(239,68,68,0.07)', border: 'rgba(239,68,68,0.18)', text: '#FCA5A5', badge: 'rgba(239,68,68,0.15)', badgeText: '#FCA5A5' } :
    sev === 'warning'  ? { bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.18)', text: '#FCD34D', badge: 'rgba(245,158,11,0.15)', badgeText: '#FCD34D' } :
                         { bg: 'rgba(34,197,94,0.06)',  border: 'rgba(34,197,94,0.15)',  text: '#6EE7B7', badge: 'rgba(34,197,94,0.12)',  badgeText: '#6EE7B7' }

  return (
    <motion.div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(4,6,14,0.70)',
        border: `1px solid ${statusColor}28`,
        boxShadow: `0 0 32px ${statusColor}10`,
        backdropFilter: 'blur(24px)',
      }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-5 py-4"
        style={{ borderBottom: expanded ? `1px solid ${statusColor}18` : 'none' }}
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: `${statusColor}18`, border: `1px solid ${statusColor}28` }}>
            <FileText className="w-3.5 h-3.5" style={{ color: statusColor }} />
          </div>
          <div className="text-left">
            <div className="text-xs font-semibold tracking-wider uppercase"
              style={{ color: statusColor, opacity: 0.75, letterSpacing: '0.08em' }}>
              Behavior Analysis Report
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>
              {session.candidate_name} · {patterns.length} signal{patterns.length !== 1 ? 's' : ''} detected
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}28` }}>
            {status}
          </span>
          {expanded
            ? <ChevronUp className="w-3.5 h-3.5" style={{ color: 'var(--text-3)' }} />
            : <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--text-3)' }} />
          }
        </div>
      </button>

      {/* Body */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="px-5 py-4 space-y-3">

              {/* Candidate info row */}
              <div className="flex items-center justify-between pb-3"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div>
                  <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-3)' }}>
                    Candidate
                  </div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-0)' }}>
                    {session.candidate_name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-3)' }}>
                    Current Status
                  </div>
                  <div className="text-sm font-medium" style={{ color: statusColor }}>
                    {status}
                  </div>
                </div>
              </div>

              {/* Patterns */}
              <div>
                <div className="text-[10px] uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-3)' }}>
                  Observed Patterns
                </div>
                <div className="space-y-2">
                  {patterns.map((p, i) => {
                    const c = sevColor(p.severity)
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.25, delay: i * 0.06 }}
                        className="flex gap-3 items-start p-3 rounded-xl"
                        style={{ background: c.bg, border: `1px solid ${c.border}` }}
                      >
                        <span className="text-sm flex-shrink-0 mt-0.5">{sevIcon(p.severity)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold" style={{ color: c.text }}>
                              {p.label}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium capitalize"
                              style={{ background: c.badge, color: c.badgeText }}>
                              {p.severity}
                            </span>
                          </div>
                          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-3)' }}>
                            {p.detail}
                          </p>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>

              {/* Assessment */}
              <div className="pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>
                  Overall Assessment
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
                  {assessment}
                </p>
              </div>

              {/* Confidence footer */}
              <div className="flex items-center justify-between pt-2"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                  Confidence
                </span>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                  style={{ background: confidenceBg, color: confidenceColor }}>
                  {confidence}
                </span>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ─── Session Review Modal ───────────────────────────────────────────────── */

/** A unified playback entry — either a timeline event or a risk checkpoint */
interface PlayEntry {
  relMs: number          // ms from session start (normalised)
  kind: 'event' | 'risk'
  event?: TimelineEvent
  riskScore?: number
  label: string
  severity: 'info' | 'warning' | 'critical' | 'risk'
}

const REPLAY_DURATION_MS = 20_000   // fixed 20-second replay window

function buildPlayEntries(session: CandidateSession): { entries: PlayEntry[]; totalMs: number } {
  const allTs = [
    ...session.timeline.map(e => e.timestamp),
    ...session.risk_history.map(h => h.time),
  ]
  if (!allTs.length) return { entries: [], totalMs: 0 }

  const origin = Math.min(...allTs)
  const end    = Math.max(...allTs)
  const span   = Math.max(end - origin, 1)

  /* Normalise all timestamps to a 0–REPLAY_DURATION_MS window */
  const norm = (t: number) => ((t - origin) / span) * REPLAY_DURATION_MS

  const entries: PlayEntry[] = []

  /* Seed: exam start */
  entries.push({
    relMs: 0,
    kind: 'event',
    label: 'Examination session started',
    severity: 'info',
  })

  session.timeline
    .filter(e => e.type !== 'exam_start')   // avoid duplicate start entry
    .forEach(e => {
      entries.push({
        relMs: norm(e.timestamp),
        kind: 'event',
        event: e,
        label: e.description,
        severity: e.severity,
      })
    })

  session.risk_history.forEach(h => {
    entries.push({
      relMs: norm(h.time),
      kind: 'risk',
      riskScore: h.score,
      label: `Integrity score updated → ${Math.round(h.score)}`,
      severity: 'risk',
    })
  })

  entries.sort((a, b) => a.relMs - b.relMs)
  return { entries, totalMs: REPLAY_DURATION_MS }
}

function SessionReviewModal({
  session, onClose,
}: { session: CandidateSession; onClose: () => void }) {
  const { entries, totalMs } = buildPlayEntries(session)

  const [playheadMs, setPlayheadMs] = useState(0)
  const [playing,    setPlaying]    = useState(false)
  const [finished,   setFinished]   = useState(false)
  const tickRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const TICK_MS  = 80   // interval resolution

  /* ── Playback engine ── */
  const stopTick = () => { if (tickRef.current) clearInterval(tickRef.current) }

  const startPlay = useCallback(() => {
    if (finished) {
      setPlayheadMs(0)
      setFinished(false)
    }
    setPlaying(true)
  }, [finished])

  const pause = () => { setPlaying(false); stopTick() }

  const restart = () => {
    stopTick()
    setPlayheadMs(0)
    setFinished(false)
    setPlaying(true)
  }

  useEffect(() => {
    if (!playing) { stopTick(); return }
    tickRef.current = setInterval(() => {
      setPlayheadMs(prev => {
        const next = prev + TICK_MS
        if (next >= totalMs) {
          stopTick()
          setPlaying(false)
          setFinished(true)
          return totalMs
        }
        return next
      })
    }, TICK_MS)
    return stopTick
  }, [playing, totalMs])

  useEffect(() => () => stopTick(), [])

  /* Auto-start on open */
  useEffect(() => { if (totalMs > 0) setPlaying(true) }, [totalMs])

  /* ── Derived ── */
  const visibleEntries = entries.filter(e => e.relMs <= playheadMs)
  const progressPct    = totalMs > 0 ? (playheadMs / totalMs) * 100 : 0

  /* Current risk from the latest risk entry visible */
  const latestRisk = [...visibleEntries].reverse().find(e => e.kind === 'risk')
  const currentRiskScore = latestRisk?.riskScore ?? 0
  const currentRiskColor = getRiskColor(currentRiskScore)

  /* Accumulated risk sparkline data */
  const sparkData = visibleEntries
    .filter(e => e.kind === 'risk')
    .map((e, i) => ({ t: i, score: Math.round(e.riskScore ?? 0) }))

  /* Elapsed display time */
  const elapsed = playheadMs / 1000
  const totalSec = totalMs / 1000
  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  }

  const sevStyle = (sev: PlayEntry['severity']) => {
    if (sev === 'critical') return { dot: '#EF4444', text: '#FCA5A5', bg: 'rgba(239,68,68,0.07)', border: 'rgba(239,68,68,0.18)' }
    if (sev === 'warning')  return { dot: '#F59E0B', text: '#FCD34D', bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.18)' }
    if (sev === 'risk')     return { dot: currentRiskColor, text: 'var(--text-2)', bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.07)' }
    return { dot: '#22C55E', text: '#6EE7B7', bg: 'rgba(34,197,94,0.05)', border: 'rgba(34,197,94,0.14)' }
  }

  const sevIcon = (sev: PlayEntry['severity']) =>
    sev === 'critical' ? <AlertTriangle className="w-3 h-3" /> :
    sev === 'warning'  ? <Activity      className="w-3 h-3" /> :
    sev === 'risk'     ? <Activity      className="w-3 h-3" /> :
                         <CheckCircle   className="w-3 h-3" />

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-6"
      style={{ background: 'rgba(2,4,10,0.88)', backdropFilter: 'blur(12px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(8,12,24,0.97)',
          border: '1px solid rgba(255,255,255,0.09)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.60)',
        }}
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.28)' }}>
              <Search className="w-4 h-4" style={{ color: '#818CF8' }} />
            </div>
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--text-0)' }}>
                Examination Session Review
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                {session.candidate_name} · {entries.length} recorded events
              </div>
            </div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-3)', border: '1px solid var(--border-0)' }}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── Risk summary strip ── */}
        <div className="flex items-center gap-4 px-6 py-3 flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div>
            <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-3)' }}>
              Live Risk
            </div>
            <motion.div
              key={Math.round(currentRiskScore)}
              initial={{ opacity: 0.5, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-xl font-bold tabnum"
              style={{ color: currentRiskColor }}
            >
              {Math.round(currentRiskScore)}
            </motion.div>
          </div>
          <div className="flex-1 h-10">
            {sparkData.length >= 2 ? (
              <ResponsiveContainer width="100%" height={40}>
                <AreaChart data={sparkData} margin={{ top: 2, right: 2, left: 0, bottom: 2 }}>
                  <defs>
                    <linearGradient id="reviewGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={currentRiskColor} stopOpacity={0.30} />
                      <stop offset="100%" stopColor={currentRiskColor} stopOpacity={0.00} />
                    </linearGradient>
                  </defs>
                  <YAxis domain={[0, 100]} hide />
                  <Area type="monotone" dataKey="score"
                    stroke={currentRiskColor} strokeWidth={1.5}
                    fill="url(#reviewGrad)" dot={false}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center">
                <div className="w-full h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-3)' }}>
              Status
            </div>
            <div className="text-xs font-medium" style={{ color: currentRiskColor }}>
              {getRiskLabel(currentRiskScore)}
            </div>
          </div>
        </div>

        {/* ── Progress bar ── */}
        <div className="px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>

          {/* Timeline scrubber */}
          <div className="relative h-1.5 rounded-full mb-3 overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.08)' }}>
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ background: currentRiskColor, width: `${progressPct}%` }}
              transition={{ duration: 0.08 }}
            />
            {/* Event markers */}
            {entries.map((e, i) => (
              <div key={i}
                className="absolute top-1/2 -translate-y-1/2 w-1 h-1 rounded-full"
                style={{
                  left: `${(e.relMs / totalMs) * 100}%`,
                  background: sevStyle(e.severity).dot,
                  opacity: e.relMs <= playheadMs ? 0.9 : 0.25,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            ))}
          </div>

          {/* Time labels + controls */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono tabnum" style={{ color: 'var(--text-3)' }}>
              {fmt(elapsed)}
            </span>

            {/* Playback controls */}
            <div className="flex items-center gap-2">
              <button onClick={restart}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  color: 'var(--text-2)',
                }}>
                <RotateCcw className="w-3 h-3" />
              </button>
              <button onClick={playing ? pause : startPlay}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
                style={{
                  background: playing ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.22)',
                  border: '1px solid rgba(99,102,241,0.30)',
                  color: '#818CF8',
                }}>
                {playing
                  ? <><Pause className="w-3 h-3" /> Pause</>
                  : finished
                    ? <><RotateCcw className="w-3 h-3" /> Replay</>
                    : <><Play className="w-3 h-3" /> Play</>
                }
              </button>
            </div>

            <span className="text-[11px] font-mono tabnum" style={{ color: 'var(--text-3)' }}>
              {fmt(totalSec)}
            </span>
          </div>
        </div>

        {/* ── Timeline entries ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.10) transparent' }}>

          {visibleEntries.length === 0 && (
            <div className="text-center py-12">
              <Clock className="w-6 h-6 mx-auto mb-2 opacity-20" style={{ color: 'var(--text-3)' }} />
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>Playback starting…</p>
            </div>
          )}

          <AnimatePresence initial={false}>
            {visibleEntries.map((entry, i) => {
              const s = sevStyle(entry.severity)
              const isLatest = i === visibleEntries.length - 1
              const wallTime = new Date(
                session.started_at + entry.relMs * ((session.risk_history[0]
                  ? (Math.max(...session.risk_history.map(h => h.time)) - Math.min(...session.risk_history.map(h => h.time)))
                  : REPLAY_DURATION_MS) / REPLAY_DURATION_MS)
              ).toLocaleTimeString()

              return (
                <motion.div
                  key={`${entry.relMs}-${i}`}
                  layout
                  initial={{ opacity: 0, x: -12, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: 'auto' }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div
                    className="flex gap-3 items-start p-3 rounded-xl transition-all duration-300"
                    style={{
                      background: isLatest && playing ? s.bg : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isLatest && playing ? s.border : 'rgba(255,255,255,0.05)'}`,
                      boxShadow: isLatest && playing ? `0 0 12px ${s.dot}18` : 'none',
                    }}
                  >
                    {/* Dot + vertical line */}
                    <div className="flex flex-col items-center gap-1 mt-0.5 flex-shrink-0">
                      <div className="w-5 h-5 rounded-md flex items-center justify-center"
                        style={{ background: `${s.dot}18`, color: s.dot }}>
                        {sevIcon(entry.severity)}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium leading-snug" style={{ color: s.text }}>
                          {entry.label}
                        </span>
                        {isLatest && playing && (
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse"
                            style={{ background: s.dot }} />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono" style={{ color: 'var(--text-3)' }}>
                          {fmt(entry.relMs / 1000)}
                        </span>
                        {entry.kind === 'risk' && entry.riskScore !== undefined && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                            style={{
                              background: `${getRiskColor(entry.riskScore)}18`,
                              color: getRiskColor(entry.riskScore),
                            }}>
                            Risk: {Math.round(entry.riskScore)}
                          </span>
                        )}
                        {entry.event?.severity && entry.kind === 'event' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded capitalize font-medium"
                            style={{ background: `${s.dot}15`, color: s.dot }}>
                            {entry.event.severity}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {/* Finished banner */}
          {finished && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2 py-4 rounded-xl mt-2"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}>
              <CheckCircle className="w-3.5 h-3.5" style={{ color: '#6EE7B7' }} />
              <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                Session replay complete — {entries.length} events reviewed
              </span>
            </motion.div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-3 flex items-center justify-between flex-shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-3">
            {[
              { dot: '#22C55E', label: 'Normal' },
              { dot: '#F59E0B', label: 'Suspicious' },
              { dot: '#EF4444', label: 'Critical' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: l.dot }} />
                <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{l.label}</span>
              </div>
            ))}
          </div>
          <span className="text-[10px]" style={{ color: 'var(--text-3)', opacity: 0.5 }}>
            {Math.round(progressPct)}% reviewed
          </span>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ─── Demo Controls ──────────────────────────────────────────────────────── */
function DemoControls({
  onRun, active, running,
}: { onRun: (s: DemoScenario) => void; active: DemoScenario | null; running: boolean }) {
  const scenarios: DemoScenario[] = ['normal', 'suspicious', 'cheating']

  return (
    <div className="space-y-2">
      {scenarios.map(scenario => {
        const meta    = getScenarioMeta(scenario)
        const isActive = active === scenario && running

        return (
          <button key={scenario} onClick={() => onRun(scenario)} disabled={running}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left
                       transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: isActive ? 'rgba(255,255,255,0.04)' : 'transparent',
              border:     `1px solid ${isActive ? 'rgba(255,255,255,0.12)' : 'var(--border-0)'}`,
            }}>
            <div className="w-2 h-2 rounded-full flex-shrink-0 transition-all duration-300"
              style={{
                background: meta.color,
                boxShadow:  isActive ? `0 0 8px ${meta.color}` : 'none',
              }} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium" style={{ color: 'var(--text-0)' }}>
                {meta.label}
              </div>
              <div className="text-[11px] truncate" style={{ color: 'var(--text-3)' }}>
                {meta.description}
                <span className="ml-2 font-mono" style={{ color: meta.color, opacity: 0.7 }}>
                  ({meta.expectedRisk})
                </span>
              </div>
            </div>
            {isActive
              ? <Activity className="w-3.5 h-3.5 animate-pulse flex-shrink-0" style={{ color: 'var(--text-2)' }} />
              : <Play className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-3)' }} />
            }
          </button>
        )
      })}
    </div>
  )
}

/* ─── Integrity Index ────────────────────────────────────────────────────── */
interface IntegrityTier {
  min: number
  max: number
  label: string
  color: string
  glow: string
  explanation: string
}

const INTEGRITY_TIERS: IntegrityTier[] = [
  {
    min: 85, max: 100,
    label: 'Verified Session',
    color: '#22C55E',
    glow: 'rgba(34,197,94,0.28)',
    explanation: 'Behavioral patterns are consistent and within expected norms. This session presents no integrity concerns.',
  },
  {
    min: 60, max: 84,
    label: 'Minor Concerns',
    color: '#84CC16',
    glow: 'rgba(132,204,22,0.22)',
    explanation: 'Isolated anomalies detected but insufficient to indicate deliberate misconduct. Standard review advised.',
  },
  {
    min: 30, max: 59,
    label: 'Requires Review',
    color: '#F59E0B',
    glow: 'rgba(245,158,11,0.26)',
    explanation: 'Multiple behavioral signals deviate from the candidate\'s baseline. Examiner review is recommended.',
  },
  {
    min: 0, max: 29,
    label: 'Integrity Compromised',
    color: '#EF4444',
    glow: 'rgba(239,68,68,0.30)',
    explanation: 'Significant integrity violations detected. This session should be escalated for formal review.',
  },
]

function getIntegrityTier(index: number): IntegrityTier {
  return INTEGRITY_TIERS.find(t => index >= t.min && index <= t.max) ?? INTEGRITY_TIERS[3]
}

function IntegrityIndexCard({ riskScore, hasSession }: { riskScore: number; hasSession: boolean }) {
  const index = Math.round(Math.max(0, Math.min(100, 100 - riskScore)))
  const tier  = getIntegrityTier(index)

  /* SVG semicircle — identical geometry to RiskGauge for visual coherence */
  const R  = 54
  const cx = 70
  const cy = 68
  const angleAt = (frac: number) => Math.PI * (1 - frac)
  const pt = (frac: number) => ({
    x: cx + R * Math.cos(angleAt(frac)),
    y: cy - R * Math.sin(angleAt(frac)),
  })
  const pct   = index / 100
  const start = pt(0)
  const fillPt = pt(pct)
  const large  = pct > 0.5 ? 1 : 0

  /* Tier segment boundaries on the arc track */
  const tiers = [
    { end: 0.29, color: 'rgba(239,68,68,0.45)'  },
    { end: 0.59, color: 'rgba(245,158,11,0.38)' },
    { end: 0.84, color: 'rgba(132,204,22,0.35)' },
    { end: 1.00, color: 'rgba(34,197,94,0.35)'  },
  ]

  return (
    <div
      className="rounded-2xl p-5 transition-all duration-700"
      style={{
        background: hasSession
          ? `radial-gradient(ellipse at 50% 0%, ${tier.glow} 0%, rgba(4,6,14,0) 70%), var(--surface-1)`
          : 'var(--surface-1)',
        border: hasSession
          ? `1px solid ${tier.color}28`
          : '1px solid var(--border-0)',
      }}
    >
      {/* Card header */}
      <div className="flex items-center justify-between mb-4">
        <div className="label">Integrity Index</div>
        {hasSession && (
          <motion.span
            key={tier.label}
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: `${tier.color}18`,
              color: tier.color,
              border: `1px solid ${tier.color}30`,
            }}
          >
            {tier.label}
          </motion.span>
        )}
      </div>

      {hasSession ? (
        <>
          {/* Arc + score */}
          <div className="flex items-center gap-4">
            <svg width="140" height="82" className="flex-shrink-0 overflow-visible">
              {/* Segmented track */}
              {tiers.map((seg, i) => {
                const prev = i === 0 ? 0 : tiers[i - 1].end
                const sp = pt(prev)
                const ep = pt(seg.end)
                const lg = (seg.end - prev) > 0.5 ? 1 : 0
                return (
                  <path key={i}
                    d={`M ${sp.x} ${sp.y} A ${R} ${R} 0 ${lg} 1 ${ep.x} ${ep.y}`}
                    fill="none" stroke={seg.color} strokeWidth="6" strokeLinecap="butt"
                  />
                )
              })}
              {/* Active fill */}
              {pct > 0 && (
                <motion.path
                  d={`M ${start.x} ${start.y} A ${R} ${R} 0 ${large} 1 ${fillPt.x} ${fillPt.y}`}
                  fill="none"
                  stroke={tier.color}
                  strokeWidth="6"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                  style={{ filter: `drop-shadow(0 0 6px ${tier.color}99)` }}
                />
              )}
              {/* Index number */}
              <motion.text
                key={index}
                x={cx} y={cy - 4}
                textAnchor="middle"
                fill="white"
                fontSize="26"
                fontWeight="700"
                fontFamily="Inter"
                style={{ fontFeatureSettings: '"tnum" 1' }}
                initial={{ opacity: 0.3, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                {index}
              </motion.text>
              <text x={cx} y={cy + 13}
                textAnchor="middle" fontSize="9" fontWeight="500"
                fill={tier.color}
                style={{ transition: 'fill 0.5s ease' }}>
                / 100
              </text>
              {/* Scale labels */}
              <text x="10"      y={cy + 5} fill="rgba(255,255,255,0.18)" fontSize="8">0</text>
              <text x={cx*2-14} y={cy + 5} fill="rgba(255,255,255,0.18)" fontSize="8">100</text>
            </svg>

            {/* Explanation */}
            <div className="flex-1 min-w-0">
              <motion.p
                key={tier.label}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 }}
                className="text-[11px] leading-relaxed"
                style={{ color: 'var(--text-3)' }}
              >
                {tier.explanation}
              </motion.p>
            </div>
          </div>

          {/* Tier legend bar */}
          <div className="mt-4 space-y-1.5">
            <div className="flex rounded-lg overflow-hidden h-1.5">
              {INTEGRITY_TIERS.slice().reverse().map(t => (
                <div key={t.label}
                  className="flex-1 transition-all duration-500"
                  style={{
                    background: index >= t.min ? t.color : `${t.color}28`,
                  }} />
              ))}
            </div>
            <div className="flex justify-between">
              {['0', '30', '60', '85', '100'].map(v => (
                <span key={v} className="text-[9px] font-mono" style={{ color: 'rgba(255,255,255,0.18)' }}>
                  {v}
                </span>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-0)' }}>
            <Shield className="w-5 h-5 opacity-20" style={{ color: 'var(--text-3)' }} />
          </div>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>No active session</p>
          <p className="text-[11px] mt-1" style={{ color: 'var(--text-3)', opacity: 0.55 }}>
            Run a scenario to calculate
          </p>
        </div>
      )}
    </div>
  )
}

/* ─── useCountUp hook ────────────────────────────────────────────────────── */
function useCountUp(target: number, duration = 1800, decimals = 0, triggered = true) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!triggered) return
    const start  = performance.now()
    const from   = 0

    const ease = (t: number) => 1 - Math.pow(1 - t, 3)   // cubic ease-out

    const tick = (now: number) => {
      const elapsed = Math.min(now - start, duration)
      const progress = ease(elapsed / duration)
      const current = from + (target - from) * progress
      setValue(parseFloat(current.toFixed(decimals)))
      if (elapsed < duration) rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target, duration, decimals, triggered])

  return value
}

/* ─── Institution Summary ────────────────────────────────────────────────── */
const INST_DATA = {
  total:       1248,
  verified:    1089,
  concerns:    133,
  review:      20,
  compromised: 6,
  avgIndex:    94.2,
  examDate:    'Today, 09:00 – 13:00 IST',
  institution: 'National University Examination Board',
}

interface SummaryStatProps {
  label: string
  value: number
  decimals?: number
  suffix?: string
  color: string
  subLabel?: string
  triggered: boolean
}

function SummaryStat({ label, value, decimals = 0, suffix = '', color, subLabel, triggered }: SummaryStatProps) {
  const displayed = useCountUp(value, 1600, decimals, triggered)
  const pct = useCountUp(
    INST_DATA.total > 0 ? (value / INST_DATA.total) * 100 : 0,
    1600, 1, triggered
  )
  const showPct = decimals === 0 && suffix === '' && label !== 'Avg. Integrity Index'

  return (
    <div className="rounded-xl p-4 flex flex-col gap-2"
      style={{
        background: 'var(--surface-1)',
        border: `1px solid var(--border-0)`,
        borderLeft: `3px solid ${color}`,
      }}>
      <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
        {label}
      </div>
      <div className="flex items-end gap-1.5">
        <span className="text-2xl font-bold tabnum leading-none" style={{ color }}>
          {decimals > 0 ? displayed.toFixed(decimals) : Math.round(displayed).toLocaleString()}
        </span>
        {suffix && (
          <span className="text-sm font-medium mb-0.5" style={{ color, opacity: 0.7 }}>{suffix}</span>
        )}
      </div>
      {subLabel && (
        <div className="text-[11px]" style={{ color: 'var(--text-3)' }}>{subLabel}</div>
      )}
      {showPct && (
        <div className="mt-1">
          <div className="flex justify-between mb-1">
            <span className="text-[9px]" style={{ color: 'var(--text-3)' }}>
              {pct.toFixed(1)}% of total
            </span>
          </div>
          <div className="h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, pct)}%`,
                background: color,
                transition: 'width 1.6s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function InstitutionSummary() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [triggered, setTriggered] = useState(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setTriggered(true); obs.disconnect() } },
      { threshold: 0.15 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  /* Distribution bar segments */
  const dist = [
    { pct: (INST_DATA.verified    / INST_DATA.total) * 100, color: '#22C55E' },
    { pct: (INST_DATA.concerns    / INST_DATA.total) * 100, color: '#84CC16' },
    { pct: (INST_DATA.review      / INST_DATA.total) * 100, color: '#F59E0B' },
    { pct: (INST_DATA.compromised / INST_DATA.total) * 100, color: '#EF4444' },
  ]

  /* SVG arc for average index — same geometry as IntegrityIndexCard but smaller */
  const R = 38; const cx = 50; const cy = 48
  const angleAt = (frac: number) => Math.PI * (1 - frac)
  const pt = (frac: number) => ({
    x: cx + R * Math.cos(angleAt(frac)),
    y: cy - R * Math.sin(angleAt(frac)),
  })
  const avgPct   = INST_DATA.avgIndex / 100
  const arcStart = pt(0)
  const arcEnd   = pt(avgPct)
  const large    = avgPct > 0.5 ? 1 : 0

  return (
    <motion.section
      ref={sectionRef}
      className="mt-6"
      initial={{ opacity: 0, y: 20 }}
      animate={triggered ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
            <Users className="w-4 h-4" style={{ color: '#818CF8' }} />
          </div>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-0)' }}>
              Sample Institution Analytics
            </h2>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>
              {INST_DATA.institution} · {INST_DATA.examDate}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
          style={{
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.20)',
          }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#F59E0B' }} />
          <span className="text-[10px] font-medium" style={{ color: '#FCD34D' }}>
            Demonstration Data
          </span>
        </div>
      </div>

      {/* Main stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <SummaryStat label="Candidates Monitored" value={INST_DATA.total}
          color="var(--text-0)" triggered={triggered} />
        <SummaryStat label="Verified Sessions"    value={INST_DATA.verified}
          color="#22C55E" triggered={triggered} />
        <SummaryStat label="Minor Concerns"       value={INST_DATA.concerns}
          color="#84CC16" triggered={triggered} />
        <SummaryStat label="Requires Review"      value={INST_DATA.review}
          color="#F59E0B" triggered={triggered} />
        <SummaryStat label="Integrity Compromised" value={INST_DATA.compromised}
          color="#EF4444" triggered={triggered} />
        {/* Average index — custom card */}
        <div className="rounded-xl p-4 flex flex-col gap-2"
          style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--border-0)',
            borderLeft: '3px solid #22C55E',
          }}>
          <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
            Avg. Integrity Index
          </div>
          <div className="flex items-center gap-2">
            <svg width="100" height="56" className="flex-shrink-0 overflow-visible">
              <path
                d={`M ${arcStart.x} ${arcStart.y} A ${R} ${R} 0 1 1 ${cx + R} ${cy}`}
                fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" strokeLinecap="round"
              />
              {triggered && (
                <motion.path
                  d={`M ${arcStart.x} ${arcStart.y} A ${R} ${R} 0 ${large} 1 ${arcEnd.x} ${arcEnd.y}`}
                  fill="none" stroke="#22C55E" strokeWidth="5" strokeLinecap="round"
                  style={{ filter: 'drop-shadow(0 0 4px rgba(34,197,94,0.60))' }}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
                />
              )}
              <text x={cx} y={cy - 2} textAnchor="middle"
                fill="white" fontSize="15" fontWeight="700" fontFamily="Inter"
                style={{ fontFeatureSettings: '"tnum" 1' }}>
                {triggered ? INST_DATA.avgIndex.toFixed(1) : '0.0'}
              </text>
              <text x={cx} y={cy + 11} textAnchor="middle"
                fill="#22C55E" fontSize="7.5" fontWeight="500">
                / 100
              </text>
            </svg>
          </div>
          <div className="text-[11px]" style={{ color: '#6EE7B7' }}>Verified Session</div>
        </div>
      </div>

      {/* Distribution bar */}
      <div className="rounded-2xl p-5"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border-0)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="label mb-0.5">Session Distribution</div>
            <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>
              Integrity outcome breakdown across {INST_DATA.total.toLocaleString()} monitored candidates
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px]" style={{ color: 'var(--text-3)' }}>Clearance rate</div>
            <div className="text-lg font-bold tabnum" style={{ color: '#22C55E' }}>
              {(((INST_DATA.verified + INST_DATA.concerns) / INST_DATA.total) * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Stacked bar */}
        <div className="flex rounded-lg overflow-hidden h-3 mb-3 gap-px">
          {dist.map((seg, i) => (
            <motion.div key={i}
              className="h-full first:rounded-l-lg last:rounded-r-lg"
              style={{ background: seg.color }}
              initial={{ width: 0 }}
              animate={triggered ? { width: `${seg.pct}%` } : { width: 0 }}
              transition={{ duration: 1.4, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Verified Sessions',     n: INST_DATA.verified,    color: '#22C55E' },
            { label: 'Minor Concerns',        n: INST_DATA.concerns,    color: '#84CC16' },
            { label: 'Requires Review',       n: INST_DATA.review,      color: '#F59E0B' },
            { label: 'Integrity Compromised', n: INST_DATA.compromised, color: '#EF4444' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: l.color }} />
              <div>
                <div className="text-[11px] font-medium tabnum" style={{ color: l.color }}>
                  {l.n.toLocaleString()}
                </div>
                <div className="text-[10px]" style={{ color: 'var(--text-3)' }}>{l.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  )
}

/* ─── Risk Chart ─────────────────────────────────────────────────────────── */
function RiskChart({ data, color }: { data: { t: number; score: number }[]; color: string }) {
  if (data.length < 2) {
    return (
      <div className="h-36 flex flex-col items-center justify-center gap-2"
        style={{ color: 'var(--text-3)' }}>
        <Activity className="w-5 h-5 opacity-30" />
        <p className="text-xs">Run a scenario to see the trend</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={140}>
      <AreaChart data={data} margin={{ top: 4, right: 2, left: -28, bottom: 0 }}>
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity={0.30} />
            <stop offset="100%" stopColor={color} stopOpacity={0.00} />
          </linearGradient>
        </defs>
        <XAxis dataKey="t" hide />
        <YAxis domain={[0, 100]}
          tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.20)' }}
          tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            background: 'rgba(4,6,14,0.95)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10, fontSize: 12, color: 'white',
          }}
          formatter={(v: number) => [`${v}`, 'Risk score']}
          labelFormatter={() => ''}
        />
        <Area type="monotoneX" dataKey="score"
          stroke={color} strokeWidth={2}
          fill="url(#chartGrad)"
          dot={false}
          isAnimationActive
          animationDuration={400}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/* ─── Main Dashboard ─────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const [session,        setSession]        = useState<CandidateSession | null>(null)
  const [wsConnected,    setWsConnected]    = useState(false)
  const [activeScenario, setActiveScenario] = useState<DemoScenario | null>(null)
  const [isRunning,      setIsRunning]      = useState(false)
  const [showAlert,      setShowAlert]      = useState(false)
  const [alertDismissed, setAlertDismissed] = useState(false)
  const [showReview,     setShowReview]     = useState(false)
  const timeoutsRef  = useRef<ReturnType<typeof setTimeout>[]>([])
  const prevScore    = useRef(0)

  /* Trigger alert when score crosses 70 */
  useEffect(() => {
    const s = session?.current_risk_score ?? 0
    if (s > 70 && prevScore.current <= 70 && !alertDismissed) setShowAlert(true)
    prevScore.current = s
  }, [session?.current_risk_score, alertDismissed])

  /* Backend WS for live student sessions */
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8000'
    const url  = `${toWsUrl(base)}/ws-dashboard`
    let ws: WebSocket, timer: ReturnType<typeof setTimeout>, attempts = 0

    const connect = () => {
      try {
        ws = new WebSocket(url)
        ws.onopen  = () => { setWsConnected(true); attempts = 0 }
        ws.onclose = () => {
          setWsConnected(false)
          if (attempts < 5) timer = setTimeout(connect, 2000 * Math.pow(1.5, attempts++))
        }
        ws.onerror = () => ws.close()
        ws.onmessage = (e: MessageEvent) => {
          try {
            const msg = JSON.parse(e.data as string)
            if (msg.type === 'initial_state') {
              const sessions: CandidateSession[] = msg.payload ?? []
              if (sessions.length) setSession(sessions[sessions.length - 1])
            }
            if (msg.type === 'session_update') {
              const inc = msg.payload as CandidateSession
              setSession(prev =>
                (!prev || prev.session_id !== inc.session_id) ? inc : {
                  ...inc,
                  risk_history: mergeHistory(prev.risk_history, inc.risk_history ?? []),
                  timeline:     mergeTimeline(prev.timeline,    inc.timeline    ?? []),
                }
              )
            }
          } catch { /* ignore */ }
        }
      } catch { /* demo-only mode */ }
    }
    connect()
    return () => { clearTimeout(timer); try { ws?.close() } catch { /* ignore */ } }
  }, [])

  /* Demo runner */
  const clearT = () => { timeoutsRef.current.forEach(clearTimeout); timeoutsRef.current = [] }

  const runScenario = useCallback((scenarioType: DemoScenario) => {
    clearT()
    setShowAlert(false)
    setAlertDismissed(false)
    prevScore.current = 0
    setIsRunning(true)
    setActiveScenario(scenarioType)
    setSession(buildInitialSession(scenarioType, `demo-${scenarioType}-${Date.now()}`))

    SCENARIOS[scenarioType].forEach(step => {
      const t = setTimeout(() => {
        const now = Date.now()
        const newEvents: TimelineEvent[] = step.events.map(ev => ({
          id:          `${now}-${ev.type}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp:   now,
          type:        ev.type,
          description: ev.description,
          severity:    ev.severity,
        }))
        setSession(prev => !prev ? prev : {
          ...prev,
          current_risk_score: step.riskScore,
          risk_level:  getRiskLevel(step.riskScore),
          features:    step.features,
          risk_history: [...(prev.risk_history ?? []), { time: now, score: step.riskScore }].slice(-60),
          timeline:    mergeTimeline(prev.timeline ?? [], newEvents),
        })
      }, step.delay)
      timeoutsRef.current.push(t)
    })

    const lastDelay = SCENARIOS[scenarioType][SCENARIOS[scenarioType].length - 1].delay
    timeoutsRef.current.push(setTimeout(() => setIsRunning(false), lastDelay + 1500))
  }, [])

  const reset = () => {
    clearT()
    setSession(null)
    setActiveScenario(null)
    setIsRunning(false)
    setShowAlert(false)
    setAlertDismissed(false)
    prevScore.current = 0
  }

  useEffect(() => () => clearT(), [])

  /* Derived */
  const riskScore  = session?.current_risk_score ?? 0
  const riskLevel  = session?.risk_level ?? 'low'
  const riskColor  = getRiskColor(riskScore)
  const alertCount = (session?.timeline ?? []).filter(e => e.severity !== 'info').length
  const chartData  = (session?.risk_history ?? []).map((h, i) => ({ t: i, score: Math.round(h.score) }))

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-0)' }}>

      {/* Alert banner — pointer-events-none wrapper ensures it never blocks UI */}
      <AnimatePresence>
        {showAlert && session && (
          <AlertBanner
            score={riskScore}
            name={session.candidate_name}
            onDismiss={() => { setShowAlert(false); setAlertDismissed(true) }}
          />
        )}
      </AnimatePresence>

      {/* Session Review Modal */}
      <AnimatePresence>
        {showReview && session && session.timeline.length > 0 && (
          <SessionReviewModal session={session} onClose={() => setShowReview(false)} />
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="nav-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--brand)' }}>
                <Shield className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-0)' }}>ExamShield</span>
            </Link>
            <span style={{ color: 'var(--text-3)' }}>/</span>
            <span className="text-sm" style={{ color: 'var(--text-2)' }}>Admin Dashboard</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Connection badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-0)' }}>
              {wsConnected ? (
                <>
                  <div className="w-1.5 h-1.5 rounded-full pulse-low" style={{ background: 'var(--risk-green)' }} />
                  <span className="text-[11px] font-medium" style={{ color: '#6EE7B7', opacity: 0.75 }}>LIVE</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3" style={{ color: 'var(--text-3)' }} />
                  <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>Demo mode</span>
                </>
              )}
            </div>

            <Link href="/exam"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all duration-150"
              style={{
                color: 'var(--text-2)',
                border: '1px solid var(--border-0)',
              }}>
              <ExternalLink className="w-3 h-3" />
              Student Portal
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { l: 'Sessions',    v: session ? '1' : '0', Icon: Users,          vColor: 'var(--text-0)' },
            { l: 'Risk score',  v: session ? `${Math.round(riskScore)}` : '—', Icon: Activity, vColor: riskColor },
            { l: 'Alerts',      v: String(alertCount),   Icon: AlertTriangle,
              vColor: alertCount > 0 ? 'var(--risk-amber)' : 'var(--text-0)' },
            { l: 'Status',      v: session?.exam_status ?? 'Idle', Icon: CheckCircle, vColor: 'var(--text-0)' },
          ].map(c => (
            <div key={c.l} className="rounded-xl p-4"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border-0)' }}>
              <div className="flex items-center gap-1.5 mb-2.5">
                <c.Icon className="w-3.5 h-3.5" style={{ color: 'var(--text-3)' }} />
                <span className="label">{c.l}</span>
              </div>
              <div className="text-2xl font-bold tabnum" style={{ color: c.vColor }}>
                {c.v}
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* ── Main panel ─────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">


            {/* Gauge + Candidate */}
            <div className="grid sm:grid-cols-2 gap-4">
              <RiskGauge score={riskScore} level={riskLevel} />

              <div className={`rounded-2xl p-5 transition-all duration-700
                              ${riskLevel === 'high' ? 'risk-card-high' : 'glass'}`}
                style={riskLevel === 'high' ? { border: '1px solid rgba(239,68,68,0.22)' } : {}}>
                {session ? (
                  <div className="h-full flex flex-col justify-between">
                    <div>
                      <div className="label mb-2">Candidate</div>
                      <div className="flex items-start gap-2 mb-4">
                        <div>
                          <h2 className="text-base font-semibold mb-1.5" style={{ color: 'var(--text-0)' }}>
                            {session.candidate_name}
                          </h2>
                          <motion.div
                            key={riskLevel}
                            initial={{ opacity: 0, scale: 0.88 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.28, ease: [0.22,1,0.36,1] }}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium"
                            style={{
                              color:      riskColor,
                              background: `${riskColor}14`,
                              border:     `1px solid ${riskColor}28`,
                            }}>
                            <div
                              className={riskLevel === 'high' ? 'pulse-high' : riskLevel === 'medium' ? 'pulse-medium' : 'pulse-low'}
                              style={{
                                width: 6, height: 6,
                                borderRadius: '50%',
                                background: riskColor,
                                flexShrink: 0,
                              }} />
                            {getRiskLabel(riskScore)}
                          </motion.div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="label">Behavior signals</div>
                        {session.timeline.length > 0 && (
                          <button
                            onClick={() => setShowReview(true)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-150"
                            style={{
                              background: 'rgba(99,102,241,0.12)',
                              border: '1px solid rgba(99,102,241,0.25)',
                              color: '#818CF8',
                            }}>
                            <Search className="w-3 h-3" />
                            Review Session
                          </button>
                        )}
                      </div>
                      <FeatureStats session={session} />
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-center">
                    <div>
                      <Users className="w-7 h-7 mx-auto mb-2" style={{ color: 'var(--text-3)', opacity: 0.4 }} />
                      <p className="text-sm" style={{ color: 'var(--text-3)' }}>No active session</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-3)', opacity: 0.6 }}>
                        Run a demo scenario →
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Chart */}
            <div className="rounded-2xl p-5"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border-0)' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="label mb-0.5">Risk trend</div>
                  {chartData.length > 0 && (
                    <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                      {chartData.length} data points
                    </p>
                  )}
                </div>
                {chartData.length > 0 && (
                  <span className="text-sm font-semibold tabnum" style={{ color: riskColor }}>
                    {chartData[chartData.length - 1]?.score ?? 0}
                  </span>
                )}
              </div>
              <RiskChart data={chartData} color={riskColor} />
            </div>

            {/* Behavior Analysis Report */}
            <BehaviorAnalysisReport session={session} />
          </div>

          {/* ── Right panel ──────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Integrity Index */}
            <IntegrityIndexCard riskScore={riskScore} hasSession={!!session} />

            {/* Demo controls */}
            <div className="rounded-2xl p-5"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border-0)' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="label">Demo scenarios</div>
                {session && (
                  <button onClick={reset}
                    className="p-1.5 rounded-lg transition-colors duration-150"
                    style={{ color: 'var(--text-3)' }}>
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <DemoControls onRun={runScenario} active={activeScenario} running={isRunning} />
              <p className="text-[10px] mt-3 leading-relaxed" style={{ color: 'var(--text-3)' }}>
                Client-side simulation — works without a backend connection. Numbers in brackets
                show expected risk range.
              </p>
            </div>

            {/* Timeline */}
            <div className="rounded-2xl p-5"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border-0)' }}>
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-3.5 h-3.5" style={{ color: 'var(--text-3)' }} />
                <div className="label flex-1">Event timeline</div>
                {alertCount > 0 && (
                  <div className="px-1.5 py-0.5 rounded-md text-[10px] font-medium tabnum"
                    style={{
                      background: 'rgba(245,158,11,0.10)',
                      border: '1px solid rgba(245,158,11,0.22)',
                      color: 'var(--risk-amber)',
                    }}>
                    {alertCount}
                  </div>
                )}
              </div>
              <Timeline events={session?.timeline ?? []} />
            </div>
          </div>
        </div>

        {/* Institution Summary */}
        <InstitutionSummary />
      </div>
    </div>
  )
}
