import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardWebSocketAuth } from '@/components/DashboardWebSocketAuth'

/**
 * Server-side auth guard for /dashboard plus authenticated WebSocket boundary.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in?next=/dashboard')
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    redirect('/sign-in?next=/dashboard')
  }

  return (
    <DashboardWebSocketAuth accessToken={session.access_token}>
      {children}
    </DashboardWebSocketAuth>
  )
}
