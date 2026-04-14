"use client"

/**
 * Datacenter Detail Popup — OpenGridWorks-style DC information card
 *
 * Shows when clicking a datacenter diamond on the map. Displays:
 * - Name + type header
 * - PeeringDB / OpenStreetMap source badges
 * - Location (city, state)
 * - Building/Telecom classification
 * - OSM ID link
 * - Site analysis button
 * - Nearby datacenters list with status badges
 */

import { X, ExternalLink, MapPin, Server, Globe, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Datacenter } from "@/components/crep/layers/datacenter-diamonds"

interface DatacenterPopupProps {
  dc: Datacenter
  nearbyDCs?: Datacenter[]
  onClose: () => void
  onFlyTo?: (lat: number, lng: number, zoom?: number) => void
  onSiteAnalysis?: (dc: Datacenter) => void
  onSelectNearby?: (dc: Datacenter) => void
}

const SOURCE_BADGES: Record<string, { label: string; color: string }> = {
  peeringdb: { label: "PEERINGDB", color: "border-blue-500/50 text-blue-400 bg-blue-500/10" },
  openstreetmap: { label: "OPENSTREETMAP", color: "border-teal-500/50 text-teal-400 bg-teal-500/10" },
}

export function DatacenterPopup({
  dc,
  nearbyDCs = [],
  onClose,
  onFlyTo,
  onSiteAnalysis,
  onSelectNearby,
}: DatacenterPopupProps) {
  const sourceBadge = SOURCE_BADGES[dc.source?.toLowerCase() || ""] || SOURCE_BADGES.openstreetmap
  const location = [dc.city, dc.state, dc.country].filter(Boolean).join(", ")

  return (
    <div className="min-w-[320px] max-w-[400px] bg-[#0a1628]/98 backdrop-blur-md rounded-lg border border-gray-600/40 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700/50 flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-white">{dc.name}</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">Datacenter</p>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-700/50 text-gray-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Source badge */}
      <div className="px-4 py-2 border-b border-gray-700/30 flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className={cn("text-[8px] px-1.5 h-5", sourceBadge.color)}>
          {sourceBadge.label}
        </Badge>
        {dc.status && (
          <Badge variant="outline" className={cn(
            "text-[8px] px-1.5 h-5",
            dc.status.toLowerCase() === "operational"
              ? "border-green-500/50 text-green-400 bg-green-500/10"
              : "border-yellow-500/50 text-yellow-400 bg-yellow-500/10"
          )}>
            {dc.status.toUpperCase()}
          </Badge>
        )}
      </div>

      {/* Details */}
      <div className="px-4 py-2 border-b border-gray-700/30 space-y-1.5 text-[11px]">
        {location && (
          <div className="flex items-center gap-1.5 text-gray-300">
            <MapPin className="w-3 h-3 text-gray-500" />
            {location}
          </div>
        )}
        {dc.type && (
          <div className="flex justify-between">
            <span className="text-gray-500">Building</span>
            <span className="text-gray-300">{dc.type}</span>
          </div>
        )}
        {dc.networks !== undefined && (
          <div className="text-gray-400">
            {dc.networks} networks · {dc.ixps || 0} IXPs · {dc.carriers || 0} carriers
          </div>
        )}
        {dc.osm_id && (
          <div className="flex justify-between">
            <span className="text-gray-500">OSM</span>
            <span className="text-cyan-400 font-mono text-[10px]">way/{dc.osm_id}</span>
          </div>
        )}
      </div>

      {/* Site analysis button */}
      {onSiteAnalysis && (
        <div className="px-4 py-2 border-b border-gray-700/30">
          <button
            onClick={() => onSiteAnalysis(dc)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-cyan-500/40 bg-cyan-500/10 text-[10px] text-cyan-400 hover:bg-cyan-500/20 transition-colors"
          >
            <Search className="w-3 h-3" />
            Site analysis
          </button>
        </div>
      )}

      {/* Nearby datacenters */}
      {nearbyDCs.length > 0 && (
        <div className="px-4 py-2 space-y-2">
          <p className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">
            Nearby Data Centers ({nearbyDCs.length} total)
          </p>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {nearbyDCs.slice(0, 5).map((nearby) => (
              <button
                key={nearby.id}
                onClick={() => onSelectNearby?.(nearby)}
                className="w-full text-left p-2 rounded bg-black/30 hover:bg-black/50 border border-gray-700/30 transition-colors"
              >
                <p className="text-[11px] text-white font-medium truncate">{nearby.name}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  {nearby.source?.toLowerCase().includes("peeringdb") && (
                    <Badge variant="outline" className="text-[7px] px-1 h-4 border-blue-500/50 text-blue-400">
                      PEERINGDB
                    </Badge>
                  )}
                  {nearby.status && (
                    <Badge variant="outline" className={cn(
                      "text-[7px] px-1 h-4",
                      nearby.status.toLowerCase() === "operational"
                        ? "border-green-500/50 text-green-400"
                        : "border-gray-500/50 text-gray-400"
                    )}>
                      {nearby.status.toUpperCase()}
                    </Badge>
                  )}
                </div>
              </button>
            ))}
            {nearbyDCs.length > 5 && (
              <p className="text-[10px] text-cyan-400 cursor-pointer hover:underline">
                +{nearbyDCs.length - 5} more
              </p>
            )}
          </div>
          {nearbyDCs.length > 5 && (
            <p className="text-[9px] text-gray-500">
              Showing first 5 of {nearbyDCs.length} nearby data centers
            </p>
          )}
        </div>
      )}
    </div>
  )
}
