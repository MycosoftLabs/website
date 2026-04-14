"use client"

/**
 * Infrastructure Stats Panel — OpenGridWorks-style viewport-reactive left panel
 *
 * Shows live statistics that update as the user pans/zooms the map:
 * - Region name (from reverse geocode of viewport center)
 * - Plant count + total capacity (GW)
 * - Technology breakdown with color dots, counts, capacity bars
 * - Size (MW) legend with concentric circles
 * - Per-layer sections: Transmission, Substations, Data Centers
 *
 * Computed client-side from visible entities — no server round-trip needed.
 */

import { useMemo, useState } from "react"
import { Settings, ChevronDown, ChevronUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  computePlantStats,
  type PowerPlant,
  type PlantStats,
} from "@/components/crep/layers/power-plant-bubbles"
import { VOLTAGE_CLASSES, type TransmissionLine } from "@/components/crep/layers/transmission-lines"
import { SUBSTATION_TIERS, type Substation } from "@/components/crep/layers/substation-markers"
import type { Datacenter } from "@/components/crep/layers/datacenter-diamonds"

interface InfraStatsProps {
  regionName?: string
  plants: PowerPlant[]
  transmissionLines?: TransmissionLine[]
  substations?: Substation[]
  datacenters?: Datacenter[]
  zoom?: number
  bubbleScale?: number
  onBubbleScaleChange?: (scale: number) => void
  className?: string
}

