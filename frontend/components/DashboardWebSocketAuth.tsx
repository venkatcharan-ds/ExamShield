'use client'

import { useMemo } from 'react'

/**
 * The existing dashboard page opens its WebSocket directly. This small
 * boundary supplies the authenticated Supabase JWT to /ws-dashboard without
 * rewriting the large dashboard component.
 */
export function DashboardWebSocketAuth({
  accessToken,
  children,
}: {
  accessToken: string
  children: React.ReactNode
}) {
  useMemo(() => {
    const NativeWebSocket = window.WebSocket
    if ((window as Window & { __examShieldWsPatched?: boolean }).__examShieldWsPatched) return

    class AuthenticatedWebSocket extends NativeWebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        const raw = String(url)
        if (raw.includes('/ws-dashboard') && accessToken) {
          const separator = raw.includes('?') ? '&' : '?'
          url = `${raw}${separator}token=${encodeURIComponent(accessToken)}`
        }
        super(url, protocols)
      }
    }

    window.WebSocket = AuthenticatedWebSocket as typeof WebSocket
    ;(window as Window & { __examShieldWsPatched?: boolean }).__examShieldWsPatched = true
  }, [accessToken])

  return <>{children}</>
}
