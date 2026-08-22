'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  AuthShell,
  AuthField,
  AuthError,
  AuthSubmitButton,
} from '@/components/AuthShell'

export default function StudentSignInPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Enter your email and password.'); return }
    setLoading(true)
    const { error: signInError } = await createClient().auth.signInWithPassword({ email, password })
    setLoading(false)
    if (signInError) { setError('Invalid email or password.'); return }
    window.location.href = '/portal'
  }

  return (
    <AuthShell
      title="Candidate Sign In"
      subtitle="ExamShield · Student Portal"
    >
      <AuthError message={error} />

      <form onSubmit={handleSubmit} noValidate>
        <AuthField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />

        {/* Password with show/hide toggle — built manually since AuthField has no suffix slot */}
        <label className="block mb-6">
          <span className="label mb-1.5 block">Password</span>
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

        <AuthSubmitButton loading={loading}>Sign In</AuthSubmitButton>
      </form>

      <div
        className="mt-5 pt-5 text-center text-xs space-y-2"
        style={{ borderTop: '1px solid var(--border-0)', color: 'var(--text-3)' }}
      >
        <div>
          Don&apos;t have an account?{' '}
          <Link href="/sign-up" className="font-medium" style={{ color: '#A5B4FC' }}>
            Sign up
          </Link>
        </div>
        <div>
          Administrator?{' '}
          <Link href="/admin/sign-in" className="font-medium" style={{ color: '#A5B4FC' }}>
            Admin sign in →
          </Link>
        </div>
      </div>
    </AuthShell>
  )
}
