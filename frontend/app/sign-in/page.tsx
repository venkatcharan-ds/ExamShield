'use client'

import Link from 'next/link'
import { Shield, GraduationCap, LayoutDashboard, ChevronRight, Lock } from 'lucide-react'
import { AuthShell } from '@/components/AuthShell'

export default function SignInPage() {
  return (
    <AuthShell
      title="Sign in to ExamShield"
      subtitle="Select the authorized workspace you need to access."
      footer={
        <>
          New candidate?{' '}
          <Link href="/sign-up" className="font-semibold text-indigo-400 hover:underline">
            Create a student account
          </Link>
        </>
      }
    >
      <div className="space-y-3.5">
        <Link
          href="/student/sign-in"
          className="group flex items-center gap-4 rounded-2xl p-4 transition-all duration-200 glass-card"
          style={{
            border: '1px solid rgba(99,102,241,0.25)',
          }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
            style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.30)' }}
          >
            <GraduationCap className="w-6 h-6 text-indigo-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-sm" style={{ color: 'var(--text-0)' }}>Candidate Portal</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>Take assessments, review consent, submit answers.</div>
          </div>
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" style={{ color: 'var(--text-3)' }} />
        </Link>

        <Link
          href="/admin/sign-in"
          className="group flex items-center gap-4 rounded-2xl p-4 transition-all duration-200 glass-card"
          style={{
            border: '1px solid rgba(16,185,129,0.25)',
          }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.28)' }}
          >
            <LayoutDashboard className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-sm" style={{ color: 'var(--text-0)' }}>SOC Admin Dashboard</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>Real-time telemetry, risk gauge, candidate signals.</div>
          </div>
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" style={{ color: 'var(--text-3)' }} />
        </Link>
      </div>

      <div className="mt-6 flex items-center justify-center gap-2 text-[11px] font-mono" style={{ color: 'var(--text-3)' }}>
        <Lock className="w-3.5 h-3.5 text-indigo-400" />
        <span>Cryptographic Role-Based Access</span>
      </div>
    </AuthShell>
  )
}
