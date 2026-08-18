'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Shield } from 'lucide-react'

/**
 * Shared chrome for every auth page (sign-in, sign-up, forgot/reset password).
 * Matches the existing ExamShield dark, glass, indigo-accent design system
 * (see frontend/app/exam/page.tsx pre-exam card for the reference pattern).
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
    <div className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{ background: 'var(--surface-0)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-md w-full">
        <div className="rounded-2xl p-8"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border-1)' }}>

          {/* Logo + product name */}
          <Link href="/" className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--brand)', boxShadow: '0 0 18px rgba(99,102,241,0.40)' }}>
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold tracking-tight" style={{ color: 'var(--text-0)' }}>ExamShield</h1>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>Privacy-first AI exam integrity</p>
            </div>
          </Link>

          <h2 className="text-xl font-semibold tracking-tight mb-1.5" style={{ color: 'var(--text-0)' }}>
            {title}
          </h2>
          <p className="text-sm mb-7" style={{ color: 'var(--text-1)' }}>{subtitle}</p>

          {children}

          {footer && (
            <div className="mt-6 pt-6 text-center text-sm" style={{ borderTop: '1px solid var(--border-0)', color: 'var(--text-2)' }}>
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
  )
}

export function AuthError({ message }: { message: string }) {
  if (!message) return null
  return (
    <div className="mb-4 px-3.5 py-2.5 rounded-xl text-xs leading-relaxed"
      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', color: '#FCA5A5' }}
      role="alert">
      {message}
    </div>
  )
}

export function AuthSuccess({ message }: { message: string }) {
  if (!message) return null
  return (
    <div className="mb-4 px-3.5 py-2.5 rounded-xl text-xs leading-relaxed"
      style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)', color: '#6EE7B7' }}
      role="status">
      {message}
    </div>
  )
}

export function AuthSubmitButton({
  loading, children, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className="w-full py-3 text-sm font-medium text-white rounded-xl
                 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
                 flex items-center justify-center gap-2"
      style={{ background: 'var(--brand)', boxShadow: '0 0 22px rgba(99,102,241,0.32)' }}>
      {loading && (
        <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
      )}
      {children}
    </button>
  )
}

