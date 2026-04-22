"use client"

/**
 * useLivePosition — live clock-ticking lat/lng for CREP entity widgets
 * — Apr 22, 2026
 *
 * Morgan: "all planes boats satelites need accurate moving live gps
 * data long lat in their widget moving live like a clock".
 *
 * Reads window.__crep_lastKnown (populated on every pump cycle by
 * CREPDashboardClient's lastKnown effect) for an entity by id, then
 * extrapolates lat/lng from the last known position + velocity at a
 * 100 ms tick so the widget displays numbers that move smoothly
 * between server updates instead of freezing on the click-time value.
 *
 * Behaviour:
 *   - Returns { lat, lng, heading, speed, ts, tickAt } every 100 ms
 *   - Falls back to static fallbackLat/fallbackLng if the id isn't in
 *     the lastKnown map (e.g. satellite handled by SGP4 animation,
 *     entity just clicked but pump hasn't written yet)
 *   - Pauses when tab hidden (visibilitychange)
 *   - Safe on SSR — returns fallback without touching window
 */

import { useEffect, useState } from "react"

export interface LivePosition {
  lat: number
  lng: number
  /** Heading in degrees clockwise from north (0 = north). */
  heading: number
  /** Ground speed (deg / s in map coords — negative if not available). */
  speed_dps: number
  /** Seconds since the last server update. */
  age_s: number
  /** Epoch ms of the last render tick (for "updated Xs ago" UI). */
  tickAt: number
}

interface LastKnownEntry {
  lat: number
  lng: number
  velLng: number
  velLat: number
  ts: number
  heading?: number
}

const TICK_MS = 100

export function useLivePosition(
  id: string | undefined,
  fallbackLat: number | null | undefined,
  fallbackLng: number | null | undefined,
): LivePosition | null {
  const [pos, setPos] = useState<LivePosition | null>(() => {
    if (!Number.isFinite(fallbackLat) || !Number.isFinite(fallbackLng)) return null
    return { lat: Number(fallbackLat), lng: Number(fallbackLng), heading: 0, speed_dps: -1, age_s: 0, tickAt: Date.now() }
  })

  useEffect(() => {
    if (!id) return
    if (typeof window === "undefined") return
    let timer: any = null
    let cancelled = false

    const compute = (): LivePosition | null => {
      const lk = (window as any).__crep_lastKnown as Record<string, LastKnownEntry> | undefined
      const entry = lk?.[id]
      const now = Date.now()
      if (!entry) {
        if (Number.isFinite(fallbackLat) && Number.isFinite(fallbackLng)) {
          return { lat: Number(fallbackLat), lng: Number(fallbackLng), heading: 0, speed_dps: -1, age_s: 0, tickAt: now }
        }
        return null
      }
      const dtSec = Math.max(0, (now - entry.ts) / 1000)
      const lng = entry.lng + entry.velLng * dtSec
      const lat = entry.lat + entry.velLat * dtSec
      const speed = Math.hypot(entry.velLng, entry.velLat)
      const heading = entry.heading != null && Number.isFinite(entry.heading)
        ? entry.heading
        : (speed > 1e-9 ? (Math.atan2(entry.velLng, entry.velLat) * 180 / Math.PI + 360) % 360 : 0)
      return { lat, lng, heading, speed_dps: speed, age_s: dtSec, tickAt: now }
    }

    const tick = () => {
      if (cancelled) return
      if (document.hidden) return
      const p = compute()
      if (p) setPos(p)
    }

    // Initial tick immediately so the widget doesn't wait for the
    // first interval fire to show a live number.
    tick()
    timer = setInterval(tick, TICK_MS)

    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
    }
  }, [id, fallbackLat, fallbackLng])

  return pos
}
