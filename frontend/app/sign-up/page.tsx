'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AuthShell, AuthField, AuthError, AuthSuccess, AuthSubmitButton } from '@/components/AuthShell'

function passwordIssue(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.'
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return 'Password must include a letter and a number.'
  return null
}

export default function SignUpPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!fullName.trim()) { setError('Enter your full name.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a valid email address.'); return }
    const pwIssue = passwordIssue(password)
    if (pwIssue) { setError(pwIssue); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }

    setLoading(true)
    const supabase = createClient()
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    })
    setLoading(false)

    if (signUpError) {
      setError(signUpError.message.includes('already registered')
        ? 'An account with this email already exists.'
        : 'Could not create account. Try again.')
      return
    }

    // Supabase returns a user with no active session when email confirmation
    // is required — never treat that as a fully authenticated login.
    if (data.user && !data.session) {
      setAwaitingConfirmation(true)
    } else if (data.session) {
      window.location.href = '/dashboard'
    }
  }

  if (awaitingConfirmation) {
    return (
      <AuthShell title="Check your email" subtitle={`We sent a confirmation link to ${email}.`}>
        <AuthSuccess message="Click the link in your email to activate your account, then sign in." />
        <Link href="/sign-in"
          className="mt-2 inline-flex w-full items-center justify-center py-3 text-sm font-medium text-white rounded-xl transition-all duration-200 active:scale-[0.98]"
          style={{ background: 'var(--brand)', boxShadow: '0 0 22px rgba(99,102,241,0.32)' }}>
          Back to Sign In
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Create account"
      subtitle="Set up admin access to the ExamShield dashboard."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/sign-in" className="font-medium underline underline-offset-2" style={{ color: '#A5B4FC' }}>
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <AuthError message={error} />

        <AuthField
          label="Full Name"
          type="text"
          autoComplete="name"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          required
        />
        <AuthField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <AuthField
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <AuthField
          label="Confirm Password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          required
        />

        <AuthSubmitButton type="submit" loading={loading}>
          Create Account
        </AuthSubmitButton>
      </form>
    </AuthShell>
  )
}