export function InfrastructureStatsPanel({
  regionName,
  plants,
  transmissionLines = [],
  substations = [],
  datacenters = [],
  zoom = 2,
  bubbleScale = 1.0,
  onBubbleScaleChange,
  className,
}: InfraStatsProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["plants", "transmission", "substations", "datacenters"])
  )

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Compute plant stats
  const stats = useMemo(() => computePlantStats(plants), [plants])

  // Compute transmission stats
  const txStats = useMemo(() => {
    const byClass = new Map<string, number>()
    for (const line of transmissionLines) {
      for (const vc of VOLTAGE_CLASSES) {
        if (line.voltage_kv >= vc.minKV && line.voltage_kv <= vc.maxKV) {
          byClass.set(vc.id, (byClass.get(vc.id) || 0) + 1)
          break
        }
      }
    }
    return byClass
  }, [transmissionLines])

  // Compute substation stats
  const subStats = useMemo(() => {
    const byTier = new Map<string, number>()
    for (const sub of substations) {
      for (const tier of SUBSTATION_TIERS) {
        if (sub.voltage_kv >= tier.minKV && sub.voltage_kv <= tier.maxKV) {
          byTier.set(tier.id, (byTier.get(tier.id) || 0) + 1)
          break
        }
      }
    }
    return byTier
  }, [substations])

  const maxCapacity = stats.byFuelType[0]?.capacityGW || 1

  return (
    <div className={cn("space-y-0 text-white", className)}>
      {/* Header — Region name + plant count */}
      <div className="px-3 py-2.5 border-b border-cyan-500/20 bg-black/30">
        <div className="text-[11px] font-bold text-white">
          {regionName || "Power Plants"}
          <Badge variant="outline" className="ml-2 text-[8px] px-1.5 border-cyan-500/40 text-cyan-400">
            BETA
          </Badge>
        </div>
        <div className="text-[10px] text-gray-400 mt-0.5">
          {stats.totalPlants.toLocaleString()} plants | {stats.totalCapacityGW} GW
        </div>
      </div>

      {/* Technology breakdown */}
      <SectionHeader
        title="Technology"
        expanded={expandedSections.has("plants")}
        onToggle={() => toggleSection("plants")}
        extra={
          <button className="text-gray-500 hover:text-gray-300 p-0.5">
            <Settings className="w-3 h-3" />
          </button>
        }
      />
      {expandedSections.has("plants") && (
        <div className="px-3 py-1 space-y-0.5">
          {stats.byFuelType.map((fuel) => (
            <div key={fuel.fuel} className="flex items-center gap-2 py-0.5 text-[10px]">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: fuel.color }} />
              <span className="text-gray-300 flex-1 truncate">{fuel.fuel}</span>
              <span className="text-gray-500 font-mono w-12 text-right">{fuel.count.toLocaleString()}</span>
              <span className="text-gray-400 font-mono w-16 text-right">
                {fuel.capacityGW >= 1 ? `${fuel.capacityGW}GW` : `${Math.round(fuel.capacityGW * 1000)}MW`}
              </span>
              {/* Capacity bar */}
              <div className="w-12 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (fuel.capacityGW / maxCapacity) * 100)}%`,
                    backgroundColor: fuel.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Size legend */}
      <div className="px-3 py-2 border-t border-gray-700/30">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-semibold text-gray-300">Size (MW)</span>
          <button className="text-gray-500 hover:text-gray-300 p-0.5">
            <Settings className="w-3 h-3" />
          </button>
        </div>
        <div className="flex items-end gap-1 h-10">
          {[5000, 2500, 1000, 500, 100].map((mw) => {
            const radius = Math.sqrt(mw) * 0.3
            return (
              <div key={mw} className="flex flex-col items-center gap-0.5">
                <div
                  className="rounded-full border border-gray-600/60"
                  style={{
                    width: `${Math.max(4, radius)}px`,
                    height: `${Math.max(4, radius)}px`,
                    backgroundColor: "rgba(100, 100, 100, 0.3)",
                  }}
                />
                <span className="text-[7px] text-gray-600">
                  {mw >= 1000 ? `${mw / 1000}GW` : `${mw}MW`}
                </span>
              </div>
            )
          })}
        </div>
        <div className="text-[8px] text-gray-600 mt-1">
          Zoom {zoom?.toFixed(1)} | Bubble size {bubbleScale?.toFixed(2)}x
        </div>
      </div>

      {/* Data Centers */}
      {datacenters.length > 0 && (
        <>
          <SectionHeader
            title={`Data Centers`}
            expanded={expandedSections.has("datacenters")}
            onToggle={() => toggleSection("datacenters")}
            count={datacenters.length}
          />
          {expandedSections.has("datacenters") && (
            <div className="px-3 py-1 space-y-0.5 text-[10px]">
              <div className="flex items-center gap-2 py-0.5">
                <span className="text-gray-300">◆ Data Centers</span>
              </div>
              <div className="flex items-center gap-2 py-0.5">
                <span className="text-gray-500">◇ Internet Exchanges</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Transmission */}
      {transmissionLines.length > 0 && (
        <>
          <SectionHeader
            title="Transmission"
            expanded={expandedSections.has("transmission")}
            onToggle={() => toggleSection("transmission")}
          />
          {expandedSections.has("transmission") && (
            <div className="px-3 py-1 space-y-0.5">
              {VOLTAGE_CLASSES.map((vc) => {
                const count = txStats.get(vc.id) || 0
                if (count === 0) return null
                return (
                  <div key={vc.id} className="flex items-center gap-2 py-0.5 text-[10px]">
                    <div className="w-4 h-0.5 rounded" style={{ backgroundColor: vc.cssColor }} />
                    <span className="text-gray-300">{vc.label}</span>
                    <span className="text-gray-500 font-mono ml-auto">{count}</span>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Substations */}
      {substations.length > 0 && (
        <>
          <SectionHeader
            title="Substations"
            expanded={expandedSections.has("substations")}
            onToggle={() => toggleSection("substations")}
          />
          {expandedSections.has("substations") && (
            <div className="px-3 py-1 space-y-0.5">
              {SUBSTATION_TIERS.map((tier) => {
                const count = subStats.get(tier.id) || 0
                if (count === 0) return null
                return (
                  <div key={tier.id} className="flex items-center gap-2 py-0.5 text-[10px]">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tier.cssColor }} />
                    <span className="text-gray-300">{tier.label}</span>
                    <span className="text-gray-500 font-mono ml-auto">{count}</span>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({
  title,
  expanded,
  onToggle,
  count,
  extra,
}: {
  title: string
  expanded: boolean
  onToggle: () => void
  count?: number
  extra?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 border-t border-gray-700/30 cursor-pointer hover:bg-gray-800/30" onClick={onToggle}>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold text-gray-300">{title}</span>
        {count !== undefined && (
          <span className="text-[8px] text-gray-500 font-mono">{count}</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {extra}
        {expanded ? (
          <ChevronUp className="w-3 h-3 text-gray-500" />
        ) : (
          <ChevronDown className="w-3 h-3 text-gray-500" />
        )}
      </div>
    </div>
  )
}
