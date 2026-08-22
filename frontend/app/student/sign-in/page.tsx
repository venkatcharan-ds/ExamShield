'use client'

import { useState } from 'react'
import Link from 'next/link'
import { GraduationCap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AuthShell, AuthField, AuthError, AuthSubmitButton } from '@/components/AuthShell'

export default function StudentSignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Enter your email and password.'); return }
    setLoading(true)
    const { error: signInError } = await createClient().auth.signInWithPassword({ email, password })
    setLoading(false)
    if (signInError) {
      setError(signInError.message.toLowerCase().includes('email not confirmed')
        ? 'Please verify your email before signing in.'
        : 'Invalid email or password.')
      return
    }
    window.location.href = '/portal'
  }

  return (
    <AuthShell
      title="Student Login"
      subtitle="Sign in to your private examination portal."
      footer={
        <>Need administrator access? <Link href="/admin/sign-in" className="font-medium underline underline-offset-2" style={{ color: '#A5B4FC' }}>Admin Login</Link></>
      }
    >
      <div className="flex items-center gap-2 mb-5 text-xs" style={{ color: 'var(--text-3)' }}>
        <GraduationCap className="w-4 h-4" /> Student workspace · Exam access only
      </div>
      <form onSubmit={handleSubmit} noValidate>
        <AuthError message={error} />
        <AuthField label="Email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <AuthField label="Password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required />
        <div className="flex justify-end -mt-2 mb-5">
          <Link href="/forgot-password" className="text-xs" style={{ color: 'var(--text-2)' }}>Forgot password?</Link>
        </div>
        <AuthSubmitButton type="submit" loading={loading}>Enter Student Portal</AuthSubmitButton>
      </form>
    </AuthShell>
  )
}
