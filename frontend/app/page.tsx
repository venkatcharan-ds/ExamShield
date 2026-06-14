'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link'
import {
  Shield, EyeOff, Brain, Activity, ChevronRight,
  Keyboard, MousePointer, LayoutGrid, Zap,
  XCircle, CheckCircle2,
} from 'lucide-react'

/* ─── Easing curves ──────────────────────────────────────────────────────── */
const EASE = [0.22, 1, 0.36, 1] as const

const rise = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: EASE, delay },
})

const fade = (delay = 0) => ({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.45, delay },
})

/* ─── Scroll-triggered wrapper ───────────────────────────────────────────── */
function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 22 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  )
}

/* ─── Simulated live event log ───────────────────────────────────────────── */
const EVENTS = [
  { t: '14:32:05', msg: 'Session 0042 started — monitoring active', type: 'ok' },
  { t: '14:35:17', msg: 'Tab switch detected — risk 35', type: 'warn' },
  { t: '14:35:29', msg: 'Paste event — answer block inserted — risk 76', type: 'alert' },
  { t: '14:35:31', msg: 'Risk level escalated to HIGH — admin notified', type: 'alert' },
  { t: '14:38:02', msg: '148 candidates — 147 clear — 1 flagged', type: 'ok' },
]

const EVENT_COLOR = { ok: '#10B981', warn: '#F59E0B', alert: '#EF4444' }

