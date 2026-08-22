'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { CheckCircle, Clock, Shield, CheckCircle2, Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useBehaviorTracker } from '@/hooks/useBehaviorTracker'
import { QUESTION_BANK, EXAM_NAME, EXAM_DURATION_MINUTES, type ExamQuestion } from '@/services/questionBank'
import { DEFAULT_CONSENT, grantConsent } from '@/services/consentApi'
import type { BehaviorSnapshot } from '@/types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

function humanize(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

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
  const [started, setStarted] = useState(false)
  const [showConsent, setShowConsent] = useState(false)
  const [consentChecked, setConsentChecked] = useState(false)
  const [consentSubmitting, setConsentSubmitting] = useState(false)
  const [consentError, setConsentError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [seconds, setSeconds] = useState(EXAM_DURATION_MINUTES * 60)
  const [result, setResult] = useState<ReturnType<typeof summarize> | null>(null)
  const [showSubmit, setShowSubmit] = useState(false)
  const queued = useRef<BehaviorSnapshot[]>([])
  const sessionId = useMemo(() => `exam-${crypto.randomUUID()}`, [])

  useEffect(() => {
    let active = true
    createClient().auth.getSession().then(({ data }) => {
      if (!active) return
      const session = data.session
      if (!session?.user) return
      const name = (session.user.user_metadata?.full_name as string | undefined) || session.user.email?.split('@')[0] || 'Candidate'
      setUser({ id: session.user.id, name, token: session.access_token })
    })
    return () => { active = false }
  }, [])

  const { send, isConnected } = useWebSocket({
    sessionId, candidateName: user?.name ?? 'Candidate', examName: EXAM_NAME,
    questionsTotal: questions.length,
    enabled: started && !submitted && !!user,
  })

  const onSnapshot = useCallback((snapshot: BehaviorSnapshot) => {
    if (isConnected) send({ type: 'behavior_snapshot', payload: snapshot })
    else queued.current = [...queued.current, snapshot].slice(-5)
  }, [isConnected, send])

  useBehaviorTracker({ sessionId, candidateName: user?.name ?? 'Candidate', onSnapshot, intervalMs: 3000, enabled: started && !submitted && !!user })

  useEffect(() => {
    if (!isConnected || queued.current.length === 0) return
    queued.current.splice(0).forEach(snapshot => send({ type: 'behavior_snapshot', payload: snapshot }))
  }, [isConnected, send])

  const answeredCount = Object.values(answers).filter(v => v.trim()).length
  useEffect(() => {
    if (!started || submitted || !isConnected) return
    send({ type: 'exam_progress', payload: { session_id: sessionId, questions_answered: answeredCount, questions_total: questions.length } })
  }, [answeredCount, started, submitted, isConnected, send, sessionId, questions.length])

  useEffect(() => {
    if (!started || submitted) return
    if (seconds <= 0) { setShowSubmit(true); return }
    const timer = setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000)
    return () => clearInterval(timer)
  }, [started, submitted, seconds])

  const openConsent = () => {
    setConsentChecked(false)
    setConsentError(null)
    setShowConsent(true)
  }

  const confirmConsentAndStart = async () => {
    if (!consentChecked || !user || consentSubmitting) return
    setConsentSubmitting(true)
    setConsentError(null)
    try {
      await grantConsent(sessionId)
      setShowConsent(false)
      setStarted(true)
    } catch {
      setConsentError('We could not record your consent. Please try again before starting the examination.')
    } finally {
      setConsentSubmitting(false)
    }
  }

  const submit = useCallback(async () => {
    setResult(summarize(questions, answers)); setSubmitted(true); setShowSubmit(false)
    if (user?.token) await fetch(`${API_BASE}/api/sessions/${sessionId}/end`, { method: 'POST', headers: { Authorization: `Bearer ${user.token}` } }).catch(() => {})
  }, [questions, answers, user, sessionId])

  if (!user) return <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface-0)', color: 'var(--text-0)' }}><div className="text-center"><Shield className="w-10 h-10 mx-auto mb-4" style={{ color: 'var(--brand)' }} /><h1 className="text-xl font-semibold">Sign in required</h1><p className="text-sm mt-2" style={{ color: 'var(--text-2)' }}>Please sign in before starting the examination.</p><Link href="/sign-in" className="inline-block mt-5 px-5 py-2.5 rounded-xl text-sm text-white" style={{ background: 'var(--brand)' }}>Sign in</Link></div></main>

  if (submitted && result) return <main className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--surface-0)' }}><div className="w-full max-w-lg text-center"><CheckCircle className="w-14 h-14 mx-auto mb-5" style={{ color: 'var(--risk-green)' }} /><h1 className="text-2xl font-bold" style={{ color: 'var(--text-0)' }}>Exam submitted</h1><p className="mt-2" style={{ color: 'var(--text-2)' }}>{EXAM_NAME}</p><div className="grid grid-cols-2 gap-3 mt-7"><div className="p-4 rounded-xl" style={{ background: 'var(--surface-1)' }}><b className="text-2xl">{result.answered}/{result.total}</b><div className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Questions answered</div></div><div className="p-4 rounded-xl" style={{ background: 'var(--surface-1)' }}><b className="text-2xl">{result.wordCount}</b><div className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Words written</div></div></div><p className="text-sm mt-6" style={{ color: 'var(--text-2)' }}>Your responses have been recorded and submitted for review.</p><p className="text-xs mt-2" style={{ color: 'var(--text-3)' }}>Session: {sessionId.slice(-12)}</p><Link href="/portal" className="inline-block mt-6 text-sm" style={{ color: '#A5B4FC' }}>Return to your workspace →</Link></div></main>

  if (!started) return <main className="min-h-screen flex items-center justify-center px-6 py-12" style={{ background: 'var(--surface-0)' }}><div className="w-full max-w-xl rounded-2xl p-8" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-1)' }}><div className="flex items-center gap-3 mb-7"><div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--brand)' }}><Shield className="w-5 h-5 text-white" /></div><div><div className="font-semibold" style={{ color: 'var(--text-0)' }}>ExamShield</div><div className="text-xs" style={{ color: 'var(--text-3)' }}>Secure examination</div></div></div><h1 className="text-2xl font-bold" style={{ color: 'var(--text-0)' }}>{EXAM_NAME}</h1><p className="mt-2 text-sm" style={{ color: 'var(--text-2)' }}>{questions.length} descriptive questions · {EXAM_DURATION_MINUTES} minutes</p><div className="mt-6 p-4 rounded-xl" style={{ background: 'rgba(99,102,241,.07)', border: '1px solid rgba(99,102,241,.18)' }}><p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>You are signed in as <b>{user.name}</b>. ExamShield monitors behavioral signals such as typing timing, mouse activity, tab switching and paste events. No camera or screen recording is used.</p></div><button onClick={openConsent} className="w-full mt-7 py-3 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--brand)' }}>Begin Examination</button></div>{showConsent && <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,.78)', backdropFilter: 'blur(8px)' }}><div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 sm:p-8" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-1)', boxShadow: '0 24px 80px rgba(0,0,0,.45)' }}><div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,.15)' }}><Shield className="w-5 h-5" style={{ color: 'var(--brand)' }} /></div><div><h2 className="text-xl font-bold" style={{ color: 'var(--text-0)' }}>ExamShield Consent</h2><p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Consent boundary · version {DEFAULT_CONSENT.version}</p></div></div><button onClick={() => setShowConsent(false)} disabled={consentSubmitting} className="p-2 rounded-lg" style={{ color: 'var(--text-3)' }} aria-label="Close"><X className="w-5 h-5" /></button></div><div className="mt-6 space-y-5"><div><h3 className="text-sm font-semibold" style={{ color: 'var(--text-0)' }}>What you are agreeing to</h3><p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--text-2)' }}>For examination integrity, ExamShield will monitor behavioral signals during this examination session and use them for real-time risk scoring.</p></div><div className="grid sm:grid-cols-2 gap-4"><div className="rounded-xl p-4" style={{ background: 'rgba(16,185,129,.06)', border: '1px solid rgba(16,185,129,.18)' }}><div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--risk-green)' }}>Allowed</div><ul className="space-y-2">{[...DEFAULT_CONSENT.purpose, ...DEFAULT_CONSENT.data_categories].map(item => <li key={item} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-1)' }}><CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--risk-green)' }} />{humanize(item)}</li>)}</ul></div><div className="rounded-xl p-4" style={{ background: 'rgba(239,68,68,.05)', border: '1px solid rgba(239,68,68,.16)' }}><div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--risk-red)' }}>Not authorized</div><ul className="space-y-2">{DEFAULT_CONSENT.prohibited_data.map(item => <li key={item} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-1)' }}><span style={{ color: 'var(--risk-red)' }}>×</span>{humanize(item)}</li>)}</ul></div></div><div className="rounded-xl p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-1)' }}><div className="grid sm:grid-cols-2 gap-3 text-xs"><div><span style={{ color: 'var(--text-3)' }}>Collection: </span><span style={{ color: 'var(--text-1)' }}>{humanize(DEFAULT_CONSENT.collection_scope)}</span></div><div><span style={{ color: 'var(--text-3)' }}>Processing: </span><span style={{ color: 'var(--text-1)' }}>{humanize(DEFAULT_CONSENT.processing_scope)}</span></div><div><span style={{ color: 'var(--text-3)' }}>Duration: </span><span style={{ color: 'var(--text-1)' }}>This exam session · up to {DEFAULT_CONSENT.duration_days} days for the consent record</span></div><div><span style={{ color: 'var(--text-3)' }}>Purpose: </span><span style={{ color: 'var(--text-1)' }}>{DEFAULT_CONSENT.purpose.map(humanize).join(', ')}</span></div></div></div><label className="flex items-start gap-3 p-4 rounded-xl cursor-pointer" style={{ background: consentChecked ? 'rgba(99,102,241,.09)' : 'var(--surface-2)', border: `1px solid ${consentChecked ? 'rgba(99,102,241,.45)' : 'var(--border-1)'}` }}><input type="checkbox" checked={consentChecked} onChange={e => setConsentChecked(e.target.checked)} disabled={consentSubmitting} className="mt-0.5 w-4 h-4 accent-indigo-500" /><span className="text-sm leading-relaxed" style={{ color: 'var(--text-1)' }}><b style={{ color: 'var(--text-0)' }}>I agree</b> to the ExamShield consent boundary above and understand that behavioral monitoring will be used for examination integrity during this session.</span></label>{consentError && <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)', color: '#FCA5A5' }}>{consentError}</div>}<div className="flex justify-end gap-3 pt-1"><button onClick={() => setShowConsent(false)} disabled={consentSubmitting} className="px-4 py-2.5 rounded-xl text-sm" style={{ border: '1px solid var(--border-1)', color: 'var(--text-2)' }}>Cancel</button><button onClick={() => void confirmConsentAndStart()} disabled={!consentChecked || consentSubmitting} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed" style={{ background: 'var(--brand)' }}>{consentSubmitting ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Recording consent…</span> : 'Agree & Start Examination'}</button></div></div></div>}</main>

  const q = questions[index], mins = Math.floor(seconds / 60), secs = seconds % 60
  return <main className="min-h-screen" style={{ background: 'var(--surface-0)' }}><header className="sticky top-0 z-30 px-6 py-3 flex items-center justify-between" style={{ background: 'var(--surface-1)', borderBottom: '1px solid var(--border-0)' }}><div><b style={{ color: 'var(--text-0)' }}>{EXAM_NAME}</b><div className="text-xs" style={{ color: 'var(--text-3)' }}>{user.name} · {answeredCount}/{questions.length} answered</div></div><div className="flex items-center gap-4"><span className="text-xs" style={{ color: isConnected ? 'var(--risk-green)' : 'var(--risk-yellow)' }}>{isConnected ? '● Monitoring' : '● Connecting'}</span><span className="font-mono text-sm" style={{ color: seconds < 300 ? 'var(--risk-red)' : 'var(--text-1)' }}><Clock className="inline w-4 h-4 mr-1" />{String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}</span><button onClick={() => setShowSubmit(true)} className="px-3 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: 'var(--brand)' }}>Submit</button></div></header><div className="max-w-5xl mx-auto px-6 py-8 grid lg:grid-cols-[1fr_240px] gap-5"><section className="rounded-2xl p-6" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-1)' }}><div className="text-xs mb-3" style={{ color: 'var(--text-3)' }}>Question {index + 1} of {questions.length} · {q.category}</div><h2 className="text-lg font-semibold leading-relaxed mb-5" style={{ color: 'var(--text-0)' }}>{q.question}</h2><textarea value={answers[q.id] ?? ''} onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))} rows={16} placeholder={q.placeholder} className="w-full rounded-xl p-4 text-sm outline-none resize-y leading-relaxed" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-1)', color: 'var(--text-0)', minHeight: '18rem' }} /><div className="flex justify-end mt-1.5 text-[11px]" style={{ color: 'var(--text-3)' }}>{(answers[q.id] ?? '').split(/\s+/).filter(Boolean).length} words</div><div className="flex justify-between mt-5"><button disabled={index === 0} onClick={() => setIndex(i => i - 1)} className="px-4 py-2 rounded-lg text-xs disabled:opacity-30" style={{ border: '1px solid var(--border-1)', color: 'var(--text-2)' }}>Previous</button>{index === questions.length - 1 ? <button onClick={() => setShowSubmit(true)} className="px-4 py-2 rounded-lg text-xs text-white" style={{ background: 'var(--brand)' }}>Submit Exam</button> : <button onClick={() => setIndex(i => i + 1)} className="px-4 py-2 rounded-lg text-xs text-white" style={{ background: 'var(--brand)' }}>Next</button>}</div></section><aside className="rounded-2xl p-4 h-fit" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-1)' }}><div className="text-xs font-semibold mb-3" style={{ color: 'var(--text-0)' }}>Questions</div><div className="grid grid-cols-5 gap-1.5">{questions.map((item, i) => <button key={item.id} onClick={() => setIndex(i)} className="aspect-square rounded-lg text-[11px]" style={{ background: i === index ? 'rgba(99,102,241,.18)' : answers[item.id]?.trim() ? 'rgba(16,185,129,.10)' : 'var(--surface-3)', border: `1px solid ${i === index ? 'var(--brand)' : 'var(--border-0)'}`, color: 'var(--text-2)' }}>{i + 1}</button>)}</div></aside></div>{showSubmit && <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,.7)' }}><div className="w-full max-w-sm rounded-2xl p-6" style={{ background: 'var(--surface-1)' }}><h2 className="font-semibold" style={{ color: 'var(--text-0)' }}>Submit examination?</h2><p className="text-sm mt-2" style={{ color: 'var(--text-2)' }}>Answered {answeredCount}/{questions.length}. Unanswered {questions.length - answeredCount}.</p><div className="flex justify-end gap-2 mt-6"><button onClick={() => setShowSubmit(false)} className="px-4 py-2 rounded-lg text-xs" style={{ border: '1px solid var(--border-1)', color: 'var(--text-2)' }}>Cancel</button><button onClick={() => void submit()} className="px-4 py-2 rounded-lg text-xs text-white" style={{ background: 'var(--brand)' }}>Confirm Submit</button></div></div></div>}</main>
}
