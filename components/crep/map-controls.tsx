"use client"

/**
 * Enhanced Map Controls for CREP Dashboard
 * 
 * Inspired by:
 * - FlightRadar24: Aircraft filters, altitude bands, airline filters
 * - SatelliteMap.space: Orbital category filters, pass predictions
 * - MarineTraffic: Vessel type filters, port layers, shipping lanes
 * - SWPC: Space weather overlays, geomagnetic storm indicators
 * 
 * Provides granular control over map layers and data visualization.
 */

import { useState, useMemo } from "react"
import {
  Plane,
  Ship,
  Satellite,
  Sun,
  Cloud,
  Wind,
  Anchor,
  Radio,
  Factory,
  Shield,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Filter,
  Settings,
  Gauge,
  Navigation,
  Timer,
  Wifi,
  WifiOff,
  Activity,
  Zap,
  Container,
  Fish,
  Target,
  RefreshCw,
  Play,
  Pause,
  Circle,
  Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

// =============================================================================
// TYPES
// =============================================================================

export interface AircraftFilter {
  showAirborne: boolean
  showGround: boolean
  minAltitude: number    // feet
  maxAltitude: number    // feet
  airlines: string[]     // IATA codes
  aircraftTypes: string[]
  showMilitary: boolean
  showCargo: boolean
  showPrivate: boolean
  showCommercial: boolean
}

export interface VesselFilter {
  showCargo: boolean
  showTanker: boolean
  showPassenger: boolean
  showFishing: boolean
  showTug: boolean
  showMilitary: boolean
  showPleasure: boolean
  minSpeed: number       // knots
  showPortAreas: boolean
  showShippingLanes: boolean
  showAnchorages: boolean
}

export interface SatelliteFilter {
  showStations: boolean  // ISS, Tiangong
  showWeather: boolean
  showComms: boolean
  showGPS: boolean
  showStarlink: boolean
  showDebris: boolean
  showActive: boolean
  orbitTypes: ("LEO" | "MEO" | "GEO" | "HEO")[]
}

export interface SpaceWeatherFilter {
  showSolarFlares: boolean
  showCME: boolean       // Coronal Mass Ejection
  showGeomagneticStorms: boolean
  showRadiationBelts: boolean
  showAuroraOval: boolean
  showSolarWind: boolean
}

export interface NOAAScales {
  radio: number    // R0-R5
  solar: number    // S0-S5
  geomag: number   // G0-G5
}

export interface StreamStatus {
  type: string
  connected: boolean
  lastUpdate?: string
  messageCount: number
  latency?: number
}

interface MapControlsProps {
  aircraftFilter: AircraftFilter
  vesselFilter: VesselFilter
  satelliteFilter: SatelliteFilter
  spaceWeatherFilter: SpaceWeatherFilter
  streamStatuses: StreamStatus[]
  isStreaming: boolean
  noaaScales?: NOAAScales  // Real-time NOAA space weather scales
  onAircraftFilterChange: (filter: Partial<AircraftFilter>) => void
  onVesselFilterChange: (filter: Partial<VesselFilter>) => void
  onSatelliteFilterChange: (filter: Partial<SatelliteFilter>) => void
  onSpaceWeatherFilterChange: (filter: Partial<SpaceWeatherFilter>) => void
  onToggleStreaming: () => void
  onRefresh: () => void
}

// =============================================================================
// COMPONENT
// =============================================================================

export function MapControls({
  aircraftFilter,
  vesselFilter,
  satelliteFilter,
  spaceWeatherFilter,
  streamStatuses,
  isStreaming,
  noaaScales,
  onAircraftFilterChange,
  onVesselFilterChange,
  onSatelliteFilterChange,
  onSpaceWeatherFilterChange,
  onToggleStreaming,
  onRefresh,
}: MapControlsProps) {
  const [activeTab, setActiveTab] = useState("aircraft")
  const [expanded, setExpanded] = useState(true)

  // Calculate active filter counts
  const activeFilters = useMemo(() => {
    let count = 0
    if (aircraftFilter.showAirborne) count++
    if (aircraftFilter.showGround) count++
    if (aircraftFilter.showMilitary) count++
    if (vesselFilter.showCargo) count++
    if (vesselFilter.showTanker) count++
    if (vesselFilter.showPassenger) count++
    if (satelliteFilter.showStations) count++
    if (satelliteFilter.showStarlink) count++
    if (spaceWeatherFilter.showSolarFlares) count++
    return count
  }, [aircraftFilter, vesselFilter, satelliteFilter, spaceWeatherFilter])

  return (
    <div className="bg-black/90 border border-cyan-500/30 rounded-lg overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-cyan-500/20 cursor-pointer hover:bg-cyan-500/5"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-medium text-cyan-400 uppercase tracking-wider">
            Data Filters
          </span>
          {activeFilters > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-cyan-500/30 text-cyan-300">
              {activeFilters}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onRefresh()
            }}
            className="h-6 w-6 p-0 hover:bg-cyan-500/20"
          >
            <RefreshCw className="w-3 h-3 text-cyan-400" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onToggleStreaming()
            }}
            className={cn(
              "h-6 w-6 p-0",
              isStreaming ? "hover:bg-green-500/20" : "hover:bg-yellow-500/20"
            )}
          >
            {isStreaming ? (
              <Pause className="w-3 h-3 text-green-400" />
            ) : (
              <Play className="w-3 h-3 text-yellow-400" />
            )}
          </Button>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-cyan-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-cyan-400" />
          )}
        </div>
      </div>

      {expanded && (
        <>
          {/* Stream Status Bar */}
          <div className="flex items-center gap-1 px-2 py-1.5 border-b border-cyan-500/20 bg-black/50">
            {streamStatuses.map((status) => (
              <div
                key={status.type}
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded text-[10px]",
                  status.connected
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400"
                )}
              >
                <Circle className={cn(
                  "w-1.5 h-1.5",
                  status.connected ? "fill-green-400" : "fill-red-400"
                )} />
                <span className="uppercase font-medium">{status.type.slice(0, 3)}</span>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full h-8 rounded-none bg-black/50 border-b border-cyan-500/20 grid grid-cols-4 gap-0">
              <TabsTrigger
                value="aircraft"
                className="h-7 rounded-none text-[10px] data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"
              >
                <Plane className="w-3 h-3 mr-1" />
                AIR
              </TabsTrigger>
              <TabsTrigger
                value="vessels"
                className="h-7 rounded-none text-[10px] data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"
              >
                <Ship className="w-3 h-3 mr-1" />
                SEA
              </TabsTrigger>
              <TabsTrigger
                value="satellites"
                className="h-7 rounded-none text-[10px] data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"
              >
                <Satellite className="w-3 h-3 mr-1" />
                SAT
              </TabsTrigger>
              <TabsTrigger
                value="weather"
                className="h-7 rounded-none text-[10px] data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"
              >
                <Sun className="w-3 h-3 mr-1" />
                SWX
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[200px]">
              {/* Aircraft Filters */}
              <TabsContent value="aircraft" className="m-0 p-2 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <FilterToggle
                    label="Airborne"
                    icon={<Plane className="w-3 h-3" />}
                    checked={aircraftFilter.showAirborne}
                    onChange={(v) => onAircraftFilterChange({ showAirborne: v })}
                    color="cyan"
                  />
                  <FilterToggle
                    label="Ground"
                    icon={<Target className="w-3 h-3" />}
                    checked={aircraftFilter.showGround}
                    onChange={(v) => onAircraftFilterChange({ showGround: v })}
                    color="gray"
                  />
                  <FilterToggle
                    label="Commercial"
                    icon={<Plane className="w-3 h-3" />}
                    checked={aircraftFilter.showCommercial}
                    onChange={(v) => onAircraftFilterChange({ showCommercial: v })}
                    color="blue"
                  />
                  <FilterToggle
                    label="Cargo"
                    icon={<Container className="w-3 h-3" />}
                    checked={aircraftFilter.showCargo}
                    onChange={(v) => onAircraftFilterChange({ showCargo: v })}
                    color="orange"
                  />
                  <FilterToggle
                    label="Military"
                    icon={<Shield className="w-3 h-3" />}
                    checked={aircraftFilter.showMilitary}
                    onChange={(v) => onAircraftFilterChange({ showMilitary: v })}
                    color="yellow"
                  />
                  <FilterToggle
                    label="Private"
                    icon={<Plane className="w-3 h-3" />}
                    checked={aircraftFilter.showPrivate}
                    onChange={(v) => onAircraftFilterChange({ showPrivate: v })}
                    color="purple"
                  />
                </div>
                
                {/* Altitude Filter */}
                <div className="space-y-1.5 pt-2 border-t border-cyan-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-cyan-400/70">Altitude Range</span>
                    <span className="text-[10px] text-cyan-400">
                      {aircraftFilter.minAltitude.toLocaleString()} - {aircraftFilter.maxAltitude.toLocaleString()} ft
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={50000}
                    step={1000}
                    value={[aircraftFilter.minAltitude, aircraftFilter.maxAltitude]}
                    onValueChange={([min, max]) => 
                      onAircraftFilterChange({ minAltitude: min, maxAltitude: max })
                    }
                    className="w-full"
                  />
                </div>
              </TabsContent>

              {/* Vessel Filters */}
              <TabsContent value="vessels" className="m-0 p-2 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <FilterToggle
                    label="Cargo"
                    icon={<Container className="w-3 h-3" />}
                    checked={vesselFilter.showCargo}
                    onChange={(v) => onVesselFilterChange({ showCargo: v })}
                    color="green"
                  />
                  <FilterToggle
                    label="Tanker"
                    icon={<Ship className="w-3 h-3" />}
                    checked={vesselFilter.showTanker}
                    onChange={(v) => onVesselFilterChange({ showTanker: v })}
                    color="red"
                  />
                  <FilterToggle
                    label="Passenger"
                    icon={<Ship className="w-3 h-3" />}
                    checked={vesselFilter.showPassenger}
                    onChange={(v) => onVesselFilterChange({ showPassenger: v })}
                    color="blue"
                  />
                  <FilterToggle
                    label="Fishing"
                    icon={<Fish className="w-3 h-3" />}
                    checked={vesselFilter.showFishing}
                    onChange={(v) => onVesselFilterChange({ showFishing: v })}
                    color="cyan"
                  />
                  <FilterToggle
                    label="Tug"
                    icon={<Anchor className="w-3 h-3" />}
                    checked={vesselFilter.showTug}
                    onChange={(v) => onVesselFilterChange({ showTug: v })}
                    color="yellow"
                  />
                  <FilterToggle
                    label="Military"
                    icon={<Shield className="w-3 h-3" />}
                    checked={vesselFilter.showMilitary}
                    onChange={(v) => onVesselFilterChange({ showMilitary: v })}
                    color="orange"
                  />
                </div>

                {/* Maritime Layers */}
                <div className="space-y-1.5 pt-2 border-t border-cyan-500/20">
                  <span className="text-[10px] text-cyan-400/70">Maritime Layers</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <FilterToggle
                      label="Ports"
                      icon={<Anchor className="w-3 h-3" />}
                      checked={vesselFilter.showPortAreas}
                      onChange={(v) => onVesselFilterChange({ showPortAreas: v })}
                      color="teal"
                      compact
                    />
                    <FilterToggle
                      label="Lanes"
                      icon={<Navigation className="w-3 h-3" />}
                      checked={vesselFilter.showShippingLanes}
                      onChange={(v) => onVesselFilterChange({ showShippingLanes: v })}
                      color="blue"
                      compact
                    />
                    <FilterToggle
                      label="Anchor"
                      icon={<Anchor className="w-3 h-3" />}
                      checked={vesselFilter.showAnchorages}
                      onChange={(v) => onVesselFilterChange({ showAnchorages: v })}
                      color="gray"
                      compact
                    />
                  </div>
                </div>

                {/* Speed Filter */}
                <div className="space-y-1.5 pt-2 border-t border-cyan-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-cyan-400/70">Min Speed</span>
                    <span className="text-[10px] text-cyan-400">{vesselFilter.minSpeed} kn</span>
                  </div>
                  <Slider
                    min={0}
                    max={30}
                    step={1}
                    value={[vesselFilter.minSpeed]}
                    onValueChange={([v]) => onVesselFilterChange({ minSpeed: v })}
                    className="w-full"
                  />
                </div>
              </TabsContent>

              {/* Satellite Filters */}
              <TabsContent value="satellites" className="m-0 p-2 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <FilterToggle
                    label="Stations"
                    icon={<Satellite className="w-3 h-3" />}
                    checked={satelliteFilter.showStations}
                    onChange={(v) => onSatelliteFilterChange({ showStations: v })}
                    color="cyan"
                    hint="ISS, Tiangong"
                  />
                  <FilterToggle
                    label="Weather"
                    icon={<Cloud className="w-3 h-3" />}
                    checked={satelliteFilter.showWeather}
                    onChange={(v) => onSatelliteFilterChange({ showWeather: v })}
                    color="blue"
                  />
                  <FilterToggle
                    label="Comms"
                    icon={<Radio className="w-3 h-3" />}
                    checked={satelliteFilter.showComms}
                    onChange={(v) => onSatelliteFilterChange({ showComms: v })}
                    color="green"
                  />
                  <FilterToggle
                    label="GPS/GNSS"
                    icon={<Navigation className="w-3 h-3" />}
                    checked={satelliteFilter.showGPS}
                    onChange={(v) => onSatelliteFilterChange({ showGPS: v })}
                    color="orange"
                  />
                  <FilterToggle
                    label="Starlink"
                    icon={<Wifi className="w-3 h-3" />}
                    checked={satelliteFilter.showStarlink}
                    onChange={(v) => onSatelliteFilterChange({ showStarlink: v })}
                    color="purple"
                  />
                  <FilterToggle
                    label="Debris"
                    icon={<Target className="w-3 h-3" />}
                    checked={satelliteFilter.showDebris}
                    onChange={(v) => onSatelliteFilterChange({ showDebris: v })}
                    color="red"
                  />
                </div>

                {/* Orbit Types */}
                <div className="space-y-1.5 pt-2 border-t border-cyan-500/20">
                  <span className="text-[10px] text-cyan-400/70">Orbit Types</span>
                  <div className="flex flex-wrap gap-1">
                    {(["LEO", "MEO", "GEO", "HEO"] as const).map((orbit) => (
                      <Badge
                        key={orbit}
                        variant="outline"
                        className={cn(
                          "text-[9px] px-1.5 py-0 h-5 cursor-pointer transition-colors",
                          satelliteFilter.orbitTypes.includes(orbit)
                            ? "bg-cyan-500/30 border-cyan-500/50 text-cyan-400"
                            : "bg-transparent border-gray-600 text-gray-500 hover:border-cyan-500/30"
                        )}
                        onClick={() => {
                          const current = satelliteFilter.orbitTypes
                          const newTypes = current.includes(orbit)
                            ? current.filter((t) => t !== orbit)
                            : [...current, orbit]
                          onSatelliteFilterChange({ orbitTypes: newTypes })
                        }}
                      >
                        {orbit}
                      </Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Space Weather Filters */}
              <TabsContent value="weather" className="m-0 p-2 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <FilterToggle
                    label="Solar Flares"
                    icon={<Sun className="w-3 h-3" />}
                    checked={spaceWeatherFilter.showSolarFlares}
                    onChange={(v) => onSpaceWeatherFilterChange({ showSolarFlares: v })}
                    color="yellow"
                  />
                  <FilterToggle
                    label="CME"
                    icon={<Zap className="w-3 h-3" />}
                    checked={spaceWeatherFilter.showCME}
                    onChange={(v) => onSpaceWeatherFilterChange({ showCME: v })}
                    color="orange"
                    hint="Coronal Mass Ejection"
                  />
                  <FilterToggle
                    label="G-Storms"
                    icon={<Activity className="w-3 h-3" />}
                    checked={spaceWeatherFilter.showGeomagneticStorms}
                    onChange={(v) => onSpaceWeatherFilterChange({ showGeomagneticStorms: v })}
                    color="red"
                  />
                  <FilterToggle
                    label="Radiation"
                    icon={<Shield className="w-3 h-3" />}
                    checked={spaceWeatherFilter.showRadiationBelts}
                    onChange={(v) => onSpaceWeatherFilterChange({ showRadiationBelts: v })}
                    color="purple"
                  />
                  <FilterToggle
                    label="Aurora Oval"
                    icon={<Circle className="w-3 h-3" />}
                    checked={spaceWeatherFilter.showAuroraOval}
                    onChange={(v) => onSpaceWeatherFilterChange({ showAuroraOval: v })}
                    color="green"
                  />
                  <FilterToggle
                    label="Solar Wind"
                    icon={<Wind className="w-3 h-3" />}
                    checked={spaceWeatherFilter.showSolarWind}
                    onChange={(v) => onSpaceWeatherFilterChange({ showSolarWind: v })}
                    color="cyan"
                  />
                </div>

                {/* NOAA Scales */}
                <div className="space-y-1.5 pt-2 border-t border-cyan-500/20">
                  <div className="flex items-center gap-1">
                    <Info className="w-3 h-3 text-cyan-400/50" />
                    <span className="text-[10px] text-cyan-400/70">NOAA Space Weather Scales</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <ScaleIndicator label="R" value={noaaScales?.radio ?? 0} description="Radio Blackout" />
                    <ScaleIndicator label="S" value={noaaScales?.solar ?? 0} description="Solar Radiation" />
                    <ScaleIndicator label="G" value={noaaScales?.geomag ?? 0} description="Geomagnetic" />
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </>
      )}
    </div>
  )
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface FilterToggleProps {
  label: string
  icon: React.ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  color: string
  hint?: string
  compact?: boolean
}

function FilterToggle({
  label,
  icon,
  checked,
  onChange,
  color,
  hint,
  compact = false,
}: FilterToggleProps) {
  const colorClasses: Record<string, string> = {
    cyan: "border-cyan-500/50 bg-cyan-500/20 text-cyan-400",
    blue: "border-blue-500/50 bg-blue-500/20 text-blue-400",
    green: "border-green-500/50 bg-green-500/20 text-green-400",
    red: "border-red-500/50 bg-red-500/20 text-red-400",
    yellow: "border-yellow-500/50 bg-yellow-500/20 text-yellow-400",
    orange: "border-orange-500/50 bg-orange-500/20 text-orange-400",
    purple: "border-purple-500/50 bg-purple-500/20 text-purple-400",
    gray: "border-gray-500/50 bg-gray-500/20 text-gray-400",
    teal: "border-teal-500/50 bg-teal-500/20 text-teal-400",
  }

  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        "flex items-center gap-1.5 rounded border transition-all",
        compact ? "px-1.5 py-0.5" : "px-2 py-1.5",
        checked
          ? colorClasses[color] || colorClasses.cyan
          : "border-gray-700 bg-transparent text-gray-500 hover:border-gray-600"
      )}
    >
      <div className={cn(
        "flex items-center justify-center",
        compact ? "w-3 h-3" : "w-4 h-4"
      )}>
        {icon}
      </div>
      <span className={cn(
        "font-medium",
        compact ? "text-[8px]" : "text-[10px]"
      )}>
        {label}
      </span>
      {hint && !compact && (
        <span className="text-[8px] text-gray-500 ml-auto">{hint}</span>
      )}
    </button>
  )
}

