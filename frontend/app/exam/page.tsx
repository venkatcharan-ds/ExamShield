'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, CheckCircle2, Clock, AlertTriangle, ChevronRight,
  ChevronLeft, Lock, Sparkles, FileText, Check, ShieldCheck,
  EyeOff, Terminal, ArrowRight, CornerDownRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useBehaviorTracker } from '@/hooks/useBehaviorTracker'
import { QUESTION_BANK, EXAM_NAME, EXAM_DURATION_MINUTES, type ExamQuestion } from '@/services/questionBank'
import { grantConsent } from '@/services/consentApi'
import type { BehaviorSnapshot, RiskAssessment } from '@/types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

function summarize(questions: ExamQuestion[], answers: Record<string, string>) {
  let answered = 0, wordCount = 0
  for (const q of questions) {
    const text = answers[q.id]?.trim() ?? ''
    if (text) {
      answered++
      wordCount += text.split(/\s+/).filter(Boolean).length
    }
  }
  return { answered, unanswered: questions.length - answered, wordCount, total: questions.length }
}

export default function ExamPage() {
  const [questions] = useState(QUESTION_BANK)
  const [user, setUser] = useState<{ id: string; name: string; token: string } | null>(null)
  const [loadingAuth, setLoadingAuth] = useState(true)

  const [showConsentModal, setShowConsentModal] = useState(false)
  const [consentAgreed, setConsentAgreed] = useState(false)
  const [consentGranting, setConsentGranting] = useState(false)

  const [started, setStarted] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [seconds, setSeconds] = useState(EXAM_DURATION_MINUTES * 60)
  const [result, setResult] = useState<ReturnType<typeof summarize> | null>(null)
  const [risk, setRisk] = useState<RiskAssessment | null>(null)
  const [showSubmitModal, setShowSubmitModal] = useState(false)

  const queued = useRef<BehaviorSnapshot[]>([])
  const sessionId = useMemo(() => `exam-${crypto.randomUUID()}`, [])

  /* Supabase session check */
  useEffect(() => {
    let active = true
    createClient().auth.getSession().then(({ data }) => {
      if (!active) return
      const session = data.session
      if (session?.user) {
        const name =
          (session.user.user_metadata?.full_name as string | undefined) ||
          session.user.email?.split('@')[0] ||
          'Candidate'
        setUser({ id: session.user.id, name, token: session.access_token })
      }
      setLoadingAuth(false)
    })
    return () => { active = false }
  }, [])

  /* Risk callback from WebSocket */
  const onRisk = useCallback((assessment: RiskAssessment) => setRisk(assessment), [])

  /* Live WebSocket connection */
  const { send, isConnected } = useWebSocket({
    sessionId,
    candidateName: user?.name ?? 'Candidate',
    examName: EXAM_NAME,
    questionsTotal: questions.length,
    onRiskUpdate: onRisk,
    enabled: started && !submitted && !!user,
  })

  /* Behavioral tracker */
  const onSnapshot = useCallback((snapshot: BehaviorSnapshot) => {
    if (isConnected) {
      send({ type: 'behavior_snapshot', payload: snapshot })
    } else {
      queued.current = [...queued.current, snapshot].slice(-5)
    }
  }, [isConnected, send])

  useBehaviorTracker({
    sessionId,
    candidateName: user?.name ?? 'Candidate',
    onSnapshot,
    intervalMs: 3000,
    enabled: started && !submitted && !!user,
  })

  /* Drain queued snapshots once connected */
  useEffect(() => {
    if (!isConnected || queued.current.length === 0) return
    queued.current.splice(0).forEach(snapshot => send({ type: 'behavior_snapshot', payload: snapshot }))
  }, [isConnected, send])

  /* Stream answer progress updates */
  const answeredCount = Object.values(answers).filter(v => v.trim()).length
  useEffect(() => {
    if (!started || submitted || !isConnected) return
    send({
      type: 'exam_progress',
      payload: {
        session_id: sessionId,
        questions_answered: answeredCount,
        questions_total: questions.length,
      },
    })
  }, [answeredCount, started, submitted, isConnected, send, sessionId, questions.length])

  /* Exam timer countdown */
  useEffect(() => {
    if (!started || submitted) return
    if (seconds <= 0) {
      setShowSubmitModal(true)
      return
    }
    const timer = setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000)
    return () => clearInterval(timer)
  }, [started, submitted, seconds])

  /* Handle Consent & Begin */
  const handleConfirmConsent = async () => {
    if (!consentAgreed) return
    setConsentGranting(true)
    try {
      await grantConsent(sessionId, {
        purpose: ['examination_integrity'],
        data_categories: ['keystroke_timing', 'mouse_movement', 'tab_switching'],
        collection_scope: 'session_only',
        processing_scope: 'real_time_risk_scoring',
      })
    } catch {
      // Allow fallback if backend runs in mock or local mode
    } finally {
      setConsentGranting(false)
      setShowConsentModal(false)
      setStarted(true)
    }
  }

  /* Submit Exam */
  const submitExam = useCallback(async () => {
    const summary = summarize(questions, answers)
    setResult(summary)
    setSubmitted(true)
    setShowSubmitModal(false)
    if (user?.token) {
      await fetch(`${API_BASE}/api/sessions/${sessionId}/end`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}` },
      }).catch(() => {})
    }
  }, [questions, answers, user, sessionId])

  /* ── 1. Loading State ── */
  if (loadingAuth) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface-0)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
          <span className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>Verifying credentials…</span>
        </div>
      </main>
    )
  }

  /* ── 2. Unauthenticated State ── */
  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 relative" style={{ background: 'var(--surface-0)' }}>
        <div className="cyber-grid absolute inset-0 opacity-25 pointer-events-none" />
        <div className="max-w-md w-full p-8 rounded-3xl text-center glass-hi relative z-10" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.30)' }}>
            <Shield className="w-6 h-6 text-indigo-400" />
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--text-0)' }}>
            Candidate Sign In Required
          </h1>
          <p className="text-xs leading-relaxed mb-6" style={{ color: 'var(--text-2)' }}>
            You must be signed in with your candidate credentials to access the examination environment and record your verified score.
          </p>
          <div className="flex flex-col gap-2.5">
            <Link
              href="/student/sign-in"
              className="py-3 text-xs font-semibold text-white rounded-xl transition-all duration-200"
              style={{ background: 'var(--brand)', boxShadow: '0 0 20px rgba(99,102,241,0.35)' }}
            >
              Sign In to Candidate Portal
            </Link>
            <Link
              href="/"
              className="py-3 text-xs font-medium rounded-xl transition-all duration-200"
              style={{ color: 'var(--text-2)', border: '1px solid var(--border-0)' }}
            >
              Return to Homepage
            </Link>
          </div>
        </div>
      </main>
    )
  }

  /* ── 3. Submission Complete Receipt ── */
  if (submitted && result) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 py-12 relative" style={{ background: 'var(--surface-0)' }}>
        <div className="cyber-grid absolute inset-0 opacity-25 pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-xl w-full p-8 md:p-10 rounded-3xl glass-hi relative z-10 text-center"
          style={{
            border: '1px solid rgba(16,185,129,0.30)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.60), 0 0 40px rgba(16,185,129,0.12)',
          }}
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-emerald-500/10 border border-emerald-500/25">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>

          <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
            Examination Complete
          </span>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1 mb-2" style={{ color: 'var(--text-0)' }}>
            Assessment Successfully Submitted
          </h1>
          <p className="text-xs md:text-sm mb-8" style={{ color: 'var(--text-2)' }}>
            {EXAM_NAME}
          </p>

          <div className="grid grid-cols-2 gap-3.5 mb-8">
            <div className="p-4 rounded-2xl text-left bg-white/[0.02] border border-white/5">
              <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                Questions Answered
              </div>
              <div className="text-2xl font-bold mt-1 tabnum" style={{ color: 'var(--text-0)' }}>
                {result.answered} <span className="text-sm font-normal text-zinc-500">/ {result.total}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl text-left bg-white/[0.02] border border-white/5">
              <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                Total Words Written
              </div>
              <div className="text-2xl font-bold mt-1 tabnum text-indigo-400">
                {result.wordCount}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 text-left text-xs mb-8 space-y-2">
            <div className="flex justify-between items-center text-zinc-400">
              <span>Candidate:</span>
              <span className="font-medium text-zinc-200">{user.name}</span>
            </div>
            <div className="flex justify-between items-center text-zinc-400">
              <span>Session ID:</span>
              <span className="font-mono text-[11px] text-zinc-300">{sessionId}</span>
            </div>
            <div className="flex justify-between items-center text-zinc-400">
              <span>Privacy Integrity:</span>
              <span className="text-emerald-400 font-medium">✓ Zero Video Capture</span>
            </div>
          </div>

          <Link
            href="/portal"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-xs font-semibold text-white rounded-xl transition-all duration-200"
            style={{ background: 'var(--brand)', boxShadow: '0 0 20px rgba(99,102,241,0.35)' }}
          >
            Return to Candidate Workspace
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>
      </main>
    )
  }

  /* ── 4. Pre-Exam Briefing & Consent Modal Trigger ── */
  if (!started) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 py-12 relative" style={{ background: 'var(--surface-0)' }}>
        <div className="cyber-grid absolute inset-0 opacity-25 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-xl w-full p-8 md:p-10 rounded-3xl glass-hi relative z-10"
          style={{
            border: '1px solid rgba(99,102,241,0.25)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.60), 0 0 35px rgba(99,102,241,0.10)',
          }}
        >
          <div className="flex items-center gap-3.5 mb-6">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                boxShadow: '0 0 20px rgba(99,102,241,0.40)',
              }}
            >
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight" style={{ color: 'var(--text-0)' }}>
                ExamShield Secure Assessment
              </div>
              <div className="text-[11px] font-mono" style={{ color: '#818CF8' }}>
                Privacy-Preserving Telemetry
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: 'var(--text-0)' }}>
            {EXAM_NAME}
          </h1>
          <p className="text-xs md:text-sm mb-6" style={{ color: 'var(--text-2)' }}>
            {questions.length} descriptive questions · {EXAM_DURATION_MINUTES} minutes maximum time
          </p>

          <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-6">
            <div className="text-xs font-semibold text-indigo-300 mb-1">
              Candidate Identity Verified
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Signed in as <b className="text-white">{user.name}</b>. ExamShield monitors behavioral signals (keystroke rhythm, typing intervals, mouse movement, window blur transitions). No camera or screen recording is ever used.
            </p>
          </div>

          <div className="space-y-2.5 mb-8 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Full keyboard and typing dynamics analysis enabled</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Consent Firewall verified under DPDP &amp; GDPR principles</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Zero client installation required</span>
            </div>
          </div>

          <button
            onClick={() => setShowConsentModal(true)}
            className="w-full py-4 text-sm font-semibold text-white rounded-2xl transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
              boxShadow: '0 0 25px rgba(99,102,241,0.40)',
            }}
          >
            Review Consent &amp; Start Examination
            <ChevronRight className="w-4 h-4" />
          </button>
        </motion.div>

        {/* ── Consent Modal (Steps 5, 6, 7) ── */}
        <AnimatePresence>
          {showConsentModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(2,4,10,0.85)', backdropFilter: 'blur(16px)' }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-lg w-full p-7 md:p-8 rounded-3xl glass-hi"
                style={{
                  border: '1px solid rgba(99,102,241,0.30)',
                  boxShadow: '0 30px 80px rgba(0,0,0,0.70)',
                }}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-indigo-500/15 border border-indigo-500/30">
                    <Lock className="w-4.5 h-4.5 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: 'var(--text-0)' }}>
                      Candidate Privacy &amp; Consent
                    </h2>
                    <div className="text-[11px] font-mono text-zinc-400">
                      ConsentPulse™ Enforced Boundary
                    </div>
                  </div>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed mb-5">
                  Before beginning your examination, review the exact scope of data collection. ExamShield operates under strict cryptographic and behavioral integrity:
                </p>

                <div className="space-y-3 mb-6 text-xs">
                  <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                    <div className="font-semibold text-emerald-400 mb-1 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Authorized Collection (Active)
                    </div>
                    <p className="text-zinc-400 text-[11.5px] leading-relaxed">
                      Keystroke timing metadata, mouse movement velocity entropy, window focus transitions, and text paste frequency.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                    <div className="font-semibold text-red-400 mb-1 flex items-center gap-1.5">
                      <EyeOff className="w-3.5 h-3.5" />
                      Strictly Excluded &amp; Prohibited
                    </div>
                    <p className="text-zinc-400 text-[11.5px] leading-relaxed">
                      Zero webcam recording, zero microphone audio, zero screen capture, and zero text keylogging.
                    </p>
                  </div>
                </div>

                {/* "I agree" Checkbox (Requirement 6) */}
                <label className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 cursor-pointer mb-6 hover:bg-white/[0.04] transition-colors">
                  <input
                    type="checkbox"
                    checked={consentAgreed}
                    onChange={e => setConsentAgreed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-zinc-700 text-indigo-600 focus:ring-indigo-500 bg-zinc-900"
                  />
                  <span className="text-xs text-zinc-200 leading-snug">
                    I agree to privacy-preserving behavioral monitoring for the duration of this examination session.
                  </span>
                </label>

                {/* Actions (Requirement 7) */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConsentModal(false)}
                    className="flex-1 py-3 text-xs font-semibold rounded-xl text-zinc-400 hover:text-zinc-200 border border-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => void handleConfirmConsent()}
                    disabled={!consentAgreed || consentGranting}
                    className="flex-[2] py-3 text-xs font-semibold text-white rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{
                      background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                      boxShadow: consentAgreed ? '0 0 20px rgba(99,102,241,0.40)' : 'none',
                    }}
                  >
                    {consentGranting ? 'Authorizing Boundary…' : 'Agree & Start Examination'}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    )
  }

  /* ── 5. Live 5-Question Exam Interface ── */
  const q = questions[index]
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  const isTimeCritical = seconds < 300
  const currentAnswer = answers[q.id] ?? ''
  const currentWords = currentAnswer.trim().split(/\s+/).filter(Boolean).length
  const currentChars = currentAnswer.length
  const progressPercent = Math.round((answeredCount / questions.length) * 100)

  return (
    <main className="min-h-screen relative flex flex-col" style={{ background: 'var(--surface-0)' }}>
      {/* Background ambience */}
      <div className="cyber-grid absolute inset-0 opacity-15 pointer-events-none" />

      {/* Header bar */}
      <header className="sticky top-0 z-30 px-6 h-16 flex items-center justify-between nav-blur">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-indigo-500/20 border border-indigo-500/30">
            <Shield className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight" style={{ color: 'var(--text-0)' }}>
              {EXAM_NAME}
            </div>
            <div className="text-[11px] text-zinc-400 font-mono">
              Candidate: <span className="text-zinc-200">{user.name}</span> · {answeredCount}/{questions.length} Answered
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* WebSocket Monitoring indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-mono">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 pulse-low' : 'bg-amber-400'}`} />
            <span style={{ color: isConnected ? '#6EE7B7' : '#FCD34D' }}>
              {isConnected ? 'Telemetry Active · Encrypted' : 'Connecting…'}
            </span>
          </div>

          {/* Countdown Clock */}
          <div
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono text-sm font-bold tabnum"
            style={{
              background: isTimeCritical ? 'rgba(239,68,68,0.12)' : 'var(--surface-2)',
              border: `1px solid ${isTimeCritical ? 'rgba(239,68,68,0.30)' : 'var(--border-1)'}`,
              color: isTimeCritical ? '#F87171' : 'var(--text-0)',
            }}
          >
            <Clock className="w-4 h-4" />
            <span>{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</span>
          </div>

          {/* Submit button */}
          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-4 py-2 text-xs font-semibold text-white rounded-xl transition-all duration-150"
            style={{
              background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
              boxShadow: '0 0 16px rgba(99,102,241,0.30)',
            }}
          >
            Submit Exam
          </button>
        </div>
      </header>

      {/* Main Examination Workspace */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 grid lg:grid-cols-[1fr_260px] gap-6 relative z-10">

        {/* Question & Answer Card */}
        <section
          className="rounded-3xl p-7 md:p-8 flex flex-col justify-between glass-hi"
          style={{
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.50)',
          }}
        >
          <div>
            {/* Question meta */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full text-indigo-400 bg-indigo-500/10 border border-indigo-500/20">
                Question {index + 1} of {questions.length} · {q.category}
              </span>
              <span className="text-[11px] font-mono text-zinc-500">
                Long-form descriptive
              </span>
            </div>

            {/* Question Prompt */}
            <h2 className="text-base md:text-lg font-semibold leading-relaxed mb-6" style={{ color: 'var(--text-0)' }}>
              {q.question}
            </h2>

            {/* Answer Textarea */}
            <div className="relative">
              <textarea
                value={answers[q.id] ?? ''}
                onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                rows={14}
                placeholder={q.placeholder}
                className="w-full rounded-2xl p-5 text-sm outline-none resize-y leading-relaxed font-sans transition-all duration-200"
                style={{
                  background: 'rgba(6,9,20,0.80)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: 'var(--text-0)',
                  minHeight: '18rem',
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = 'rgba(99,102,241,0.55)'
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(99,102,241,0.15)'
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />

              {/* Counters */}
              <div className="flex items-center justify-between px-2 pt-2 text-[11px] font-mono text-zinc-500">
                <span>{currentChars} characters</span>
                <span className="text-indigo-400 font-semibold">{currentWords} words</span>
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/5">
            <button
              disabled={index === 0}
              onClick={() => setIndex(i => i - 1)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 disabled:opacity-25 disabled:cursor-not-allowed"
              style={{ border: '1px solid var(--border-1)', color: 'var(--text-2)' }}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            {index === questions.length - 1 ? (
              <button
                onClick={() => setShowSubmitModal(true)}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold text-white transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  boxShadow: '0 0 20px rgba(16,185,129,0.35)',
                }}
              >
                Review &amp; Submit
                <Check className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setIndex(i => i + 1)}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold text-white transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                  boxShadow: '0 0 20px rgba(99,102,241,0.35)',
                }}
              >
                Next Question
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </section>

        {/* Question Navigator Sidebar */}
        <aside className="space-y-4">
          <div
            className="rounded-3xl p-5 glass-hi"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="label">Exam Navigator</span>
              <span className="text-[10px] font-mono text-zinc-400">{progressPercent}% Done</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-4">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400"
                style={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* 5 Questions Grid */}
            <div className="grid grid-cols-5 gap-2 mb-4">
              {questions.map((item, i) => {
                const isCurrent = i === index
                const isAnswered = Boolean(answers[item.id]?.trim())
                return (
                  <button
                    key={item.id}
                    onClick={() => setIndex(i)}
                    className="aspect-square rounded-xl text-xs font-mono font-semibold transition-all duration-150 flex items-center justify-center relative"
                    style={{
                      background: isCurrent
                        ? 'rgba(99,102,241,0.25)'
                        : isAnswered
                          ? 'rgba(16,185,129,0.12)'
                          : 'var(--surface-3)',
                      border: `1px solid ${
                        isCurrent
                          ? 'var(--brand)'
                          : isAnswered
                            ? 'rgba(16,185,129,0.30)'
                            : 'var(--border-0)'
                      }`,
                      color: isCurrent ? 'white' : isAnswered ? '#6EE7B7' : 'var(--text-3)',
                      boxShadow: isCurrent ? '0 0 12px rgba(99,102,241,0.30)' : 'none',
                    }}
                  >
                    {i + 1}
                    {isAnswered && (
                      <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    )}
                  </button>
                )
              })}
            </div>

            <div className="pt-3 border-t border-white/5 text-[11px] text-zinc-500 space-y-1">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-indigo-400" />
                <span>Current Question</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-zinc-700" />
                <span>Unanswered ({questions.length - answeredCount})</span>
              </div>
            </div>
          </div>

          {/* Privacy Assurance info card */}
          <div className="rounded-3xl p-5 bg-white/[0.02] border border-white/5 text-xs text-zinc-400 space-y-2">
            <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
              <Lock className="w-3.5 h-3.5 text-indigo-400" />
              Privacy Assurance
            </div>
            <p className="text-[11.5px] leading-relaxed text-zinc-500">
              ExamShield monitors typing dynamics and focus events. Your raw answer content is never used for proctoring.
            </p>
          </div>
        </aside>

      </div>

      {/* ── Submission Confirmation Modal (Requirement 11) ── */}
      <AnimatePresence>
        {showSubmitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(2,4,10,0.85)', backdropFilter: 'blur(16px)' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="max-w-md w-full p-7 rounded-3xl glass-hi"
              style={{
                border: '1px solid rgba(255,255,255,0.10)',
                boxShadow: '0 25px 60px rgba(0,0,0,0.70)',
              }}
            >
              <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-0)' }}>
                Submit Examination?
              </h2>
              <p className="text-xs text-zinc-300 mb-6 leading-relaxed">
                You have answered <b className="text-white">{answeredCount}</b> of <b className="text-white">{questions.length}</b> questions ({questions.length - answeredCount} unanswered). Once submitted, your responses are finalized and recorded for examiner evaluation.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="flex-1 py-3 text-xs font-semibold rounded-xl text-zinc-400 hover:text-zinc-200 border border-white/10 transition-colors"
                >
                  Continue Writing
                </button>
                <button
                  onClick={() => void submitExam()}
                  className="flex-1 py-3 text-xs font-semibold text-white rounded-xl transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                    boxShadow: '0 0 20px rgba(99,102,241,0.40)',
                  }}
                >
                  Confirm &amp; Submit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
