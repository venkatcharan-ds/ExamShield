'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Shield, Activity, Users, Brain,
  Eye, EyeOff, Copy, Check, Lock, Zap, ArrowRight,
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
    if (!email || !password) { setError('Enter your administrator email and password.'); return }
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
      setError('This account does not have administrator privileges.')
      return
    }

    window.location.href = '/dashboard'
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{
        background: 'var(--surface-0)',
      }}
    >
      {/* Background ambient lighting */}
      <div
        className="float-a absolute top-12 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
      <div className="cyber-grid absolute inset-0 opacity-25 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative z-10"
      >
        {/* ── Brand header ───────────────────────────────────────────── */}
        <Link href="/" className="flex items-center justify-center gap-3 mb-6 group">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
              boxShadow: '0 0 30px rgba(99,102,241,0.50)',
            }}
          >
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-0)' }}>
              ExamShield
            </div>
            <div className="text-[11px] font-mono tracking-wider uppercase text-indigo-400">
              Security Operations Center
            </div>
          </div>
        </Link>

        {/* ── Feature badges ─────────────────────────────────────────── */}
        <div className="flex flex-wrap justify-center gap-2 mb-7">
          {[
            { Icon: Users,    label: 'Live Telemetry' },
            { Icon: Brain,    label: 'Isolation Forest AI' },
            { Icon: Activity, label: 'Real-time Risk SOC' },
          ].map(({ Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium"
              style={{
                background: 'rgba(99,102,241,0.08)',
                border: '1px solid rgba(99,102,241,0.22)',
                color: '#A5B4FC',
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </div>
          ))}
        </div>

        {/* ── Card ───────────────────────────────────────────────────── */}
        <div
          className="rounded-3xl p-8 glass-hi"
          style={{
            border: '1px solid rgba(99,102,241,0.25)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.60), 0 0 40px rgba(99,102,241,0.12)',
          }}
        >
          <h2 className="text-xl font-bold tracking-tight mb-1" style={{ color: 'var(--text-0)' }}>
            Admin Sign In
          </h2>
          <p className="text-xs mb-6 text-zinc-400">
            Authorised examiner access · Cryptographic role enforcement
          </p>

          {/* ── Demo credentials panel ─────────────────────────────── */}
          <div
            className="rounded-2xl p-4 mb-6"
            style={{
              background: 'rgba(245,158,11,0.06)',
              border: '1px solid rgba(245,158,11,0.25)',
            }}
          >
            <div className="flex items-center gap-1.5 mb-3">
              <Zap className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                Hackathon Demo Access
              </span>
            </div>

            {/* Email row */}
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <div className="min-w-0">
                <div className="text-[9px] uppercase tracking-wider mb-0.5 text-zinc-500 font-mono">
                  Email
                </div>
                <div className="text-[11.5px] font-mono truncate text-zinc-300">
                  {ADMIN_EMAIL}
                </div>
              </div>
              <button
                type="button"
                onClick={() => copy(ADMIN_EMAIL, setCopiedEmail)}
                className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-medium transition-all"
                style={{
                  background: copiedEmail ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${copiedEmail ? 'rgba(34,197,94,0.30)' : 'var(--border-0)'}`,
                  color: copiedEmail ? '#6EE7B7' : 'var(--text-2)',
                }}
              >
                {copiedEmail ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedEmail ? 'Copied' : 'Copy'}
              </button>
            </div>

            {/* Password row */}
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[9px] uppercase tracking-wider mb-0.5 text-zinc-500 font-mono">
                  Password
                </div>
                {demoPassword ? (
                  <div className="text-[11.5px] flex items-center gap-1.5 text-emerald-400 font-medium">
                    <Check className="w-3 h-3 flex-shrink-0" />
                    Pre-filled in form
                  </div>
                ) : (
                  <div className="text-[11px] text-zinc-500">
                    Auto-configured password
                  </div>
                )}
              </div>
              {demoPassword && (
                <button
                  type="button"
                  onClick={() => copy(demoPassword, setCopiedPass)}
                  className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-medium transition-all"
                  style={{
                    background: copiedPass ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${copiedPass ? 'rgba(34,197,94,0.30)' : 'var(--border-0)'}`,
                    color: copiedPass ? '#6EE7B7' : 'var(--text-2)',
                  }}
                >
                  {copiedPass ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedPass ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>
          </div>

          {/* ── Error ──────────────────────────────────────────────── */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 px-4 py-3 rounded-xl text-xs leading-relaxed"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: '#FCA5A5',
              }}
              role="alert"
            >
              {error}
            </motion.div>
          )}

          {/* ── Form ───────────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} noValidate>
            <label className="block mb-4">
              <span className="label mb-1.5 block">Admin Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full text-sm rounded-xl px-4 py-3 transition-all duration-200 focus:outline-none font-mono"
                style={{
                  background: 'var(--surface-3)',
                  border: '1px solid var(--border-1)',
                  color: 'var(--text-0)',
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = 'rgba(99,102,241,0.50)'
                  e.currentTarget.style.boxShadow = '0 0 16px rgba(99,102,241,0.18)'
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'var(--border-1)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
            </label>

            <label className="block mb-6">
              <span className="label mb-1.5 block">Password</span>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full text-sm rounded-xl px-4 py-3 pr-11 transition-all duration-200 focus:outline-none"
                  style={{
                    background: 'var(--surface-3)',
                    border: '1px solid var(--border-1)',
                    color: 'var(--text-0)',
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = 'rgba(99,102,241,0.50)'
                    e.currentTarget.style.boxShadow = '0 0 16px rgba(99,102,241,0.18)'
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = 'var(--border-1)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-80 text-zinc-400"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 text-sm font-semibold text-white rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                boxShadow: '0 0 25px rgba(99,102,241,0.40)',
              }}
            >
              {loading ? (
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              {loading ? 'Authenticating Role…' : 'Access SOC Dashboard'}
            </button>
          </form>

          <div
            className="mt-6 pt-5 text-center text-xs"
            style={{ borderTop: '1px solid var(--border-0)', color: 'var(--text-3)' }}
          >
            Candidate?{' '}
            <Link href="/student/sign-in" className="font-semibold text-indigo-400 hover:underline">
              Student sign in →
            </Link>
          </div>
        </div>

        <p className="text-center text-[11px] mt-4 font-mono text-zinc-500">
          Secured by Supabase Auth · Role-based access control
        </p>
      </motion.div>
    </div>
  )
}
