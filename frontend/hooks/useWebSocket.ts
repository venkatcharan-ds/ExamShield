'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import type { WebSocketMessage, RiskAssessment } from '@/types'
import { createClient } from '@/lib/supabase/client'

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

interface UseWebSocketOptions {
  sessionId: string
  candidateName: string
  examName?: string
  questionsTotal?: number
  onRiskUpdate?: (assessment: RiskAssessment) => void
  enabled?: boolean
}

export interface UseWebSocketReturn {
  send: (message: WebSocketMessage) => void
  connectionState: ConnectionState
  isConnected: boolean
}

function toWsUrl(raw: string): string {
  return raw.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://')
}

export function useWebSocket({
  sessionId,
  candidateName,
  examName,
  questionsTotal,
  onRiskUpdate,
  enabled = true,
}: UseWebSocketOptions): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const mountedRef = useRef(true)
  const onRiskUpdateRef = useRef(onRiskUpdate)
  onRiskUpdateRef.current = onRiskUpdate

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')
  const MAX_ATTEMPTS = 5
  const BASE_DELAY_MS = 2000

  const connect = useCallback(async () => {
    if (!enabled || !sessionId || !mountedRef.current) return

    const supabase = createClient()
    const { data: { session: authSession } } = await supabase.auth.getSession()
    if (!authSession?.access_token) {
      if (mountedRef.current) setConnectionState('error')
      return
    }

    const base = process.env.NEXT_PUBLIC_WS_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
    const wsBase = toWsUrl(base)
    const url = `${wsBase}/ws/${encodeURIComponent(sessionId)}?token=${encodeURIComponent(authSession.access_token)}`

    try {
      setConnectionState('connecting')
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        if (!mountedRef.current) { ws.close(); return }
        setConnectionState('connected')
        reconnectAttemptsRef.current = 0
        ws.send(JSON.stringify({
          type: 'session_start',
          payload: {
            session_id: sessionId,
            candidate_name: candidateName,
            ...(examName ? { exam_name: examName } : {}),
            ...(questionsTotal ? { questions_total: questionsTotal } : {}),
          },
        }))
      }

      ws.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data as string) as WebSocketMessage
          if (msg.type === 'risk_update' && onRiskUpdateRef.current) {
            onRiskUpdateRef.current(msg.payload as RiskAssessment)
          }
        } catch { /* ignore malformed messages */ }
      }

      ws.onclose = () => {
        if (!mountedRef.current) return
        setConnectionState('disconnected')
        wsRef.current = null
        if (reconnectAttemptsRef.current < MAX_ATTEMPTS && enabled) {
          const delay = BASE_DELAY_MS * Math.pow(1.5, reconnectAttemptsRef.current)
          reconnectAttemptsRef.current++
          reconnectTimerRef.current = setTimeout(connect, delay)
        } else {
          setConnectionState('error')
        }
      }

      ws.onerror = () => {
        if (mountedRef.current) setConnectionState('error')
        ws.close()
      }
    } catch {
      if (mountedRef.current) setConnectionState('error')
    }
  }, [sessionId, candidateName, examName, questionsTotal, enabled])

  useEffect(() => {
    mountedRef.current = true
    void connect()
    return () => {
      mountedRef.current = false
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
      }
    }
  }, [connect])

  const send = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(message))
  }, [])

  return { send, connectionState, isConnected: connectionState === 'connected' }
}
