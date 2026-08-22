'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Users, Plus, ArrowLeft, CheckCircle2, AlertTriangle,
  RefreshCw, Eye, EyeOff, Clock, UserPlus, Lock,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { UserMenu } from '@/components/UserMenu'

interface AdminUser {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  email_confirmed: boolean
  role: string
}

interface CreateResult {
  id: string
  email: string
  role: string
  email_confirmed: boolean
  created_at: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

async function getToken(): Promise<string | null> {
  const { data } = await createClient().auth.getSession()
  return data.session?.access_token ?? null
}

async function fetchAdmins(token: string): Promise<AdminUser[]> {
  const resp = await fetch(`${API_URL}/api/admin/users`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!resp.ok) throw new Error(`Failed to load admin accounts (${resp.status})`)
  const body = await resp.json()
  return body.admins as AdminUser[]
}

async function createAdmin(
  token: string,
  email: string,
  password: string,
): Promise<CreateResult> {
  const resp = await fetch(`${API_URL}/api/admin/users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })
  const body = await resp.json()
  if (!resp.ok) {
    throw new Error(body.detail ?? `Error ${resp.status}`)
  }
  return body as CreateResult
}

function fmtDate(iso: string | null) {
  if (!iso) return 'Never'
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function AdminRow({ user }: { user: AdminUser }) {
  const initials = user.email.slice(0, 2).toUpperCase()
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 p-4 rounded-2xl glass-card"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold font-mono"
        style={{ background: 'rgba(99,102,241,0.18)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.30)' }}
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs md:text-sm font-semibold truncate text-zinc-100 font-mono">
          {user.email}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-mono uppercase font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20"
          >
            Examiner Role
          </span>
          <span className="text-[11px] text-zinc-500">
            Created {fmtDate(user.created_at)}
          </span>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-[10px] font-mono text-zinc-500 mb-0.5">Last Active</div>
        <div className="flex items-center gap-1.5 justify-end">
          {user.last_sign_in_at ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Clock className="w-3.5 h-3.5 text-zinc-600" />
          )}
          <span className="text-xs font-mono" style={{ color: user.last_sign_in_at ? '#6EE7B7' : 'var(--text-3)' }}>
            {fmtDate(user.last_sign_in_at)}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

function CreateAdminForm({ onCreated }: { onCreated: (user: CreateResult) => void }) {
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [showPwd,    setShowPwd]    = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [success,    setSuccess]    = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!email.includes('@')) { setError('Enter a valid email address.'); return }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return }

    setLoading(true)
    try {
      const token = await getToken()
      if (!token) { setError('Session expired — please sign in again.'); return }
      const result = await createAdmin(token, email, password)
      setSuccess(`Admin privileges provisioned for ${result.email}`)
      setEmail('')
      setPassword('')
      onCreated(result)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label mb-1.5 block">Admin Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="examiner@examshield.io"
          required
          autoComplete="off"
          className="w-full text-xs rounded-xl px-4 py-3 bg-zinc-900/80 border border-white/10 text-white outline-none focus:border-indigo-500 transition-colors font-mono"
        />
      </div>

      <div>
        <label className="label mb-1.5 block">Password</label>
        <div className="relative">
          <input
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            required
            autoComplete="new-password"
            className="w-full text-xs rounded-xl px-4 py-3 pr-11 bg-zinc-900/80 border border-white/10 text-white outline-none focus:border-indigo-500 transition-colors font-mono"
          />
          <button
            type="button"
            onClick={() => setShowPwd(v => !v)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
            tabIndex={-1}
          >
            {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            key="err"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="p-3 rounded-xl text-xs bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-2"
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}
        {success && (
          <motion.div
            key="ok"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="p-3 rounded-xl text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-start gap-2"
          >
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 text-xs font-semibold text-white rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
        style={{
          background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
          boxShadow: '0 0 20px rgba(99,102,241,0.35)',
        }}
      >
        {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
        {loading ? 'Provisioning…' : 'Provision Admin Privileges'}
      </button>
    </form>
  )
}

export default function AdminManagementPage() {
  const [admins,  setAdmins]  = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) { setError('Session expired — please sign in again.'); return }
      const list = await fetchAdmins(token)
      setAdmins(list)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load admins')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreated = (created: CreateResult) => {
    const asUser: AdminUser = {
      id: created.id,
      email: created.email,
      created_at: created.created_at,
      last_sign_in_at: null,
      email_confirmed: created.email_confirmed,
      role: created.role,
    }
    setAdmins(prev => [asUser, ...prev])
  }

  return (
    <div className="min-h-screen relative" style={{ background: 'var(--surface-0)' }}>
      <div className="cyber-grid absolute inset-0 opacity-20 pointer-events-none" />

      {/* Header */}
      <header className="nav-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--brand)' }}>
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold" style={{ color: 'var(--text-0)' }}>ExamShield</span>
            </Link>
            <span className="text-zinc-600">/</span>
            <Link href="/dashboard" className="text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors">
              SOC Dashboard
            </Link>
            <span className="text-zinc-600">/</span>
            <span className="text-xs font-mono text-indigo-400">Admin Management</span>
          </div>
          <UserMenu />
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 relative z-10">
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="w-9 h-9 rounded-xl flex items-center justify-center glass hover:border-indigo-500/40 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-0)' }}>
                Administrator Management
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Manage examiner and invigilator permissions across the security operations center.
              </p>
            </div>
          </div>

          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono glass hover:border-indigo-500/40 text-zinc-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Admin user accounts list */}
          <div className="lg:col-span-3 space-y-4">
            <div className="rounded-3xl p-6 glass-hi" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span className="label">Provisioned Accounts</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-zinc-300">
                  {admins.length} Total
                </span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                </div>
              ) : error ? (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                  {error}
                </div>
              ) : admins.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500 font-mono">
                  Zero administrator accounts found.
                </div>
              ) : (
                <div className="space-y-2.5">
                  <AnimatePresence initial={false}>
                    {admins.map(u => <AdminRow key={u.id} user={u} />)}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          {/* Create new admin */}
          <div className="lg:col-span-2">
            <div className="rounded-3xl p-6 glass-hi sticky top-24" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-indigo-400" />
                <span className="label">Provision New Admin</span>
              </div>
              <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                New accounts are immediately granted admin role access to the SOC dashboard.
              </p>
              <CreateAdminForm onCreated={handleCreated} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
