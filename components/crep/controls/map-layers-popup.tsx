"use client"

/**
 * CREP Map Layers Popup — On-map floating widget for basemap + overlay selection
 *
 * Positioned next to the GPS/zoom controls at the bottom of the map.
 * Opens a popup panel with:
 *   - Map type thumbnails (Dark, Satellite, Terrain, etc.)
 *   - EO Imagery overlays (MODIS, VIIRS, Landsat, Aurora)
 *   - Jurisdiction boundaries (State, County, FEMA, Country)
 *   - Infrastructure visibility toggles
 *
 * Modeled after OpenGridWorks' on-map layers widget.
 */

import { useState, useCallback, useRef, useEffect } from "react"
import { Layers, X, Globe, Map as MapIcon, Moon, Sun, Satellite, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import type { EoImageryFilter } from "@/components/crep/earth2"

// ── Basemap definitions ──
interface BasemapOption {
  id: string
  name: string
  preview: string // CSS gradient as preview thumbnail
  style: string   // MapLibre style URL
}

const BASEMAPS: BasemapOption[] = [
  {
    id: "dark",
    name: "Dark",
    preview: "linear-gradient(135deg, #0a1628 0%, #1a2744 50%, #0d1b2a 100%)",
    style: "https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json",
  },
  {
    id: "dark-labels",
    name: "Dark + Labels",
    preview: "linear-gradient(135deg, #0a1628 0%, #2a3a5c 50%, #0d1b2a 100%)",
    style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  },
  {
    id: "light",
    name: "Light",
    preview: "linear-gradient(135deg, #e8e8e8 0%, #f5f5f5 50%, #d4d4d4 100%)",
    style: "https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json",
  },
  {
    id: "satellite",
    name: "Satellite",
    preview: "linear-gradient(135deg, #1a3a1a 0%, #2d5a3d 30%, #0d2240 70%, #0a1628 100%)",
    style: "https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json",
  },
  {
    id: "black-marble",
    name: "NASA Night",
    preview: "linear-gradient(135deg, #000000 0%, #0a0a2e 30%, #1a0a0a 60%, #000000 100%)",
    style: "https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json",
  },
]

// ── EO Imagery overlay definitions ──
interface EoOverlay {
  id: keyof EoImageryFilter
  name: string
  color: string
  description: string
}

const EO_OVERLAYS: EoOverlay[] = [
  { id: "showModis",   name: "MODIS True Color",  color: "#059669", description: "Daily NASA satellite imagery" },
  { id: "showViirs",   name: "VIIRS Night Lights", color: "#f59e0b", description: "Global night light composite" },
  { id: "showLandsat",  name: "Landsat WELD",      color: "#3b82f6", description: "Historic true color imagery" },
  { id: "showAirs",    name: "AIRS Atmosphere",    color: "#a855f7", description: "Atmospheric IR sounding" },
  { id: "showEonet",   name: "EONET Events",       color: "#ef4444", description: "NASA active natural events" },
]

// ── Jurisdiction layer toggles ──
interface JurisdictionToggle {
  id: "country" | "state" | "county" | "fema"
  name: string
  color: string
  minZoom: string
}

const JURISDICTION_TOGGLES: JurisdictionToggle[] = [
  { id: "country", name: "Country Borders",   color: "#4ade80", minZoom: "1+" },
  { id: "state",   name: "State/Province",     color: "#60a5fa", minZoom: "3+" },
  { id: "county",  name: "County/District",    color: "#a78bfa", minZoom: "7+" },
  { id: "fema",    name: "FEMA Regions",        color: "#f59e0b", minZoom: "3-10" },
]

interface MapLayersPopupProps {
  /** Current basemap ID */
  currentBasemap: string
  /** Callback when basemap changes */
  onBasemapChange: (basemapId: string, styleUrl: string) => void
  /** Current EO imagery filter state */
  eoImageryFilter: EoImageryFilter
  /** Callback when EO imagery toggles change */
  onEoFilterChange: (filter: Partial<EoImageryFilter>) => void
  /** MapLibre map instance for jurisdiction layer toggling */
  map: any
  /** Whether infra layers are visible */
  showInfra: boolean
  /** Toggle infra layers */
  onToggleInfra: (show: boolean) => void
  /** Additional CSS classes */
  className?: string
}

export function MapLayersPopup({
  currentBasemap,
  onBasemapChange,
  eoImageryFilter,
  onEoFilterChange,
  map,
  showInfra,
  onToggleInfra,
  className,
}: MapLayersPopupProps) {
  const [open, setOpen] = useState(false)
  const [jurisdictionState, setJurisdictionState] = useState({
    country: true,
    state: true,
    county: true,
    fema: true,
  })
  const popupRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open])

  const toggleJurisdiction = useCallback((group: "country" | "state" | "county" | "fema") => {
    const newState = !jurisdictionState[group]
    setJurisdictionState(prev => ({ ...prev, [group]: newState }))
    // Toggle MapLibre layers
    if (map) {
      try {
        const { toggleJurisdictionLayer } = require("@/lib/crep/jurisdiction-layers")
        toggleJurisdictionLayer(map, group, newState)
      } catch {}
    }
  }, [map, jurisdictionState])

  return (
    <div ref={popupRef} className={cn("relative", className)}>
      {/* Toggle Button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
          "bg-black/70 border backdrop-blur-sm",
          open
            ? "border-cyan-400/60 text-cyan-400 shadow-[0_0_12px_rgba(0,255,255,0.2)]"
            : "border-cyan-500/30 text-cyan-500/70 hover:border-cyan-400/50 hover:text-cyan-400"
        )}
        title="Map Layers"
      >
        <Layers className="w-4 h-4" />
      </button>

      {/* Popup Panel */}
      {open && (
        <div
          className="absolute bottom-10 left-0 w-[340px] max-h-[70vh] overflow-y-auto rounded-xl bg-[#0a1628]/95 border border-cyan-500/30 backdrop-blur-xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-cyan-500/20">
            <span className="text-[11px] font-mono tracking-wider text-cyan-400 uppercase">Map Layers</span>
            <button
              onClick={() => setOpen(false)}
              className="p-0.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* ── Map Type Grid ── */}
          <div className="p-3 border-b border-cyan-500/10">
            <div className="text-[9px] font-mono tracking-wider text-gray-500 uppercase mb-2">Basemap</div>
            <div className="grid grid-cols-5 gap-1.5">
              {BASEMAPS.map(bm => (
                <button
                  key={bm.id}
                  onClick={() => onBasemapChange(bm.id, bm.style)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-all",
                    currentBasemap === bm.id
                      ? "border-cyan-400/60 bg-cyan-400/10 shadow-[0_0_8px_rgba(0,255,255,0.15)]"
                      : "border-white/10 hover:border-white/25 bg-white/5"
                  )}
                >
                  <div
                    className="w-full aspect-square rounded-md"
                    style={{ background: bm.preview }}
                  />
                  <span className={cn(
                    "text-[8px] font-mono leading-tight text-center",
                    currentBasemap === bm.id ? "text-cyan-400" : "text-gray-500"
                  )}>
                    {bm.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Earth Observation Imagery ── */}
          <div className="p-3 border-b border-cyan-500/10">
            <div className="text-[9px] font-mono tracking-wider text-gray-500 uppercase mb-2">
              Satellite Imagery (NASA GIBS)
            </div>
            <div className="space-y-1">
              {EO_OVERLAYS.map(eo => {
                const isEnabled = eoImageryFilter[eo.id]
                return (
                  <button
                    key={eo.id}
                    onClick={() => onEoFilterChange({ [eo.id]: !isEnabled })}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-all text-left",
                      isEnabled
                        ? "bg-white/10 border border-white/20"
                        : "hover:bg-white/5 border border-transparent"
                    )}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: isEnabled ? eo.color : "transparent",
                        border: `1.5px solid ${eo.color}`,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className={cn("text-[10px] font-mono", isEnabled ? "text-white" : "text-gray-400")}>
                        {eo.name}
                      </div>
                      <div className="text-[8px] text-gray-600 truncate">{eo.description}</div>
                    </div>
                    {isEnabled ? (
                      <Eye className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                    ) : (
                      <EyeOff className="w-3 h-3 text-gray-600 flex-shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Jurisdiction Boundaries ── */}
          <div className="p-3 border-b border-cyan-500/10">
            <div className="text-[9px] font-mono tracking-wider text-gray-500 uppercase mb-2">
              Jurisdiction Boundaries
            </div>
            <div className="space-y-1">
              {JURISDICTION_TOGGLES.map(jt => {
                const isEnabled = jurisdictionState[jt.id]
                return (
                  <button
                    key={jt.id}
                    onClick={() => toggleJurisdiction(jt.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-all text-left",
                      isEnabled
                        ? "bg-white/10 border border-white/20"
                        : "hover:bg-white/5 border border-transparent"
                    )}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: isEnabled ? jt.color : "transparent",
                        border: `1.5px solid ${jt.color}`,
                      }}
                    />
                    <div className="flex-1">
                      <span className={cn("text-[10px] font-mono", isEnabled ? "text-white" : "text-gray-400")}>
                        {jt.name}
                      </span>
                    </div>
                    <span className="text-[8px] text-gray-600 font-mono">{jt.minZoom}</span>
                    {isEnabled ? (
                      <Eye className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                    ) : (
                      <EyeOff className="w-3 h-3 text-gray-600 flex-shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Infrastructure Toggle ── */}
          <div className="p-3">
            <div className="text-[9px] font-mono tracking-wider text-gray-500 uppercase mb-2">
              Infrastructure
            </div>
            <button
              onClick={() => onToggleInfra(!showInfra)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-all text-left",
                showInfra
                  ? "bg-white/10 border border-white/20"
                  : "hover:bg-white/5 border border-transparent"
              )}
            >
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: showInfra ? "#f59e0b" : "transparent",
                  border: "1.5px solid #f59e0b",
                }}
              />
              <span className={cn("text-[10px] font-mono flex-1", showInfra ? "text-white" : "text-gray-400")}>
                All Infrastructure Layers
              </span>
              <span className="text-[8px] text-gray-600 font-mono">
                Plants, Lines, Subs, Cables, Towers
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
