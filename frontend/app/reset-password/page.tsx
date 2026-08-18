'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AuthShell, AuthField, AuthError, AuthSuccess, AuthSubmitButton } from '@/components/AuthShell'

function passwordIssue(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.'
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return 'Password must include a letter and a number.'
  return null
}

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session)
      setReady(true)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const pwIssue = passwordIssue(password)
    if (pwIssue) { setError(pwIssue); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError('Could not update password. Request a new reset link and try again.')
      return
    }
    setDone(true)
  }

  if (!ready) return null

  if (done) {
    return (
      <AuthShell title="Password updated" subtitle="Your password has been reset successfully.">
        <AuthSuccess message="You can now sign in with your new password." />
        <Link href="/sign-in"
          className="mt-2 inline-flex w-full items-center justify-center py-3 text-sm font-medium text-white rounded-xl transition-all duration-200 active:scale-[0.98]"
          style={{ background: 'var(--brand)', boxShadow: '0 0 22px rgba(99,102,241,0.32)' }}>
          Go to Sign In
        </Link>
      </AuthShell>
    )
  }

  if (!hasSession) {
    return (
      <AuthShell title="Reset link expired" subtitle="This password reset link is invalid or has expired.">
        <Link href="/forgot-password"
          className="inline-flex w-full items-center justify-center py-3 text-sm font-medium text-white rounded-xl transition-all duration-200 active:scale-[0.98]"
          style={{ background: 'var(--brand)', boxShadow: '0 0 22px rgba(99,102,241,0.32)' }}>
          Request a new link
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Choose a new password for your account."
      footer={
        <Link href="/sign-in" className="font-medium underline underline-offset-2" style={{ color: '#A5B4FC' }}>
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <AuthError message={error} />
        <AuthField
          label="New Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <AuthField
          label="Confirm New Password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          required
        />
        <AuthSubmitButton type="submit" loading={loading}>
          Update Password
        </AuthSubmitButton>
      </form>
    </AuthShell>
  )
}
