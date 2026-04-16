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
  TreePine,
  Bug,
  Bird,
  PawPrint,
  Mountain,
  Flame,
  Droplets,
  Radar,
  Cpu,
  Thermometer,
  Droplet,
  Wrench,
  Power,
  Fuel,
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

export interface GroundFilter {
  // Biodiversity & Wildlife
  showFungi: boolean
  showPlants: boolean
  showBirds: boolean
  showMammals: boolean
  showReptiles: boolean
  showInsects: boolean
  showMarineLife: boolean
  // Natural Events
  showEarthquakes: boolean
  showVolcanoes: boolean
  showWildfires: boolean
  showStorms: boolean
  showLightning: boolean
  showTornadoes: boolean
  showFloods: boolean
  // Infrastructure & Pollution
  showFactories: boolean
  showPowerPlants: boolean
  showMining: boolean
  showOilGas: boolean
  showWaterPollution: boolean
  // Military & Defense
  showMilitaryBases: boolean
  // Sensors & Devices
  showMycoBrain: boolean
  showSporeBase: boolean
  showSmartFence: boolean
  showPartnerNetworks: boolean
}

export interface NOAAScales {
  radio: number    // R0-R5
  solar: number    // S0-S5
  geomag: number   // G0-G5
}

/** Earth Observation imagery toggles (NASA GIBS layers) - re-export from earth2 */
import type { EoImageryFilter } from "@/components/crep/earth2"
export type { EoImageryFilter }

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
  groundFilter: GroundFilter
  streamStatuses: StreamStatus[]
  isStreaming: boolean
  noaaScales?: NOAAScales  // Real-time NOAA space weather scales
  onAircraftFilterChange: (filter: Partial<AircraftFilter>) => void
  onVesselFilterChange: (filter: Partial<VesselFilter>) => void
  onSatelliteFilterChange: (filter: Partial<SatelliteFilter>) => void
  onSpaceWeatherFilterChange: (filter: Partial<SpaceWeatherFilter>) => void
  onGroundFilterChange: (filter: Partial<GroundFilter>) => void
  onToggleStreaming: () => void
  onRefresh: () => void
  /** Optional: Earth Observation imagery toggles (NASA GIBS) */
  eoImageryFilter?: EoImageryFilter
  onEoImageryFilterChange?: (filter: Partial<EoImageryFilter>) => void
}

// =============================================================================
// COMPONENT
// =============================================================================

const DEFAULT_EO_FILTER: EoImageryFilter = {
  showModis: false,
  showViirs: false,
  showAirs: false,
  showLandsat: false,
  showEonet: false,
}

