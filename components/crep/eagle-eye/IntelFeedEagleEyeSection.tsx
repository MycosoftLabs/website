"use client"

/**
 * Intel Feed — Eagle Eye section — Apr 20, 2026 (Phase 6c)
 *
 * A compact card that lives inside the existing Intel Feed left panel,
 * showing live counts of permanent cameras + ephemeral events by
 * provider. Subscribes to the `crep:eagle:{camera,event}-counts`
 * CustomEvents dispatched by EagleEyeOverlay.
 *
 * Click a provider row → focuses the EagleEyeOverlay on that provider
 * (sets window.__crep_eagle_focus_provider + dispatches a matching
 * CustomEvent the overlay can pick up in a future pass).
 *
 * Intentionally self-contained (no changes to the existing Intel Feed
 * component) so this drops into any panel that renders this component.
 */

import { useEffect, useState } from "react"
import { Camera, Radio, PlaySquare } from "lucide-react"

interface EagleCounts {
  total: number
  by_provider: Record<string, number>
}

const CAM_PROVIDERS: Array<{ id: string; name: string; color: string }> = [
  { id: "shinobi",         name: "Shinobi",       color: "#22d3ee" },
  { id: "unifi-protect",   name: "UniFi Protect", color: "#38bdf8" },
  { id: "road511",         name: "511 traffic",   color: "#fbbf24" },
  { id: "511ga",           name: "GA DOT",        color: "#fbbf24" },
  { id: "511-bayarea",     name: "Bay Area 511",  color: "#fbbf24" },
  { id: "windy",           name: "Windy",         color: "#60a5fa" },
  { id: "earthcam",        name: "EarthCam",      color: "#a855f7" },
  { id: "nps",             name: "NPS parks",     color: "#22c55e" },
  { id: "usgs",            name: "USGS hazards",  color: "#22c55e" },
]

const EVENT_PROVIDERS: Array<{ id: string; name: string; color: string }> = [
  { id: "youtube-live",     name: "YouTube Live",  color: "#ef4444" },
  { id: "bluesky",          name: "Bluesky",       color: "#38bdf8" },
  { id: "mastodon",         name: "Mastodon",      color: "#6d28d9" },
  { id: "x",                name: "X",             color: "#f3f4f6" },
  { id: "tiktok",           name: "TikTok",        color: "#ec4899" },
  { id: "mindex-ephemeral", name: "MINDEX",        color: "#22d3ee" },
]

export default function IntelFeedEagleEyeSection() {
  const [cams, setCams] = useState<EagleCounts>({ total: 0, by_provider: {} })
  const [events, setEvents] = useState<EagleCounts>({ total: 0, by_provider: {} })

  useEffect(() => {
    const onCam = (e: any) => {
      const d = e?.detail || {}
      setCams({ total: d.total || 0, by_provider: d.by_provider || {} })
    }
    const onEvt = (e: any) => {
      const d = e?.detail || {}
      setEvents({ total: d.total || 0, by_provider: d.by_provider || {} })
    }
    window.addEventListener("crep:eagle:camera-counts", onCam as any)
    window.addEventListener("crep:eagle:event-counts", onEvt as any)
    // Seed from globals in case events already fired before mount
    const seedCams = (window as any).__crep_eagle_camera_counts
    const seedEvts = (window as any).__crep_eagle_event_counts
    if (seedCams) setCams({ total: Object.values(seedCams as Record<string, number>).reduce((a, n) => a + n, 0), by_provider: seedCams })
    if (seedEvts) setEvents({ total: Object.values(seedEvts as Record<string, number>).reduce((a, n) => a + n, 0), by_provider: seedEvts })
    return () => {
      window.removeEventListener("crep:eagle:camera-counts", onCam as any)
      window.removeEventListener("crep:eagle:event-counts", onEvt as any)
    }
  }, [])

  const focusProvider = (id: string) => {
    try {
      ;(window as any).__crep_eagle_focus_provider = id
      window.dispatchEvent(new CustomEvent("crep:eagle:focus-provider", { detail: { provider: id } }))
    } catch { /* ignore */ }
  }

  return (
    <div className="border-t border-cyan-500/20 pt-3 mt-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <PlaySquare className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
            Eagle Eye
          </span>
        </div>
        <span className="text-[10px] text-gray-500">video intelligence</span>
      </div>

      {/* Permanent cameras subsection */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Camera className="w-3 h-3 text-cyan-400" />
            <span className="text-[10px] font-semibold text-white uppercase tracking-wide">
              Cameras
            </span>
          </div>
          <span className="text-[10px] tabular-nums text-cyan-300">{cams.total}</span>
        </div>
        <div className="grid grid-cols-2 gap-0.5">
          {CAM_PROVIDERS.filter((p) => (cams.by_provider[p.id] || 0) > 0).map((p) => (
            <button
              key={p.id}
              onClick={() => focusProvider(p.id)}
              className="flex items-center justify-between px-1.5 py-0.5 rounded hover:bg-white/5 text-left"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="shrink-0" style={{ width: 5, height: 5, borderRadius: 9, background: p.color, display: "inline-block" }} />
                <span className="text-[10px] text-gray-300 truncate">{p.name}</span>
              </div>
              <span className="text-[10px] tabular-nums text-gray-400">{cams.by_provider[p.id] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Ephemeral events subsection */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-yellow-400" />
            <span className="text-[10px] font-semibold text-white uppercase tracking-wide">
              Live events
            </span>
          </div>
          <span className="text-[10px] tabular-nums text-yellow-300">{events.total}</span>
        </div>
        <div className="grid grid-cols-2 gap-0.5">
          {EVENT_PROVIDERS.filter((p) => (events.by_provider[p.id] || 0) > 0).map((p) => (
            <button
              key={p.id}
              onClick={() => focusProvider(p.id)}
              className="flex items-center justify-between px-1.5 py-0.5 rounded hover:bg-white/5 text-left"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="shrink-0" style={{ width: 5, height: 5, borderRadius: 9, background: p.color, display: "inline-block" }} />
                <span className="text-[10px] text-gray-300 truncate">{p.name}</span>
              </div>
              <span className="text-[10px] tabular-nums text-gray-400">{events.by_provider[p.id] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      {cams.total === 0 && events.total === 0 && (
        <div className="text-[10px] text-gray-500 italic mt-1">
          Toggle "Eagle Eye — Cameras" and "Eagle Eye — Live Events" in the right-panel layer list to populate.
        </div>
      )}
    </div>
  )
}
