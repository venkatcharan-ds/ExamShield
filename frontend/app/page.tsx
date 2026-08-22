'use client'

import { useRef, useState, useEffect } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import ThreeBackground from '@/components/ThreeBackground'
import {
  Shield, EyeOff, Brain, Activity, ChevronRight,
  Keyboard, MousePointer, LayoutGrid, Zap,
  XCircle, CheckCircle2, ShieldCheck, Lock,
  Cpu, Terminal, ArrowRight, Sparkles, Radio,
} from 'lucide-react'

/* ─── Easing curves ──────────────────────────────────────────────────────── */
const EASE = [0.16, 1, 0.3, 1] as const // cinematic cubic-bezier

const rise = (delay = 0) => ({
  initial: { opacity: 0, y: 22 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.65, ease: EASE, delay },
})

const fade = (delay = 0) => ({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.5, delay },
})

/* ─── Scroll-triggered reveal wrapper ────────────────────────────────────── */
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
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  )
}

/* ─── Simulated live event stream ────────────────────────────────────────── */
const LIVE_EVENTS = [
  { t: '14:32:05', msg: 'Session exam-0042 initiated — telemetry active', type: 'ok' },
  { t: '14:35:17', msg: 'Focus transition: window blur event detected', type: 'warn' },
  { t: '14:35:29', msg: 'Paste anomaly: 340 chars inserted in 12ms — risk 76', type: 'alert' },
  { t: '14:35:31', msg: 'Anomaly flagged in SOC dashboard — admin notified', type: 'alert' },
  { t: '14:38:02', msg: 'Consent Firewall: Unauthorized camera request BLOCKED', type: 'shield' },
  { t: '14:40:15', msg: 'Candidate 148 — typing rhythm aligned with baseline', type: 'ok' },
]

const EVENT_STYLES = {
  ok: { color: '#34D399', bg: 'rgba(16,185,129,0.12)', label: 'CLEARED' },
  warn: { color: '#FBBF24', bg: 'rgba(245,158,11,0.12)', label: 'WARNING' },
  alert: { color: '#F87171', bg: 'rgba(239,68,68,0.14)', label: 'CRITICAL' },
  shield: { color: '#818CF8', bg: 'rgba(99,102,241,0.14)', label: 'FIREWALL' },
}

