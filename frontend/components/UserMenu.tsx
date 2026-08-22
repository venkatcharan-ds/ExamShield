'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, ChevronDown, User, Shield } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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
        className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl glass hover:border-indigo-500/40 transition-colors duration-150"
        aria-label="Account menu"
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[10.5px] font-bold font-mono text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' }}
        >
          {initials}
        </div>
        <span className="text-xs font-medium text-zinc-200 hidden sm:inline-block max-w-[120px] truncate">
          {profile.name}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 mt-2 w-60 rounded-2xl overflow-hidden z-50 glass-hi"
            style={{
              border: '1px solid rgba(255,255,255,0.10)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.65)',
            }}
          >
            <div className="p-4 border-b border-white/5 bg-white/[0.02]">
              <div className="text-xs font-bold text-white truncate">{profile.name}</div>
              <div className="text-[11px] font-mono text-zinc-400 truncate mt-0.5">{profile.email}</div>
              <div className="inline-flex items-center gap-1 mt-2 text-[9.5px] font-mono uppercase px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Shield className="w-2.5 h-2.5" />
                Examiner Account
              </div>
            </div>

            <div className="p-2">
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold rounded-xl text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                <LogOut className="w-3.5 h-3.5" />
                {signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
