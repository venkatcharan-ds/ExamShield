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

export function GitHubButton({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="w-full py-3 text-sm font-medium rounded-xl transition-all duration-200 active:scale-[0.98]
                 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
      style={{ background: 'var(--surface-3)', border: '1px solid var(--border-1)', color: 'var(--text-0)' }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.34-1.28-1.69-1.28-1.69-1.04-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.59.24 2.76.12 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.07.78 2.15 0 1.55-.01 2.8-.01 3.18 0 .31.21.67.8.56A10.52 10.52 0 0 0 23.5 12c0-6.35-5.15-11.5-11.5-11.5Z" />
      </svg>
      {loading ? 'Connecting…' : 'Continue with GitHub'}
    </button>
  )
}

export function AuthDivider() {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px" style={{ background: 'var(--border-0)' }} />
      <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>or</span>
      <div className="flex-1 h-px" style={{ background: 'var(--border-0)' }} />
    </div>
  )
}
