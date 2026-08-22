'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Shield } from 'lucide-react'

/**
 * Shared chrome for every auth page (sign-in, student sign-in, sign-up, forgot/reset password).
 * Matches the ExamShield dark futuristic glassmorphism design system.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{
        background: 'var(--surface-0)',
      }}
    >
      {/* Ambient background glow */}
      <div
        className="float-a absolute top-10 left-1/2 -translate-x-1/2 w-[550px] h-[550px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
          filter: 'blur(70px)',
        }}
      />
      <div className="cyber-grid absolute inset-0 opacity-25 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-md w-full relative z-10"
      >
        <div
          className="rounded-3xl p-8 glass-hi"
          style={{
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.60), 0 0 35px rgba(99,102,241,0.10)',
          }}
        >
          {/* Logo + product name */}
          <Link href="/" className="flex items-center gap-3 mb-8 group">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                boxShadow: '0 0 24px rgba(99,102,241,0.45)',
              }}
            >
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold tracking-tight text-base" style={{ color: 'var(--text-0)' }}>
                ExamShield
              </h1>
              <p className="text-[11px] font-mono tracking-wider uppercase" style={{ color: '#818CF8' }}>
                AI Exam Integrity
              </p>
            </div>
          </Link>

          <h2 className="text-xl font-bold tracking-tight mb-1" style={{ color: 'var(--text-0)' }}>
            {title}
          </h2>
          <p className="text-xs mb-7" style={{ color: 'var(--text-2)' }}>
            {subtitle}
          </p>

          {children}

          {footer && (
            <div
              className="mt-6 pt-5 text-center text-xs"
              style={{ borderTop: '1px solid var(--border-0)', color: 'var(--text-2)' }}
            >
              {footer}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

/* ─── Shared form primitives ────────────────────────────────────────────── */

export function AuthField({
  label, ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block mb-4">
      <span className="label mb-1.5 block">{label}</span>
      <input
        {...props}
        className="w-full text-sm rounded-xl px-4 py-3 transition-all duration-200 focus:outline-none"
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
  )
}

export function AuthError({ message }: { message: string }) {
  if (!message) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-5 px-4 py-3 rounded-xl text-xs leading-relaxed"
      style={{
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.25)',
        color: '#FCA5A5',
      }}
      role="alert"
    >
      {message}
    </motion.div>
  )
}

export function AuthSuccess({ message }: { message: string }) {
  if (!message) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-5 px-4 py-3 rounded-xl text-xs leading-relaxed"
      style={{
        background: 'rgba(16,185,129,0.08)',
        border: '1px solid rgba(16,185,129,0.25)',
        color: '#6EE7B7',
      }}
      role="status"
    >
      {message}
    </motion.div>
  )
}

export function AuthSubmitButton({
  loading, children, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className="w-full py-3.5 text-sm font-semibold text-white rounded-xl
                 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
                 flex items-center justify-center gap-2"
      style={{
        background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
        boxShadow: '0 0 24px rgba(99,102,241,0.38)',
      }}
    >
      {loading && (
        <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
      )}
      {children}
    </button>
  )
}
