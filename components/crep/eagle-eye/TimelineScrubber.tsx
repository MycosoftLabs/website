"use client"

/**
 * TimelineScrubber — Eagle Eye ephemeral events bottom bar — Apr 20, 2026
 * (Phase 6)
 *
 * 24 h horizontal strip at the bottom of CREP showing every ephemeral
 * video event (YouTube Live, Bluesky, Mastodon, X, TikTok) as a tick.
 * Drag the scrubber handle to set the time window; EagleEyeOverlay
 * picks this up via the global `window.__crep_eagle_time_window` ref
 * + CustomEvent `crep:eagle:time-window`.
 *
 * Also shows live counts per provider + filter chips. Default behavior:
 * time window = last 6 h (matches /api/eagle/events default).
 *
 * Minimal UI: collapsed by default (small tab at bottom-left). Expanded
 * state shows the full strip. Toggles with a chevron.
 */

import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronUp, ChevronDown, Clock, Filter } from "lucide-react"

interface Event {
  id: string
  observed_at: string | null
  provider: string
  inferred_place?: string | null
  inference_confidence?: number | null
  title?: string | null
}

// Apr 20, 2026 expansion (Morgan: "ensure you have all sources and that
// eagle eye timeline is working not just with social media but any events
// seen on all video"). Timeline now spans ALL Eagle Eye event sources
// grouped into 3 categories: Social / Camera / Sensor. Each provider
// gets a distinct hue + a category tag so users can filter by category
// or by individual source.
type ProviderDef = {
  id: string
  name: string
  color: string
  category: "social" | "camera" | "sensor"
}
const PROVIDERS: ProviderDef[] = [
  // Social — public posts + live broadcasts
  { id: "youtube-live",     name: "YouTube Live",      color: "#ef4444", category: "social" },
  { id: "bluesky",          name: "Bluesky",           color: "#38bdf8", category: "social" },
  { id: "mastodon",         name: "Mastodon",          color: "#6d28d9", category: "social" },
  { id: "twitch",           name: "Twitch",            color: "#9146ff", category: "social" },
  { id: "x",                name: "X",                 color: "#f3f4f6", category: "social" },
  { id: "tiktok",           name: "TikTok",            color: "#ec4899", category: "social" },
  { id: "reddit",           name: "Reddit",            color: "#ff4500", category: "social" },

  // Camera — events from registered camera infrastructure
  { id: "shinobi-detector", name: "Shinobi detector",  color: "#22d3ee", category: "camera" },
  { id: "alertwildfire",    name: "ALERTWildfire",     color: "#f97316", category: "camera" },
  { id: "hpwren",           name: "HPWREN",            color: "#fbbf24", category: "camera" },
  { id: "caltrans-incident",name: "Caltrans CCTV",     color: "#fde047", category: "camera" },
  { id: "nps-cam-event",    name: "NPS cam",           color: "#22c55e", category: "camera" },
  { id: "usgs-cam-event",   name: "USGS cam",          color: "#a3e635", category: "camera" },

  // Sensor — non-camera events that pin to a video viewport
  { id: "cbp-wait-spike",   name: "CBP wait spike",    color: "#f43f5e", category: "sensor" },
  { id: "511-incident",     name: "511 incident",      color: "#fb923c", category: "sensor" },
  { id: "fire-alert",       name: "Fire alert",        color: "#dc2626", category: "sensor" },
  { id: "weather-warning",  name: "Weather warning",   color: "#0ea5e9", category: "sensor" },
  { id: "mindex-ephemeral", name: "MINDEX",            color: "#14b8a6", category: "sensor" },
]
const CATEGORIES = [
  { id: "social", name: "Social", color: "#a855f7" },
  { id: "camera", name: "Camera", color: "#22d3ee" },
  { id: "sensor", name: "Sensor", color: "#fb923c" },
] as const

