'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AuthShell, AuthField, AuthError, AuthSubmitButton } from '@/components/AuthShell'

function SignInForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Enter your email and password.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (signInError) {
      if (signInError.message.toLowerCase().includes('email not confirmed')) {
        setError('Please verify your email before signing in — check your inbox for the confirmation link.')
      } else {
        setError('Invalid email or password.')
      }
      return
    }

    // Full navigation (not router.push) so the just-set session cookie is
    // guaranteed to be present on the next request middleware sees.
    window.location.href = next
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to the ExamShield admin dashboard."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link href="/sign-up" className="font-medium underline underline-offset-2" style={{ color: '#A5B4FC' }}>
            Create account
          </Link>
        </>
      }
    >
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
        <AuthField
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />

        <div className="flex justify-end -mt-2 mb-5">
          <Link href="/forgot-password" className="text-xs" style={{ color: 'var(--text-2)' }}>
            Forgot password?
          </Link>
        </div>

        <AuthSubmitButton type="submit" loading={loading}>
          Sign In
        </AuthSubmitButton>
      </form>
    </AuthShell>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  )
}
