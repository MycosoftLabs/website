"use client"

/**
 * Infrastructure Detail Widget — Live data widget for infrastructure assets
 *
 * Shows detailed information when clicking any infrastructure asset on the map:
 * - Submarine cables: name, length, landing points, owners, RFS year, cable system
 * - Substations: name, voltage class, connected lines, operator
 * - Transmission lines: voltage, operator, length, circuit ID
 * - Power plants: delegates to PlantPopup
 * - Cell towers: radio type, operator, MCC/MNC, band
 * - Data centers: operator, networks, type
 *
 * Positioned near the click point on the map, floats above the asset.
 */

import { useEffect, useRef } from "react"
import {
  X, Cable, Zap, MapPin, Building2, Radio, Server,
  Calendar, Hash, ExternalLink, Globe, Signal,
  Activity, ArrowRight, CircleDot, Factory, Navigation
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// ── Types ────────────────────────────────────────────────────────────────────

export type InfraAssetType = "cable" | "substation" | "transmission_line" | "plant" | "cell_tower" | "datacenter" | "military" | "airport"

export interface InfraAsset {
  type: InfraAssetType
  id?: string
  name: string
  lat: number
  lng: number
  properties: Record<string, any>
  /** Screen position for popup placement */
  screenX?: number
  screenY?: number
}

interface InfraDetailWidgetProps {
  asset: InfraAsset
  onClose: () => void
  onFlyTo?: (lat: number, lng: number, zoom?: number) => void
  className?: string
}

// ── Voltage color helper ─────────────────────────────────────────────────────

function voltageColor(kv: number): string {
  if (kv >= 735) return "#ffffff"
  if (kv >= 500) return "#22d3ee"
  if (kv >= 345) return "#60a5fa"
  if (kv >= 230) return "#a855f7"
  if (kv >= 100) return "#ec4899"
  if (kv >= 31) return "#fb923c"
  return "#9ca3af"
}

function voltageClass(kv: number): string {
  if (kv >= 735) return "EHV 735kV+"
  if (kv >= 500) return "EHV 500-734kV"
  if (kv >= 345) return "HV 345-499kV"
  if (kv >= 230) return "HV 230-344kV"
  if (kv >= 100) return "MV 100-229kV"
  if (kv >= 31) return "MV 31-99kV"
  if (kv > 0) return `LV ${kv}kV`
  return "Unknown"
}

// ── Cable type icon ──────────────────────────────────────────────────────────

function assetTypeIcon(type: InfraAssetType) {
  switch (type) {
    case "cable": return <Cable className="w-4 h-4 text-cyan-400" />
    case "substation": return <Zap className="w-4 h-4 text-purple-400" />
    case "transmission_line": return <Activity className="w-4 h-4 text-blue-400" />
    case "plant": return <Factory className="w-4 h-4 text-amber-400" />
    case "cell_tower": return <Signal className="w-4 h-4 text-green-400" />
    case "datacenter": return <Server className="w-4 h-4 text-pink-400" />
    case "military": return <Building2 className="w-4 h-4 text-red-400" />
    case "airport": return <Globe className="w-4 h-4 text-teal-400" />
  }
}

function assetTypeLabel(type: InfraAssetType): string {
  switch (type) {
    case "cable": return "Submarine Cable"
    case "substation": return "Substation"
    case "transmission_line": return "Transmission Line"
    case "plant": return "Power Plant"
    case "cell_tower": return "Cell Tower"
    case "datacenter": return "Data Center"
    case "military": return "Military Installation"
    case "airport": return "Airport"
  }
}

function assetTypeAccent(type: InfraAssetType): string {
  switch (type) {
    case "cable": return "border-cyan-500/50 from-cyan-900/30"
    case "substation": return "border-purple-500/50 from-purple-900/30"
    case "transmission_line": return "border-blue-500/50 from-blue-900/30"
    case "plant": return "border-amber-500/50 from-amber-900/30"
    case "cell_tower": return "border-green-500/50 from-green-900/30"
    case "datacenter": return "border-pink-500/50 from-pink-900/30"
    case "military": return "border-red-500/50 from-red-900/30"
    case "airport": return "border-teal-500/50 from-teal-900/30"
  }
}

// ── Detail rows per asset type ───────────────────────────────────────────────

function getDetailRows(asset: InfraAsset): { label: string; value: string; icon: React.ReactNode; color?: string }[] {
  const p = asset.properties || {}
  const rows: { label: string; value: string; icon: React.ReactNode; color?: string }[] = []

  switch (asset.type) {
    case "cable":
      if (p.length_km) rows.push({ label: "Length", value: `${Number(p.length_km).toLocaleString()} km`, icon: <Navigation className="w-3 h-3" /> })
      if (p.owners) rows.push({ label: "Owners", value: p.owners, icon: <Building2 className="w-3 h-3" /> })
      if (p.rfs_year || p.year) rows.push({ label: "RFS Year", value: String(p.rfs_year || p.year), icon: <Calendar className="w-3 h-3" /> })
      if (p.cable_id || p.id) rows.push({ label: "Cable ID", value: p.cable_id || p.id, icon: <Hash className="w-3 h-3" /> })
      if (p.landing_points) rows.push({ label: "Landing Points", value: p.landing_points, icon: <MapPin className="w-3 h-3" /> })
      if (p.capacity) rows.push({ label: "Capacity", value: p.capacity, icon: <Activity className="w-3 h-3" /> })
      if (p.url) rows.push({ label: "Reference", value: "View source", icon: <ExternalLink className="w-3 h-3" />, color: "text-cyan-400" })
      if (p.status) rows.push({ label: "Status", value: p.status, icon: <CircleDot className="w-3 h-3" /> })
      break

    case "substation":
      if (p.voltage_kv) rows.push({
        label: "Voltage Class",
        value: voltageClass(Number(p.voltage_kv)),
        icon: <Zap className="w-3 h-3" />,
        color: voltageColor(Number(p.voltage_kv))
      })
      if (p.voltage_kv) rows.push({ label: "Voltage", value: `${p.voltage_kv} kV`, icon: <Activity className="w-3 h-3" /> })
      if (p.operator) rows.push({ label: "Operator", value: p.operator, icon: <Building2 className="w-3 h-3" /> })
      if (p.sub_type || p.type) rows.push({ label: "Type", value: p.sub_type || p.type, icon: <CircleDot className="w-3 h-3" /> })
      if (p.status) rows.push({ label: "Status", value: p.status, icon: <CircleDot className="w-3 h-3" /> })
      if (p.connected_lines) rows.push({ label: "Connected Lines", value: String(p.connected_lines), icon: <Cable className="w-3 h-3" /> })
      break

    case "transmission_line":
      if (p.voltage_kv) rows.push({
        label: "Voltage Class",
        value: voltageClass(Number(p.voltage_kv)),
        icon: <Zap className="w-3 h-3" />,
        color: voltageColor(Number(p.voltage_kv))
      })
      if (p.voltage_kv) rows.push({ label: "Voltage", value: `${p.voltage_kv} kV`, icon: <Activity className="w-3 h-3" /> })
      if (p.operator) rows.push({ label: "Operator", value: p.operator, icon: <Building2 className="w-3 h-3" /> })
      if (p.circuits) rows.push({ label: "Circuits", value: String(p.circuits), icon: <Hash className="w-3 h-3" /> })
      if (p.length_km) rows.push({ label: "Length", value: `${Number(p.length_km).toLocaleString()} km`, icon: <Navigation className="w-3 h-3" /> })
      if (p.frequency) rows.push({ label: "Frequency", value: `${p.frequency} Hz`, icon: <Radio className="w-3 h-3" /> })
      break

    case "cell_tower":
      if (p.radio) rows.push({ label: "Radio Type", value: p.radio, icon: <Signal className="w-3 h-3" /> })
      if (p.operator) rows.push({ label: "Operator", value: p.operator, icon: <Building2 className="w-3 h-3" /> })
      if (p.mcc) rows.push({ label: "MCC", value: String(p.mcc), icon: <Hash className="w-3 h-3" /> })
      if (p.mnc) rows.push({ label: "MNC", value: String(p.mnc), icon: <Hash className="w-3 h-3" /> })
      if (p.band) rows.push({ label: "Band", value: p.band, icon: <Radio className="w-3 h-3" /> })
      if (p.range_m) rows.push({ label: "Range", value: `${Number(p.range_m).toLocaleString()} m`, icon: <Activity className="w-3 h-3" /> })
      break

    case "datacenter":
      if (p.operator) rows.push({ label: "Operator", value: p.operator, icon: <Building2 className="w-3 h-3" /> })
      if (p.sub_type || p.type) rows.push({ label: "Type", value: p.sub_type || p.type, icon: <Server className="w-3 h-3" /> })
      if (p.networks) rows.push({ label: "Networks", value: String(p.networks), icon: <Globe className="w-3 h-3" /> })
      if (p.ixps) rows.push({ label: "IXPs", value: String(p.ixps), icon: <Activity className="w-3 h-3" /> })
      if (p.carriers) rows.push({ label: "Carriers", value: String(p.carriers), icon: <Cable className="w-3 h-3" /> })
      if (p.status) rows.push({ label: "Status", value: p.status, icon: <CircleDot className="w-3 h-3" /> })
      break

    case "military":
      if (p.sub_type || p.type) rows.push({ label: "Type", value: p.sub_type || p.type, icon: <Building2 className="w-3 h-3" /> })
      if (p.operator) rows.push({ label: "Operator", value: p.operator, icon: <Building2 className="w-3 h-3" /> })
      if (p.branch) rows.push({ label: "Branch", value: p.branch, icon: <CircleDot className="w-3 h-3" /> })
      if (p.status) rows.push({ label: "Status", value: p.status, icon: <CircleDot className="w-3 h-3" /> })
      break

    case "airport":
      if (p.iata || p.iata_code) rows.push({ label: "IATA", value: p.iata || p.iata_code, icon: <Hash className="w-3 h-3" /> })
      if (p.icao) rows.push({ label: "ICAO", value: p.icao, icon: <Hash className="w-3 h-3" /> })
      if (p.sub_type || p.type) rows.push({ label: "Type", value: p.sub_type || p.type, icon: <CircleDot className="w-3 h-3" /> })
      if (p.operator) rows.push({ label: "Operator", value: p.operator, icon: <Building2 className="w-3 h-3" /> })
      if (p.elevation_ft) rows.push({ label: "Elevation", value: `${p.elevation_ft} ft`, icon: <Activity className="w-3 h-3" /> })
      if (p.runways) rows.push({ label: "Runways", value: String(p.runways), icon: <Navigation className="w-3 h-3" /> })
      break

    case "plant":
      if (p.sub_type || p.type) rows.push({ label: "Fuel Type", value: p.sub_type || p.type, icon: <Zap className="w-3 h-3" /> })
      if (p.capacity_mw) rows.push({ label: "Capacity", value: `${Number(p.capacity_mw).toLocaleString()} MW`, icon: <Activity className="w-3 h-3" /> })
      if (p.operator) rows.push({ label: "Operator", value: p.operator, icon: <Building2 className="w-3 h-3" /> })
      if (p.status) rows.push({ label: "Status", value: p.status, icon: <CircleDot className="w-3 h-3" /> })
      break
  }

  // Always add source if available
  if (p.source && !rows.find(r => r.label === "Reference")) {
    rows.push({ label: "Source", value: p.source.toUpperCase(), icon: <ExternalLink className="w-3 h-3" /> })
  }

  return rows
}

// ── Source badge ──────────────────────────────────────────────────────────────

function getSourceBadge(source?: string): { label: string; className: string } | null {
  if (!source) return null
  const s = source.toLowerCase()
  if (s.includes("mindex")) return { label: "MINDEX", className: "border-cyan-500/50 text-cyan-400 bg-cyan-500/10" }
  if (s.includes("osm")) return { label: "OSM", className: "border-teal-500/50 text-teal-400 bg-teal-500/10" }
  if (s.includes("eia")) return { label: "EIA", className: "border-blue-500/50 text-blue-400 bg-blue-500/10" }
  if (s.includes("hifld")) return { label: "HIFLD", className: "border-amber-500/50 text-amber-400 bg-amber-500/10" }
  if (s.includes("submarine")) return { label: "SCM", className: "border-cyan-500/50 text-cyan-400 bg-cyan-500/10" }
  if (s.includes("opencellid")) return { label: "OCID", className: "border-green-500/50 text-green-400 bg-green-500/10" }
  return { label: source.toUpperCase().slice(0, 8), className: "border-gray-500/50 text-gray-400 bg-gray-500/10" }
}

// ── Main Widget ──────────────────────────────────────────────────────────────

export function InfraDetailWidget({ asset, onClose, onFlyTo, className }: InfraDetailWidgetProps) {
  const widgetRef = useRef<HTMLDivElement>(null)
  const details = getDetailRows(asset)
  const accent = assetTypeAccent(asset.type)
  const sourceBadge = getSourceBadge(asset.properties?.source)
  const vkv = asset.properties?.voltage_kv ? Number(asset.properties.voltage_kv) : 0

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  // Subtitle based on type
  const subtitle = (() => {
    const p = asset.properties || {}
    switch (asset.type) {
      case "cable":
        return p.length_km ? `${Number(p.length_km).toLocaleString()} km` : "Submarine Cable"
      case "substation":
        return vkv > 0 ? `${vkv} kV` : "Substation"
      case "transmission_line":
        return vkv > 0 ? `${vkv} kV ${voltageClass(vkv)}` : "Transmission Line"
      case "plant":
        return p.capacity_mw ? `${Number(p.capacity_mw).toLocaleString()} MW` : p.sub_type || "Power Plant"
      case "cell_tower":
        return p.radio || "Cell Tower"
      case "datacenter":
        return p.operator || "Data Center"
      case "military":
        return p.sub_type || p.type || "Military"
      case "airport":
        return [p.iata_code, p.icao].filter(Boolean).join(" / ") || "Airport"
    }
  })()

  return (
    <div
      ref={widgetRef}
      className={cn(
        "min-w-[320px] max-w-[400px] bg-[#0a1628]/98 backdrop-blur-md rounded-lg shadow-2xl overflow-hidden border",
        "bg-gradient-to-b to-[#0a1628]/98",
        accent,
        className
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700/40 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {assetTypeIcon(asset.type)}
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">
              {assetTypeLabel(asset.type)}
            </span>
          </div>
          <h3 className="text-sm font-bold text-white leading-tight">
            {asset.name || "Unknown Asset"}
          </h3>
          {subtitle && (
            <span className="text-xs text-gray-400 mt-0.5 block">{subtitle}</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Status + Source badges row */}
      <div className="px-4 py-2 border-b border-gray-700/30 flex items-center gap-2 flex-wrap">
        {asset.properties?.status && (
          <Badge variant="outline" className={cn(
            "text-[9px] px-1.5 h-5",
            asset.properties.status.toLowerCase() === "active" || asset.properties.status.toLowerCase() === "operating"
              ? "border-green-500/50 text-green-400"
              : asset.properties.status.toLowerCase() === "retired" || asset.properties.status.toLowerCase() === "closed"
              ? "border-red-500/50 text-red-400"
              : asset.properties.status.toLowerCase() === "planned" || asset.properties.status.toLowerCase() === "construction"
              ? "border-yellow-500/50 text-yellow-400"
              : "border-gray-500/50 text-gray-400"
          )}>
            {asset.properties.status}
          </Badge>
        )}
        {sourceBadge && (
          <Badge variant="outline" className={cn("text-[8px] px-1.5 h-5", sourceBadge.className)}>
            {sourceBadge.label}
          </Badge>
        )}
        {asset.type === "substation" && vkv > 0 && (
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: voltageColor(vkv) }} />
            <span className="text-[10px] font-mono" style={{ color: voltageColor(vkv) }}>
              {voltageClass(vkv)}
            </span>
          </div>
        )}
        {asset.type === "transmission_line" && vkv > 0 && (
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-8 h-1 rounded-full" style={{ backgroundColor: voltageColor(vkv) }} />
            <span className="text-[10px] font-mono" style={{ color: voltageColor(vkv) }}>
              {vkv} kV
            </span>
          </div>
        )}
        {asset.type === "cable" && asset.properties?.color && (
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-8 h-1 rounded-full" style={{ backgroundColor: asset.properties.color }} />
          </div>
        )}
      </div>

      {/* Detail rows */}
      {details.length > 0 && (
        <div className="px-4 py-2.5 border-b border-gray-700/30 space-y-2">
          {details.map((d, i) => (
            <div key={i} className="flex items-center justify-between text-[11px]">
              <span className="text-gray-500 flex items-center gap-1.5 flex-shrink-0">
                {d.icon}
                {d.label}
              </span>
              <span
                className="font-medium text-right truncate max-w-[200px] ml-2 text-gray-300"
                style={d.color?.startsWith("#") ? { color: d.color } : undefined}
              >
                {d.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Live data indicator (for real-time sources) */}
      {(asset.type === "plant" || asset.type === "substation") && (
        <div className="px-4 py-1.5 border-b border-gray-700/30 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[9px] text-green-400 uppercase tracking-wider">MINDEX Live</span>
          <span className="text-[9px] text-gray-600 ml-auto">
            {new Date().toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* Location + Fly-to */}
      <div className="px-4 py-2.5">
        <button
          onClick={() => onFlyTo?.(asset.lat, asset.lng, asset.type === "cable" ? 6 : 12)}
          className="w-full flex items-center justify-between p-2 rounded bg-white/5 hover:bg-white/10 border border-gray-700/40 transition-colors group"
        >
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
            <div className="text-left">
              <div className="text-[9px] text-gray-500 uppercase">Location</div>
              <div className="text-[11px] text-gray-300 font-mono group-hover:text-white transition-colors">
                {asset.lat.toFixed(4)}, {asset.lng.toFixed(4)}
              </div>
            </div>
          </div>
          <ArrowRight className="w-3 h-3 text-gray-500 group-hover:text-white transition-colors" />
        </button>
      </div>
    </div>
  )
}