const HOURS_BACK = 24
const TICK_SECONDS = 30 // horizontal granularity: one tick = 30 s

export default function TimelineScrubber() {
  const [expanded, setExpanded] = useState(false)
  const [events, setEvents] = useState<Event[]>([])
  const [enabledProviders, setEnabledProviders] = useState<Set<string>>(new Set(PROVIDERS.map((p) => p.id)))
  const [hoursBack, setHoursBack] = useState(6)
  const [loading, setLoading] = useState(false)

  // Broadcast the time-window preference so EagleEyeOverlay picks it up
  useEffect(() => {
    try {
      ;(window as any).__crep_eagle_time_window = { hoursBack }
      window.dispatchEvent(new CustomEvent("crep:eagle:time-window", { detail: { hoursBack } }))
    } catch { /* ignore */ }
  }, [hoursBack])

  // Poll /api/eagle/events every 60s when expanded
  useEffect(() => {
    if (!expanded) return
    let cancelled = false
    const fetchEvents = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/eagle/events?hoursBack=${hoursBack}&limit=5000`)
        if (!res.ok) return
        const j = await res.json()
        if (!cancelled) setEvents(j.events || [])
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoading(false) }
    }
    fetchEvents()
    const t = setInterval(fetchEvents, 60_000)
    return () => { cancelled = true; clearInterval(t) }
  }, [expanded, hoursBack])

  const buckets = useMemo(() => {
    // Bucket events into TICK_SECONDS-wide bins over the last hoursBack hours.
    const now = Date.now()
    const windowMs = hoursBack * 3600_000
    const start = now - windowMs
    const binCount = Math.ceil(windowMs / (TICK_SECONDS * 1000))
    const bins: Record<string, number>[] = Array.from({ length: binCount }, () => ({}))
    let max = 0
    for (const e of events) {
      if (!e.observed_at) continue
      if (!enabledProviders.has(e.provider)) continue
      const t = new Date(e.observed_at).getTime()
      if (t < start || t > now) continue
      const binIdx = Math.floor((t - start) / (TICK_SECONDS * 1000))
      if (binIdx < 0 || binIdx >= binCount) continue
      const b = bins[binIdx]
      b[e.provider] = (b[e.provider] || 0) + 1
      const total = Object.values(b).reduce((a, n) => a + n, 0)
      if (total > max) max = total
    }
    return { bins, max: Math.max(max, 1) }
  }, [events, enabledProviders, hoursBack])

  const totalShown = useMemo(
    () => events.filter((e) => enabledProviders.has(e.provider)).length,
    [events, enabledProviders],
  )

  return (
    <div
      className="fixed left-4 bottom-4 z-[9999] rounded-lg border border-cyan-500/40 bg-[#0a1628]/95 shadow-2xl backdrop-blur-sm transition-all overflow-hidden"
      style={{ width: expanded ? Math.min(900, typeof window !== "undefined" ? window.innerWidth - 32 : 900) : 200 }}
    >
      {/* Tab */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-white/5"
      >
        <Clock className="w-4 h-4 text-cyan-400" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-white">Eagle Eye timeline</div>
          <div className="text-[10px] text-cyan-400/70 truncate">
            {expanded ? `${totalShown} events in last ${hoursBack} h` : "expand"}
          </div>
        </div>
        {expanded ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronUp className="w-3 h-3 text-gray-400" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* Hour window selector */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500 mr-1">window</span>
            {[1, 6, 12, 24].map((h) => (
              <button
                key={h}
                onClick={() => setHoursBack(h)}
                className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                  hoursBack === h
                    ? "bg-cyan-500/30 border-cyan-400 text-cyan-100"
                    : "border-gray-700 text-gray-400 hover:text-gray-200"
                }`}
              >
                {h}h
              </button>
            ))}
          </div>

          {/* Category filter row — quick toggle of social/camera/sensor groups */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500 mr-1">category</span>
            {CATEGORIES.map((cat) => {
              const ids = PROVIDERS.filter((p) => p.category === cat.id).map((p) => p.id)
              const allOn = ids.every((id) => enabledProviders.has(id))
              const someOn = ids.some((id) => enabledProviders.has(id))
              const catCount = events.filter((e) => ids.includes(e.provider)).length
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setEnabledProviders((prev) => {
                      const next = new Set(prev)
                      if (allOn) for (const id of ids) next.delete(id)
                      else for (const id of ids) next.add(id)
                      return next
                    })
                  }}
                  className={`text-[10px] px-2 py-0.5 rounded border transition-colors flex items-center gap-1 ${
                    allOn ? "border-white/40 text-white" : someOn ? "border-white/20 text-gray-300" : "border-gray-800 text-gray-600"
                  }`}
                  style={allOn ? { backgroundColor: `${cat.color}33` } : {}}
                >
                  <span style={{ width: 6, height: 6, borderRadius: 9, background: cat.color, display: "inline-block" }} />
                  {cat.name}
                  <span className="text-gray-500">{catCount}</span>
                </button>
              )
            })}
          </div>

          {/* Provider filter chips — grouped by category for readability */}
          <div className="space-y-1">
            {CATEGORIES.map((cat) => (
              <div key={cat.id} className="flex items-center gap-1 flex-wrap">
                <Filter className="w-3 h-3 text-gray-500 mr-0.5" />
                <span className="text-[9px] text-gray-500 mr-1 uppercase tracking-wider" style={{ minWidth: 38 }}>{cat.name}</span>
                {PROVIDERS.filter((p) => p.category === cat.id).map((p) => {
                  const on = enabledProviders.has(p.id)
                  const count = events.filter((e) => e.provider === p.id).length
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setEnabledProviders((prev) => {
                          const next = new Set(prev)
                          if (next.has(p.id)) next.delete(p.id)
                          else next.add(p.id)
                          return next
                        })
                      }}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-colors flex items-center gap-1 ${
                        on ? "border-white/30 text-white" : "border-gray-800 text-gray-600 line-through"
                      }`}
                      style={on ? { backgroundColor: `${p.color}26` } : {}}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: 9, background: p.color, display: "inline-block" }} />
                      {p.name}
                      <span className="text-gray-500">{count}</span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Timeline strip */}
          <div className="relative h-12 bg-black/40 rounded border border-white/5 overflow-hidden">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center text-[10px] text-cyan-400">
                loading events…
              </div>
            )}
            <div className="flex h-full items-end">
              {buckets.bins.map((b, i) => {
                const total = Object.values(b).reduce((a, n) => a + n, 0)
                const hPct = Math.max(0, (total / buckets.max) * 100)
                // Color by dominant provider in this bin
                let dominant: string | null = null
                let dominantCount = 0
                for (const [prov, n] of Object.entries(b)) {
                  if (n > dominantCount) { dominant = prov; dominantCount = n }
                }
                const color = PROVIDERS.find((p) => p.id === dominant)?.color || "#22d3ee"
                return (
                  <div
                    key={i}
                    style={{
                      flex: "1 1 0",
                      height: `${hPct}%`,
                      backgroundColor: total > 0 ? color : "transparent",
                      opacity: total > 0 ? 0.8 : 0,
                      minHeight: total > 0 ? 2 : 0,
                      marginRight: 0.5,
                    }}
                    title={`${total} events`}
                  />
                )
              })}
            </div>
            {/* "now" marker on the right */}
            <div className="absolute top-0 right-0 bottom-0 w-px bg-red-500" />
          </div>

          {/* Axis labels */}
          <div className="flex justify-between text-[9px] text-gray-500 px-0.5">
            <span>-{hoursBack}h</span>
            <span>-{Math.round(hoursBack / 2)}h</span>
            <span>now</span>
          </div>
        </div>
      )}
    </div>
  )
}
