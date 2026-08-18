'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  name: string
  email: string
}

/** Compact profile + logout control for the dashboard header. Never renders tokens/session data. */
export function UserMenu() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setProfile({
        name: (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'Admin',
        email: user.email ?? '',
      })
    })
  }, [])

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const handleSignOut = async () => {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/sign-in')
    router.refresh()
  }

  if (!profile) return null

  const initials = profile.name.split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg transition-colors duration-150"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border-0)' }}
        aria-label="Account menu"
      >
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0"
          style={{ background: 'var(--brand)', color: 'white' }}>
          {initials}
        </div>
        <ChevronDown className="w-3 h-3" style={{ color: 'var(--text-3)' }} />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-56 rounded-xl overflow-hidden z-50"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border-1)', boxShadow: '0 16px 40px rgba(0,0,0,0.45)' }}
        >
          <div className="px-3.5 py-3" style={{ borderBottom: '1px solid var(--border-0)' }}>
            <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-0)' }}>{profile.name}</div>
            <div className="text-xs truncate mt-0.5" style={{ color: 'var(--text-2)' }}>{profile.email}</div>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium transition-colors duration-150 disabled:opacity-50"
            style={{ color: '#FCA5A5' }}
          >
            <LogOut className="w-3.5 h-3.5" />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  )
}
