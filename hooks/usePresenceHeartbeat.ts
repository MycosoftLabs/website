/**
 * React Hook for presence heartbeat
 *
 * Sends heartbeat to Supabase every 30 seconds while user is active.
 * Tracks current page, activity type, and manages session lifecycle.
 */

"use client"

import { useEffect, useRef, useCallback, useState } from "react"

const HEARTBEAT_INTERVAL_MS = 30_000

export type ActivityType = "active" | "idle" | "away"

interface HeartbeatPayload {
  session_id: string
  page_path: string
  activity_type: ActivityType
  app_context?: string
}

export function usePresenceHeartbeat(enabled: boolean, userId: string | undefined) {
  const sessionIdRef = useRef<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastActivityRef = useRef<number>(Date.now())
  const [activityType, setActivityType] = useState<ActivityType>("active")

  const getSessionId = useCallback((): string => {
    if (sessionIdRef.current) return sessionIdRef.current
    const id = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`
    sessionIdRef.current = id
    return id
  }, [])

  const sendHeartbeat = useCallback(
    async (payload: Partial<HeartbeatPayload> = {}) => {
      if (!userId) return

      const pagePath = typeof window !== "undefined" ? window.location.pathname : "/"
      const body: HeartbeatPayload = {
        session_id: getSessionId(),
        page_path: pagePath,
        activity_type: activityType,
        app_context: "web",
        ...payload,
      }

      try {
        const baseUrl =
          typeof window !== "undefined"
            ? window.location.origin
            : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3010"
        await fetch(`${baseUrl}/api/presence/heartbeat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          credentials: "include",
        })
      } catch {
        // Silently ignore heartbeat failures
      }
    },
    [userId, getSessionId, activityType]
  )

  const startSession = useCallback(async () => {
    if (!userId) return
    await sendHeartbeat({ activity_type: "active" })
  }, [userId, sendHeartbeat])

  const endSession = useCallback(async () => {
    if (!userId) return

    try {
      const baseUrl =
        typeof window !== "undefined"
          ? window.location.origin
          : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3010"
      await fetch(`${baseUrl}/api/presence/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: getSessionId(),
          page_path: typeof window !== "undefined" ? window.location.pathname : "/",
          activity_type: "away",
          end_session: true,
        }),
        credentials: "include",
      })
    } catch {
      // Ignore
    }
  }, [userId, getSessionId])

  useEffect(() => {
    if (!enabled || !userId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    startSession()

    intervalRef.current = setInterval(() => {
      lastActivityRef.current = Date.now()
      sendHeartbeat()
    }, HEARTBEAT_INTERVAL_MS)

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setActivityType("idle")
      } else {
        setActivityType("active")
        lastActivityRef.current = Date.now()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    const handlePageUnload = () => {
      const body = JSON.stringify({
        session_id: getSessionId(),
        page_path: window.location.pathname,
        activity_type: "away",
        end_session: true,
      })
      const url = `${window.location.origin}/api/presence/heartbeat`
      if (typeof navigator.sendBeacon === "function") {
        const blob = new Blob([body], { type: "application/json" })
        navigator.sendBeacon(url, blob)
      }
    }

    window.addEventListener("beforeunload", handlePageUnload)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("beforeunload", handlePageUnload)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      endSession()
    }
  }, [enabled, userId, startSession, sendHeartbeat, endSession, getSessionId])

  return {
    sessionId: sessionIdRef.current ?? getSessionId(),
    activityType,
    lastActivity: lastActivityRef.current,
  }
}
