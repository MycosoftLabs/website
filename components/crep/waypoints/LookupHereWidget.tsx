"use client"

/**
 * "What's here?" Widget — Apr 22, 2026
 *
 * Morgan: "the right click whats here search does not work needs to be
 * fixed".
 *
 * Listens for the crep:lookup-here event (dispatched by WaypointSystem
 * when the user picks "What's here?" from the right-click menu) and:
 *
 *   1. Calls /api/crep/reverse-geocode?lat&lng → address + admin +
 *      country + nearby MINDEX entities (substations, cameras, TX
 *      lines, species obs, etc) within 1 km.
 *   2. Displays the results in a floating panel anchored to the click
 *      location with the Mycosoft cyan styling used by other CREP
 *      widgets.
 *   3. Each nearby entity is a button that calls the existing
 *      window.__crep_selectAsset hook to open its detail panel.
 *
 * Independent of WaypointSystem — we just need the event to fire from
 * somewhere. WaypointSystem owns the menu UI, this widget owns the
 * response.
 */

import { useEffect, useState } from "react"
import { MapPin, X, Navigation2, Loader2 } from "lucide-react"

type NearbyEntity = {
  id: string
  type: string
  name: string | null
  lat: number
  lng: number
  dist_m: number
  voltage: string | null
  operator: string | null
}

type LookupResult = {
  lat: number
  lng: number
  radius_km: number
  address: string | null
  place: string | null
  admin: string | null
  country: string | null
  nearby: NearbyEntity[]
}

export default function LookupHereWidget() {
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "loading"; lat: number; lng: number }
    | { kind: "ok"; data: LookupResult }
    | { kind: "err"; message: string; lat: number; lng: number }
  >({ kind: "idle" })

  useEffect(() => {
    const onLookup = async (e: any) => {
      const lat = Number(e?.detail?.lat)
      const lng = Number(e?.detail?.lng)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
      setState({ kind: "loading", lat, lng })
      try {
        const res = await fetch(`/api/crep/reverse-geocode?lat=${lat}&lng=${lng}&radius=1`, {
          signal: AbortSignal.timeout(15_000),
        })
        if (!res.ok) {
          setState({ kind: "err", message: `HTTP ${res.status}`, lat, lng })
          return
        }
        const data = (await res.json()) as LookupResult
        setState({ kind: "ok", data })
      } catch (err: any) {
        setState({ kind: "err", message: err?.message || "fetch failed", lat, lng })
      }
    }
    window.addEventListener("crep:lookup-here", onLookup as any)
    return () => window.removeEventListener("crep:lookup-here", onLookup as any)
  }, [])

  if (state.kind === "idle") return null

  const lat = state.kind === "ok" ? state.data.lat : state.lat
  const lng = state.kind === "ok" ? state.data.lng : state.lng

  return (
    <div className="fixed z-[10001] bottom-4 left-4 w-[360px] max-h-[70vh] bg-[#0a1628] border border-cyan-500/40 rounded-lg shadow-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-cyan-900/60 to-blue-900/30 border-b border-cyan-500/30">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-bold text-white truncate">What's here</div>
            <div className="text-[10px] font-mono text-cyan-300/80 truncate">
              {lat.toFixed(5)}°, {lng.toFixed(5)}°
            </div>
          </div>
        </div>
        <button
          onClick={() => setState({ kind: "idle" })}
          className="p-1 rounded hover:bg-white/10"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {state.kind === "loading" && (
          <div className="flex items-center gap-2 px-4 py-6 text-xs text-cyan-300">
            <Loader2 className="w-4 h-4 animate-spin" />
            Looking up location + nearby infrastructure…
          </div>
        )}
        {state.kind === "err" && (
          <div className="px-4 py-6 text-xs text-red-300">
            Lookup failed: {state.message}
          </div>
        )}
        {state.kind === "ok" && (
          <div className="p-3 space-y-3">
            {/* Address */}
            <div className="space-y-1">
              <div className="text-[9px] uppercase tracking-wider text-cyan-400 font-mono">Address</div>
              <div className="text-xs text-white">
                {state.data.address || <span className="text-gray-500 italic">no geocoded address (open ocean / remote)</span>}
              </div>
              {(state.data.place || state.data.admin || state.data.country) && (
                <div className="text-[10px] text-cyan-200/80">
                  {[state.data.place, state.data.admin, state.data.country].filter(Boolean).join(" · ")}
                </div>
              )}
            </div>

            {/* Nearby entities */}
            <div className="space-y-1">
              <div className="text-[9px] uppercase tracking-wider text-cyan-400 font-mono flex items-center justify-between">
                <span>Nearby (≤ {state.data.radius_km} km)</span>
                <span className="text-cyan-200/60">{state.data.nearby.length}</span>
              </div>
              {state.data.nearby.length === 0 ? (
                <div className="text-[10px] text-gray-500 italic">No indexed infrastructure or observations within {state.data.radius_km} km.</div>
              ) : (
                <div className="space-y-1">
                  {state.data.nearby.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        const hook = (window as any).__crep_selectAsset
                        if (typeof hook === "function") {
                          hook({ type: n.type, id: n.id, name: n.name, lat: n.lat, lng: n.lng, properties: { voltage: n.voltage, operator: n.operator } })
                        }
                      }}
                      className="w-full text-left bg-white/5 hover:bg-cyan-500/20 border border-white/10 rounded px-2 py-1.5 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-white truncate">
                            {n.name || <span className="text-gray-500 italic">unnamed {n.type}</span>}
                          </div>
                          <div className="text-[9px] text-cyan-300/70 font-mono truncate">
                            {n.type}{n.voltage ? ` · ${n.voltage}` : ""}{n.operator ? ` · ${n.operator}` : ""}
                          </div>
                        </div>
                        <div className="shrink-0 text-[9px] text-cyan-400 font-mono flex items-center gap-0.5">
                          <Navigation2 className="w-2.5 h-2.5" />
                          {n.dist_m < 1000 ? `${Math.round(n.dist_m)} m` : `${(n.dist_m / 1000).toFixed(2)} km`}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