function LiveLog() {
  const [activeIdx, setActiveIdx] = useState(3)

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx(prev => (prev + 1) % LIVE_EVENTS.length)
    }, 3200)
    return () => clearInterval(timer)
  }, [])

  return (
    <div
      className="rounded-2xl overflow-hidden glass-hi"
      style={{
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.60), 0 0 30px rgba(99,102,241,0.12)',
      }}
    >
      {/* Title bar */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ background: 'rgba(5,8,18,0.85)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#EF4444', opacity: 0.8 }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#F59E0B', opacity: 0.8 }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#10B981', opacity: 0.8 }} />
          </div>
          <span className="text-[11px] ml-2 font-mono tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>
            examshield://telemetry-stream
          </span>
        </div>
        <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.25)' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-low" />
          <span className="text-[10px] font-semibold tracking-wider" style={{ color: '#34D399' }}>LIVE SOC FEED</span>
        </div>
      </div>

      {/* Stream events */}
      <div className="p-4 space-y-2.5" style={{ background: 'rgba(4,6,15,0.60)' }}>
        {LIVE_EVENTS.slice(0, 5).map((e, i) => {
          const s = EVENT_STYLES[e.type as keyof typeof EVENT_STYLES]
          const isHighlight = i === (activeIdx % 5)
          return (
            <motion.div
              key={i}
              className="flex items-start gap-3 font-mono text-[11.5px] p-2 rounded-xl transition-all duration-300"
              style={{
                background: isHighlight ? 'rgba(255,255,255,0.04)' : 'transparent',
                border: isHighlight ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
              }}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.1, duration: 0.4 }}
            >
              <span className="tabnum flex-shrink-0 text-[10.5px]" style={{ color: 'rgba(255,255,255,0.30)' }}>
                {e.t}
              </span>
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0"
                style={{ background: s.bg, color: s.color }}
              >
                {s.label}
              </span>
              <span className="truncate flex-1" style={{ color: 'var(--text-1)' }}>
                {e.msg}
              </span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Interactive Background Matrix Grid ─────────────────────────────────── */
function CyberBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Ambient Orb 1 */}
      <div
        className="float-a absolute -top-24 left-1/4 w-[500px] h-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(99,102,241,0.02) 50%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      {/* Ambient Orb 2 */}
      <div
        className="float-b absolute top-96 right-10 w-[450px] h-[450px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(16,185,129,0.09) 0%, rgba(16,185,129,0.01) 50%, transparent 70%)',
          filter: 'blur(64px)',
        }}
      />
      {/* Subtle grid lines */}
      <div className="cyber-grid absolute inset-0 opacity-40" />
      {/* Subtle dot overlay */}
      <div className="dot-grid absolute inset-0 opacity-35" />
    </div>
  )
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-screen relative" style={{ background: 'var(--surface-0)' }}>

      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <nav className={scrolled ? "nav-blur fixed top-0 inset-x-0 z-50 bg-white/10 backdrop-blur-lg transition-colors" : "nav-blur fixed top-0 inset-x-0 z-50"}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                boxShadow: '0 0 20px rgba(99,102,241,0.45)',
              }}
            >
              <Shield className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight" style={{ color: 'var(--text-0)' }}>
                ExamShield
              </span>
              <span className="text-[10px] uppercase font-mono tracking-widest" style={{ color: '#818CF8' }}>
                AI Examination Integrity
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {[
              ['/portal', 'Student Portal'],
              ['/exam', 'Examination'],
              ['/dashboard', 'SOC Dashboard'],
              ['/dashboard/admin', 'Admin Console'],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors duration-150"
                style={{ color: 'var(--text-2)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-0)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-2)')}
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="px-3.5 py-2 text-xs font-medium rounded-xl transition-all duration-150"
              style={{
                color: 'var(--text-1)',
                border: '1px solid var(--border-1)',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              Sign In
            </Link>
            <Link
              href="/exam"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-xl transition-all duration-200 active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                boxShadow: '0 0 20px rgba(99,102,241,0.35)',
              }}
            >
              Start Exam
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ──────────────────────────────────────────────────── */}
      <section className="relative pt-36 pb-24 px-6 overflow-hidden">
        <ThreeBackground />

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          {/* Track Badge */}
          <motion.div
            {...fade(0.1)}
            className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full text-xs font-medium"
            style={{
              color: '#A5B4FC',
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.25)',
              boxShadow: '0 0 20px rgba(99,102,241,0.12)',
            }}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>FAR AWAY 2026 · AI Examination Track · India</span>
          </motion.div>

          {/* Cinematic Headline */}
          <motion.h1
            {...rise(0.18)}
            className="font-extrabold tracking-tight leading-[1.08] mb-6"
            style={{
              fontSize: 'clamp(2.5rem, 6vw, 4.4rem)',
              color: 'var(--text-0)',
            }}
          >
            Privacy-First AI
            <br />
            <span
              style={{
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                backgroundImage: 'linear-gradient(135deg, #A5B4FC 0%, #6366F1 45%, #34D399 100%)',
              }}
            >
              Exam Integrity
            </span>
          </motion.h1>

          {/* Supporting Statement */}
          <motion.p
            {...rise(0.26)}
            className="text-lg md:text-xl font-medium mb-3 max-w-2xl mx-auto leading-relaxed"
            style={{ color: '#E0E7FF' }}
          >
            No cameras. No screen recording. No biometric surveillance.
          </motion.p>
          <motion.p
            {...rise(0.32)}
            className="text-sm md:text-base max-w-2xl mx-auto leading-relaxed mb-10"
            style={{ color: 'var(--text-2)' }}
          >
            ExamShield replaces invasive spyware with real-time keystroke dynamics, mouse entropy,
            and focus signals evaluated by an Isolation Forest AI anomaly engine.
          </motion.p>

          {/* Action CTAs */}
          <motion.div
            {...rise(0.40)}
            className="flex flex-col sm:flex-row gap-3.5 justify-center mb-16"
          >
            <Link
              href="/exam"
              className="group inline-flex items-center justify-center gap-2 px-7 py-4 text-sm font-semibold text-white rounded-xl transition-all duration-200 active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                boxShadow: '0 0 30px rgba(99,102,241,0.45)',
              }}
            >
              Start Examination
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-7 py-4 text-sm font-semibold rounded-xl transition-all duration-200"
              style={{
                color: 'var(--text-0)',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-2)',
                backdropFilter: 'blur(16px)',
              }}
            >
              <Activity className="w-4 h-4 text-emerald-400" />
              Live SOC Dashboard
            </Link>
          </motion.div>

          {/* Live Telemetry Visualizer */}
          <motion.div {...rise(0.48)} className="max-w-xl mx-auto">
            <LiveLog />
          </motion.div>
        </div>

        {/* Hero Feature Indicators */}
        <motion.div
          {...rise(0.58)}
          className="relative z-10 max-w-4xl mx-auto mt-14 grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          {[
            { label: 'Bandwidth Footprint', val: '< 10 KB/s', sub: 'Runs on 2G connections', color: '#6EE7B7' },
            { label: 'Camera Requirement', val: '0 Cameras', sub: 'Complete student privacy', color: '#A5B4FC' },
            { label: 'AI Risk Engine', val: 'Real-time', sub: 'Isolation Forest anomaly model', color: '#FCD34D' },
            { label: 'Consent Firewall', val: 'Active', sub: 'Strict boundary enforcement', color: '#93C5FD' },
          ].map((item, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl text-center glass-card"
            >
              <div className="text-[10.5px] uppercase font-mono tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>
                {item.label}
              </div>
              <div className="text-xl font-bold tabnum mb-0.5" style={{ color: item.color }}>
                {item.val}
              </div>
              <div className="text-[11px]" style={{ color: 'var(--text-2)' }}>
                {item.sub}
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── Problem vs Solution Comparison ─────────────────────────────────── */}
      <section className="py-24 px-6 relative" style={{ borderTop: '1px solid var(--border-0)' }}>
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-16">
            <div className="label mb-3">The Paradigm Shift</div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" style={{ color: 'var(--text-0)' }}>
              Surveillance Is Not Integrity
            </h2>
            <p className="text-sm md:text-base max-w-xl mx-auto" style={{ color: 'var(--text-2)' }}>
              Traditional proctoring creates severe privacy liabilities, discriminates against candidates with poor hardware or lighting, and fails on slow broadband.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-6 items-stretch">
            {/* Traditional Proctoring */}
            <Reveal delay={0.08}>
              <div
                className="h-full rounded-2xl p-7 flex flex-col justify-between"
                style={{
                  background: 'rgba(239,68,68,0.02)',
                  border: '1px solid rgba(239,68,68,0.18)',
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ background: 'rgba(239,68,68,0.12)', color: '#FCA5A5' }}>
                      Status Quo
                    </span>
                    <span className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>Traditional Surveillance</span>
                  </div>

                  <h3 className="text-lg font-semibold mb-4" style={{ color: '#FCA5A5' }}>
                    Invasive & Hardware-Dependent
                  </h3>

                  <ul className="space-y-3.5 text-sm" style={{ color: 'var(--text-1)' }}>
                    {[
                      'Continuous webcam observation of student home environments',
                      'Full screen recording creating GDPR & student data privacy risks',
                      'Requires minimum 5–10 Mbps bandwidth; fails on Tier 2/3 connections',
                      'High false positive rate from looking away, natural anxiety, or low light',
                      'Mandatory expensive webcams and microphones',
                    ].map((txt, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
                        <span>{txt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-4 border-t border-red-500/10 text-xs" style={{ color: 'rgba(252,165,165,0.65)' }}>
                  Excludes over 60% of Indian candidates lacking dedicated webcams or fiber connections.
                </div>
              </div>
            </Reveal>

            {/* ExamShield */}
            <Reveal delay={0.16}>
              <div
                className="h-full rounded-2xl p-7 flex flex-col justify-between"
                style={{
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(16,185,129,0.04) 100%)',
                  border: '1px solid rgba(99,102,241,0.30)',
                  boxShadow: '0 0 40px rgba(99,102,241,0.10)',
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.14)', color: '#6EE7B7', border: '1px solid rgba(16,185,129,0.30)' }}>
                      ExamShield Architecture
                    </span>
                    <span className="text-xs font-mono" style={{ color: '#818CF8' }}>Privacy-First Behavioral AI</span>
                  </div>

                  <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-0)' }}>
                    Behavioral Signals Without Surveillance
                  </h3>

                  <ul className="space-y-3.5 text-sm" style={{ color: 'var(--text-1)' }}>
                    {[
                      'Analyzes typing rhythm, key intervals, and mouse motion metadata',
                      'Zero webcam, microphone, or screen recording required',
                      'Lightweight WebSocket telemetry operates smoothly on 2G (<10 KB/s)',
                      'Pre-trained Isolation Forest anomaly model detects robotic text injection & focus loss',
                      'Runs in any standard modern web browser with zero client software installation',
                    ].map((txt, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
                        <span>{txt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-4 border-t border-emerald-500/10 text-xs" style={{ color: 'rgba(110,231,183,0.75)' }}>
                  Deployable instantly to 1,000,000+ simultaneous candidates across India.
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── 4-Stage AI Pipeline ────────────────────────────────────────────── */}
      <section className="py-24 px-6 relative" style={{ borderTop: '1px solid var(--border-0)' }}>
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-16">
            <div className="label mb-3">AI Architecture</div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" style={{ color: 'var(--text-0)' }}>
              How Behavioral Detection Works
            </h2>
            <p className="text-sm md:text-base max-w-xl mx-auto" style={{ color: 'var(--text-2)' }}>
              ExamShield captures metadata on how you interact with the exam — never reading your text content or capturing video.
            </p>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                step: '01',
                title: 'Interaction Telemetry',
                desc: 'Captures keystroke intervals, mouse velocity entropy, idle pauses, and tab focus blur events in 3-second windows.',
                icon: Keyboard,
                color: '#818CF8',
              },
              {
                step: '02',
                title: 'Consent Firewall',
                desc: 'ConsentPulse verifies telemetry against the candidate consent boundary, blocking unauthorized collection.',
                icon: ShieldCheck,
                color: '#34D399',
              },
              {
                step: '03',
                title: 'Isolation Forest AI',
                desc: 'Anomaly detection model pre-trained on 600+ behavioral patterns identifies copy-paste spikes and abnormal typing.',
                icon: Brain,
                color: '#FBBF24',
              },
              {
                step: '04',
                title: 'Real-time SOC Alert',
                desc: 'Composite risk score (0–100) streams to invigilator dashboard with automated timeline flags and forensic review.',
                icon: Activity,
                color: '#F87171',
              },
            ].map((card, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <div className="h-full p-6 rounded-2xl glass-card flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: `${card.color}15`, border: `1px solid ${card.color}30` }}
                      >
                        <card.icon className="w-5 h-5" style={{ color: card.color }} />
                      </div>
                      <span className="font-mono text-xs font-bold" style={{ color: 'var(--text-3)' }}>
                        {card.step}
                      </span>
                    </div>
                    <h3 className="font-semibold text-base mb-2" style={{ color: 'var(--text-0)' }}>
                      {card.title}
                    </h3>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
                      {card.desc}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── ConsentPulse Section ───────────────────────────────────────────── */}
      <section
        className="py-24 px-6 relative overflow-hidden"
        style={{
          borderTop: '1px solid var(--border-0)',
          background: 'radial-gradient(ellipse 70% 45% at 50% 50%, rgba(99,102,241,0.08) 0%, transparent 70%)',
        }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <Reveal>
            <div
              className="inline-flex items-center gap-2 mb-4 px-3.5 py-1.5 rounded-full text-xs font-semibold"
              style={{ color: '#A5B4FC', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}
            >
              <Lock className="w-3.5 h-3.5" />
              Dynamic Governance
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" style={{ color: 'var(--text-0)' }}>
              ConsentPulse™ Privacy Firewall
            </h2>
            <p className="text-sm md:text-base max-w-xl mx-auto leading-relaxed mb-10" style={{ color: 'var(--text-2)' }}>
              ExamShield monitors exam dishonesty, but <span style={{ color: 'var(--text-0)' }}>ConsentPulse</span> ensures the AI itself never exceeds the permissions agreed to by the candidate.
            </p>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="p-6 rounded-2xl glass-hi max-w-2xl mx-auto text-left">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/5">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>
                  Enforced Boundary Model
                </span>
                <span className="text-xs font-mono text-emerald-400 font-medium">✓ GDPR / DPDP Verified</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                  <div className="font-semibold text-emerald-400 mb-1.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Authorized Telemetry
                  </div>
                  <p className="text-zinc-400 leading-relaxed">
                    Keystroke intervals, mouse dynamics, focus blur counters.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-red-500/5 border border-red-500/15">
                  <div className="font-semibold text-red-400 mb-1.5 flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5" />
                    Strictly Prohibited
                  </div>
                  <p className="text-zinc-400 leading-relaxed">
                    Webcam access, audio feeds, facial analysis, text keylogging.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Call to Action ─────────────────────────────────────────────────── */}
      <section className="py-24 px-6 relative" style={{ borderTop: '1px solid var(--border-0)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <Reveal>
            <div className="label mb-4">Live Verification</div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" style={{ color: 'var(--text-0)' }}>
              Test The System In Real-Time
            </h2>
            <p className="text-sm md:text-base max-w-lg mx-auto mb-10" style={{ color: 'var(--text-2)' }}>
              Open the Candidate Exam in one window and the Admin SOC Dashboard in another. Type normally, then test a paste event to watch the risk telemetry react.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/exam"
                className="px-7 py-4 text-sm font-semibold text-white rounded-xl transition-all duration-200 active:scale-[0.97]"
                style={{
                  background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                  boxShadow: '0 0 25px rgba(99,102,241,0.40)',
                }}
              >
                Launch Student Exam
              </Link>
              <Link
                href="/dashboard"
                className="px-7 py-4 text-sm font-semibold rounded-xl transition-all duration-200"
                style={{
                  color: 'var(--text-0)',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-1)',
                }}
              >
                Open SOC Dashboard
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="py-10 px-6" style={{ borderTop: '1px solid var(--border-0)' }}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--brand)' }}>
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-semibold" style={{ color: 'var(--text-0)' }}>
              ExamShield
            </span>
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>
              · FAR AWAY 2026 Examination Track
            </span>
          </div>
          <div className="text-xs" style={{ color: 'var(--text-3)' }}>
            Zero Surveillance · 100% Privacy-Preserving AI
          </div>
        </div>
      </footer>

    </div>
  )
}
