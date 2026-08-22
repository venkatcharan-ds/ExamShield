'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { UserMenu } from '@/components/UserMenu'
import { ConsentPanel } from '@/components/ConsentPanel'
import {
  Shield, Activity, AlertTriangle, CheckCircle, Clock,
  Users, WifiOff, Play, RotateCcw, ExternalLink, X,
  FileText, ChevronDown, ChevronUp, Pause, Search,
  Radio, Lock, Terminal, Sparkles, CheckCircle2,
} from 'lucide-react'
import type { CandidateSession, TimelineEvent } from '@/types'
import { getRiskColor, getRiskLabel, getRiskLevel } from '@/services/demoScenarios'
import { createClient } from '@/lib/supabase/client'

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function toWsUrl(s: string) {
  return s.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://')
}

function mergeTimeline(a: TimelineEvent[], b: TimelineEvent[]) {
  const m = new Map<string, TimelineEvent>()
  ;[...a, ...b].forEach(e => m.set(e.id, e))
  return Array.from(m.values()).sort((x, y) => x.timestamp - y.timestamp).slice(-35)
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
    <div className="pointer-events-none fixed top-20 inset-x-0 z-50 flex justify-center px-4">
      <motion.div
        className="pointer-events-auto w-full max-w-lg"
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.96, transition: { duration: 0.2 } }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          className="flex items-center gap-3.5 px-5 py-3.5 rounded-2xl glass-hi"
          style={{
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.40)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.60), 0 0 35px rgba(239,68,68,0.25)',
          }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(239,68,68,0.25)' }}
          >
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-red-400">
              Integrity Alert · High Risk Detected
            </p>
            <p className="text-xs truncate mt-0.5 text-zinc-200">
              Candidate <b className="text-white">{name}</b> crossed threshold ({Math.round(score)}/100)
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 hover:bg-white/10 transition-colors text-zinc-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  )
}

