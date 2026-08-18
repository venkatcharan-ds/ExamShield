import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Shared callback for email-confirmation links and password-reset links —
 * Supabase's PKCE flow redirects here with a `code` that must be exchanged
 * for a session before the destination page can use it.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=auth_callback_failed`)
}
