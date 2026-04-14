"use client"

/**
 * Power Plant Detail Popup — OpenGridWorks-style plant information card
 *
 * Shows when clicking a power plant bubble on the map. Displays:
 * - Name + capacity (MW) header
 * - Fuel type badge with color dot
 * - Status (Operating/Planned/Retired/Cancelled)
 * - Data source badges (EIA 860M, GEM, OSM)
 * - Site analysis button
 * - Detail table: Sector, BA, Entity, Online years, Retirement years, Plant ID
 * - Warning banner for modeled retirement data
 */

import { X, ExternalLink, MapPin, Zap, Building2, Calendar, Hash, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { PowerPlant } from "@/components/crep/layers/power-plant-bubbles"
import { FUEL_TYPE_CSS_COLORS } from "@/components/crep/layers/power-plant-bubbles"

interface PlantPopupProps {
  plant: PowerPlant
  onClose: () => void
  onFlyTo?: (lat: number, lng: number, zoom?: number) => void
  onSiteAnalysis?: (plant: PowerPlant) => void
  className?: string
}

function getFuelCssColor(fuel: string): string {
  return FUEL_TYPE_CSS_COLORS[fuel.toLowerCase().trim()] || "#6b7280"
}

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  eia: { label: "EIA 860M", color: "border-blue-500/50 text-blue-400 bg-blue-500/10" },
  gem: { label: "GEM", color: "border-emerald-500/50 text-emerald-400 bg-emerald-500/10" },
  osm: { label: "OPENSTREETMAP", color: "border-teal-500/50 text-teal-400 bg-teal-500/10" },
  hifld: { label: "HIFLD", color: "border-amber-500/50 text-amber-400 bg-amber-500/10" },
}

function getSourceBadge(source?: string) {
  if (!source) return null
  const key = source.toLowerCase()
  for (const [k, v] of Object.entries(SOURCE_LABELS)) {
    if (key.includes(k)) return v
  }
  return { label: source.toUpperCase(), color: "border-gray-500/50 text-gray-400 bg-gray-500/10" }
}

export function PlantPopup({ plant, onClose, onFlyTo, onSiteAnalysis, className }: PlantPopupProps) {
  const fuelColor = getFuelCssColor(plant.fuel_type)
  const sourceBadge = getSourceBadge(plant.source)
  const capacityDisplay = plant.capacity_mw >= 1000
    ? `${(plant.capacity_mw / 1000).toFixed(1)} GW`
    : `${Math.round(plant.capacity_mw)} MW`

  const details: { label: string; value: string; icon: React.ReactNode }[] = [
    ...(plant.sector ? [{ label: "Sector", value: plant.sector, icon: <Building2 className="w-3 h-3" /> }] : []),
    ...(plant.ba ? [{ label: "BA", value: plant.ba, icon: <Zap className="w-3 h-3" /> }] : []),
    ...(plant.entity ? [{ label: "Entity", value: plant.entity, icon: <Building2 className="w-3 h-3" /> }] : []),
    ...(plant.online_year ? [{ label: "Online years", value: String(plant.online_year), icon: <Calendar className="w-3 h-3" /> }] : []),
    ...(plant.retirement_year ? [{ label: "Retirement years", value: String(plant.retirement_year), icon: <Calendar className="w-3 h-3" /> }] : []),
    ...(plant.plant_id ? [{ label: "Plant ID", value: plant.plant_id, icon: <Hash className="w-3 h-3" /> }] : []),
  ]

  return (
    <div className={cn(
      "min-w-[300px] max-w-[380px] bg-[#0a1628]/98 backdrop-blur-md rounded-lg border border-gray-600/40 shadow-2xl overflow-hidden",
      className
    )}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700/50 flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white truncate">{plant.name}</h3>
            <span className="text-sm font-bold text-cyan-400 whitespace-nowrap">{capacityDisplay}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: fuelColor }} />
              <span className="text-[11px] text-gray-300">{plant.fuel_type}</span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-700/50 text-gray-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Status + Source badges */}
      <div className="px-4 py-2 border-b border-gray-700/30 flex items-center gap-2">
        <span className="text-[10px] text-gray-400">Status</span>
        <Badge variant="outline" className={cn(
          "text-[9px] px-1.5 h-5",
          plant.status?.toLowerCase() === "operating"
            ? "border-green-500/50 text-green-400"
            : plant.status?.toLowerCase() === "retired"
            ? "border-red-500/50 text-red-400"
            : "border-yellow-500/50 text-yellow-400"
        )}>
          {plant.status || "Unknown"}
        </Badge>
        {sourceBadge && (
          <Badge variant="outline" className={cn("text-[8px] px-1.5 h-5", sourceBadge.color)}>
            {sourceBadge.label}
          </Badge>
        )}
        {onSiteAnalysis && (
          <button
            onClick={() => onSiteAnalysis(plant)}
            className="ml-auto flex items-center gap-1 px-2 py-1 rounded border border-cyan-500/40 bg-cyan-500/10 text-[9px] text-cyan-400 hover:bg-cyan-500/20 transition-colors"
          >
            <Search className="w-3 h-3" />
            Site analysis
          </button>
        )}
      </div>

      {/* Details table */}
      {details.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-700/30 space-y-1.5">
          {details.map((d, i) => (
            <div key={i} className="flex items-center justify-between text-[11px]">
              <span className="text-gray-500 flex items-center gap-1.5">
                {d.icon}
                {d.label}
              </span>
              <span className="text-gray-300 font-medium">{d.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Location */}
      <div className="px-4 py-2 border-b border-gray-700/30">
        <button
          onClick={() => onFlyTo?.(plant.lat, plant.lng, 12)}
          className="w-full flex items-center justify-between p-2 rounded bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-colors group"
        >
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-cyan-400" />
            <div className="text-left">
              <div className="text-[9px] text-gray-500 uppercase">Location</div>
              <div className="text-[11px] text-cyan-400 font-mono">
                {plant.lat.toFixed(4)}, {plant.lng.toFixed(4)}
                {plant.state && ` · ${plant.state}`}
                {plant.country && !plant.state && ` · ${plant.country}`}
              </div>
            </div>
          </div>
          <ExternalLink className="w-3 h-3 text-cyan-400 group-hover:text-cyan-300" />
        </button>
      </div>

      {/* Warning banner for modeled data */}
      {plant.retirement_year && (
        <div className="px-4 py-2 bg-amber-500/10 border-t border-amber-500/20">
          <p className="text-[10px] text-amber-400 text-center">
            Includes modeled retirement years
          </p>
        </div>
      )}
    </div>
  )
}
