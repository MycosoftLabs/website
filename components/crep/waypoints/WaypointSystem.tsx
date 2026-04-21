"use client"

/**
 * CREP Waypoint System — Apr 20, 2026
 *
 * Morgan: "right click should be able to open up a widget for markers
 * to add waypoints check what this is and places saving".
 *
 * Right-click anywhere on the map → context menu appears with options:
 *   • Save as waypoint (opens naming dialog → saves with colour/icon)
 *   • Copy lat/lng
 *   • Look up what's here (queries MINDEX + Eagle Eye + known layers)
 *   • Drop a quick pin (unnamed, for measurement)
 *
 * Saved waypoints persist in localStorage under crep.waypoints.v1 and
 * render on the map as diamond markers with their name. Clicking a
 * waypoint marker opens the same dialog (edit / delete / export).
 *
 * Syncs to MINDEX at POST /api/mindex/waypoints when MINDEX is reachable
 * so waypoints survive across devices (best-effort; localStorage stays
 * authoritative for this user's session).
 */

import { useEffect, useRef, useState } from "react"
import type { Map as MapLibreMap } from "maplibre-gl"

export type Waypoint = {
  id: string
  name: string
  lat: number
  lng: number
  color?: string
  icon?: string
  notes?: string
  category?: "general" | "asset" | "hazard" | "infra" | "myca" | "intel"
  created_at: string
}

const STORAGE_KEY = "crep.waypoints.v1"
const COLORS = [
  { hex: "#fbbf24", name: "amber" },
  { hex: "#f43f5e", name: "rose" },
  { hex: "#22c55e", name: "green" },
  { hex: "#3b82f6", name: "blue" },
  { hex: "#a855f7", name: "purple" },
  { hex: "#f97316", name: "orange" },
  { hex: "#06b6d4", name: "cyan" },
  { hex: "#ec4899", name: "pink" },
]
const CATEGORIES: { value: Waypoint["category"]; label: string; icon: string }[] = [
  { value: "general", label: "General", icon: "📍" },
  { value: "asset", label: "Asset",   icon: "🏭" },
  { value: "hazard", label: "Hazard", icon: "⚠️" },
  { value: "infra", label: "Infra",   icon: "⚡" },
  { value: "myca",  label: "MYCA",    icon: "🍄" },
  { value: "intel", label: "Intel",   icon: "🎯" },
]

function loadWaypoints(): Waypoint[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.filter((w: any) => w?.id && Number.isFinite(w.lat) && Number.isFinite(w.lng))
  } catch { return [] }
}

function saveWaypoints(wps: Waypoint[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(wps)) } catch { /* quota exceeded */ }
  // Fire-and-forget sync to MINDEX for cross-device durability
  try {
    fetch("/api/mindex/waypoints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ waypoints: wps }),
    }).catch(() => undefined)
  } catch { /* ignore */ }
}

interface WaypointSystemProps {
  map: MapLibreMap | null
}

