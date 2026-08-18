'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AuthShell, AuthField, AuthError, AuthSuccess, AuthSubmitButton } from '@/components/AuthShell'

const GENERIC_SUCCESS =
  'If an account exists for this email, password reset instructions have been sent.'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    // Supabase's own response never reveals whether the email exists;
    // show the same generic message regardless of the outcome.
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })
    setLoading(false)
    setSuccess(GENERIC_SUCCESS)
  }

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you reset instructions."
      footer={
        <Link href="/sign-in" className="font-medium underline underline-offset-2" style={{ color: '#A5B4FC' }}>
          Back to sign in
        </Link>
      }
    >
      {success ? (
        <AuthSuccess message={success} />
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <AuthError message={error} />
          <AuthField
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <AuthSubmitButton type="submit" loading={loading}>
            Send Reset Link
          </AuthSubmitButton>
        </form>
      )}
    </AuthShell>
  )
}