/* ─── Precision Risk Gauge ───────────────────────────────────────────────── */
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
  const large  = 0

  return (
    <div
      className={`rounded-3xl p-6 transition-all duration-700 glass-hi
                  ${isHigh ? 'risk-card-high' : isMed ? 'risk-card-medium' : ''}`}
      style={{
        border: isHigh ? '1px solid rgba(239,68,68,0.35)' : '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="label">Composite Risk Level</div>
        <span
          className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full"
          style={{ background: `${color}18`, color, border: `1px solid ${color}35` }}
        >
          {label}
        </span>
      </div>

      <div className="flex flex-col items-center">
        <svg width="180" height="104" className="overflow-visible">
          {/* Background Track */}
          <path
            d={`M ${start.x} ${start.y} A ${R} ${R} 0 1 1 ${cx + R} ${cy}`}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Active Fill Arc */}
          {pct > 0 && (
            <path
              d={`M ${start.x} ${start.y} A ${R} ${R} 0 ${large} 1 ${fillPt.x} ${fillPt.y}`}
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
              style={{
                transition: 'stroke 0.6s ease, filter 0.6s ease',
                filter: `drop-shadow(0 0 ${isHigh ? 12 : 6}px ${color}${isHigh ? 'ee' : '88'})`,
              }}
            />
          )}
          {/* Numerical Score */}
          <motion.text
            key={Math.round(pct)}
            x={cx} y={cy - 4}
            textAnchor="middle"
            fill="white"
            fontSize="32"
            fontWeight="800"
            fontFamily="Inter"
            style={{ fontFeatureSettings: '"tnum" 1' }}
            initial={{ opacity: 0.4, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.30, ease: [0.22, 1, 0.36, 1] }}
          >
            {Math.round(pct)}
          </motion.text>
          <text
            x={cx} y={cy + 17}
            textAnchor="middle" fontSize="11" fontWeight="600"
            fill={color}
            style={{ transition: 'fill 0.5s ease' }}
          >
            {label}
          </text>
          {/* Extremities */}
          <text x="12" y={cy + 6} fill="rgba(255,255,255,0.20)" fontSize="9" fontFamily="monospace">0</text>
          <text x={cx*2-14} y={cy + 6} fill="rgba(255,255,255,0.20)" fontSize="9" fontFamily="monospace">100</text>
        </svg>

        {/* Legend */}
        <div className="flex gap-3.5 mt-2">
          {[
            { c: 'var(--risk-green)', l: 'Normal (0–30)' },
            { c: 'var(--risk-amber)', l: 'Suspicious (31–70)' },
            { c: 'var(--risk-red)',   l: 'High (71–100)' },
          ].map(z => (
            <div key={z.l} className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: z.c }} />
              <span className="text-[9.5px] font-mono text-zinc-400">{z.l}</span>
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
      <div className="text-center py-10 flex flex-col items-center gap-2.5">
        <Clock className="w-6 h-6 text-zinc-600" />
        <p className="text-xs text-zinc-500 font-mono">Awaiting telemetry events…</p>
      </div>
    )
  }

  const bgBorder = (sev: string) => ({
    critical: { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.25)',  text: '#FCA5A5' },
    warning:  { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', text: '#FCD34D' },
    info:     { bg: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.20)', text: '#6EE7B7' },
  }[sev] ?? { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)', text: 'var(--text-2)' })

  return (
    <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
      <AnimatePresence initial={false}>
        {sorted.map(ev => {
          const { bg, border, text } = bgBorder(ev.severity)
          const icon = ev.severity === 'critical'
            ? <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            : ev.severity === 'warning'
              ? <Activity className="w-3.5 h-3.5 text-amber-400" />
              : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          return (
            <motion.div
              key={ev.id}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div
                className="flex gap-3 items-start p-3 rounded-2xl transition-all"
                style={{ background: bg, border: `1px solid ${border}` }}
              >
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: 'rgba(0,0,0,0.30)' }}
                >
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-snug font-medium" style={{ color: text }}>
                    {ev.description}
                  </p>
                  <p className="text-[10px] font-mono mt-1 text-zinc-500">
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

/* ─── Behavioral Feature Telemetry Stats ─────────────────────────────────── */
function FeatureStats({ session }: { session: CandidateSession }) {
  const f = session.features
  if (!f) return (
    <div className="text-center py-6 text-xs text-zinc-500 font-mono">
      Awaiting first 3-second telemetry window…
    </div>
  )

  const rows = [
    { l: 'Typing speed',  v: `${Math.round(f.typing_speed)} kpm`, warn: f.typing_speed > 600 },
    { l: 'Key interval',  v: `${Math.round(f.average_key_interval)} ms`, warn: f.average_key_interval > 800 },
    { l: 'Tab switches',  v: String(f.tab_switch_count), warn: f.tab_switch_count >= 1 },
    { l: 'Paste events',  v: String(f.paste_count), warn: f.paste_count >= 1 },
    { l: 'Copy events',   v: String(f.copy_count), warn: f.copy_count >= 1 },
    { l: 'Idle duration', v: `${f.idle_duration.toFixed(1)} s`, warn: f.idle_duration > 8 },
  ]

  return (
    <div className="grid grid-cols-2 gap-2">
      {rows.map(r => (
        <div
          key={r.l}
          className="p-3 rounded-2xl flex flex-col justify-between transition-all duration-300"
          style={{
            background: r.warn ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.025)',
            border: `1px solid ${r.warn ? 'rgba(245,158,11,0.25)' : 'var(--border-0)'}`,
            borderLeft: r.warn ? '3px solid rgba(245,158,11,0.70)' : undefined,
          }}
        >
          <span className="text-[10px] uppercase font-mono text-zinc-400">{r.l}</span>
          <span
            className="text-sm font-bold font-mono tabnum mt-1"
            style={{ color: r.warn ? 'var(--risk-amber)' : 'var(--text-0)' }}
          >
            {r.v}
          </span>
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
    if (f.tab_switch_count >= 3) {
      patterns.push({
        label: 'Multiple exam window exits',
        detail: `Detected ${f.tab_switch_count} focus blur transitions during active assessment.`,
        severity: 'critical',
      })
    } else if (f.tab_switch_count >= 1) {
      patterns.push({
        label: 'Exam window blur transition',
        detail: `Candidate navigated away from the exam ${f.tab_switch_count} time${f.tab_switch_count > 1 ? 's' : ''}.`,
        severity: 'warning',
      })
    }

    if (f.paste_count >= 2) {
      patterns.push({
        label: 'Repeated synthetic text insertion',
        detail: `Recorded ${f.paste_count} sudden text insertions. Anomaly model flags external content injection.`,
        severity: 'critical',
      })
    } else if (f.paste_count === 1) {
      patterns.push({
        label: 'Text paste event detected',
        detail: 'External text block was pasted into the answer field.',
        severity: 'warning',
      })
    }

    if (f.copy_count >= 1) {
      patterns.push({
        label: 'Question text extraction',
        detail: `${f.copy_count} copy events suggest exam prompt extraction.`,
        severity: 'warning',
      })
    }

    if (f.typing_speed > 120) {
      patterns.push({
        label: 'Abnormal keystroke velocity',
        detail: `Velocity reached ${Math.round(f.typing_speed)} KPM — exceeds human typing threshold.`,
        severity: 'critical',
      })
    }

    if (f.idle_duration > 15) {
      patterns.push({
        label: 'Prolonged inactivity period',
        detail: `Candidate paused for ${f.idle_duration.toFixed(1)}s without interaction.`,
        severity: 'warning',
      })
    }
  }

  const nonInfoTimeline = timeline.filter(e => e.severity !== 'info')
  const hasPaste = nonInfoTimeline.some(e => e.type === 'paste')
  if (hasPaste && (!f || f.paste_count === 0)) {
    patterns.push({
      label: 'Past text insertion recorded',
      detail: 'A paste operation occurred earlier in the examination timeline.',
      severity: 'warning',
    })
  }

  if (patterns.length === 0) {
    patterns.push({
      label: 'Consistent biometric typing rhythm',
      detail: 'Keystroke velocity, focus retention, and inter-key intervals align with human baseline.',
      severity: 'info',
    })
  }

  const flagged = patterns.filter(p => p.severity !== 'info')
  let assessment: string
  let confidence: 'High' | 'Medium' | 'Low'
  let status: string

  if (score >= 71) {
    assessment = 'This examination session exhibits multiple severe behavioral anomalies. Manual examiner review required before certification.'
    confidence = patterns.length >= 2 ? 'High' : 'Medium'
    status = 'Requires Immediate Review'
  } else if (score >= 31) {
    assessment = 'Moderate behavioral deviations detected. Secondary examiner check recommended.'
    confidence = 'Medium'
    status = 'Requires Review'
  } else if (flagged.length === 0) {
    assessment = 'No integrity deviations identified. Candidate interaction pattern strictly matches normal examination behavior.'
    confidence = 'High'
    status = 'Session Cleared'
  } else {
    assessment = 'Minor behavioral fluctuations observed but aggregate telemetry remains within normal threshold.'
    confidence = 'High'
    status = 'Reviewed — Normal'
  }

  return { patterns, assessment, confidence, status }
}

/* ─── Behavior Analysis Report Card ─────────────────────────────────────── */
function BehaviorAnalysisReport({ session }: { session: CandidateSession | null }) {
  const [expanded, setExpanded] = useState(true)

  if (!session || !session.features) {
    return (
      <div className="rounded-3xl p-6 glass-hi text-center" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <FileText className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
        <div className="text-xs text-zinc-500 font-mono">
          Behavior analysis generates when active telemetry is streamed.
        </div>
      </div>
    )
  }

  const { patterns, assessment, confidence, status } = generateBehaviorAnalysis(session)
  const score = session.current_risk_score
  const statusColor = score >= 71 ? '#EF4444' : score >= 31 ? '#F59E0B' : '#10B981'

  return (
    <motion.div
      className="rounded-3xl overflow-hidden glass-hi"
      style={{
        border: `1px solid ${statusColor}30`,
        boxShadow: `0 20px 50px rgba(0,0,0,0.50), 0 0 30px ${statusColor}10`,
      }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-6 py-4 transition-colors hover:bg-white/[0.02]"
        style={{ borderBottom: expanded ? `1px solid ${statusColor}20` : 'none' }}
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: `${statusColor}18`, border: `1px solid ${statusColor}30` }}
          >
            <FileText className="w-4 h-4" style={{ color: statusColor }} />
          </div>
          <div className="text-left">
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: statusColor }}>
              Behavior Analysis Report
            </div>
            <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
              {session.candidate_name} · {patterns.length} pattern{patterns.length !== 1 ? 's' : ''} evaluated
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span
            className="text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full"
            style={{ background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}30` }}
          >
            {status}
          </span>
          {expanded
            ? <ChevronUp className="w-4 h-4 text-zinc-400" />
            : <ChevronDown className="w-4 h-4 text-zinc-400" />
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
            <div className="p-6 space-y-4">
              {/* Pattern breakdown */}
              <div className="space-y-2.5">
                {patterns.map((p, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-2xl flex items-start gap-3"
                    style={{
                      background: p.severity === 'critical' ? 'rgba(239,68,68,0.07)' : p.severity === 'warning' ? 'rgba(245,158,11,0.07)' : 'rgba(16,185,129,0.06)',
                      border: `1px solid ${p.severity === 'critical' ? 'rgba(239,68,68,0.20)' : p.severity === 'warning' ? 'rgba(245,158,11,0.20)' : 'rgba(16,185,129,0.18)'}`,
                    }}
                  >
                    <span className="text-xs mt-0.5 flex-shrink-0">
                      {p.severity === 'critical' ? '⛔' : p.severity === 'warning' ? '⚠️' : '✓'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-zinc-200">{p.label}</span>
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded-full font-mono uppercase"
                          style={{
                            background: p.severity === 'critical' ? 'rgba(239,68,68,0.20)' : p.severity === 'warning' ? 'rgba(245,158,11,0.20)' : 'rgba(16,185,129,0.20)',
                            color: p.severity === 'critical' ? '#FCA5A5' : p.severity === 'warning' ? '#FCD34D' : '#6EE7B7',
                          }}
                        >
                          {p.severity}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-zinc-400 leading-relaxed">{p.detail}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Assessment */}
              <div className="pt-3 border-t border-white/5 text-xs text-zinc-300 leading-relaxed">
                <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">
                  Examiner Synthesis
                </span>
                {assessment}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ─── Session Review & Replay Modal ──────────────────────────────────────── */
interface PlayEntry {
  relMs: number
  kind: 'event' | 'risk'
  event?: TimelineEvent
  riskScore?: number
  label: string
  severity: 'info' | 'warning' | 'critical' | 'risk'
}

const REPLAY_DURATION_MS = 20_000

function buildPlayEntries(session: CandidateSession): { entries: PlayEntry[]; totalMs: number } {
  const allTs = [
    ...session.timeline.map(e => e.timestamp),
    ...session.risk_history.map(h => h.time),
  ]
  if (!allTs.length) return { entries: [], totalMs: 0 }

  const origin = Math.min(...allTs)
  const end    = Math.max(...allTs)
  const span   = Math.max(end - origin, 1)
  const norm = (t: number) => ((t - origin) / span) * REPLAY_DURATION_MS
  const entries: PlayEntry[] = []

  entries.push({
    relMs: 0,
    kind: 'event',
    label: 'Examination session initiated',
    severity: 'info',
  })

  session.timeline
    .filter(e => e.type !== 'exam_start')
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
      label: `Risk telemetry updated → ${Math.round(h.score)}`,
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
  const TICK_MS  = 80

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
  useEffect(() => { if (totalMs > 0) setPlaying(true) }, [totalMs])

  const visibleEntries = entries.filter(e => e.relMs <= playheadMs)
  const progressPct    = totalMs > 0 ? (playheadMs / totalMs) * 100 : 0
  const latestRisk = [...visibleEntries].reverse().find(e => e.kind === 'risk')
  const currentRiskScore = latestRisk?.riskScore ?? 0
  const currentRiskColor = getRiskColor(currentRiskScore)

  const sparkData = visibleEntries
    .filter(e => e.kind === 'risk')
    .map((e, i) => ({ t: i, score: Math.round(e.riskScore ?? 0) }))

  const elapsed = playheadMs / 1000
  const totalSec = totalMs / 1000
  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  }

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(2,4,10,0.88)', backdropFilter: 'blur(16px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden glass-hi"
        style={{
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.75)',
        }}
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-indigo-500/20 border border-indigo-500/30">
              <Search className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <div className="text-sm font-bold" style={{ color: 'var(--text-0)' }}>
                Forensic Session Playback
              </div>
              <div className="text-[11px] font-mono text-zinc-400">
                {session.candidate_name} · {entries.length} recorded events
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10 text-zinc-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live scrubber and controls */}
        <div className="px-6 py-4 border-b border-white/5 space-y-3">
          <div className="relative h-2 rounded-full bg-zinc-800 overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ background: currentRiskColor, width: `${progressPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-zinc-400">{fmt(elapsed)}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={restart}
                className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={playing ? pause : startPlay}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
              >
                {playing ? <><Pause className="w-3.5 h-3.5" /> Pause</> : <><Play className="w-3.5 h-3.5" /> Play</>}
              </button>
            </div>
            <span className="text-xs font-mono text-zinc-400">{fmt(totalSec)}</span>
          </div>
        </div>

        {/* Event timeline during playback */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2.5 max-h-[350px]">
          {visibleEntries.map((entry, i) => (
            <div
              key={i}
              className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: entry.severity === 'critical' ? '#EF4444' : entry.severity === 'warning' ? '#F59E0B' : '#10B981',
                  }}
                />
                <span className="text-zinc-200">{entry.label}</span>
              </div>
              <span className="font-mono text-[11px] text-zinc-500">{fmt(entry.relMs / 1000)}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ─── Integrity Index Card ───────────────────────────────────────────────── */
function IntegrityIndexCard({ riskScore, hasSession }: { riskScore: number; hasSession: boolean }) {
  const index = Math.round(Math.max(0, Math.min(100, 100 - riskScore)))
  const tierColor = index >= 71 ? '#10B981' : index >= 31 ? '#F59E0B' : '#EF4444'
  const tierLabel = index >= 71 ? 'Verified Normal' : index >= 31 ? 'Needs Review' : 'High Violation Risk'

  return (
    <div className="rounded-3xl p-6 glass-hi" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="label">Integrity Index</div>
        {hasSession && (
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: `${tierColor}18`, color: tierColor, border: `1px solid ${tierColor}30` }}
          >
            {tierLabel}
          </span>
        )}
      </div>

      {hasSession ? (
        <div className="space-y-4">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold tabnum font-mono" style={{ color: tierColor }}>
              {index}
            </span>
            <span className="text-xs text-zinc-500 font-mono">/ 100</span>
          </div>

          <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
            <motion.div
              className="h-full"
              style={{ background: tierColor, width: `${index}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            {index >= 71
              ? 'Candidate behavioral signals strictly adhere to typical examination benchmarks.'
              : 'Behavioral variance exceeds normal tolerances. Review flagged timeline anomalies.'}
          </p>
        </div>
      ) : (
        <div className="py-6 text-center text-xs text-zinc-500 font-mono">
          Awaiting active session telemetry…
        </div>
      )}
    </div>
  )
}

/* ─── Real-Time Risk Chart ───────────────────────────────────────────────── */
function RiskChart({ data, color }: { data: { t: number; score: number }[]; color: string }) {
  if (data.length < 2) {
    return (
      <div className="h-40 flex flex-col items-center justify-center gap-2 text-zinc-500 font-mono text-xs">
        <Activity className="w-5 h-5 opacity-40" />
        <span>Telemetry trend populates in real-time</span>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0.00} />
          </linearGradient>
        </defs>
        <XAxis dataKey="t" hide />
        <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.30)' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            background: 'rgba(4,6,15,0.95)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 12, fontSize: 12, color: 'white',
          }}
          formatter={(v: number) => [`${v}`, 'Risk Score']}
        />
        <Area type="monotone" dataKey="score" stroke={color} strokeWidth={2.5} fill="url(#chartGrad)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/* ─── Candidate Selector Strip ───────────────────────────────────────────── */
function CandidateSelector({
  sessions, selectedId, onSelect,
}: {
  sessions: Record<string, CandidateSession>
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const list = Object.values(sessions)
  if (list.length === 0) return null

  return (
    <div className="rounded-3xl p-5 mb-6 glass-hi" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-indigo-400" />
        <span className="label">Live Candidate Sessions</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-white/5 text-zinc-300">
          {list.length} Connected
        </span>
      </div>

      <div className="flex flex-wrap gap-2.5">
        {list.map(s => {
          const isSelected = s.session_id === selectedId
          const score = s.current_risk_score ?? 0
          const color = getRiskColor(score)
          const isActive = s.exam_status === 'active'

          return (
            <button
              key={s.session_id}
              onClick={() => onSelect(s.session_id)}
              className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-left transition-all duration-200"
              style={{
                background: isSelected ? `${color}15` : 'rgba(255,255,255,0.025)',
                border: `1px solid ${isSelected ? `${color}40` : 'rgba(255,255,255,0.06)'}`,
                boxShadow: isSelected ? `0 0 20px ${color}20` : 'none',
              }}
            >
              <div
                className={isActive ? (score > 70 ? 'pulse-high' : score > 30 ? 'pulse-medium' : 'pulse-low') : ''}
                style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }}
              />
              <div>
                <div className="text-xs font-bold text-zinc-100">{s.candidate_name}</div>
                <div className="text-[10px] font-mono text-zinc-400">
                  Risk: <span style={{ color }}>{Math.round(score)}</span> · {isActive ? 'Active' : 'Finished'}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Clean Cybernetic Empty State (Truth in Metrics) ────────────────────── */
function EmptyDashboardState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-3xl p-12 text-center glass-hi max-w-2xl mx-auto my-12 relative overflow-hidden"
      style={{
        border: '1px solid rgba(99,102,241,0.25)',
        boxShadow: '0 25px 60px rgba(0,0,0,0.60), 0 0 35px rgba(99,102,241,0.10)',
      }}
    >
      <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6 bg-indigo-500/10 border border-indigo-500/25 relative">
        <Radio className="w-8 h-8 text-indigo-400" />
        <div className="absolute inset-0 rounded-3xl border border-indigo-500/40 animate-ping opacity-40" />
      </div>

      <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-indigo-400">
        Telemetry Receiver Active
      </span>
      <h2 className="text-2xl font-bold tracking-tight mt-1 mb-3" style={{ color: 'var(--text-0)' }}>
        Awaiting Examination Session
      </h2>
      <p className="text-xs md:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed mb-8">
        Zero active candidate sessions connected. Launch the student examination in a second browser window to stream real-time keystroke dynamics, window focus events, and AI risk scoring.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/exam"
          target="_blank"
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-xs font-semibold text-white rounded-xl transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
            boxShadow: '0 0 20px rgba(99,102,241,0.40)',
          }}
        >
          Launch Candidate Exam in New Tab
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
        <Link
          href="/dashboard/admin"
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-xs font-semibold rounded-xl text-zinc-300 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
        >
          Manage Administrators
        </Link>
      </div>
    </motion.div>
  )
}

/* ─── Main SOC Dashboard Page ────────────────────────────────────────────── */
export default function DashboardPage() {
  const [sessions,          setSessions]          = useState<Record<string, CandidateSession>>({})
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [wsConnected,       setWsConnected]       = useState(false)
  const [showAlert,         setShowAlert]         = useState(false)
  const [alertDismissed,    setAlertDismissed]    = useState(false)
  const [showReview,        setShowReview]        = useState(false)
  const prevScore = useRef(0)

  const session = selectedSessionId ? (sessions[selectedSessionId] ?? null) : null

  const selectCandidate = useCallback((id: string) => {
    setSelectedSessionId(id)
    setShowAlert(false)
    setAlertDismissed(false)
    prevScore.current = 0
  }, [])

  /* Alert on risk spike */
  useEffect(() => {
    const s = session?.current_risk_score ?? 0
    if (s > 70 && prevScore.current <= 70 && !alertDismissed) {
      setShowAlert(true)
    }
    prevScore.current = s
  }, [session?.current_risk_score, alertDismissed])

  /* WebSocket live dashboard telemetry */
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_WS_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
    let ws: WebSocket, timer: ReturnType<typeof setTimeout>, attempts = 0

    const connect = async () => {
      try {
        const { data } = await createClient().auth.getSession()
        const token = data.session?.access_token
        if (!token) { setWsConnected(false); return }
        const url = `${toWsUrl(base)}/ws-dashboard?token=${encodeURIComponent(token)}`
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
              const incoming: CandidateSession[] = msg.payload ?? []
              const map: Record<string, CandidateSession> = {}
              for (const s of incoming) map[s.session_id] = s
              setSessions(map)
              setSelectedSessionId(prev => (prev === null && incoming.length > 0 ? incoming[0].session_id : prev))
            }
            if (msg.type === 'session_update') {
              const inc = msg.payload as CandidateSession
              setSessions(prev => {
                const existing = prev[inc.session_id]
                const merged: CandidateSession = existing ? {
                  ...inc,
                  risk_history: mergeHistory(existing.risk_history, inc.risk_history ?? []),
                  timeline:     mergeTimeline(existing.timeline,    inc.timeline    ?? []),
                } : inc
                return { ...prev, [inc.session_id]: merged }
              })
              setSelectedSessionId(prev => (prev === null ? inc.session_id : prev))
            }
          } catch { /* ignore */ }
        }
      } catch { setWsConnected(false) }
    }
    connect()
    return () => { clearTimeout(timer); try { ws?.close() } catch { /* ignore */ } }
  }, [])

  const totalSessions = Object.keys(sessions).length
  const riskScore     = session?.current_risk_score ?? 0
  const riskLevel     = session?.risk_level ?? 'low'
  const riskColor     = getRiskColor(riskScore)
  const alertCount    = (session?.timeline ?? []).filter(e => e.severity !== 'info').length
  const chartData     = (session?.risk_history ?? []).map((h, i) => ({ t: i, score: Math.round(h.score) }))

  return (
    <div className="min-h-screen relative" style={{ background: 'var(--surface-0)' }}>
      <div className="cyber-grid absolute inset-0 opacity-20 pointer-events-none" />

      {/* Critical Alert Toast */}
      <AnimatePresence>
        {showAlert && session && (
          <AlertBanner
            score={riskScore}
            name={session.candidate_name}
            onDismiss={() => { setShowAlert(false); setAlertDismissed(true) }}
          />
        )}
      </AnimatePresence>

      {/* Playback Review Modal */}
      <AnimatePresence>
        {showReview && session && session.timeline.length > 0 && (
          <SessionReviewModal session={session} onClose={() => setShowReview(false)} />
        )}
      </AnimatePresence>

      {/* Top Navigation */}
      <header className="nav-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' }}
              >
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold" style={{ color: 'var(--text-0)' }}>ExamShield</span>
            </Link>
            <span className="text-zinc-600">/</span>
            <span className="text-xs font-mono font-medium text-indigo-400">SOC Command Center</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Socket Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs font-mono">
              {wsConnected ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-emerald-400 pulse-low" />
                  <span className="text-emerald-400 font-medium">SOC LIVE</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-zinc-500" />
                  <span className="text-zinc-500">Standby</span>
                </>
              )}
            </div>

            <Link
              href="/dashboard/admin"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl glass hover:border-indigo-500/40 transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              Admin Management
            </Link>

            <Link
              href="/exam"
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl glass hover:border-indigo-500/40 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
              Open Candidate Exam
            </Link>

            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main SOC Dashboard View */}
      <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { l: 'Active Sessions', v: String(totalSessions), Icon: Users, color: 'var(--text-0)' },
            { l: 'Selected Risk', v: session ? `${Math.round(riskScore)}` : '—', Icon: Activity, color: session ? riskColor : 'var(--text-3)' },
            { l: 'Flagged Alerts', v: session ? String(alertCount) : '—', Icon: AlertTriangle, color: alertCount > 0 ? '#F59E0B' : 'var(--text-0)' },
            { l: 'Session State', v: session?.exam_status ?? 'Idle', Icon: CheckCircle, color: session?.exam_status === 'active' ? '#10B981' : 'var(--text-3)' },
          ].map(c => (
            <div key={c.l} className="rounded-3xl p-5 glass-hi" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2 mb-2">
                <c.Icon className="w-4 h-4 text-zinc-400" />
                <span className="label">{c.l}</span>
              </div>
              <div className="text-2xl md:text-3xl font-extrabold font-mono tabnum" style={{ color: c.color }}>
                {c.v}
              </div>
            </div>
          ))}
        </div>

        {/* Candidate Selector Strip */}
        <CandidateSelector
          sessions={sessions}
          selectedId={selectedSessionId}
          onSelect={selectCandidate}
        />

        {/* Main Operational Panel */}
        {session ? (
          <div className="grid lg:grid-cols-3 gap-6">

            {/* Left & Center Columns */}
            <div className="lg:col-span-2 space-y-6">

              {/* Gauge + Candidate Profile */}
              <div className="grid sm:grid-cols-2 gap-6">
                <RiskGauge score={riskScore} level={riskLevel} />

                <div
                  className={`rounded-3xl p-6 glass-hi flex flex-col justify-between
                              ${riskLevel === 'high' ? 'risk-card-high' : ''}`}
                  style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div>
                    <div className="label mb-2">Active Candidate</div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-lg font-bold text-white">{session.candidate_name}</h2>
                        <span className="text-[11px] font-mono text-zinc-400 block mt-0.5">
                          ID: {session.session_id.slice(-12)}
                        </span>
                      </div>
                      <span
                        className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: `${riskColor}18`, color: riskColor, border: `1px solid ${riskColor}30` }}
                      >
                        {getRiskLabel(riskScore)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                      <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="text-[10px] uppercase font-mono text-zinc-500">Progress</div>
                        <div className="font-bold text-zinc-200 mt-0.5">
                          {session.questions_answered ?? 0} / {session.questions_total ?? 5} answered
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="text-[10px] uppercase font-mono text-zinc-500">State</div>
                        <div className="font-bold text-emerald-400 mt-0.5">
                          {session.exam_status === 'active' ? '● In Progress' : 'Submitted'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="label">Live Signals</div>
                      {session.timeline.length > 0 && (
                        <button
                          onClick={() => setShowReview(true)}
                          className="flex items-center gap-1 text-[11px] font-mono text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          <Search className="w-3.5 h-3.5" />
                          Replay
                        </button>
                      )}
                    </div>
                    <FeatureStats session={session} />
                  </div>
                </div>
              </div>

              {/* Real-Time Risk Chart */}
              <div className="rounded-3xl p-6 glass-hi" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="label mb-0.5">Continuous Risk Telemetry</div>
                    <span className="text-[11px] font-mono text-zinc-400">
                      {chartData.length} Real-time checkpoints evaluated
                    </span>
                  </div>
                  {chartData.length > 0 && (
                    <span className="text-sm font-bold font-mono" style={{ color: riskColor }}>
                      Latest: {chartData[chartData.length - 1]?.score ?? 0}
                    </span>
                  )}
                </div>
                <RiskChart data={chartData} color={riskColor} />
              </div>

              {/* Behavior Analysis Report Card */}
              <BehaviorAnalysisReport session={session} />

              {/* ConsentPulse Firewall & Boundary Test Panel */}
              <ConsentPanel subjectId={session?.session_id ?? null} />
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Integrity Index */}
              <IntegrityIndexCard riskScore={riskScore} hasSession={!!session} />

              {/* Live Timeline */}
              <div className="rounded-3xl p-6 glass-hi" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-zinc-400" />
                    <span className="label">Forensic Timeline</span>
                  </div>
                  {alertCount > 0 && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
                      {alertCount} Flagged
                    </span>
                  )}
                </div>
                <Timeline events={session?.timeline ?? []} />
              </div>
            </div>

          </div>
        ) : (
          <EmptyDashboardState />
        )}

      </div>
    </div>
  )
}
