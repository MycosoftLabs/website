"use client"

/**
 * LiveAQIWidget — auto-refreshing AirNow AQI panel — Apr 22, 2026
 *
 * Morgan: "all aqi widgets even ones we added for project oyster and
 * goffs need live data in widget no refresh needed".
 *
 * Drop-in replacement for static AQI panels. Takes a lat/lng, mounts
 * the useAirNowAQI hook, renders:
 *   - Dominant AQI number + color-coded category label
 *   - All pollutant readings (PM2.5 / O3 / PM10 / CO / NO2 / SO2)
 *   - Reporting area + last-observed-at
 *   - Quiet "live" badge that pulses during refresh
 *
 * No refresh button — the hook auto-refreshes every 10 min and
 * immediately on tab foreground.
 */

import { Wind, Activity } from "lucide-react"
import { useAirNowAQI } from "@/lib/crep/use-airnow-aqi"

export interface LiveAQIWidgetProps {
  lat: number
  lng: number
  /** Radius to search for a reporting monitor (miles). Default 25. */
  radiusMi?: number
  /** Render compact single-row when true; full multi-row card when false. */
  compact?: boolean
  /** Optional header label — if provided, shown above the panel. */
  title?: string
}

export default function LiveAQIWidget({ lat, lng, radiusMi = 25, compact = false, title }: LiveAQIWidgetProps) {
  const s = useAirNowAQI(lat, lng, radiusMi)

  if (s.status === "unavailable") {
    return (
      <div className="bg-black/30 rounded-lg p-3 border border-yellow-500/20 text-[11px] text-yellow-300">
        AirNow key not configured on this deployment — no live AQI available.
      </div>
    )
  }

  if (s.status === "idle" || (s.status === "loading" && !s.data)) {
    return (
      <div className="bg-black/30 rounded-lg p-3 border border-white/10 text-[11px] text-white/60 flex items-center gap-2">
        <Activity className="w-3 h-3 animate-pulse" /> Fetching AQI…
      </div>
    )
  }

  if (s.status === "err" && !s.data) {
    return (
      <div className="bg-black/30 rounded-lg p-3 border border-red-500/20 text-[11px] text-red-300">
        AQI fetch failed: {s.message}
      </div>
    )
  }

  const data = s.status === "ok" ? s.data : s.data
  if (!data || !data.dominant) {
    return (
      <div className="bg-black/30 rounded-lg p-3 border border-white/10 text-[11px] text-white/60">
        No AirNow monitors reporting within {radiusMi} mi.
      </div>
    )
  }

  const { dominant, observations, reporting_area, cached_at } = data
  const updated = new Date(cached_at)
  const color = dominant.category.color

  if (compact) {
    return (
      <div className="bg-black/30 rounded-lg px-2 py-1.5 border border-white/10 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />
        <div className="text-[10px] text-white/60 uppercase tracking-wider">AQI</div>
        <div className="text-white font-mono font-bold" style={{ color }}>{dominant.aqi}</div>
        <div className="text-[10px] text-white/60 truncate flex-1">{dominant.category.name}</div>
        <div className="text-[9px] text-white/40 font-mono">{dominant.parameter}</div>
      </div>
    )
  }

  return (
    <div className="bg-black/30 rounded-lg p-3 border border-white/10 space-y-2">
      {title && (
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-300">{title}</div>
          <div className="flex items-center gap-1 text-[9px] text-white/40">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: color }} />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: color }} />
            </span>
            LIVE
          </div>
        </div>
      )}
      <div className="flex items-center gap-3">
        <div className="rounded-lg px-3 py-1.5 border" style={{ background: `${color}22`, borderColor: `${color}66` }}>
          <div className="text-[9px] font-mono uppercase tracking-wider" style={{ color }}>AQI</div>
          <div className="text-2xl font-mono font-bold leading-tight" style={{ color }}>{dominant.aqi}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-white font-semibold truncate">{dominant.category.name}</div>
          <div className="text-[10px] text-white/60 truncate">
            {dominant.parameter} dominant · {reporting_area || "EPA AirNow"}
          </div>
        </div>
      </div>
      {observations.length > 1 && (
        <div className="grid grid-cols-3 gap-1.5">
          {observations.slice(0, 6).map((o, i) => (
            <div key={i} className="bg-white/5 rounded px-1.5 py-1 border border-white/10">
              <div className="text-[9px] text-white/50 uppercase tracking-wider">{o.parameter}</div>
              <div className="text-xs font-mono" style={{ color: o.category.color }}>{o.aqi}</div>
            </div>
          ))}
        </div>
      )}
      <div className="text-[9px] text-white/40 font-mono">
        EPA AirNow · updated {updated.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} · auto-refreshes every 10 min
        <Wind className="inline w-2.5 h-2.5 ml-1 opacity-50" />
      </div>
    </div>
  )
}
