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
import { Settings, ChevronDown, ChevronUp, SlidersHorizontal, Grid3X3, X, Diamond, Triangle, Layers, MapPinned, Share2, Camera, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  computePlantStats,
  type PlantStats,
  type PowerPlant,
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
  cableRoutes?: any[]
  statsOverride?: PlantStats | null
  countsOverride?: {
    plants?: number
    transmissionLines?: number
    substations?: number
    datacenters?: number
    cableRoutes?: number
  } | null
  zoom?: number
  bubbleScale?: number
  onBubbleScaleChange?: (scale: number) => void
  enabledLayers?: Record<string, boolean>
  onLayerToggle?: (layerId: string, enabled: boolean) => void
  className?: string
}

export function InfrastructureStatsPanel({
  regionName,
  plants,
  transmissionLines = [],
  substations = [],
  datacenters = [],
  cableRoutes = [],
  statsOverride = null,
  countsOverride = null,
  zoom = 2,
  bubbleScale = 1.0,
  onBubbleScaleChange,
  enabledLayers = {},
  onLayerToggle,
  className,
}: InfraStatsProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set())
  const [settingsPanel, setSettingsPanel] = useState<"filters" | "plants" | "size" | "datacenters" | "transmission" | "substations" | "labels" | null>(null)
  const [plantStatus, setPlantStatus] = useState<Record<string, boolean>>({
    Operating: true,
    Planned: true,
    "Under Construction": true,
    Mothballed: false,
    Retired: false,
    Cancelled: false,
  })
  const [colorMode, setColorMode] = useState("Technology")
  const [palette, setPalette] = useState("Default")
  const [substationStyle, setSubstationStyle] = useState<"diamond" | "triangle">("diamond")
  const [substationGlow, setSubstationGlow] = useState<"neon" | "gold">("neon")
  const [labelPrefs, setLabelPrefs] = useState<Record<string, boolean>>({
    labels: true,
    substationLabels: true,
    basemapText: true,
    lineLabelsOnly: false,
    colorByLineType: true,
    enhancedVisibility: true,
    bigLabels: false,
  })

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Compute plant stats. The Earth Simulator can pass a server-side viewport
  // summary so heavy global datasets do not need to be parsed in React.
  const computedStats = useMemo(() => computePlantStats(plants), [plants])
  const stats = statsOverride ?? computedStats
  const totalPlants = countsOverride?.plants ?? stats.totalPlants
  const totalTransmissionLines = countsOverride?.transmissionLines ?? transmissionLines.length
  const totalSubstations = countsOverride?.substations ?? substations.length
  const totalDatacenters = countsOverride?.datacenters ?? datacenters.length
  const totalCableRoutes = countsOverride?.cableRoutes ?? cableRoutes.length

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
  const layerIsOn = (id: string) => enabledLayers[id] ?? true
  const setLayer = (id: string, enabled: boolean) => onLayerToggle?.(id, enabled)
  const toggleLayer = (id: string) => setLayer(id, !layerIsOn(id))

  return (
    <div className={cn("space-y-0 text-white", className)}>
      {/* Header — Region name + plant count */}
      <div className="px-3 py-2.5 border-b border-cyan-500/20 bg-black/30">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[11px] font-bold text-white">
              {regionName || "Infrastructure"}
              <Badge variant="outline" className="ml-2 text-[8px] px-1.5 border-cyan-500/40 text-cyan-400">
                BETA
              </Badge>
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              {totalPlants.toLocaleString()} plants | {stats.totalCapacityGW} GW
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              title="Show filters"
              onClick={() => setSettingsPanel(settingsPanel === "filters" ? null : "filters")}
              className="h-7 w-7 rounded border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 flex items-center justify-center"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Display settings"
              onClick={() => setSettingsPanel(settingsPanel === "plants" ? null : "plants")}
              className="h-7 w-7 rounded border border-gray-600/50 bg-black/30 text-gray-300 hover:border-cyan-500/40 flex items-center justify-center"
            >
              <Grid3X3 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {settingsPanel && (
        <InfraSettingsPanel
          panel={settingsPanel}
          onClose={() => setSettingsPanel(null)}
          plantStatus={plantStatus}
          setPlantStatus={setPlantStatus}
          colorMode={colorMode}
          setColorMode={setColorMode}
          palette={palette}
          setPalette={setPalette}
          bubbleScale={bubbleScale}
          onBubbleScaleChange={onBubbleScaleChange}
          substationStyle={substationStyle}
          setSubstationStyle={setSubstationStyle}
          substationGlow={substationGlow}
          setSubstationGlow={setSubstationGlow}
          labelPrefs={labelPrefs}
          setLabelPrefs={setLabelPrefs}
        />
      )}

      {/* Quick overview — all infra categories with colored dots */}
      <div className="px-3 py-2 border-b border-gray-700/30 space-y-1">
        <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Overview</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full shrink-0 bg-amber-400" />
            <span className="text-[10px] text-gray-300">Power Plants</span>
            <span className="text-[10px] text-amber-400 font-mono ml-auto">{totalPlants.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full shrink-0 bg-violet-400" />
            <span className="text-[10px] text-gray-300">Substations</span>
            <span className="text-[10px] text-violet-400 font-mono ml-auto">{totalSubstations.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full shrink-0 bg-rose-400" />
            <span className="text-[10px] text-gray-300">TX Lines</span>
            <span className="text-[10px] text-rose-400 font-mono ml-auto">{totalTransmissionLines.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full shrink-0 bg-cyan-400" />
            <span className="text-[10px] text-gray-300">Sub. Cables</span>
            <span className="text-[10px] text-cyan-400 font-mono ml-auto">{totalCableRoutes.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Technology breakdown */}
      <SectionHeader
        title="Technology"
        expanded={expandedSections.has("plants")}
        onToggle={() => toggleSection("plants")}
        extra={
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setSettingsPanel(settingsPanel === "plants" ? null : "plants") }}
            className="text-gray-500 hover:text-gray-300 p-0.5"
          >
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
          <button
            type="button"
            onClick={() => setSettingsPanel(settingsPanel === "size" ? null : "size")}
            className="text-gray-500 hover:text-gray-300 p-0.5"
          >
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
      {(
        <>
          <SectionHeader
            title={`Data Centers`}
            expanded={expandedSections.has("datacenters")}
            onToggle={() => toggleSection("datacenters")}
            count={totalDatacenters}
            extra={
              <button type="button" onClick={(e) => { e.stopPropagation(); setSettingsPanel(settingsPanel === "datacenters" ? null : "datacenters") }} className="text-gray-500 hover:text-gray-300 p-0.5">
                <Settings className="w-3 h-3" />
              </button>
            }
          />
          {expandedSections.has("datacenters") && (
            <div className="px-3 py-1 space-y-0.5 text-[10px]">
              <LayerRow label="Data Centers" swatch="diamond" color="#ffffff" count={totalDatacenters} active={layerIsOn("dataCentersG") || layerIsOn("dataCenters")} onToggle={() => toggleLayer("dataCentersG")} />
              <LayerRow label="Internet Exchanges" swatch="diamond" color="#64748b" active={layerIsOn("dataCentersG")} onToggle={() => toggleLayer("dataCentersG")} muted />
              <LayerRow label="Fiber Infrastructure" color="#22d3ee" active={layerIsOn("submarineCables") || layerIsOn("fiber")} onToggle={() => toggleLayer("submarineCables")} />
              <LayerRow label="Submarine Cables" color="#06b6d4" count={totalCableRoutes} active={layerIsOn("submarineCables")} onToggle={() => toggleLayer("submarineCables")} />
              <LayerRow label="Landing Points" swatch="dot" color="#67e8f9" active={layerIsOn("submarineCables")} onToggle={() => toggleLayer("submarineCables")} />
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
      {totalTransmissionLines > 0 && (
        <>
          <SectionHeader
            title="Transmission"
            expanded={expandedSections.has("transmission")}
            onToggle={() => toggleSection("transmission")}
            count={totalTransmissionLines}
            extra={
              <button type="button" onClick={(e) => { e.stopPropagation(); setSettingsPanel(settingsPanel === "transmission" ? null : "transmission") }} className="text-gray-500 hover:text-gray-300 p-0.5">
                <Settings className="w-3 h-3" />
              </button>
            }
          />
          {expandedSections.has("transmission") && (
            <div className="px-3 py-1 space-y-0.5">
              <LayerRow label="HIFLD Lines (US)" color="#22d3ee" active={layerIsOn("transmissionLines")} onToggle={() => toggleLayer("transmissionLines")} />
              <LayerRow label="ROW Infra" color="#38bdf8" active={layerIsOn("txLinesGlobal")} onToggle={() => toggleLayer("txLinesGlobal")} />
              <LayerRow label="OSM Lines (US)" color="#818cf8" active={layerIsOn("txLinesSub")} onToggle={() => toggleLayer("txLinesSub")} />
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
      {totalSubstations > 0 && (
        <>
          <SectionHeader
            title="Substations"
            expanded={expandedSections.has("substations")}
            onToggle={() => toggleSection("substations")}
            count={totalSubstations}
            extra={
              <button type="button" onClick={(e) => { e.stopPropagation(); setSettingsPanel(settingsPanel === "substations" ? null : "substations") }} className="text-gray-500 hover:text-gray-300 p-0.5">
                <Settings className="w-3 h-3" />
              </button>
            }
          />
          {expandedSections.has("substations") && (
            <div className="px-3 py-1 space-y-0.5">
              <LayerRow label="HIFLD Subs (US)" swatch="dot" color="#c084fc" active={layerIsOn("substations")} onToggle={() => toggleLayer("substations")} />
              <LayerRow label="ROW Subs" swatch="dot" color="#a78bfa" active={layerIsOn("substations")} onToggle={() => toggleLayer("substations")} />
              <LayerRow label="OSM Subs (US)" swatch="dot" color="#8b5cf6" active={layerIsOn("substations")} onToggle={() => toggleLayer("substations")} />
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

      {/* Submarine Cables */}
      {totalCableRoutes > 0 && (
        <>
          <SectionHeader
            title="Submarine Cables"
            expanded={expandedSections.has("cables")}
            onToggle={() => toggleSection("cables")}
            count={totalCableRoutes}
          />
          {expandedSections.has("cables") && (
            <div className="px-3 py-1 space-y-0.5 text-[10px]">
              <div className="flex items-center gap-2 py-0.5">
                <div className="w-4 h-0.5 rounded bg-cyan-400" />
                <span className="text-gray-300">Active routes</span>
                <span className="text-gray-500 font-mono ml-auto">{totalCableRoutes}</span>
              </div>
            </div>
          )}
        </>
      )}

      <SectionHeader
        title="Planned Upgrades"
        expanded={expandedSections.has("upgrades")}
        onToggle={() => toggleSection("upgrades")}
      />
      {expandedSections.has("upgrades") && (
        <div className="px-3 py-1 space-y-0.5 text-[10px]">
          {["Construction", "Permitting", "Engineering", "Planning", "Conceptual", "Planned Substations"].map((label) => (
            <LayerRow key={label} label={label} color="#f59e0b" active={layerIsOn("plannedTransmission")} onToggle={() => toggleLayer("plannedTransmission")} />
          ))}
        </div>
      )}

      <SectionHeader
        title="Gas Pipelines"
        expanded={expandedSections.has("gas")}
        onToggle={() => toggleSection("gas")}
      />
      {expandedSections.has("gas") && (
        <div className="px-3 py-1 space-y-0.5 text-[10px]">
          <LayerRow label="Interstate" color="#fb7185" active={layerIsOn("oilGas")} onToggle={() => toggleLayer("oilGas")} />
          <LayerRow label="Intrastate" color="#fda4af" active={layerIsOn("oilGas")} onToggle={() => toggleLayer("oilGas")} />
        </div>
      )}

      <SectionHeader
        title="Globe Controls"
        expanded={expandedSections.has("globe")}
        onToggle={() => toggleSection("globe")}
      />
      {expandedSections.has("globe") && (
        <div className="px-3 py-1.5 space-y-1 text-[10px]">
          <div className="grid grid-cols-2 gap-1">
            {[
              "Global All On",
              "HIFLD Lines (US)",
              "ROW Infra",
              "OSM Lines (US)",
              "HIFLD Subs (US)",
              "ROW Subs",
              "OSM Subs (US)",
            ].map((label) => (
              <button key={label} type="button" className="rounded border border-cyan-500/25 bg-cyan-500/10 px-1.5 py-1 text-[8px] text-cyan-200 hover:bg-cyan-500/20">
                {label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1">
            {["United States", "Canada", "Mexico", "Europe", "China", "India", "Japan"].map((label) => (
              <button key={label} type="button" className="rounded border border-gray-700/50 bg-black/25 px-1 py-1 text-[8px] text-gray-300 hover:border-cyan-500/40">
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <SectionHeader
        title="Label Settings"
        expanded={expandedSections.has("labels")}
        onToggle={() => toggleSection("labels")}
        extra={
          <button type="button" onClick={(e) => { e.stopPropagation(); setSettingsPanel(settingsPanel === "labels" ? null : "labels") }} className="text-gray-500 hover:text-gray-300 p-0.5">
            <Settings className="w-3 h-3" />
          </button>
        }
      />
      {expandedSections.has("labels") && (
        <div className="px-3 py-1.5 space-y-1 text-[10px]">
          {Object.entries({
            "Zoom labels v2": labelPrefs.labels,
            "Substation labels": labelPrefs.substationLabels,
            "Basemap text labels": labelPrefs.basemapText,
            "Lines only": labelPrefs.lineLabelsOnly,
            "Color by line type": labelPrefs.colorByLineType,
            "Enhanced visibility": labelPrefs.enhancedVisibility,
          }).map(([label, active]) => (
            <button
              key={label}
              type="button"
              className={cn(
                "w-full flex items-center justify-between rounded border px-2 py-1 text-[9px]",
                active ? "border-green-500/40 bg-green-500/15 text-green-200" : "border-red-500/40 bg-red-950/30 text-red-200"
              )}
            >
              <span>{label}</span>
              {active && <Check className="w-3 h-3" />}
            </button>
          ))}
        </div>
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

function LayerRow({
  label,
  color,
  count,
  active,
  onToggle,
  swatch = "line",
  muted = false,
}: {
  label: string
  color: string
  count?: number
  active: boolean
  onToggle: () => void
  swatch?: "line" | "dot" | "diamond"
  muted?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-full flex items-center gap-2 py-0.5 text-left transition-opacity",
        active ? "opacity-100" : "opacity-35",
        muted && "text-gray-500"
      )}
    >
      {swatch === "diamond" ? (
        <Diamond className="w-3 h-3 shrink-0" style={{ color, fill: active ? color : "transparent" }} />
      ) : swatch === "dot" ? (
        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      ) : (
        <div className="w-4 h-0.5 rounded shrink-0" style={{ backgroundColor: color }} />
      )}
      <span className={cn("text-[10px] flex-1 truncate", active ? "text-gray-300" : "text-gray-500")}>{label}</span>
      {count !== undefined && <span className="text-[9px] text-gray-500 font-mono">{count.toLocaleString()}</span>}
    </button>
  )
}

function InfraSettingsPanel({
  panel,
  onClose,
  plantStatus,
  setPlantStatus,
  colorMode,
  setColorMode,
  palette,
  setPalette,
  bubbleScale,
  onBubbleScaleChange,
  substationStyle,
  setSubstationStyle,
  substationGlow,
  setSubstationGlow,
  labelPrefs,
  setLabelPrefs,
}: {
  panel: "filters" | "plants" | "size" | "datacenters" | "transmission" | "substations" | "labels"
  onClose: () => void
  plantStatus: Record<string, boolean>
  setPlantStatus: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  colorMode: string
  setColorMode: (value: string) => void
  palette: string
  setPalette: (value: string) => void
  bubbleScale: number
  onBubbleScaleChange?: (scale: number) => void
  substationStyle: "diamond" | "triangle"
  setSubstationStyle: (value: "diamond" | "triangle") => void
  substationGlow: "neon" | "gold"
  setSubstationGlow: (value: "neon" | "gold") => void
  labelPrefs: Record<string, boolean>
  setLabelPrefs: React.Dispatch<React.SetStateAction<any>>
}) {
  const title = {
    filters: "Filters",
    plants: "Power Plant Display",
    size: "Size Settings",
    datacenters: "Data Centers",
    transmission: "Transmission",
    substations: "Substations",
    labels: "Label Settings",
  }[panel]
  const palettes = [
    ["Default", ["#fbbf24", "#22d3ee", "#a78bfa", "#94a3b8", "#ec4899"]],
    ["Glow", ["#facc15", "#06b6d4", "#c084fc", "#f472b6"]],
    ["Neon Night", ["#f9f871", "#00ff66", "#e879f9", "#22d3ee"]],
    ["Amber", ["#fed7aa", "#f59e0b", "#92400e"]],
    ["Ivory", ["#f8fafc", "#d6d3d1", "#a8a29e"]],
    ["Sapphire", ["#22d3ee", "#0284c7", "#0f766e"]],
    ["Prism", ["#facc15", "#60a5fa", "#a855f7", "#fb923c", "#fb7185"]],
  ]

  return (
    <div className="mx-2 my-2 rounded-lg border border-cyan-500/25 bg-[#08111f]/95 shadow-xl">
      <div className="flex items-center justify-between px-2.5 py-2 border-b border-cyan-500/20">
        <div className="flex items-center gap-1.5">
          <Settings className="w-3.5 h-3.5 text-cyan-300" />
          <span className="text-[11px] font-bold text-white">{title}</span>
        </div>
        <button type="button" onClick={onClose} className="text-gray-500 hover:text-white">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {(panel === "filters" || panel === "plants") && (
        <div className="p-2 space-y-2">
          <button type="button" className="w-full rounded bg-gray-700/50 px-2 py-1.5 text-[9px] text-gray-300 hover:bg-gray-600/50">
            Reset Filters
          </button>
          <div>
            <div className="text-[8px] text-gray-500 font-semibold uppercase mb-1">Status</div>
            <div className="grid grid-cols-3 gap-1">
              {Object.entries(plantStatus).map(([label, active]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setPlantStatus((prev) => ({ ...prev, [label]: !prev[label] }))}
                  className={cn(
                    "min-h-[35px] rounded border px-1 py-1 text-[8px] leading-tight",
                    active ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-100" : "border-gray-700/60 bg-black/20 text-gray-600"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-[8px] text-gray-500 font-semibold uppercase">Color By</div>
            <select value={colorMode} onChange={(e) => setColorMode(e.target.value)} className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1 text-[10px] text-gray-200">
              {["Technology", "Sector", "Status", "Balancing Authority", "Entity", "COD Year", "Retirement Year"].map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            <div className="space-y-1">
              {palettes.map(([name, swatches]) => (
                <button
                  key={name as string}
                  type="button"
                  onClick={() => setPalette(name as string)}
                  className={cn("w-full flex items-center gap-2 rounded border px-1.5 py-1 text-[9px]", palette === name ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-100" : "border-gray-700/50 text-gray-400")}
                >
                  <div className="flex h-3 flex-1 overflow-hidden rounded">
                    {(swatches as string[]).map((color) => <span key={color} className="flex-1" style={{ backgroundColor: color }} />)}
                  </div>
                  <span className="w-20 text-right">{name as string}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {panel === "size" && (
        <div className="p-2 space-y-2">
          <div className="text-[8px] text-gray-500 uppercase">Bubble size {bubbleScale.toFixed(2)}x</div>
          <input
            type="range"
            min={0.35}
            max={2}
            step={0.05}
            value={bubbleScale}
            onChange={(e) => onBubbleScaleChange?.(Number(e.target.value))}
            className="w-full accent-cyan-400"
          />
          <div className="grid grid-cols-4 gap-1 text-[8px] text-gray-500">
            <span>100MW</span>
            <span>500MW</span>
            <span>1GW</span>
            <span>5GW</span>
          </div>
        </div>
      )}

      {panel === "datacenters" && (
        <div className="p-2 space-y-1.5 text-[9px] text-gray-300">
          {["Megaprojects", "Epoch AI", "IM3", "OpenStreetMap", "PeeringDB"].map((label) => (
            <label key={label} className="flex items-center gap-2 rounded bg-black/25 px-2 py-1">
              <input type="checkbox" defaultChecked className="accent-cyan-400" />
              <span>{label}</span>
            </label>
          ))}
        </div>
      )}

      {panel === "transmission" && (
        <div className="p-2 space-y-2">
          <div className="text-[8px] text-gray-500 uppercase">Zoom gating</div>
          <select className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1 text-[10px] text-gray-200" defaultValue="Progressive">
            {["Progressive", "Legacy", "TX-match", "Show all"].map((option) => <option key={option}>{option}</option>)}
          </select>
          <div className="text-[8px] text-amber-300/80 rounded border border-amber-500/25 bg-amber-500/10 px-2 py-1">
            230kV+ at z6.5, 100kV+ at z7, 31kV+ at z8, less than 31kV at z11.
          </div>
        </div>
      )}

      {panel === "substations" && (
        <div className="p-2 space-y-2">
          <div className="flex gap-1">
            <button type="button" onClick={() => setSubstationStyle("diamond")} className={cn("flex-1 rounded border px-2 py-1 text-[9px]", substationStyle === "diamond" ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-100" : "border-gray-700 text-gray-400")}>
              <Diamond className="w-3 h-3 inline mr-1" />Diamond
            </button>
            <button type="button" onClick={() => setSubstationStyle("triangle")} className={cn("flex-1 rounded border px-2 py-1 text-[9px]", substationStyle === "triangle" ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-100" : "border-gray-700 text-gray-400")}>
              <Triangle className="w-3 h-3 inline mr-1" />Triangle
            </button>
          </div>
          <div className="flex gap-1">
            {(["neon", "gold"] as const).map((mode) => (
              <button key={mode} type="button" onClick={() => setSubstationGlow(mode)} className={cn("flex-1 rounded border px-2 py-1 text-[9px] capitalize", substationGlow === mode ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-100" : "border-gray-700 text-gray-400")}>
                {mode}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-[9px] text-gray-300"><input type="checkbox" defaultChecked className="accent-cyan-400" /> Plain circles</label>
          <label className="flex items-center gap-2 text-[9px] text-gray-300"><input type="checkbox" defaultChecked className="accent-cyan-400" /> Lighthouse glow</label>
        </div>
      )}

      {panel === "labels" && (
        <div className="p-2 space-y-1.5">
          {Object.keys(labelPrefs).map((key) => (
            <label key={key} className="flex items-center gap-2 rounded bg-black/25 px-2 py-1 text-[9px] text-gray-300">
              <input
                type="checkbox"
                checked={Boolean(labelPrefs[key])}
                onChange={() => setLabelPrefs((prev: any) => ({ ...prev, [key]: !prev[key] }))}
                className="accent-cyan-400"
              />
              <span>{key.replace(/([A-Z])/g, " $1").trim()}</span>
            </label>
          ))}
        </div>
      )}

      <div className="grid grid-cols-4 gap-1 border-t border-gray-800 p-2">
        {[
          { icon: <Layers className="w-3 h-3" />, label: "Layers" },
          { icon: <MapPinned className="w-3 h-3" />, label: "Custom" },
          { icon: <Camera className="w-3 h-3" />, label: "PNG" },
          { icon: <Share2 className="w-3 h-3" />, label: "Share" },
        ].map((item) => (
          <button key={item.label} type="button" className="rounded border border-gray-700 bg-black/25 px-1 py-1 text-[8px] text-gray-300 hover:border-cyan-500/40">
            <span className="flex items-center justify-center text-cyan-300">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}
