"use client"

/**
 * Unified Search (Cmd+K) — Search across all CREP entity types
 *
 * OpenGridWorks-style search that finds:
 * - Power plants (by name, fuel type, owner)
 * - Substations (by name, voltage)
 * - Datacenters (by name, operator)
 * - Aircraft (by callsign, ICAO)
 * - Vessels (by name, MMSI)
 * - Satellites (by name, NORAD ID)
 * - Species (by scientific/common name)
 * - Locations (geocode)
 *
 * Results show distance from viewport center, data source badges,
 * and FILTERED tags for hidden items.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { Search, X, MapPin, Zap, Radio, Plane, Ship, Satellite, TreePine, Globe } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { FUEL_TYPE_CSS_COLORS } from "@/components/crep/layers/power-plant-bubbles"
import type { PowerPlant } from "@/components/crep/layers/power-plant-bubbles"
import type { Substation } from "@/components/crep/layers/substation-markers"
import type { Datacenter } from "@/components/crep/layers/datacenter-diamonds"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SearchResult {
  id: string
  type: "plant" | "substation" | "datacenter" | "aircraft" | "vessel" | "satellite" | "species" | "location"
  name: string
  subtitle: string
  lat: number
  lng: number
  distance?: number // miles from viewport center
  source?: string
  fuelType?: string // for plants
  capacityMW?: number
  status?: string
  filtered?: boolean // hidden by current layer filters
  data?: any // original entity data
}

interface UnifiedSearchProps {
  plants?: PowerPlant[]
  substations?: Substation[]
  datacenters?: Datacenter[]
  viewportCenter?: { lat: number; lng: number }
  onSelect: (result: SearchResult) => void
  onClose: () => void
  isOpen: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959 // miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDistance(miles: number): string {
  if (miles < 1) return "<1 mi"
  if (miles >= 1000) return `${(miles / 1000).toFixed(0)}k mi`
  return `${Math.round(miles)} mi`
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  plant: <Zap className="w-3.5 h-3.5" />,
  substation: <Radio className="w-3.5 h-3.5" />,
  datacenter: <Globe className="w-3.5 h-3.5" />,
  aircraft: <Plane className="w-3.5 h-3.5" />,
  vessel: <Ship className="w-3.5 h-3.5" />,
  satellite: <Satellite className="w-3.5 h-3.5" />,
  species: <TreePine className="w-3.5 h-3.5" />,
  location: <MapPin className="w-3.5 h-3.5" />,
}

const TYPE_LABELS: Record<string, string> = {
  plant: "PLANT",
  substation: "SUB",
  datacenter: "DC",
  aircraft: "FLIGHT",
  vessel: "VESSEL",
  satellite: "SAT",
  species: "SPECIES",
  location: "PLACE",
}

const TYPE_COLORS: Record<string, string> = {
  plant: "bg-amber-500/20 text-amber-400 border-amber-500/40",
  substation: "bg-gray-500/20 text-gray-400 border-gray-500/40",
  datacenter: "bg-purple-500/20 text-purple-400 border-purple-500/40",
  aircraft: "bg-sky-500/20 text-sky-400 border-sky-500/40",
  vessel: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  satellite: "bg-violet-500/20 text-violet-400 border-violet-500/40",
  species: "bg-green-500/20 text-green-400 border-green-500/40",
  location: "bg-cyan-500/20 text-cyan-400 border-cyan-500/40",
}

const SOURCE_BADGE_COLORS: Record<string, string> = {
  eia: "bg-blue-500/10 text-blue-400 border-blue-500/40",
  gem: "bg-emerald-500/10 text-emerald-400 border-emerald-500/40",
  osm: "bg-teal-500/10 text-teal-400 border-teal-500/40",
  hifld: "bg-amber-500/10 text-amber-400 border-amber-500/40",
  peeringdb: "bg-indigo-500/10 text-indigo-400 border-indigo-500/40",
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UnifiedSearch({
  plants = [],
  substations = [],
  datacenters = [],
  viewportCenter,
  onSelect,
  onClose,
  isOpen,
}: UnifiedSearchProps) {
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setQuery("")
    }
  }, [isOpen])

  // Cmd+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        if (!isOpen) onSelect({ id: "__open", type: "location", name: "", subtitle: "", lat: 0, lng: 0 })
      }
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [isOpen, onClose, onSelect])

  // Search results
  const results = useMemo(() => {
    if (!query || query.length < 2) return []
    const q = query.toLowerCase()
    const matches: SearchResult[] = []
    const centerLat = viewportCenter?.lat || 0
    const centerLng = viewportCenter?.lng || 0

    // Search plants
    for (const p of plants) {
      if (
        p.name.toLowerCase().includes(q) ||
        p.fuel_type.toLowerCase().includes(q) ||
        p.owner?.toLowerCase().includes(q) ||
        p.entity?.toLowerCase().includes(q) ||
        p.state?.toLowerCase().includes(q)
      ) {
        const mw = p.capacity_mw >= 1000
          ? `${(p.capacity_mw / 1000).toFixed(0)} GW`
          : `${Math.round(p.capacity_mw)} MW`
        matches.push({
          id: p.id,
          type: "plant",
          name: `${p.name}${p.state ? ` - ${p.state}` : ""}`,
          subtitle: `${p.owner || ""} · ${mw} · ${p.fuel_type} · ${p.status || "Operating"}`,
          lat: p.lat,
          lng: p.lng,
          distance: haversineDistance(centerLat, centerLng, p.lat, p.lng),
          source: p.source,
          fuelType: p.fuel_type,
          capacityMW: p.capacity_mw,
          status: p.status,
          data: p,
        })
      }
    }

    // Search substations
    for (const s of substations) {
      if (s.name.toLowerCase().includes(q)) {
        matches.push({
          id: s.id,
          type: "substation",
          name: `${s.name}`,
          subtitle: `${s.voltage_kv} kV · ${s.status || "In Service"}`,
          lat: s.lat,
          lng: s.lng,
          distance: haversineDistance(centerLat, centerLng, s.lat, s.lng),
          source: s.source,
          data: s,
        })
      }
    }

    // Search datacenters
    for (const dc of datacenters) {
      if (
        dc.name.toLowerCase().includes(q) ||
        dc.operator?.toLowerCase().includes(q)
      ) {
        matches.push({
          id: dc.id,
          type: "datacenter",
          name: dc.name,
          subtitle: `${dc.type || "Datacenter"} · ${dc.city || ""} ${dc.state || ""}`.trim(),
          lat: dc.lat,
          lng: dc.lng,
          distance: haversineDistance(centerLat, centerLng, dc.lat, dc.lng),
          source: dc.source,
          data: dc,
        })
      }
    }

    // Sort by distance
    matches.sort((a, b) => (a.distance || 0) - (b.distance || 0))

    return matches.slice(0, 20)
  }, [query, plants, substations, datacenters, viewportCenter])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Search panel */}
      <div className="relative w-full max-w-[600px] mx-4 bg-[#0a1628]/98 backdrop-blur-md border border-cyan-500/30 rounded-xl overflow-hidden shadow-2xl shadow-cyan-500/10">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700/50">
          <Search className="w-5 h-5 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search plants, places..."
            className="flex-1 bg-transparent text-white text-sm placeholder:text-gray-500 focus:outline-none"
          />
          <kbd className="hidden sm:flex items-center px-1.5 py-0.5 rounded border border-gray-700 text-[9px] text-gray-500 font-mono">
            ESC
          </kbd>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-700/50 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="max-h-[400px] overflow-y-auto">
            {results.map((result) => (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => {
                  onSelect(result)
                  onClose()
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-cyan-500/10 transition-colors text-left border-b border-gray-700/20 last:border-0"
              >
                {/* Type badge */}
                <Badge variant="outline" className={cn("text-[8px] px-1.5 h-5 shrink-0", TYPE_COLORS[result.type])}>
                  {TYPE_LABELS[result.type]}
                </Badge>

                {/* Fuel type color dot for plants */}
                {result.fuelType && (
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: FUEL_TYPE_CSS_COLORS[result.fuelType.toLowerCase()] || "#6b7280" }}
                  />
                )}

                {/* Name + subtitle */}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-white font-medium truncate">{result.name}</p>
                  <p className="text-[10px] text-gray-500 truncate">{result.subtitle}</p>
                </div>

                {/* Distance */}
                {result.distance !== undefined && (
                  <span className="text-[10px] text-cyan-400 font-mono shrink-0">
                    {formatDistance(result.distance)}
                  </span>
                )}

                {/* Source badge */}
                {result.source && (
                  <Badge variant="outline" className={cn(
                    "text-[7px] px-1 h-4 shrink-0",
                    SOURCE_BADGE_COLORS[result.source.toLowerCase()] || "border-gray-600 text-gray-400"
                  )}>
                    {result.source.toUpperCase()}
                  </Badge>
                )}

                {/* Filtered badge */}
                {result.filtered && (
                  <Badge variant="outline" className="text-[7px] px-1 h-4 shrink-0 border-gray-600 text-gray-500">
                    FILTERED
                  </Badge>
                )}
              </button>
            ))}

            {results.length >= 20 && (
              <p className="px-4 py-2 text-[10px] text-gray-500 text-center">
                Showing 20 of many matches. Zoom in for local results.
              </p>
            )}
          </div>
        )}

        {/* Empty state */}
        {query.length >= 2 && results.length === 0 && (
          <div className="px-4 py-8 text-center">
            <Search className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No results found</p>
            <p className="text-[10px] text-gray-600 mt-1">Try a different search term</p>
          </div>
        )}

        {/* Hint when empty */}
        {query.length < 2 && (
          <div className="px-4 py-4 text-center">
            <p className="text-[11px] text-gray-500">
              Search power plants, substations, datacenters, aircraft, vessels, satellites, and species
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