export function MapControls({
  aircraftFilter,
  vesselFilter,
  satelliteFilter,
  spaceWeatherFilter,
  groundFilter,
  streamStatuses,
  isStreaming,
  noaaScales,
  onAircraftFilterChange,
  onVesselFilterChange,
  onSatelliteFilterChange,
  onSpaceWeatherFilterChange,
  onGroundFilterChange,
  onToggleStreaming,
  onRefresh,
  eoImageryFilter = DEFAULT_EO_FILTER,
  onEoImageryFilterChange,
}: MapControlsProps) {
  const [activeTab, setActiveTab] = useState("ground")
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
    // EO imagery filters no longer counted here — controlled by MapLayersPopup
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
            <TabsList className="w-full h-8 rounded-none bg-black/50 border-b border-cyan-500/20 grid grid-cols-5 gap-0">
              <TabsTrigger
                value="ground"
                className="h-7 rounded-none text-[10px] data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"
              >
                <TreePine className="w-3 h-3 mr-1" />
                GND
              </TabsTrigger>
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

            <ScrollArea className="h-[340px] max-h-[50vh] overflow-y-auto shrink-0">
              {/* Ground Filters */}
              <TabsContent value="ground" className="m-0 p-2 space-y-2">
                {/* Biodiversity & Wildlife */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-green-400/70 uppercase font-medium">Biodiversity & Wildlife</span>
                  <div className="grid grid-cols-2 gap-2">
                    <FilterToggle
                      label="Fungi"
                      icon={<TreePine className="w-3 h-3" />}
                      checked={groundFilter.showFungi}
                      onChange={(v) => onGroundFilterChange({ showFungi: v })}
                      color="orange"
                      hint="Mushrooms"
                    />
                    <FilterToggle
                      label="Plants"
                      icon={<TreePine className="w-3 h-3" />}
                      checked={groundFilter.showPlants}
                      onChange={(v) => onGroundFilterChange({ showPlants: v })}
                      color="green"
                    />
                    <FilterToggle
                      label="Birds"
                      icon={<Bird className="w-3 h-3" />}
                      checked={groundFilter.showBirds}
                      onChange={(v) => onGroundFilterChange({ showBirds: v })}
                      color="blue"
                    />
                    <FilterToggle
                      label="Mammals"
                      icon={<PawPrint className="w-3 h-3" />}
                      checked={groundFilter.showMammals}
                      onChange={(v) => onGroundFilterChange({ showMammals: v })}
                      color="orange"
                    />
                    <FilterToggle
                      label="Reptiles"
                      icon={<Bug className="w-3 h-3" />}
                      checked={groundFilter.showReptiles}
                      onChange={(v) => onGroundFilterChange({ showReptiles: v })}
                      color="green"
                    />
                    <FilterToggle
                      label="Insects"
                      icon={<Bug className="w-3 h-3" />}
                      checked={groundFilter.showInsects}
                      onChange={(v) => onGroundFilterChange({ showInsects: v })}
                      color="yellow"
                    />
                    <FilterToggle
                      label="Marine Life"
                      icon={<Fish className="w-3 h-3" />}
                      checked={groundFilter.showMarineLife}
                      onChange={(v) => onGroundFilterChange({ showMarineLife: v })}
                      color="cyan"
                    />
                  </div>
                </div>

                {/* Natural Events */}
                <div className="space-y-1.5 pt-2 border-t border-green-500/20">
                  <span className="text-[10px] text-green-400/70 uppercase font-medium">Natural Events</span>
                  <div className="grid grid-cols-2 gap-2">
                    <FilterToggle
                      label="Earthquakes"
                      icon={<Activity className="w-3 h-3" />}
                      checked={groundFilter.showEarthquakes}
                      onChange={(v) => onGroundFilterChange({ showEarthquakes: v })}
                      color="orange"
                    />
                    <FilterToggle
                      label="Volcanoes"
                      icon={<Mountain className="w-3 h-3" />}
                      checked={groundFilter.showVolcanoes}
                      onChange={(v) => onGroundFilterChange({ showVolcanoes: v })}
                      color="red"
                    />
                    <FilterToggle
                      label="Wildfires"
                      icon={<Flame className="w-3 h-3" />}
                      checked={groundFilter.showWildfires}
                      onChange={(v) => onGroundFilterChange({ showWildfires: v })}
                      color="red"
                    />
                    <FilterToggle
                      label="Storms"
                      icon={<Cloud className="w-3 h-3" />}
                      checked={groundFilter.showStorms}
                      onChange={(v) => onGroundFilterChange({ showStorms: v })}
                      color="purple"
                    />
                    <FilterToggle
                      label="Lightning"
                      icon={<Zap className="w-3 h-3" />}
                      checked={groundFilter.showLightning}
                      onChange={(v) => onGroundFilterChange({ showLightning: v })}
                      color="yellow"
                    />
                    <FilterToggle
                      label="Tornadoes"
                      icon={<Wind className="w-3 h-3" />}
                      checked={groundFilter.showTornadoes}
                      onChange={(v) => onGroundFilterChange({ showTornadoes: v })}
                      color="purple"
                    />
                    <FilterToggle
                      label="Floods"
                      icon={<Droplets className="w-3 h-3" />}
                      checked={groundFilter.showFloods}
                      onChange={(v) => onGroundFilterChange({ showFloods: v })}
                      color="blue"
                    />
                  </div>
                </div>

                {/* Infrastructure & Pollution */}
                <div className="space-y-1.5 pt-2 border-t border-green-500/20">
                  <span className="text-[10px] text-green-400/70 uppercase font-medium">Infrastructure & Pollution</span>
                  <div className="grid grid-cols-2 gap-2">
                    <FilterToggle
                      label="Factories"
                      icon={<Factory className="w-3 h-3" />}
                      checked={groundFilter.showFactories}
                      onChange={(v) => onGroundFilterChange({ showFactories: v })}
                      color="orange"
                    />
                    <FilterToggle
                      label="Power Plants"
                      icon={<Power className="w-3 h-3" />}
                      checked={groundFilter.showPowerPlants}
                      onChange={(v) => onGroundFilterChange({ showPowerPlants: v })}
                      color="yellow"
                    />
                    <FilterToggle
                      label="Mining"
                      icon={<Wrench className="w-3 h-3" />}
                      checked={groundFilter.showMining}
                      onChange={(v) => onGroundFilterChange({ showMining: v })}
                      color="gray"
                    />
                    <FilterToggle
                      label="Oil & Gas"
                      icon={<Fuel className="w-3 h-3" />}
                      checked={groundFilter.showOilGas}
                      onChange={(v) => onGroundFilterChange({ showOilGas: v })}
                      color="red"
                    />
                    <FilterToggle
                      label="Water"
                      icon={<Droplet className="w-3 h-3" />}
                      checked={groundFilter.showWaterPollution}
                      onChange={(v) => onGroundFilterChange({ showWaterPollution: v })}
                      color="blue"
                    />
                  </div>
                </div>

                {/* EO Imagery (NASA GIBS) — removed from right panel data filters.
                   Now controlled exclusively by the on-map MapLayersPopup widget. */}

                {/* Sensor Networks */}
                <div className="space-y-1.5 pt-2 border-t border-green-500/20">
                  <span className="text-[10px] text-green-400/70 uppercase font-medium">Sensor Networks</span>
                  <div className="grid grid-cols-2 gap-2">
                    <FilterToggle
                      label="MycoBrain"
                      icon={<Radar className="w-3 h-3" />}
                      checked={groundFilter.showMycoBrain}
                      onChange={(v) => onGroundFilterChange({ showMycoBrain: v })}
                      color="green"
                    />
                    <FilterToggle
                      label="SporeBase"
                      icon={<Cpu className="w-3 h-3" />}
                      checked={groundFilter.showSporeBase}
                      onChange={(v) => onGroundFilterChange({ showSporeBase: v })}
                      color="green"
                    />
                    <FilterToggle
                      label="Smart Fence"
                      icon={<Shield className="w-3 h-3" />}
                      checked={groundFilter.showSmartFence}
                      onChange={(v) => onGroundFilterChange({ showSmartFence: v })}
                      color="cyan"
                    />
                    <FilterToggle
                      label="Partners"
                      icon={<Wifi className="w-3 h-3" />}
                      checked={groundFilter.showPartnerNetworks}
                      onChange={(v) => onGroundFilterChange({ showPartnerNetworks: v })}
                      color="teal"
                    />
                  </div>
                </div>
              </TabsContent>

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
                  <FilterToggle
                    label="Active / Other"
                    icon={<Activity className="w-3 h-3" />}
                    checked={satelliteFilter.showActive}
                    onChange={(v) => onSatelliteFilterChange({ showActive: v })}
                    color="gray"
                    hint="Earth observation, imaging, uncategorized"
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
    amber: "border-amber-500/50 bg-amber-500/20 text-amber-400",
    purple: "border-purple-500/50 bg-purple-500/20 text-purple-400",
    gray: "border-gray-500/50 bg-gray-500/20 text-gray-400",
    teal: "border-teal-500/50 bg-teal-500/20 text-teal-400",
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cn(
        "flex items-center gap-1.5 rounded border transition-colors min-h-[28px] min-w-[72px] shrink-0 overflow-hidden [contain:layout]",
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
        "font-medium min-w-0 truncate",
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
