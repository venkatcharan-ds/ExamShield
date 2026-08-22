'use client'

import Link from 'next/link'
import { Shield, GraduationCap, LayoutDashboard, ChevronRight } from 'lucide-react'
import { AuthShell } from '@/components/AuthShell'

export default function SignInPage() {
  return (
    <AuthShell
      title="Sign in to ExamShield"
      subtitle="Choose the workspace you need to access."
      footer={
        <>
          New student?{' '}
          <Link href="/sign-up" className="font-medium underline underline-offset-2" style={{ color: '#A5B4FC' }}>
            Create a student account
          </Link>
        </>
      }
    >
      <div className="space-y-3">
        <Link
          href="/student/sign-in"
          className="group flex items-center gap-4 rounded-2xl p-4 transition-all duration-200"
          style={{
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.22)',
          }}
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(99,102,241,0.16)' }}>
            <GraduationCap className="w-5 h-5" style={{ color: '#A5B4FC' }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold" style={{ color: 'var(--text-0)' }}>Student Login</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>Enter your exam portal and take assessments.</div>
          </div>
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--text-3)' }} />
        </Link>

        <Link
          href="/admin/sign-in"
          className="group flex items-center gap-4 rounded-2xl p-4 transition-all duration-200"
          style={{
            background: 'rgba(16,185,129,0.06)',
            border: '1px solid rgba(16,185,129,0.18)',
          }}
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(16,185,129,0.12)' }}>
            <LayoutDashboard className="w-5 h-5" style={{ color: '#6EE7B7' }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold" style={{ color: 'var(--text-0)' }}>Admin Login</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>Monitor live exams, risk signals, and candidate sessions.</div>
          </div>
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--text-3)' }} />
        </Link>
      </div>

      <div className="mt-5 flex items-center justify-center gap-2 text-[11px]" style={{ color: 'var(--text-3)' }}>
        <Shield className="w-3.5 h-3.5" />
        Role-based access · Privacy-first monitoring
      </div>
    </AuthShell>
  )
}
