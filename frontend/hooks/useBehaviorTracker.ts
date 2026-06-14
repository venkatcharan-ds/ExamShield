'use client'

import { useEffect, useRef, useCallback } from 'react'
import type { BehaviorEvent, BehaviorSnapshot } from '@/types'

interface UseBehaviorTrackerOptions {
  sessionId: string
  candidateName: string
  onSnapshot: (snapshot: BehaviorSnapshot) => void
  intervalMs?: number  // how often to send snapshots (default 3000ms)
  enabled?: boolean
}

export function useBehaviorTracker({
  sessionId,
  candidateName,
  onSnapshot,
  intervalMs = 3000,
  enabled = true,
}: UseBehaviorTrackerOptions) {
  const eventsBufferRef = useRef<BehaviorEvent[]>([])
  const lastKeystrokeRef = useRef<number>(0)
  const windowStartRef = useRef<number>(Date.now())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isIdleRef = useRef<boolean>(false)
  const IDLE_THRESHOLD_MS = 5000

  const pushEvent = useCallback((event: BehaviorEvent) => {
    eventsBufferRef.current.push(event)
  }, [])

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)

    if (isIdleRef.current) {
      isIdleRef.current = false
      pushEvent({ type: 'idle_end', timestamp: Date.now() })
    }

    idleTimerRef.current = setTimeout(() => {
      isIdleRef.current = true
      pushEvent({ type: 'idle_start', timestamp: Date.now() })
    }, IDLE_THRESHOLD_MS)
  }, [pushEvent])

  const flushSnapshot = useCallback(() => {
    if (!enabled) return
    const now = Date.now()
    const snapshot: BehaviorSnapshot = {
      session_id: sessionId,
      candidate_name: candidateName,
      events: [...eventsBufferRef.current],
      window_start: windowStartRef.current,
      window_end: now,
    }
    eventsBufferRef.current = []
    windowStartRef.current = now
    onSnapshot(snapshot)
  }, [sessionId, candidateName, enabled, onSnapshot])

  useEffect(() => {
    if (!enabled) return

    // Keystroke listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now()
      pushEvent({
        type: 'keydown',
        timestamp: now,
        metadata: {
          key: e.key.length === 1 ? 'char' : e.key, // don't capture actual chars
          interval_since_last: lastKeystrokeRef.current ? now - lastKeystrokeRef.current : 0,
        },
      })
      lastKeystrokeRef.current = now
      resetIdleTimer()
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      pushEvent({ type: 'keyup', timestamp: Date.now() })
      // ignore e
      void e
    }

    // Mouse listener (throttled to avoid flooding)
    let lastMouseTime = 0
    const handleMouseMove = () => {
      const now = Date.now()
      if (now - lastMouseTime > 500) {
        pushEvent({ type: 'mouse_move', timestamp: now })
        lastMouseTime = now
        resetIdleTimer()
      }
    }

    // Tab visibility
    const handleVisibilityChange = () => {
      if (document.hidden) {
        pushEvent({ type: 'tab_switch', timestamp: Date.now() })
      } else {
        pushEvent({ type: 'focus_gain', timestamp: Date.now() })
      }
    }

    // Window focus
    const handleBlur = () => {
      pushEvent({ type: 'focus_loss', timestamp: Date.now() })
    }

    // Copy/Paste
    const handleCopy = () => {
      pushEvent({ type: 'copy', timestamp: Date.now() })
    }
    const handlePaste = () => {
      pushEvent({ type: 'paste', timestamp: Date.now() })
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.addEventListener('copy', handleCopy)
    document.addEventListener('paste', handlePaste)
    window.addEventListener('blur', handleBlur)

    // Flush snapshot at interval
    intervalRef.current = setInterval(flushSnapshot, intervalMs)

    // Start idle timer
    resetIdleTimer()

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('paste', handlePaste)
      window.removeEventListener('blur', handleBlur)
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [enabled, flushSnapshot, pushEvent, resetIdleTimer, intervalMs])
}
