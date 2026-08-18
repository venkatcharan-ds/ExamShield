import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/** Server-side Supabase client — used in Server Components, Route Handlers, and the dashboard layout guard. */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from a Server Component — safe to ignore because
            // the middleware below refreshes the session on every request.
          }
        },
      },
    }
  )
}
