'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Shield, BookOpen, LogOut, CheckCircle2, Clock,
  ArrowRight, Sparkles, Wifi, Lock, UserCheck,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function PortalPage() {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null)
  const [loading, setLoading] = useState(true)

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
        setUser({ name, email: session.user.email ?? '' })
      }
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  const signOut = async () => {
    await createClient().auth.signOut()
    window.location.href = '/sign-in'
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface-0)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
          <span className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>Loading workspace…</span>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen relative" style={{ background: 'var(--surface-0)' }}>
      {/* Background ambient lighting */}
      <div
        className="float-a absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)',
          filter: 'blur(70px)',
        }}
      />
      <div className="cyber-grid absolute inset-0 opacity-20 pointer-events-none" />

      {/* Header */}
      <header className="nav-blur sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                boxShadow: '0 0 20px rgba(99,102,241,0.40)',
              }}
            >
              <Shield className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <span className="font-bold text-sm" style={{ color: 'var(--text-0)' }}>ExamShield</span>
              <span className="text-[10px] block font-mono" style={{ color: '#818CF8' }}>Candidate Portal</span>
            </div>
          </Link>

          {user ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass">
                <div className="w-2 h-2 rounded-full bg-emerald-400 pulse-low" />
                <span className="text-xs font-medium" style={{ color: 'var(--text-1)' }}>{user.name}</span>
              </div>
              <button
                onClick={() => void signOut()}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl transition-all duration-150"
                style={{
                  color: 'var(--text-2)',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-0)',
                }}
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>
          ) : (
            <Link
              href="/student/sign-in"
              className="text-xs font-medium px-3.5 py-1.5 rounded-xl"
              style={{ background: 'var(--brand)', color: 'white' }}
            >
              Sign In
            </Link>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Welcome greeting */}
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
            <div>
              <div className="label mb-1">Authenticated Workspace</div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-0)' }}>
                {user ? `Welcome, ${user.name}` : 'Candidate Examination Portal'}
              </h1>
              <p className="mt-1 text-xs md:text-sm" style={{ color: 'var(--text-2)' }}>
                Your assigned assessments are protected by privacy-first behavioral monitoring.
              </p>
            </div>

            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[11px] font-mono px-3 py-1 rounded-full text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                System Ready · Verified
              </span>
            </div>
          </div>

          {/* Active Exam Card */}
          <div
            className="rounded-3xl p-7 md:p-8 relative overflow-hidden glass-hi"
            style={{
              border: '1px solid rgba(99,102,241,0.25)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.50), 0 0 35px rgba(99,102,241,0.10)',
            }}
          >
            {/* Top decorative accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-7">
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'rgba(99,102,241,0.15)',
                    border: '1px solid rgba(99,102,241,0.30)',
                  }}
                >
                  <BookOpen className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-indigo-400">
                    Active Assessment
                  </span>
                  <h2 className="text-lg md:text-xl font-bold mt-0.5" style={{ color: 'var(--text-0)' }}>
                    Computer Science &amp; Data Science Assessment
                  </h2>
                  <div className="flex items-center gap-3 mt-1.5 text-xs" style={{ color: 'var(--text-2)' }}>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      30 Minutes
                    </span>
                    <span>·</span>
                    <span>5 Descriptive Questions</span>
                    <span>·</span>
                    <span className="text-emerald-400">0 Cameras Required</span>
                  </div>
                </div>
              </div>

              <Link
                href="/exam"
                className="group flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-white rounded-2xl transition-all duration-200 active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                  boxShadow: '0 0 25px rgba(99,102,241,0.45)',
                }}
              >
                Launch Examination
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Pre-Flight System Readiness Checklist */}
            <div className="pt-6 border-t border-white/5 grid sm:grid-cols-3 gap-3.5 text-xs">
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-zinc-200">Browser Ready</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">Hardware acceleration active</div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-2.5">
                <Wifi className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-zinc-200">2G Connection Resilient</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">&lt; 10 KB/s telemetry bandwidth</div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-zinc-200">Privacy Safeguard</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">No video or audio capture</div>
                </div>
              </div>
            </div>
          </div>

          {!user && (
            <div className="mt-8 text-center">
              <Link href="/sign-in" className="text-xs font-mono text-indigo-400 hover:underline">
                Sign in with candidate credentials to record your verified grade →
              </Link>
            </div>
          )}
        </motion.div>
      </div>
    </main>
  )
}
