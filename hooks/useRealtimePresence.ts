/**
 * React Hook for real-time presence updates
 *
 * Subscribes to the presence SSE stream for live online user updates.
 */

"use client"

import { useEffect, useState } from "react"

interface OnlineUser {
  user_id: string
  name: string
  email?: string | null
  role: string
  is_superuser: boolean
  current_page: string
  session_duration_seconds: number
  last_heartbeat: string
}

interface PresenceState {
  online_users: number
  active_sessions: number
  staff_online: number
  online: OnlineUser[]
  lastUpdate: Date | null
}

const initialState: PresenceState = {
  online_users: 0,
  active_sessions: 0,
  staff_online: 0,
  online: [],
  lastUpdate: null,
}

export function useRealtimePresence(enabled = true) {
  const [state, setState] = useState<PresenceState>(initialState)
  const [error, setError] = useState<Error | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!enabled) return

    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/api/presence/stream`
    const eventSource = new EventSource(url)

    eventSource.onopen = () => {
      setIsConnected(true)
      setError(null)
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        setState({
          online_users: data.online_users ?? 0,
          active_sessions: data.active_sessions ?? 0,
          staff_online: data.staff_online ?? 0,
          online: data.online ?? [],
          lastUpdate: new Date(),
        })
      } catch {
        // Ignore parse errors
      }
    }

    eventSource.onerror = () => {
      setIsConnected(false)
      setError(new Error("Presence stream connection failed"))
    }

    return () => {
      eventSource.close()
      setIsConnected(false)
    }
  }, [enabled])

  return { ...state, error, isConnected }
}
