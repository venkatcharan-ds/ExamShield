import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Refreshes the Supabase session cookie on every request and redirects
 * unauthenticated visitors to the appropriate sign-in page:
 *   /dashboard  → /admin/sign-in
 *   /portal     → /student/sign-in
 *
 * /exam and all other routes stay public.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  if (!user) {
    if (pathname.startsWith('/dashboard')) {
      const redirectUrl = new URL('/admin/sign-in', request.url)
      redirectUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(redirectUrl)
    }
    if (pathname.startsWith('/portal')) {
      const redirectUrl = new URL('/student/sign-in', request.url)
      redirectUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(redirectUrl)
    }
  }

  if (pathname.startsWith('/dashboard') && user?.app_metadata?.role !== 'admin') {
    return NextResponse.redirect(new URL('/portal', request.url))
  }

  return supabaseResponse
}
