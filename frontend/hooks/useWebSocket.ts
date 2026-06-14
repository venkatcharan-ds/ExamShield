'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import type { WebSocketMessage, RiskAssessment } from '@/types'

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

interface UseWebSocketOptions {
  sessionId: string
  candidateName: string
  onRiskUpdate?: (assessment: RiskAssessment) => void
  enabled?: boolean
}

export interface UseWebSocketReturn {
  send: (message: WebSocketMessage) => void
  connectionState: ConnectionState
  isConnected: boolean
}

/** Normalise any URL to a WebSocket URL (ws:// or wss://) */
function toWsUrl(raw: string): string {
  return raw
    .replace(/^https:\/\//, 'wss://')
    .replace(/^http:\/\//, 'ws://')
}

export function useWebSocket({
  sessionId,
  candidateName,
  onRiskUpdate,
  enabled = true,
}: UseWebSocketOptions): UseWebSocketReturn {
  const wsRef                 = useRef<WebSocket | null>(null)
  const reconnectTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptsRef  = useRef(0)
  const mountedRef            = useRef(true)
  const onRiskUpdateRef       = useRef(onRiskUpdate)
  onRiskUpdateRef.current     = onRiskUpdate   // always latest without re-running effect

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')

  const MAX_ATTEMPTS    = 5
  const BASE_DELAY_MS   = 2000

  const connect = useCallback(() => {
    if (!enabled || !sessionId || !mountedRef.current) return

    const base   = process.env.NEXT_PUBLIC_WS_URL ?? "wss://examshield-api-production-1e2c.up.railway.app"
    const wsBase = toWsUrl(base)
    const url    = `${wsBase}/ws/${sessionId}`

    try {
      setConnectionState('connecting')
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        if (!mountedRef.current) { ws.close(); return }
        setConnectionState('connected')
        reconnectAttemptsRef.current = 0

        // Register session with backend
        ws.send(JSON.stringify({
          type: 'session_start',
          payload: { session_id: sessionId, candidate_name: candidateName },
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
        // onerror always precedes onclose — let onclose handle reconnect
        if (mountedRef.current) setConnectionState('error')
        ws.close()
      }
    } catch {
      if (mountedRef.current) setConnectionState('error')
    }
  }, [sessionId, candidateName, enabled])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      if (wsRef.current) {
        wsRef.current.onclose = null   // prevent reconnect on intentional unmount close
        wsRef.current.close()
      }
    }
  }, [connect])

  const send = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
    // If not connected, exam page queues snapshots itself
  }, [])

  return { send, connectionState, isConnected: connectionState === 'connected' }
}
