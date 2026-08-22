'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Shield, Activity, Users, Brain,
  Eye, EyeOff, Copy, Check, Lock, Zap,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/* Email is pre-filled and public — only the password must never appear in source. */
const ADMIN_EMAIL = 'venkatcharan.ds@gmail.com'

export default function AdminSignInForm({ demoPassword }: { demoPassword: string | null }) {
  const [email,        setEmail]        = useState(ADMIN_EMAIL)
  const [password,     setPassword]     = useState(demoPassword ?? '')
  const [showPass,     setShowPass]     = useState(false)
  const [error,        setError]        = useState('')
  const [loading,      setLoading]      = useState(false)
  const [copiedEmail,  setCopiedEmail]  = useState(false)
  const [copiedPass,   setCopiedPass]   = useState(false)

  const copy = (text: string, set: (v: boolean) => void) => {
    navigator.clipboard.writeText(text).catch(() => {})
    set(true)
    setTimeout(() => set(false), 2000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Enter your email and password.'); return }
    setLoading(true)
    const supabase = createClient()
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (signInError) {
      setError('Invalid email or password.')
      return
    }

    /* Enforce admin role — sign out immediately if the account isn't an admin */
    if (data.user?.app_metadata?.role !== 'admin') {
      await supabase.auth.signOut()
      setError('This account does not have administrator access.')
      return
    }

    window.location.href = '/dashboard'
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{
        background: 'var(--surface-0)',
        backgroundImage:
          'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(99,102,241,0.18) 0%, transparent 70%)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        {/* ── Brand header ───────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--brand)', boxShadow: '0 0 28px rgba(99,102,241,0.50)' }}
          >
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-base font-bold" style={{ color: 'var(--text-0)' }}>ExamShield</div>
            <div className="text-xs tracking-wide" style={{ color: '#A5B4FC', opacity: 0.8 }}>
              Administrator Workspace
            </div>
          </div>
        </div>

        {/* ── Feature badges ─────────────────────────────────────────── */}
        <div className="flex flex-wrap justify-center gap-2 mb-7">
          {[
            { Icon: Users,    label: 'Live Candidate Monitoring' },
            { Icon: Brain,    label: 'AI Exam Integrity' },
            { Icon: Activity, label: 'Real-time Risk Dashboard' },
          ].map(({ Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
              style={{
                background: 'rgba(99,102,241,0.10)',
                border: '1px solid rgba(99,102,241,0.22)',
                color: '#A5B4FC',
              }}
            >
              <Icon className="w-3 h-3" />
              {label}
            </div>
          ))}
        </div>

        {/* ── Card ───────────────────────────────────────────────────── */}
        <div
          className="rounded-2xl p-7"
          style={{
            background: 'var(--surface-1)',
            border: '1px solid rgba(99,102,241,0.22)',
            boxShadow: '0 0 48px rgba(99,102,241,0.08)',
          }}
        >
          <h2 className="text-lg font-semibold mb-0.5" style={{ color: 'var(--text-0)' }}>
            Admin Sign In
          </h2>
          <p className="text-xs mb-6" style={{ color: 'var(--text-3)' }}>
            Authorised personnel only — role verified after authentication
          </p>

          {/* ── Demo credentials panel ─────────────────────────────── */}
          <div
            className="rounded-xl p-4 mb-6"
            style={{
              background: 'rgba(245,158,11,0.06)',
              border: '1px solid rgba(245,158,11,0.22)',
            }}
          >
            <div className="flex items-center gap-1.5 mb-3">
              <Zap className="w-3 h-3 flex-shrink-0" style={{ color: '#F59E0B' }} />
              <span
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: '#F59E0B' }}
              >
                Hackathon Demo Access
              </span>
            </div>

            {/* Email row */}
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <div className="min-w-0">
                <div
                  className="text-[9px] uppercase tracking-wider mb-0.5"
                  style={{ color: 'var(--text-3)' }}
                >
                  Email
                </div>
                <div
                  className="text-[11px] font-mono truncate"
                  style={{ color: 'var(--text-1)' }}
                >
                  {ADMIN_EMAIL}
                </div>
              </div>
              <button
                type="button"
                onClick={() => copy(ADMIN_EMAIL, setCopiedEmail)}
                className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all"
                style={{
                  background: copiedEmail ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${copiedEmail ? 'rgba(34,197,94,0.25)' : 'var(--border-0)'}`,
                  color: copiedEmail ? '#6EE7B7' : 'var(--text-2)',
                }}
              >
                {copiedEmail ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedEmail ? 'Copied' : 'Copy'}
              </button>
            </div>

            {/* Password row — copy button only when password comes from server env var */}
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div
                  className="text-[9px] uppercase tracking-wider mb-0.5"
                  style={{ color: 'var(--text-3)' }}
                >
                  Password
                </div>
                {demoPassword ? (
                  <div className="text-[11px] flex items-center gap-1.5" style={{ color: '#6EE7B7' }}>
                    <Check className="w-3 h-3 flex-shrink-0" />
                    Pre-filled in form
                  </div>
                ) : (
                  <div className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                    Configure ADMIN_DEMO_PASSWORD in Vercel
                  </div>
                )}
              </div>
              {demoPassword && (
                <button
                  type="button"
                  onClick={() => copy(demoPassword, setCopiedPass)}
                  className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all"
                  style={{
                    background: copiedPass ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${copiedPass ? 'rgba(34,197,94,0.25)' : 'var(--border-0)'}`,
                    color: copiedPass ? '#6EE7B7' : 'var(--text-2)',
                  }}
                >
                  {copiedPass ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedPass ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>
          </div>

          {/* ── Error ──────────────────────────────────────────────── */}
          {error && (
            <div
              className="mb-4 px-3.5 py-2.5 rounded-xl text-xs leading-relaxed"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.22)',
                color: '#FCA5A5',
              }}
              role="alert"
            >
              {error}
            </div>
          )}

          {/* ── Form ───────────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} noValidate>
            <label className="block mb-4">
              <span className="block text-xs mb-1.5" style={{ color: 'var(--text-2)' }}>Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full text-sm rounded-xl px-3.5 py-2.5 transition-all duration-200 focus:outline-none"
                style={{
                  background: 'var(--surface-3)',
                  border: '1px solid var(--border-1)',
                  color: 'var(--text-0)',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.45)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-1)' }}
              />
            </label>

            <label className="block mb-6">
              <span className="block text-xs mb-1.5" style={{ color: 'var(--text-2)' }}>Password</span>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full text-sm rounded-xl px-3.5 py-2.5 pr-10 transition-all duration-200 focus:outline-none"
                  style={{
                    background: 'var(--surface-3)',
                    border: '1px solid var(--border-1)',
                    color: 'var(--text-0)',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.45)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-1)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-80"
                  style={{ color: 'var(--text-3)' }}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-sm font-semibold text-white rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: 'var(--brand)', boxShadow: '0 0 22px rgba(99,102,241,0.32)' }}
            >
              {loading ? (
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <Lock className="w-3.5 h-3.5" />
              )}
              {loading ? 'Authenticating…' : 'Access Dashboard'}
            </button>
          </form>

          <div
            className="mt-5 pt-5 text-center text-xs"
            style={{ borderTop: '1px solid var(--border-0)', color: 'var(--text-3)' }}
          >
            Candidate?{' '}
            <Link href="/student/sign-in" className="font-medium" style={{ color: '#A5B4FC' }}>
              Student sign in →
            </Link>
          </div>
        </div>

        <p
          className="text-center text-[10px] mt-4"
          style={{ color: 'var(--text-3)', opacity: 0.45 }}
        >
          Secured by Supabase Auth · Role-based access control
        </p>
      </motion.div>
    </div>
  )
}