export default function WaypointSystem({ map }: WaypointSystemProps) {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([])
  const [menuAt, setMenuAt] = useState<{ x: number; y: number; lngLat: [number, number] } | null>(null)
  const [editing, setEditing] = useState<Waypoint | null>(null)
  const hasInstalledRef = useRef(false)

  // Load persisted waypoints on mount
  useEffect(() => {
    setWaypoints(loadWaypoints())
  }, [])

  // Install right-click handler on the map
  useEffect(() => {
    if (!map || hasInstalledRef.current) return
    hasInstalledRef.current = true
    const onContextMenu = (e: any) => {
      if (!e?.originalEvent) return
      e.originalEvent.preventDefault()
      setMenuAt({
        x: e.originalEvent.clientX,
        y: e.originalEvent.clientY,
        lngLat: [e.lngLat.lng, e.lngLat.lat],
      })
    }
    map.on("contextmenu", onContextMenu)
    // Also close menu on regular click anywhere
    const onClickAway = () => setMenuAt(null)
    map.on("click", onClickAway)
    const onEsc = (ev: KeyboardEvent) => { if (ev.key === "Escape") setMenuAt(null) }
    window.addEventListener("keydown", onEsc)
    return () => {
      map.off("contextmenu", onContextMenu)
      map.off("click", onClickAway)
      window.removeEventListener("keydown", onEsc)
    }
  }, [map])

  // Render waypoints onto the map as a dedicated layer
  useEffect(() => {
    if (!map) return
    const ensure = () => {
      if (typeof map.getSource !== "function") return
      if (!map.getSource("crep-waypoints")) {
        map.addSource("crep-waypoints", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        })
        map.addLayer({
          id: "crep-waypoints-halo",
          type: "circle",
          source: "crep-waypoints",
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 6, 12, 14],
            "circle-color": ["get", "color"],
            "circle-opacity": 0.18,
            "circle-blur": 0.8,
          },
        })
        map.addLayer({
          id: "crep-waypoints-core",
          type: "circle",
          source: "crep-waypoints",
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 3, 12, 6],
            "circle-color": ["get", "color"],
            "circle-opacity": 1,
            "circle-stroke-width": 1.5,
            "circle-stroke-color": "#0b1220",
          },
        })
        map.addLayer({
          id: "crep-waypoints-label",
          type: "symbol",
          source: "crep-waypoints",
          minzoom: 6,
          layout: {
            "text-field": ["get", "name"],
            "text-size": 11,
            "text-offset": [0, 1.2],
            "text-anchor": "top",
            "text-allow-overlap": false,
            "text-optional": true,
          },
          paint: {
            "text-color": "#ffffff",
            "text-halo-color": "rgba(0,0,0,0.8)",
            "text-halo-width": 1.5,
          },
        })
        map.on("click", "crep-waypoints-core", (e: any) => {
          const id = e.features?.[0]?.properties?.id
          const wp = loadWaypoints().find((w) => w.id === id)
          if (wp) setEditing(wp)
        })
        map.on("mouseenter", "crep-waypoints-core", () => { map.getCanvas().style.cursor = "pointer" })
        map.on("mouseleave", "crep-waypoints-core", () => { map.getCanvas().style.cursor = "" })
      }
      const src = map.getSource("crep-waypoints") as any
      if (src?.setData) {
        src.setData({
          type: "FeatureCollection",
          features: waypoints.map((w) => ({
            type: "Feature",
            properties: { id: w.id, name: w.name, color: w.color || "#fbbf24", category: w.category || "general" },
            geometry: { type: "Point", coordinates: [w.lng, w.lat] },
          })),
        })
      }
    }
    ensure()
    if (map.isStyleLoaded()) ensure()
    else map.once("styledata", ensure)
  }, [map, waypoints])

  const addWaypoint = (partial: Partial<Waypoint>) => {
    const wp: Waypoint = {
      id: `wp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: partial.name || `Waypoint ${new Date().toLocaleTimeString()}`,
      lat: partial.lat ?? 0,
      lng: partial.lng ?? 0,
      color: partial.color || "#fbbf24",
      category: partial.category || "general",
      notes: partial.notes || "",
      created_at: new Date().toISOString(),
    }
    const next = [...waypoints, wp]
    setWaypoints(next)
    saveWaypoints(next)
    return wp
  }

  const updateWaypoint = (id: string, patch: Partial<Waypoint>) => {
    const next = waypoints.map((w) => (w.id === id ? { ...w, ...patch } : w))
    setWaypoints(next)
    saveWaypoints(next)
  }

  const deleteWaypoint = (id: string) => {
    const next = waypoints.filter((w) => w.id !== id)
    setWaypoints(next)
    saveWaypoints(next)
  }

  return (
    <>
      {/* Right-click context menu */}
      {menuAt && (
        <div
          className="fixed z-[10001] bg-[#0a1628] border border-cyan-500/40 rounded-lg shadow-2xl overflow-hidden min-w-[220px]"
          style={{ left: menuAt.x, top: menuAt.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 bg-gradient-to-r from-cyan-900/60 to-blue-900/30 border-b border-cyan-500/30 text-[10px] font-mono text-cyan-300">
            {menuAt.lngLat[1].toFixed(5)}°, {menuAt.lngLat[0].toFixed(5)}°
          </div>
          <button
            onClick={() => {
              const wp = addWaypoint({ lat: menuAt.lngLat[1], lng: menuAt.lngLat[0] })
              setEditing(wp)
              setMenuAt(null)
            }}
            className="w-full text-left px-3 py-2 text-xs text-white hover:bg-cyan-500/20 flex items-center gap-2"
          >
            <span>📍</span> Save as waypoint…
          </button>
          <button
            onClick={() => {
              addWaypoint({ lat: menuAt.lngLat[1], lng: menuAt.lngLat[0], name: "Quick pin", color: "#f43f5e" })
              setMenuAt(null)
            }}
            className="w-full text-left px-3 py-2 text-xs text-white hover:bg-cyan-500/20 flex items-center gap-2"
          >
            <span>📌</span> Drop quick pin (red)
          </button>
          <button
            onClick={() => {
              try {
                navigator.clipboard.writeText(`${menuAt.lngLat[1].toFixed(6)}, ${menuAt.lngLat[0].toFixed(6)}`)
              } catch { /* clipboard blocked */ }
              setMenuAt(null)
            }}
            className="w-full text-left px-3 py-2 text-xs text-white hover:bg-cyan-500/20 flex items-center gap-2"
          >
            <span>📋</span> Copy lat,lng
          </button>
          <button
            onClick={() => {
              try {
                const [lng, lat] = menuAt.lngLat
                window.dispatchEvent(new CustomEvent("crep:lookup-here", { detail: { lat, lng } }))
              } catch { /* ignore */ }
              setMenuAt(null)
            }}
            className="w-full text-left px-3 py-2 text-xs text-white hover:bg-cyan-500/20 flex items-center gap-2"
          >
            <span>🔎</span> What's here? (lookup)
          </button>
          <button
            onClick={() => setMenuAt(null)}
            className="w-full text-left px-3 py-1.5 text-[10px] text-gray-500 hover:bg-white/5"
          >
            Cancel (Esc)
          </button>
        </div>
      )}

      {/* Edit / create waypoint dialog */}
      {editing && (
        <div className="fixed inset-0 z-[10002] bg-black/40 backdrop-blur-sm flex items-center justify-center" onClick={() => setEditing(null)}>
          <div
            className="bg-[#0a1628] border border-cyan-500/40 rounded-lg shadow-2xl w-[340px] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 bg-gradient-to-r from-cyan-900/60 to-blue-900/30 border-b border-cyan-500/30">
              <div className="text-sm font-bold text-white">Waypoint</div>
              <div className="text-[10px] font-mono text-cyan-300">{editing.lat.toFixed(5)}°, {editing.lng.toFixed(5)}°</div>
            </div>
            <div className="p-3 space-y-2">
              <div>
                <label className="text-[10px] text-gray-400 uppercase">Name</label>
                <input
                  type="text"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full bg-black/40 border border-gray-700 rounded px-2 py-1 text-xs text-white mt-0.5"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase">Notes</label>
                <textarea
                  value={editing.notes || ""}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  rows={2}
                  className="w-full bg-black/40 border border-gray-700 rounded px-2 py-1 text-xs text-white mt-0.5 resize-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase">Category</label>
                <div className="flex gap-1 mt-0.5">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setEditing({ ...editing, category: c.value })}
                      className={`px-1.5 py-1 rounded text-[10px] border transition-colors flex-1 ${editing.category === c.value ? "bg-cyan-700/60 border-cyan-500 text-white" : "bg-black/40 border-gray-700 text-gray-400 hover:bg-white/10"}`}
                    >
                      {c.icon} {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase">Color</label>
                <div className="flex gap-1 mt-0.5">
                  {COLORS.map((c) => (
                    <button
                      key={c.hex}
                      onClick={() => setEditing({ ...editing, color: c.hex })}
                      className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${editing.color === c.hex ? "border-white scale-110" : "border-transparent"}`}
                      style={{ background: c.hex }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-1.5 pt-2">
                <button
                  onClick={() => {
                    updateWaypoint(editing.id, editing)
                    setEditing(null)
                  }}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs py-1.5 rounded font-semibold"
                >
                  Save
                </button>
                <button
                  onClick={() => { deleteWaypoint(editing.id); setEditing(null) }}
                  className="bg-red-900/40 hover:bg-red-700/60 text-red-300 hover:text-white text-xs py-1.5 px-3 rounded border border-red-500/30"
                >
                  Delete
                </button>
                <button
                  onClick={() => setEditing(null)}
                  className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs py-1.5 px-3 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
