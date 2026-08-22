'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LayoutDashboard } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AuthShell, AuthField, AuthError, AuthSubmitButton } from '@/components/AuthShell'

export default function AdminSignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Enter your admin email and password.'); return }
    setLoading(true)
    const { data, error: signInError } = await createClient().auth.signInWithPassword({ email, password })
    setLoading(false)
    if (signInError) {
      setError(signInError.message.toLowerCase().includes('email not confirmed')
        ? 'Please verify your email before signing in.'
        : 'Invalid admin credentials.')
      return
    }
    if (data.user?.app_metadata?.role !== 'admin') {
      await createClient().auth.signOut()
      setError('This account does not have administrator access.')
      return
    }
    window.location.href = '/dashboard'
  }

  return (
    <AuthShell
      title="Admin Login"
      subtitle="Secure access to the ExamShield monitoring dashboard."
      footer={
        <>Student? <Link href="/student/sign-in" className="font-medium underline underline-offset-2" style={{ color: '#A5B4FC' }}>Student Login</Link></>
      }
    >
      <div className="flex items-center gap-2 mb-5 text-xs" style={{ color: 'var(--text-3)' }}>
        <LayoutDashboard className="w-4 h-4" /> Administrator workspace · Candidate monitoring
      </div>
      <form onSubmit={handleSubmit} noValidate>
        <AuthError message={error} />
        <AuthField label="Admin Email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required />
        <AuthField label="Admin Password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required />
        <div className="flex justify-end -mt-2 mb-5">
          <Link href="/forgot-password" className="text-xs" style={{ color: 'var(--text-2)' }}>Forgot password?</Link>
        </div>
        <AuthSubmitButton type="submit" loading={loading}>Open Admin Dashboard</AuthSubmitButton>
      </form>
    </AuthShell>
  )
}
