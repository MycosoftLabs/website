"use client"

/**
 * useAirNowAQI — live AQI hook for CREP widgets — Apr 22, 2026
 *
 * Morgan: "all aqi widgets even ones we added for project oyster and
 * goffs need live data in widget no refresh needed".
 *
 * Given a lat/lng, returns the current EPA AirNow AQI reading for
 * the nearest reporting monitor and auto-refreshes every 10 min
 * (AirNow updates hourly upstream). Widgets just mount it — no manual
 * refresh button, no polling noise while backgrounded.
 *
 * Behaviour:
 *   - Fetches /api/crep/airnow/current on mount
 *   - Re-fetches every REFRESH_MS while the tab is visible
 *   - Pauses polling when document.hidden (visibility API)
 *   - Resumes immediately when the tab returns to foreground
 *   - Never throws — returns { status: "err", message } on failure so
 *     the widget can render a graceful "AQI unavailable" card
 */

import { useEffect, useRef, useState } from "react"

export interface AirNowObservation {
  parameter: string
  parameter_raw: string
  aqi: number
  category: { number: number; name: string; color: string }
  observed_at: string
  lat: number
  lng: number
  agency: string | null
  state: string | null
}

export interface AirNowData {
  reporting_area: string | null
  state: string | null
  observations: AirNowObservation[]
  dominant: { parameter: string; aqi: number; category: { number: number; name: string; color: string } } | null
  site_count: number
  cached_at: string
  ttl_s: number
  coordinates: { lat: number; lng: number; radius_mi: number }
}

export type AirNowHookState =
  | { status: "idle" }
  | { status: "loading"; data?: AirNowData }
  | { status: "ok"; data: AirNowData; updated_at: number }
  | { status: "err"; message: string; data?: AirNowData }
  | { status: "unavailable" } // API key not configured (501)

const REFRESH_MS = 10 * 60_000 // 10 min

export function useAirNowAQI(lat: number | undefined, lng: number | undefined, radiusMi = 25): AirNowHookState {
  const [state, setState] = useState<AirNowHookState>({ status: "idle" })
  const lastAttempt = useRef(0)

  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setState({ status: "idle" })
      return
    }

    let cancelled = false
    let timer: any = null

    const fetchOnce = async () => {
      if (cancelled) return
      lastAttempt.current = Date.now()
      setState((prev) => (prev.status === "ok" ? { status: "loading", data: prev.data } : { status: "loading" }))
      try {
        const res = await fetch(`/api/crep/airnow/current?lat=${lat}&lng=${lng}&distance=${radiusMi}`, {
          signal: AbortSignal.timeout(15_000),
        })
        if (res.status === 501) {
          if (!cancelled) setState({ status: "unavailable" })
          return
        }
        if (!res.ok) {
          if (!cancelled) setState({ status: "err", message: `HTTP ${res.status}` })
          return
        }
        const data = (await res.json()) as AirNowData
        if (!cancelled) setState({ status: "ok", data, updated_at: Date.now() })
      } catch (err: any) {
        if (!cancelled) setState({ status: "err", message: err?.message || "fetch failed" })
      }
    }

    const schedule = () => {
      timer = setTimeout(() => {
        if (!document.hidden) {
          fetchOnce().finally(schedule)
        } else {
          schedule()
        }
      }, REFRESH_MS)
    }

    const onVisible = () => {
      if (document.hidden) return
      // If we've been away > REFRESH_MS, refresh immediately
      if (Date.now() - lastAttempt.current > REFRESH_MS) fetchOnce()
    }

    fetchOnce().finally(schedule)
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [lat, lng, radiusMi])

  return state
}
