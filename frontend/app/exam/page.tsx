'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Shield, Clock, AlertCircle, CheckCircle } from 'lucide-react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useBehaviorTracker } from '@/hooks/useBehaviorTracker'
import type { RiskAssessment, BehaviorSnapshot } from '@/types'

const SESSION_ID     = `exam-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
const CANDIDATE_NAME = 'Demo Candidate'

const QUESTIONS = [
  {
    id: 1,
    text: "Describe the key challenges facing India's examination system and propose two technology-driven solutions that ensure fairness and security without compromising student privacy.",
  },
  {
    id: 2,
    text: 'Explain behavioral biometrics and how it differs from traditional biometric systems. What advantages does it offer for remote proctoring at scale?',
  },
  {
    id: 3,
    text: 'A student scores significantly better on online exams than in-person tests. List five behavioral indicators that an AI system could analyze to determine whether this gap indicates dishonesty.',
  },
]

/* ─── Exam timer ─────────────────────────────────────────────────────────── */
function ExamTimer({ mins }: { mins: number }) {
  const [left, setLeft] = useState(mins * 60)
  useEffect(() => {
    const t = setInterval(() => setLeft(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [])
  const m = Math.floor(left / 60), s = left % 60
  const isLow = left < 300
  return (
    <div className="flex items-center gap-1.5 text-sm font-mono tabnum"
      style={{ color: isLow ? 'var(--risk-red)' : 'var(--text-2)' }}>
      <Clock className="w-3.5 h-3.5" />
      {String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function ExamPage() {
  const [started,    setStarted]    = useState(false)
  const [submitted,  setSubmitted]  = useState(false)
  const [answers,    setAnswers]    = useState<Record<number,string>>({ 1:'', 2:'', 3:'' })
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null)
  const queueRef = useRef<BehaviorSnapshot[]>([])

  const handleRisk = useCallback((a: RiskAssessment) => setAssessment(a), [])
  const { send, connectionState, isConnected } = useWebSocket({
    sessionId: SESSION_ID, candidateName: CANDIDATE_NAME,
    onRiskUpdate: handleRisk, enabled: started && !submitted,
  })

  useEffect(() => {
    if (!isConnected || !queueRef.current.length) return
    queueRef.current.splice(0).forEach(snap =>
      send({ type: 'behavior_snapshot', payload: snap })
    )
  }, [isConnected, send])

  const handleSnapshot = useCallback((snap: BehaviorSnapshot) => {
    if (!started || submitted) return
    if (isConnected) send({ type: 'behavior_snapshot', payload: snap })
    else queueRef.current = [...queueRef.current, snap].slice(-5)
  }, [started, submitted, isConnected, send])

  useBehaviorTracker({
    sessionId: SESSION_ID, candidateName: CANDIDATE_NAME,
    onSnapshot: handleSnapshot, intervalMs: 3000, enabled: started && !submitted,
  })

  /* ── Submitted ─────────────────────────────────────────────────────────── */
  if (submitted) return (
    <div className="min-h-screen flex items-center justify-center px-6"
      style={{ background: 'var(--surface-0)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22,1,0.36,1] }}
        className="text-center max-w-md">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type:'spring', stiffness:280, damping:20, delay:0.12 }}
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{
            background: 'rgba(16,185,129,0.10)',
            border: '1px solid rgba(16,185,129,0.20)',
            boxShadow: '0 0 28px rgba(16,185,129,0.18)',
          }}>
          <CheckCircle className="w-8 h-8" style={{ color: 'var(--risk-green)' }} />
        </motion.div>
        <h1 className="text-2xl font-bold mb-2 tracking-tight" style={{ color: 'var(--text-0)' }}>
          Exam submitted
        </h1>
        <p className="mb-1" style={{ color: 'var(--text-2)' }}>Your responses have been recorded.</p>
        <p className="text-xs font-mono mb-10" style={{ color: 'var(--text-3)' }}>
          Session · {SESSION_ID.slice(-10)}
        </p>
        <Link href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white rounded-xl"
          style={{ background: 'var(--brand)', boxShadow: '0 0 20px rgba(99,102,241,0.35)' }}>
          View Admin Dashboard →
        </Link>
      </motion.div>
    </div>
  )

  /* ── Pre-exam screen ───────────────────────────────────────────────────── */
  if (!started) return (
    <div className="min-h-screen flex items-center justify-center px-6"
      style={{ background: 'var(--surface-0)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.50, ease: [0.22,1,0.36,1] }}
        className="max-w-md w-full">
        <div className="rounded-2xl p-8"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border-1)' }}>

          {/* Logo + product name */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'var(--brand)',
                boxShadow: '0 0 18px rgba(99,102,241,0.40)',
              }}>
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold tracking-tight" style={{ color: 'var(--text-0)' }}>ExamShield</h1>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                AI behavioral monitoring · No camera required
              </p>
            </div>
          </div>

          {/* Exam details */}
          <ul className="space-y-2.5 mb-8">
            {[
              '45 minutes · 3 questions, all required',
              'AI behavioral monitoring active throughout',
              'Tab switches and paste events are recorded',
              'No camera, screen recording, or content capture',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm"
                style={{ color: 'var(--text-2)' }}>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                  style={{ background: 'var(--brand)' }} />
                {item}
              </li>
            ))}
          </ul>

          {/* Privacy notice — given more visual weight to signal trust */}
          <div className="p-4 rounded-xl mb-8"
            style={{
              background: 'rgba(99,102,241,0.07)',
              border: '1px solid rgba(99,102,241,0.18)',
              borderLeft: '3px solid rgba(99,102,241,0.55)',
            }}>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(165,180,252,0.80)' }}>
              <span className="font-semibold" style={{ color: '#A5B4FC' }}>Privacy notice: </span>
              ExamShield captures only keystroke timing intervals and mouse activity counts.
              No content, camera, or screen data is ever collected or stored.
            </p>
          </div>

          {/* Candidate field */}
          <div className="mb-6">
            <div className="label mb-1.5">Candidate</div>
            <div className="px-3 py-2.5 rounded-xl text-sm font-mono"
              style={{
                background: 'var(--surface-3)',
                border: '1px solid var(--border-1)',
                color: 'var(--text-1)',
              }}>
              {CANDIDATE_NAME}
            </div>
          </div>

          <button onClick={() => setStarted(true)}
            className="w-full py-3 text-sm font-medium text-white rounded-xl
                       transition-all duration-200 active:scale-[0.98]"
            style={{
              background: 'var(--brand)',
              boxShadow: '0 0 22px rgba(99,102,241,0.32)',
            }}>
            Begin Exam
          </button>
        </div>
      </motion.div>
    </div>
  )

  /* ── Active exam ───────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-0)' }}>

      {/* Sticky header */}
      <header className="nav-blur sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--brand)' }}>
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-0)' }}>ExamShield</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Connection status — pulsing dot when connected */}
            <div className="flex items-center gap-1.5">
              {isConnected ? (
                <>
                  <div className="w-1.5 h-1.5 rounded-full pulse-low"
                    style={{ background: 'var(--risk-green)', flexShrink: 0 }} />
                  <span className="text-[11px] hidden sm:block" style={{ color: '#6EE7B7', opacity: 0.70 }}>
                    Monitoring
                  </span>
                </>
              ) : (
                <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                  {connectionState}
                </span>
              )}
            </div>

            <ExamTimer mins={45} />
          </div>
        </div>
      </header>

      {/* Questions */}
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-5">
        <div>
          <h1 className="text-lg font-semibold tracking-tight mb-1"
            style={{ color: 'var(--text-0)' }}>
            Demo Examination
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>
            Answer all three questions. AI behavioral analysis runs in the background.
          </p>
        </div>

        {QUESTIONS.map((q, idx) => (
          <motion.div key={q.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08, duration: 0.45, ease: [0.22,1,0.36,1] }}
            className="rounded-2xl p-6"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border-0)' }}>
            <div className="flex items-start gap-3 mb-5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{
                  background: 'rgba(99,102,241,0.10)',
                  border: '1px solid rgba(99,102,241,0.20)',
                }}>
                <span className="text-xs font-bold" style={{ color: '#818CF8' }}>{q.id}</span>
              </div>
              <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-1)' }}>{q.text}</p>
            </div>
            <textarea
              value={answers[q.id]}
              onChange={e => setAnswers(p => ({ ...p, [q.id]: e.target.value }))}
              placeholder="Type your answer here…"
              rows={6}
              className="w-full text-sm placeholder:text-white/18 resize-none rounded-xl px-4 py-3
                         focus:outline-none transition-all duration-200 leading-relaxed"
              style={{
                background: 'var(--surface-3)',
                border: '1px solid var(--border-0)',
                color: 'var(--text-1)',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.40)' }}
              onBlur={e =>  { e.currentTarget.style.borderColor = 'var(--border-0)' }}
            />
            <div className="mt-2 text-[11px] text-right font-mono tabnum" style={{ color: 'var(--text-3)' }}>
              {answers[q.id].trim().split(/\s+/).filter(Boolean).length} words
            </div>
          </motion.div>
        ))}

        {/* Monitoring notice */}
        <div className="flex items-start gap-3 p-4 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-0)' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--text-3)' }} />
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>
            ExamShield monitors keystroke timing, mouse movement, and browser focus.
            No camera or screen content is captured.{' '}
            <Link href="/dashboard" className="underline underline-offset-2"
              style={{ color: 'rgba(129,140,248,0.65)' }}>
              Open the admin dashboard
            </Link>{' '}
            in another tab to see your live risk score update every 3 seconds.
          </p>
        </div>

        <div className="flex justify-end pb-12">
          <button onClick={() => setSubmitted(true)}
            className="px-8 py-3 text-sm font-medium text-white rounded-xl
                       transition-all duration-200 active:scale-[0.97]"
            style={{
              background: 'var(--brand)',
              boxShadow: '0 0 18px rgba(99,102,241,0.28)',
            }}>
            Submit Exam
          </button>
        </div>
      </main>
    </div>
  )
}
