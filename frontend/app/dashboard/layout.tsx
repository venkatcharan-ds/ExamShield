import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Server-side auth guard for /dashboard — belt-and-suspenders alongside the
 * middleware check. Runs before the existing client dashboard page renders;
 * does not modify that page's logic at all.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in?next=/dashboard')
  }

  return <>{children}</>
}
