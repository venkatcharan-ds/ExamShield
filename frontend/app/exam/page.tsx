'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Shield, Clock, AlertCircle, CheckCircle, ChevronLeft, ChevronRight, Send, X } from 'lucide-react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useBehaviorTracker } from '@/hooks/useBehaviorTracker'
import { QUESTION_BANK, EXAM_NAME, EXAM_DURATION_MINUTES, shuffleQuestions, type ExamQuestion, type QuestionDifficulty } from '@/services/questionBank'
import type { RiskAssessment, BehaviorSnapshot } from '@/types'

const SESSION_ID     = `exam-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
const CANDIDATE_NAME = 'Demo Candidate'
const API_BASE        = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

const DIFFICULTY_COLOR: Record<QuestionDifficulty, string> = {
  easy: '#22C55E', medium: '#F59E0B', hard: '#EF4444',
}

interface GradeResult {
  correct: number
  incorrect: number
  unanswered: number
  total: number
  percentage: number
}

function gradeExam(questions: ExamQuestion[], answers: Record<string, number>): GradeResult {
  let correct = 0, incorrect = 0, unanswered = 0
  for (const q of questions) {
    const given = answers[q.id]
    if (given === undefined) unanswered++
    else if (given === q.correctIndex) correct++
    else incorrect++
  }
  return { correct, incorrect, unanswered, total: questions.length, percentage: Math.round((correct / questions.length) * 100) }
}

/* ─── Exam timer ─────────────────────────────────────────────────────────── */
function ExamTimer({ mins, onExpire }: { mins: number; onExpire?: () => void }) {
  const [left, setLeft] = useState(mins * 60)
  const firedRef = useRef(false)
  useEffect(() => {
    const t = setInterval(() => setLeft(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    if (left === 0 && !firedRef.current) {
      firedRef.current = true
      onExpire?.()
    }
  }, [left, onExpire])
  const m = Math.floor(left / 60), s = left % 60
  const isLow = left < 300
  return (
    <div className="flex items-center gap-1.5 text-sm font-mono tabnum"
      style={{ color: isLow ? 'var(--risk-red)' : 'var(--text-2)' }}>
      <Clock className={`w-3.5 h-3.5 ${isLow ? 'pulse-high' : ''}`} />
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </div>
  )
}

/* ─── Question navigator ─────────────────────────────────────────────────── */
function QuestionNavigator({
  total, current, answeredSet, onJump,
}: { total: number; current: number; answeredSet: Set<number>; onJump: (i: number) => void }) {
  return (
    <div className="grid grid-cols-6 lg:grid-cols-5 gap-1.5">
      {Array.from({ length: total }).map((_, i) => {
        const answered = answeredSet.has(i)
        const isCurrent = i === current
        return (
          <button key={i} onClick={() => onJump(i)}
            aria-label={`Go to question ${i + 1}${answered ? ' (answered)' : ' (unanswered)'}`}
            aria-current={isCurrent ? 'true' : undefined}
            className="aspect-square rounded-lg text-[11px] font-semibold flex items-center justify-center transition-all duration-150"
            style={{
              background: isCurrent ? 'rgba(99,102,241,0.18)' : answered ? 'rgba(16,185,129,0.10)' : 'var(--surface-3)',
              border: `1.5px solid ${isCurrent ? 'var(--brand)' : answered ? 'rgba(16,185,129,0.35)' : 'var(--border-1)'}`,
              color: isCurrent ? '#A5B4FC' : answered ? '#6EE7B7' : 'var(--text-3)',
            }}>
            {i + 1}
          </button>
        )
      })}
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function ExamPage() {
  const [questions] = useState<ExamQuestion[]>(() => shuffleQuestions(QUESTION_BANK))
  const [started,    setStarted]    = useState(false)
  const [submitted,  setSubmitted]  = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers,    setAnswers]    = useState<Record<string, number>>({})
  const [showConfirm, setShowConfirm] = useState(false)
  const [results,    setResults]    = useState<GradeResult | null>(null)
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null)
  const queueRef = useRef<BehaviorSnapshot[]>([])

  const handleRisk = useCallback((a: RiskAssessment) => setAssessment(a), [])
  const { send, connectionState, isConnected } = useWebSocket({
    sessionId: SESSION_ID, candidateName: CANDIDATE_NAME,
    examName: EXAM_NAME, questionsTotal: questions.length,
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

  // Real exam progress — reported to the same session the risk engine and
  // ConsentPulse already track, so the admin dashboard reflects genuine
  // question-answering progress, not a guess.
  const answeredCount = Object.keys(answers).length
  useEffect(() => {
    if (!started || submitted || !isConnected) return
    send({
      type: 'exam_progress',
      payload: { session_id: SESSION_ID, questions_answered: answeredCount, questions_total: questions.length },
    })
  }, [answeredCount, started, submitted, isConnected, send, questions.length])

  const selectAnswer = useCallback((qid: string, idx: number) => {
    setAnswers(prev => ({ ...prev, [qid]: idx }))
  }, [])

  const doSubmit = useCallback(() => {
    setResults(gradeExam(questions, answers))
    setSubmitted(true)
    setShowConfirm(false)
    // Best-effort — marks the session completed so the dashboard shows an
    // accurate status; harmless if it fails (e.g. backend asleep).
    fetch(`${API_BASE}/api/sessions/${SESSION_ID}/end`, { method: 'POST' }).catch(() => {})
  }, [questions, answers])

  const answeredSet = new Set(questions.map((q, i) => (answers[q.id] !== undefined ? i : -1)).filter(i => i >= 0))

  /* ── Results ────────────────────────────────────────────────────────────── */
  if (submitted && results) return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{ background: 'var(--surface-0)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="text-center max-w-md w-full">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 20, delay: 0.12 }}
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
        <p className="mb-6" style={{ color: 'var(--text-2)' }}>{EXAM_NAME}</p>

        <div className="rounded-2xl p-6 mb-6 text-left"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border-1)' }}>
          <div className="flex items-baseline justify-between mb-5">
            <div className="label">Score</div>
            <div className="text-3xl font-bold tabnum" style={{ color: 'var(--text-0)' }}>
              {results.correct}<span className="text-base font-medium" style={{ color: 'var(--text-3)' }}>/{results.total}</span>
              <span className="ml-2 text-base font-semibold" style={{ color: 'var(--brand)' }}>({results.percentage}%)</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { l: 'Correct',    v: results.correct,    c: 'var(--risk-green)' },
              { l: 'Incorrect',  v: results.incorrect,  c: 'var(--risk-red)' },
              { l: 'Unanswered', v: results.unanswered, c: 'var(--text-3)' },
            ].map(s => (
              <div key={s.l} className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-3)' }}>
                <div className="text-xl font-bold tabnum mb-0.5" style={{ color: s.c }}>{s.v}</div>
                <div className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>{s.l}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 flex items-center justify-between text-xs" style={{ borderTop: '1px solid var(--border-0)', color: 'var(--text-3)' }}>
            <span>Completion status</span>
            <span className="font-medium" style={{ color: 'var(--risk-green)' }}>Completed</span>
          </div>
        </div>

        <p className="text-xs font-mono mb-8" style={{ color: 'var(--text-3)' }}>
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
    <div className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{ background: 'var(--surface-0)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.50, ease: [0.22, 1, 0.36, 1] }}
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

          <div className="mb-6">
            <div className="label mb-1.5">Examination</div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-0)' }}>{EXAM_NAME}</h2>
          </div>

          {/* Exam details */}
          <ul className="space-y-2.5 mb-8">
            {[
              `${EXAM_DURATION_MINUTES} minutes · ${QUESTION_BANK.length} multiple-choice questions`,
              'Covers data structures, algorithms, databases, Python, statistics, ML, networks & OS',
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
  const q = questions[currentIndex]
  const isLast = currentIndex === questions.length - 1

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-0)' }}>

      {/* Submit confirmation */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-sm rounded-2xl p-6"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border-1)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold" style={{ color: 'var(--text-0)' }}>Submit exam?</h3>
                <button onClick={() => setShowConfirm(false)} style={{ color: 'var(--text-3)' }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="rounded-xl p-4 mb-5" style={{ background: 'var(--surface-3)' }}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span style={{ color: 'var(--text-2)' }}>Answered</span>
                  <span className="font-semibold tabnum" style={{ color: 'var(--risk-green)' }}>{answeredCount} / {questions.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: 'var(--text-2)' }}>Unanswered</span>
                  <span className="font-semibold tabnum" style={{ color: questions.length - answeredCount > 0 ? 'var(--risk-amber)' : 'var(--text-3)' }}>
                    {questions.length - answeredCount}
                  </span>
                </div>
              </div>
              <p className="text-xs leading-relaxed mb-5" style={{ color: 'var(--text-3)' }}>
                Are you sure you want to submit? You won&rsquo;t be able to change your answers afterward.
              </p>
              <div className="flex gap-2.5">
                <button onClick={() => setShowConfirm(false)}
                  className="flex-1 py-2.5 text-sm font-medium rounded-xl"
                  style={{ color: 'var(--text-1)', border: '1px solid var(--border-1)' }}>
                  Keep working
                </button>
                <button onClick={doSubmit}
                  className="flex-1 py-2.5 text-sm font-medium text-white rounded-xl"
                  style={{ background: 'var(--brand)' }}>
                  Submit exam
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sticky header */}
      <header className="nav-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--brand)' }}>
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold truncate hidden sm:block" style={{ color: 'var(--text-0)' }}>{EXAM_NAME}</span>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
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

            <ExamTimer mins={EXAM_DURATION_MINUTES} onExpire={doSubmit} />

            <button onClick={() => setShowConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-all duration-150"
              style={{ background: 'var(--brand)' }}>
              <Send className="w-3 h-3" />
              Submit
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 grid lg:grid-cols-[1fr_280px] gap-5">
        {/* Question card */}
        <motion.div
          key={q.id}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl p-6"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border-0)' }}>
          <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
            <span className="label">Question {currentIndex + 1} / {questions.length}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}>
                {q.category}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium capitalize"
                style={{ background: `${DIFFICULTY_COLOR[q.difficulty]}18`, color: DIFFICULTY_COLOR[q.difficulty] }}>
                {q.difficulty}
              </span>
            </div>
          </div>

          <p className="text-[15px] leading-relaxed whitespace-pre-line mb-6" style={{ color: 'var(--text-1)' }}>
            {q.question}
          </p>

          <div className="space-y-2.5">
            {q.options.map((opt, idx) => {
              const selected = answers[q.id] === idx
              return (
                <button key={idx} onClick={() => selectAnswer(q.id, idx)}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm flex items-start gap-3 transition-all duration-150"
                  style={{
                    background: selected ? 'rgba(99,102,241,0.12)' : 'var(--surface-3)',
                    border: `1px solid ${selected ? 'var(--brand)' : 'var(--border-1)'}`,
                    color: selected ? '#C7D2FE' : 'var(--text-1)',
                  }}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5"
                    style={{
                      background: selected ? 'var(--brand)' : 'var(--surface-2)',
                      color: selected ? 'white' : 'var(--text-3)',
                    }}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="whitespace-pre-line leading-relaxed">{opt}</span>
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between mt-6 pt-5" style={{ borderTop: '1px solid var(--border-0)' }}>
            <button onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ color: 'var(--text-1)', border: '1px solid var(--border-1)' }}>
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </button>
            {isLast ? (
              <button onClick={() => setShowConfirm(true)}
                className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white rounded-xl"
                style={{ background: 'var(--brand)' }}>
                Review &amp; Submit
              </button>
            ) : (
              <button onClick={() => setCurrentIndex(i => Math.min(questions.length - 1, i + 1))}
                className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white rounded-xl"
                style={{ background: 'var(--brand)' }}>
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </motion.div>

        {/* Sidebar — navigator */}
        <div className="space-y-4">
          <div className="rounded-2xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-0)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="label">Progress</span>
              <span className="text-xs font-semibold tabnum" style={{ color: 'var(--risk-green)' }}>
                {answeredCount}/{questions.length}
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden mb-4" style={{ background: 'var(--surface-3)' }}>
              <div className="h-full rounded-full transition-all duration-300"
                style={{ width: `${(answeredCount / questions.length) * 100}%`, background: 'var(--risk-green)' }} />
            </div>
            <QuestionNavigator
              total={questions.length}
              current={currentIndex}
              answeredSet={answeredSet}
              onJump={setCurrentIndex}
            />
            <div className="flex items-center gap-3 mt-4 pt-3 text-[10px]" style={{ borderTop: '1px solid var(--border-0)', color: 'var(--text-3)' }}>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#6EE7B7' }} />Answered</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: 'var(--surface-3)', border: '1px solid var(--border-1)' }} />Unanswered</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: 'var(--brand)' }} />Current</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-4 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-0)' }}>
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--text-3)' }} />
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-3)' }}>
              Keystroke timing, mouse movement, and focus are monitored throughout — including while
              you navigate between questions.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
