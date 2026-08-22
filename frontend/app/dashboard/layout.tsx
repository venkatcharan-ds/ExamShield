import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardWebSocketAuth } from '@/components/DashboardWebSocketAuth'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/sign-in?next=/dashboard')

  if (user.app_metadata?.role !== 'admin') redirect('/portal')

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) redirect('/sign-in?next=/dashboard')

  return (
    <DashboardWebSocketAuth accessToken={session.access_token}>
      {children}
    </DashboardWebSocketAuth>
  )
}