interface ScaleIndicatorProps {
  label: string
  value: number
  description: string
}

function ScaleIndicator({ label, value, description }: ScaleIndicatorProps) {
  const getColor = (v: number) => {
    if (v === 0) return "bg-green-500"
    if (v <= 2) return "bg-yellow-500"
    if (v <= 3) return "bg-orange-500"
    return "bg-red-500"
  }

  return (
    <div className="flex flex-col items-center gap-0.5 p-1.5 rounded bg-black/50 border border-cyan-500/20">
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-bold text-cyan-400">{label}</span>
        <span className={cn(
          "w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold text-black",
          getColor(value)
        )}>
          {value}
        </span>
      </div>
      <span className="text-[8px] text-gray-500">{description}</span>
    </div>
  )
}

// =============================================================================
// STREAMING STATUS INDICATOR
// =============================================================================

export function StreamingStatusBar({
  statuses,
  isLive,
  onToggle,
}: {
  statuses: StreamStatus[]
  isLive: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-black/80 border border-cyan-500/30 rounded">
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className={cn(
          "h-5 px-2 text-[10px] font-bold",
          isLive ? "text-green-400 hover:bg-green-500/20" : "text-gray-400 hover:bg-gray-500/20"
        )}
      >
        {isLive ? (
          <>
            <Circle className="w-2 h-2 mr-1 fill-green-400 animate-pulse" />
            LIVE
          </>
        ) : (
          <>
            <Circle className="w-2 h-2 mr-1 fill-gray-500" />
            PAUSED
          </>
        )}
      </Button>
      
      <div className="h-3 w-px bg-cyan-500/30" />
      
      {statuses.map((status) => (
        <div
          key={status.type}
          className={cn(
            "flex items-center gap-1 text-[10px]",
            status.connected ? "text-green-400" : "text-red-400"
          )}
        >
          <Circle className={cn(
            "w-1.5 h-1.5",
            status.connected ? "fill-green-400" : "fill-red-400"
          )} />
          <span className="uppercase font-medium">{status.type.slice(0, 3)}</span>
          {status.latency && (
            <span className="text-[8px] text-gray-500">{status.latency}ms</span>
          )}
        </div>
      ))}
    </div>
  )
}
