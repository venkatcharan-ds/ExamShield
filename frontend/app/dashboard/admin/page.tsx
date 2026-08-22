'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Users, Plus, ArrowLeft, CheckCircle, AlertTriangle,
  RefreshCw, Eye, EyeOff, Clock,
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

/* ── Helpers ─────────────────────────────────────────────────────────────── */
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

/* ── Admin User Row ──────────────────────────────────────────────────────── */
function AdminRow({ user }: { user: AdminUser }) {
  const initials = user.email.slice(0, 2).toUpperCase()
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 p-4 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold"
        style={{ background: 'rgba(99,102,241,0.18)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.28)' }}>
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate" style={{ color: 'var(--text-0)' }}>
          {user.email}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
            style={{ background: 'rgba(99,102,241,0.14)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.22)' }}>
            admin
          </span>
          <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>
            Joined {fmtDate(user.created_at)}
          </span>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-[10px] mb-0.5" style={{ color: 'var(--text-3)' }}>Last sign-in</div>
        <div className="flex items-center gap-1.5 justify-end">
          {user.last_sign_in_at ? (
            <CheckCircle className="w-3 h-3" style={{ color: '#6EE7B7' }} />
          ) : (
            <Clock className="w-3 h-3" style={{ color: 'var(--text-3)' }} />
          )}
          <span className="text-[11px] font-mono" style={{ color: user.last_sign_in_at ? '#6EE7B7' : 'var(--text-3)' }}>
            {fmtDate(user.last_sign_in_at)}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

/* ── Create Admin Form ───────────────────────────────────────────────────── */
function CreateAdminForm({
  onCreated,
}: {
  onCreated: (user: CreateResult) => void
}) {
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
      setSuccess(`Admin account created for ${result.email}`)
      setEmail('')
      setPassword('')
      onCreated(result)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.10)',
    color: 'var(--text-0)',
    fontSize: 14,
    outline: 'none',
  } as React.CSSProperties

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-[11px] mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
          Email address
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="admin@example.com"
          required
          autoComplete="off"
          style={inputStyle}
        />
      </div>

      <div>
        <label className="block text-[11px] mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
          Password
        </label>
        <div className="relative">
          <input
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            required
            autoComplete="new-password"
            style={{ ...inputStyle, paddingRight: 40 }}
          />
          <button
            type="button"
            onClick={() => setShowPwd(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer' }}
            tabIndex={-1}
          >
            {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div key="err"
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="flex items-start gap-2 p-3 rounded-xl text-xs"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', color: '#FCA5A5' }}>
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            {error}
          </motion.div>
        )}
        {success && (
          <motion.div key="ok"
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="flex items-start gap-2 p-3 rounded-xl text-xs"
            style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.22)', color: '#6EE7B7' }}>
            <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
        style={{
          background: loading ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.22)',
          border: '1px solid rgba(99,102,241,0.32)',
          color: loading ? 'rgba(129,140,248,0.50)' : '#818CF8',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading
          ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          : <Plus className="w-3.5 h-3.5" />
        }
        {loading ? 'Creating…' : 'Create Admin Account'}
      </button>
    </form>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function AdminManagementPage() {
  const [admins,    setAdmins]    = useState<AdminUser[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)

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
    <div className="min-h-screen" style={{ background: 'var(--surface-0)' }}>

      {/* Header */}
      <header className="nav-blur sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--brand)' }}>
                <Shield className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-0)' }}>ExamShield</span>
            </Link>
            <span style={{ color: 'var(--text-3)' }}>/</span>
            <Link href="/dashboard" className="text-sm transition-colors"
              style={{ color: 'var(--text-2)' }}>
              Admin Dashboard
            </Link>
            <span style={{ color: 'var(--text-3)' }}>/</span>
            <span className="text-sm" style={{ color: 'var(--text-1)' }}>Admin Management</span>
          </div>
          <UserMenu />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Page title */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard"
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ border: '1px solid var(--border-0)', color: 'var(--text-3)' }}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-0)' }}>Admin Management</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
              Manage administrator accounts. All changes apply immediately.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">

          {/* ── Admin list ─────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-4">
            <div className="rounded-2xl p-5"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border-0)' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" style={{ color: 'var(--text-3)' }} />
                  <span className="label">Admin Accounts</span>
                  {!loading && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md font-mono"
                      style={{ background: 'var(--surface-2)', color: 'var(--text-3)', border: '1px solid var(--border-0)' }}>
                      {admins.length}
                    </span>
                  )}
                </div>
                <button onClick={load} disabled={loading}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                  style={{ border: '1px solid var(--border-0)', color: 'var(--text-3)', cursor: loading ? 'default' : 'pointer' }}>
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-5 h-5 animate-spin" style={{ color: 'var(--text-3)' }} />
                </div>
              ) : error ? (
                <div className="flex items-start gap-2 p-4 rounded-xl text-xs"
                  style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', color: '#FCA5A5' }}>
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium mb-1">Failed to load admins</div>
                    <div style={{ color: 'rgba(252,165,165,0.70)' }}>{error}</div>
                    <button onClick={load} className="mt-2 underline" style={{ color: '#FCA5A5' }}>
                      Retry
                    </button>
                  </div>
                </div>
              ) : admins.length === 0 ? (
                <div className="text-center py-10">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: 'var(--text-3)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-3)' }}>No admin accounts found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {admins.map(u => <AdminRow key={u.id} user={u} />)}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          {/* ── Create form ────────────────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl p-5 sticky top-20"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border-0)' }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
                  <Plus className="w-3 h-3" style={{ color: '#818CF8' }} />
                </div>
                <span className="label">Create Admin Account</span>
              </div>
              <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>
                New accounts receive admin role immediately and can sign in at{' '}
                <Link href="/admin/sign-in" className="underline" style={{ color: 'var(--text-2)' }}>
                  /admin/sign-in
                </Link>
                .
              </p>
              <CreateAdminForm onCreated={handleCreated} />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