function LiveLog() {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5"
        style={{ background: 'rgba(0,0,0,0.35)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex gap-1.5">
          {['#EF4444','#F59E0B','#10B981'].map(c => (
            <div key={c} className="w-2.5 h-2.5 rounded-full opacity-50" style={{ background: c }} />
          ))}
        </div>
        <span className="text-[11px] ml-1 font-mono" style={{ color: 'rgba(255,255,255,0.22)' }}>
          examshield — live event stream
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-low" />
          <span className="text-[10px] font-medium" style={{ color: '#10B981', opacity: 0.7 }}>LIVE</span>
        </div>
      </div>
      {/* Events */}
      <div className="p-4 space-y-2" style={{ background: 'rgba(0,0,0,0.20)' }}>
        {EVENTS.map((e, i) => (
          <motion.div key={i} className="flex items-start gap-3 font-mono text-[11px]"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9 + i * 0.16, duration: 0.4 }}>
            <span className="tabnum flex-shrink-0" style={{ color: 'rgba(255,255,255,0.22)' }}>{e.t}</span>
            <span style={{ color: EVENT_COLOR[e.type as keyof typeof EVENT_COLOR] }}>{e.msg}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--surface-0)' }}>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="nav-blur fixed top-0 inset-x-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: 'var(--brand)',
                boxShadow: '0 0 14px rgba(99,102,241,0.40)',
              }}>
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold tracking-tight" style={{ color: 'var(--text-0)' }}>
              ExamShield
            </span>
          </Link>

          <div className="hidden sm:flex items-center">
            {([
              ['/','Home'],
              ['/exam','Student Exam'],
              ['/dashboard','Dashboard'],
            ] as [string,string][]).map(([href, label]) => (
              <Link key={href} href={href}
                className="px-3 py-1.5 text-sm rounded-lg transition-colors duration-150"
                style={{ color: 'var(--text-2)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-0)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-2)')}>
                {label}
              </Link>
            ))}
          </div>

          <Link href="/dashboard"
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-xl
                       transition-all duration-200 active:scale-[0.96]"
            style={{
              background: 'var(--brand)',
              boxShadow: '0 0 18px rgba(99,102,241,0.32)',
            }}>
            Open Dashboard
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="mesh-hero relative pt-36 pb-24 px-6 overflow-hidden">
        {/* Ambient orbs */}
        <div className="float-a absolute top-12 left-1/4 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.13) 0%, transparent 70%)', filter: 'blur(56px)' }} />
        <div className="float-b absolute bottom-0 right-1/4 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 70%)', filter: 'blur(48px)' }} />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div {...fade(0.1)}
            className="inline-flex items-center gap-2 mb-8 px-3.5 py-1.5 rounded-full text-xs font-medium"
            style={{
              color: '#A5B4FC',
              background: 'rgba(99,102,241,0.10)',
              border: '1px solid rgba(99,102,241,0.22)',
            }}>
            <Zap className="w-3 h-3" />
            FAR AWAY 2026 · Examinations Track · India
          </motion.div>

          {/* Headline — two lines, tightly tracked */}
          <motion.h1 {...rise(0.16)}
            className="font-bold tracking-tight leading-[1.06] mb-6"
            style={{
              fontSize: 'clamp(2.2rem,5.5vw,3.8rem)',
              color: 'var(--text-0)',
            }}>
            Exam integrity
            <br />
            <span style={{
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              backgroundImage: 'linear-gradient(128deg, #818CF8 0%, #6366F1 38%, #10B981 100%)',
            }}>
              without surveillance
            </span>
          </motion.h1>

          {/* Subhead — the product line */}
          <motion.p {...rise(0.24)}
            className="text-lg mb-3 max-w-xl mx-auto leading-relaxed"
            style={{ color: 'var(--text-2)' }}>
            No camera. No screen recording. No face recognition.
          </motion.p>
          <motion.p {...rise(0.30)}
            className="text-[15px] mb-12 max-w-2xl mx-auto leading-relaxed"
            style={{ color: 'var(--text-1)', opacity: 0.75 }}>
            ExamShield uses keystroke dynamics, mouse patterns, and focus signals
            to detect cheating — protecting student privacy completely.
          </motion.p>

          {/* CTAs */}
          <motion.div {...rise(0.38)}
            className="flex flex-col sm:flex-row gap-3 justify-center mb-16">
            <Link href="/exam"
              className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-medium
                         text-white rounded-xl transition-all duration-200 active:scale-[0.97]"
              style={{
                background: 'var(--brand)',
                boxShadow: '0 0 22px rgba(99,102,241,0.38)',
              }}>
              Take the Demo Exam
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-medium
                         rounded-xl transition-all duration-200"
              style={{
                color: 'var(--text-1)',
                border: '1px solid var(--border-1)',
              }}>
              <Activity className="w-4 h-4" />
              Live Admin Dashboard
            </Link>
          </motion.div>

          {/* Live log widget */}
          <motion.div {...rise(0.48)} className="max-w-lg mx-auto">
            <LiveLog />
          </motion.div>
        </div>

        {/* Stats strip */}
        <motion.div {...rise(0.60)}
          className="relative z-10 max-w-xl mx-auto mt-14 grid grid-cols-3 rounded-2xl overflow-hidden"
          style={{ border: '1px solid var(--border-1)', background: 'rgba(255,255,255,0.025)' }}>
          {[
            { v: '50M+', l: 'Students affected yearly' },
            { v: '6',    l: 'Paper leaks — India 2024' },
            { v: '0',    l: 'Cameras required' },
          ].map((s, i) => (
            <div key={i}
              className="py-6 text-center"
              style={{
                borderRight: i < 2 ? '1px solid var(--border-0)' : 'none',
              }}>
              <div className="text-2xl font-bold mb-0.5 tabnum" style={{ color: 'var(--text-0)' }}>{s.v}</div>
              <div className="text-[11px]" style={{ color: 'var(--text-3)' }}>{s.l}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── Problem ──────────────────────────────────────────────────────── */}
      <section className="py-28 px-6" style={{ borderTop: '1px solid var(--border-0)' }}>
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-14">
            <div className="label mb-3">The problem</div>
            <h2 className="text-3xl font-bold tracking-tight mb-4" style={{ color: 'var(--text-0)' }}>
              Surveillance is not integrity
            </h2>
            <p className="text-[15px] max-w-md mx-auto" style={{ color: 'var(--text-2)' }}>
              Every existing solution forces privacy violations on students — especially
              those in Tier 2/3 cities with limited bandwidth and no quality webcam.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                icon: '📷',
                title: 'Camera surveillance',
                desc: 'Students recorded via webcam throughout. 60% of Indian candidates lack reliable cameras or stable internet.',
                borderColor: 'rgba(239,68,68,0.15)',
              },
              {
                icon: '🖥',
                title: 'Screen recording',
                desc: 'Continuous capture creates massive privacy liabilities and fails on low-bandwidth connections.',
                borderColor: 'rgba(245,158,11,0.12)',
              },
              {
                icon: '⚠️',
                title: 'False positives',
                desc: 'Looking away is flagged as cheating. Anxious students and those with disabilities are penalised unfairly.',
                borderColor: 'rgba(245,158,11,0.12)',
              },
            ].map((c, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <div className="h-full p-6 rounded-2xl transition-all duration-300"
                  style={{
                    background: 'var(--surface-1)',
                    border: `1px solid ${c.borderColor}`,
                  }}>
                  <div className="text-2xl mb-4">{c.icon}</div>
                  <h3 className="font-semibold mb-2 text-[15px]" style={{ color: 'var(--text-0)' }}>{c.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{c.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Solution flow ─────────────────────────────────────────────────── */}
      <section className="py-28 px-6" style={{
        borderTop: '1px solid var(--border-0)',
        background: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(99,102,241,0.05) 0%, transparent 70%)',
      }}>
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-14">
            <div className="label mb-3">How it works</div>
            <h2 className="text-3xl font-bold tracking-tight mb-4" style={{ color: 'var(--text-0)' }}>
              Behaviour, not appearance
            </h2>
            <p className="text-[15px] max-w-lg mx-auto" style={{ color: 'var(--text-2)' }}>
              ExamShield listens to <em>how</em> you type — never <em>what</em> you type.
              Timing metadata only. No content. No camera.
            </p>
          </Reveal>

          <div className="flex flex-col md:flex-row items-stretch gap-3">
            {[
              { Icon: Keyboard,     label: 'Student activity',  sub: 'Keystroke timing · mouse movement · focus events', c: '#6366F1' },
              { Icon: Brain,        label: 'Behavioral AI',     sub: 'Isolation Forest anomaly detection model',         c: '#818CF8' },
              { Icon: Activity,     label: 'Risk analysis',     sub: 'Score 0–100 updated every 3 seconds',             c: '#F59E0B' },
              { Icon: Shield,       label: 'Admin alert',       sub: 'Live flag · event log · instant notification',    c: '#10B981' },
            ].map(({ Icon, label, sub, c }, i) => (
              <Reveal key={i} delay={i * 0.07} className="flex-1">
                <div className="relative h-full p-5 rounded-2xl text-center"
                  style={{ background: 'var(--surface-1)', border: '1px solid var(--border-0)' }}>
                  <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center"
                    style={{ background: `${c}18`, border: `1px solid ${c}28` }}>
                    <Icon className="w-5 h-5" style={{ color: c }} />
                  </div>
                  <p className="font-medium text-sm mb-1" style={{ color: 'var(--text-0)' }}>{label}</p>
                  <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-3)' }}>{sub}</p>
                  {/* connector */}
                  {i < 3 && (
                    <div className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10
                                    w-4 items-center justify-center">
                      <ChevronRight className="w-3 h-3" style={{ color: 'var(--text-3)' }} />
                    </div>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="py-28 px-6" style={{ borderTop: '1px solid var(--border-0)' }}>
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-14">
            <div className="label mb-3">Capabilities</div>
            <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-0)' }}>
              Built for Indian scale
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              { Icon: EyeOff,       title: 'Privacy-first by design', desc: 'Zero camera, zero screen recording. Keystroke timing metadata only — GDPR-compliant and built for India\'s data protection standards.' },
              { Icon: Brain,        title: 'Real ML, not rule-based',  desc: 'Isolation Forest anomaly detection, pre-trained on 600 diverse behavioral samples. Handles slow thinkers, fast typists, every style.' },
              { Icon: Activity,     title: 'Live risk scoring',        desc: 'Score updates every 3 seconds from a live WebSocket feed. The gauge moves the moment behaviour changes.' },
              { Icon: MousePointer, title: 'Eight behavioral signals', desc: 'Keystroke dynamics, mouse entropy, idle periods, tab switches, focus loss, copy/paste — fused into one AI score.' },
              { Icon: LayoutGrid,   title: 'Enterprise dashboard',     desc: 'Invigilators see every candidate simultaneously. Live gauge, event timeline, behavioral charts, and instant alerts.' },
              { Icon: Zap,          title: 'Works on 2G',              desc: 'No hardware, no install. Runs in any modern browser. Built for Tier 2 and Tier 3 India from day one.' },
            ].map(({ Icon, title, desc }, i) => (
              <Reveal key={i} delay={(i % 2) * 0.06}>
                <div className="flex gap-4 p-6 rounded-2xl transition-all duration-250 group"
                  style={{ background: 'var(--surface-1)', border: '1px solid var(--border-0)' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--border-1)'
                    e.currentTarget.style.background = 'var(--surface-2)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border-0)'
                    e.currentTarget.style.background = 'var(--surface-1)'
                  }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.18)' }}>
                    <Icon className="w-[18px] h-[18px]" style={{ color: '#818CF8' }} />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1.5 text-[15px]" style={{ color: 'var(--text-0)' }}>{title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison ───────────────────────────────────────────────────── */}
      <section className="py-28 px-6 relative overflow-hidden"
        style={{
          borderTop: '1px solid var(--border-0)',
          background: 'radial-gradient(ellipse 70% 50% at 50% 100%, rgba(99,102,241,0.06) 0%, transparent 70%)',
        }}>

        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <Reveal className="text-center mb-14">
            <div className="label mb-3">Why ExamShield</div>
            <h2 className="text-3xl font-bold tracking-tight mb-4" style={{ color: 'var(--text-0)' }}>
              A fundamentally different approach
            </h2>
            <p className="text-[15px] max-w-lg mx-auto leading-relaxed" style={{ color: 'var(--text-2)' }}>
              Every existing proctoring tool treats surveillance as integrity.
              ExamShield proves they are not the same thing.
            </p>
          </Reveal>

          {/* Comparison grid */}
          <div className="relative grid md:grid-cols-2 gap-4 items-start">

            {/* Traditional card */}
            <Reveal delay={0.05}>
              <div className="rounded-2xl overflow-hidden h-full"
                style={{
                  background: 'rgba(239,68,68,0.03)',
                  border: '1px solid rgba(239,68,68,0.14)',
                }}>

                {/* Card header */}
                <div className="px-6 py-5 flex items-center justify-between"
                  style={{ borderBottom: '1px solid rgba(239,68,68,0.10)' }}>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest mb-1"
                      style={{ color: 'rgba(239,68,68,0.55)' }}>
                      Traditional
                    </div>
                    <div className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>
                      Camera-Based Proctoring
                    </div>
                  </div>
                  <span className="text-[10px] font-medium px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{
                      background: 'rgba(239,68,68,0.10)',
                      border: '1px solid rgba(239,68,68,0.20)',
                      color: '#FCA5A5',
                    }}>
                    Status quo
                  </span>
                </div>

                {/* Items */}
                <div className="px-6 py-5 space-y-3">
                  {[
                    { label: 'Continuous camera observation',  sub: 'Students recorded throughout the session' },
                    { label: 'Room surveillance required',     sub: 'Background scanning raises privacy concerns' },
                    { label: 'High bandwidth dependency',      sub: 'Fails on connections below 5 Mbps' },
                    { label: 'Privacy risk at every layer',    sub: 'GDPR exposure, data retention liability' },
                    { label: 'Hardware dependency',            sub: 'Webcam, microphone, and stable power required' },
                  ].map((item, i) => (
                    <motion.div
                      key={item.label}
                      className="flex items-start gap-3"
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: '-40px' }}
                      transition={{ duration: 0.38, ease: EASE, delay: 0.1 + i * 0.06 }}
                    >
                      <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: 'rgba(239,68,68,0.10)' }}>
                        <XCircle className="w-3.5 h-3.5" style={{ color: '#F87171' }} />
                      </div>
                      <div>
                        <div className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                          {item.label}
                        </div>
                        <div className="text-[11px] mt-0.5 leading-snug" style={{ color: 'var(--text-3)' }}>
                          {item.sub}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Card footer */}
                <div className="px-6 py-4 mx-5 mb-5 rounded-xl"
                  style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.10)' }}>
                  <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(252,165,165,0.65)' }}>
                    60% of Indian examination candidates lack reliable webcams or stable
                    broadband — making traditional proctoring exclusionary by design.
                  </p>
                </div>
              </div>
            </Reveal>

            {/* VS pill — visible only on md+ */}
            <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10
                            w-9 h-9 rounded-full items-center justify-center"
              style={{
                background: 'var(--surface-0)',
                border: '1px solid var(--border-1)',
                boxShadow: '0 0 24px rgba(0,0,0,0.40)',
              }}>
              <span className="text-[10px] font-bold" style={{ color: 'var(--text-3)' }}>VS</span>
            </div>

            {/* ExamShield card */}
            <Reveal delay={0.12}>
              <div className="rounded-2xl overflow-hidden h-full"
                style={{
                  background: 'rgba(99,102,241,0.04)',
                  border: '1px solid rgba(99,102,241,0.22)',
                  boxShadow: '0 0 40px rgba(99,102,241,0.08)',
                }}>

                {/* Brand gradient accent line */}
                <div className="h-0.5 w-full"
                  style={{ background: 'linear-gradient(90deg, #6366F1 0%, #818CF8 50%, #10B981 100%)' }} />

                {/* Card header */}
                <div className="px-6 py-5 flex items-center justify-between"
                  style={{ borderBottom: '1px solid rgba(99,102,241,0.10)' }}>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest mb-1"
                      style={{ color: 'rgba(129,140,248,0.70)' }}>
                      ExamShield
                    </div>
                    <div className="text-base font-semibold" style={{ color: 'var(--text-0)' }}>
                      Interaction-Based Assessment
                    </div>
                  </div>
                  <span className="text-[10px] font-medium px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{
                      background: 'rgba(16,185,129,0.10)',
                      border: '1px solid rgba(16,185,129,0.22)',
                      color: '#6EE7B7',
                    }}>
                    Privacy-first
                  </span>
                </div>

                {/* Items */}
                <div className="px-6 py-5 space-y-3">
                  {[
                    { label: 'Interaction-based assessment',   sub: 'Keystroke timing and focus signals only — no footage' },
                    { label: 'No camera required',             sub: 'Zero visual surveillance at any point' },
                    { label: 'No microphone required',         sub: 'Audio capture is never requested or used' },
                    { label: 'Runs on 2G bandwidth',           sub: 'Under 10 KB/s — works anywhere in India' },
                    { label: 'Privacy-first architecture',     sub: 'Timing metadata only, no content ever stored' },
                  ].map((item, i) => (
                    <motion.div
                      key={item.label}
                      className="flex items-start gap-3"
                      initial={{ opacity: 0, x: 10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: '-40px' }}
                      transition={{ duration: 0.38, ease: EASE, delay: 0.16 + i * 0.06 }}
                    >
                      <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: 'rgba(16,185,129,0.12)' }}>
                        <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#34D399' }} />
                      </div>
                      <div>
                        <div className="text-sm font-medium" style={{ color: 'var(--text-0)' }}>
                          {item.label}
                        </div>
                        <div className="text-[11px] mt-0.5 leading-snug" style={{ color: 'var(--text-3)' }}>
                          {item.sub}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Card footer */}
                <div className="px-6 py-4 mx-5 mb-5 rounded-xl"
                  style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.12)' }}>
                  <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(110,231,183,0.70)' }}>
                    Deployable via any modern browser. No installation. No hardware procurement.
                    Ready for 1,000,000 concurrent candidates on day one.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Differentiator strip */}
          <Reveal delay={0.20} className="mt-6">
            <div className="grid grid-cols-3 rounded-2xl overflow-hidden"
              style={{ border: '1px solid var(--border-1)', background: 'rgba(255,255,255,0.018)' }}>
              {[
                { value: '0',     unit: 'Cameras',      sub: 'required' },
                { value: '0',     unit: 'Microphones',  sub: 'required' },
                { value: '2G',    unit: 'Bandwidth',    sub: 'minimum' },
              ].map((s, i) => (
                <div key={s.unit}
                  className="py-6 text-center"
                  style={{ borderRight: i < 2 ? '1px solid var(--border-0)' : 'none' }}>
                  <div className="text-2xl font-bold tabnum mb-0.5"
                    style={{
                      background: 'linear-gradient(128deg, #818CF8, #10B981)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}>
                    {s.value}
                  </div>
                  <div className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>{s.unit}</div>
                  <div className="text-[10px]" style={{ color: 'var(--text-3)' }}>{s.sub}</div>
                </div>
              ))}
            </div>
          </Reveal>

        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-28 px-6 relative overflow-hidden"
        style={{ borderTop: '1px solid var(--border-0)' }}>
        {/* Dot grid texture */}
        <div className="dot-grid absolute inset-0 opacity-40 pointer-events-none" />
        <Reveal className="relative z-10 max-w-2xl mx-auto text-center">
          <div className="label mb-4">See it in action</div>
          <h2 className="text-3xl font-bold tracking-tight mb-4" style={{ color: 'var(--text-0)' }}>
            Open both tabs simultaneously
          </h2>
          <p className="text-[15px] mb-10 leading-relaxed" style={{ color: 'var(--text-2)' }}>
            Launch the student exam and admin dashboard side by side.
            Type normally — then paste something — and watch the gauge turn red in real time.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/exam"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5
                         text-sm font-medium text-white rounded-xl transition-all duration-200 active:scale-[0.97]"
              style={{
                background: 'var(--brand)',
                boxShadow: '0 0 22px rgba(99,102,241,0.35)',
              }}>
              Student Exam Portal
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5
                         text-sm font-medium rounded-xl transition-all duration-200"
              style={{ color: 'var(--text-1)', border: '1px solid var(--border-1)' }}>
              Admin Dashboard
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="py-8 px-6" style={{ borderTop: '1px solid var(--border-0)' }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: 'var(--brand)' }}>
              <Shield className="w-3 h-3 text-white" />
            </div>
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>
              ExamShield · FAR AWAY 2026 · Built in 24 hours
            </span>
          </div>
          <span className="text-xs" style={{ color: 'var(--text-3)', opacity: 0.7 }}>
            No camera. No surveillance. Just AI.
          </span>
        </div>
      </footer>
    </div>
  )
}
