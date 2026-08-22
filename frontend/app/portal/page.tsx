'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Shield, BookOpen, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function PortalPage() {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    createClient().auth.getSession().then(({ data }) => {
      if (!active) return
      const session = data.session
      if (session?.user) {
        const name =
          (session.user.user_metadata?.full_name as string | undefined) ||
          session.user.email?.split('@')[0] ||
          'Candidate'
        setUser({ name, email: session.user.email ?? '' })
      }
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  const signOut = async () => {
    await createClient().auth.signOut()
    window.location.href = '/sign-in'
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface-0)' }}>
        <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
      </main>
    )
  }

  return (
    <main className="min-h-screen" style={{ background: 'var(--surface-0)' }}>
      <header className="px-6 py-4 flex items-center justify-between" style={{ background: 'var(--surface-1)', borderBottom: '1px solid var(--border-0)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--brand)' }}>
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-sm" style={{ color: 'var(--text-0)' }}>ExamShield</span>
        </div>
        {user && (
          <div className="flex items-center gap-4">
            <span className="text-sm" style={{ color: 'var(--text-2)' }}>{user.name}</span>
            <button onClick={() => void signOut()} className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-3)' }}>
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        )}
      </header>

      <div className="max-w-lg mx-auto px-6 py-16">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-0)' }}>
          {user ? `Welcome, ${user.name}` : 'Candidate Portal'}
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-2)' }}>
          Access your assigned examinations below. Each session is individually monitored.
        </p>

        <div className="mt-10 rounded-2xl p-6" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-1)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,.1)' }}>
              <BookOpen className="w-4.5 h-4.5" style={{ color: 'var(--brand)' }} />
            </div>
            <div>
              <div className="font-medium text-sm" style={{ color: 'var(--text-0)' }}>Computer Science &amp; Data Science Assessment</div>
              <div className="text-xs" style={{ color: 'var(--text-3)' }}>30 questions · 60 minutes</div>
            </div>
          </div>
          <p className="text-xs mb-5" style={{ color: 'var(--text-2)' }}>
            Behavioral monitoring is active during the exam. No camera or screen recording is used.
          </p>
          <Link
            href="/exam"
            className="inline-block w-full text-center py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'var(--brand)' }}
          >
            Start Examination
          </Link>
        </div>

        {!user && (
          <div className="mt-6 text-center">
            <Link href="/sign-in" className="text-sm" style={{ color: 'var(--brand)' }}>
              Sign in to access your examinations →
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
