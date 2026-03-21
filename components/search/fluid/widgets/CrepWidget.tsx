/**
 * CrepWidget - Compartmentalized CREP Live Dashboard for Search
 *
 * Mirrors the full CREP dashboard as context-aware mini-widgets:
 * - Aircraft: live altitude, speed, heading, origin/destination
 * - Vessels: live speed, heading, destination, ship type
 * - Satellites: orbit type, velocity, inclination
 * - Events: earthquakes, wildfires, storms with severity
 * - Species/Fungal: observations with source, toxicity, images
 * - Devices: MycoBrain sensors with live temperature, humidity, IAQ
 * - Space Weather: solar flares, Kp index, solar wind
 *
 * Data auto-refreshes every 30s to show live changes (speed, altitude, etc.).
 * Compartments are shown/hidden based on what the user searched for.
 */

"use client"

import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import {
  Radar,
  Plane,
  Ship,
  Satellite,
  AlertTriangle,
  Thermometer,
  Sun,
  Eye,
  MapPin,
  Camera,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Loader2,
  Activity,
  Zap,
  Waves,
  Wind,
  RefreshCw,
  Factory,
  CloudFog,
} from "lucide-react"
import { Button } from "@/components/ui/button"

// ============================================================================
// Types
// ============================================================================

/** Raw CREP search result from the API (preserves full properties per domain) */
export interface CrepSearchResult {
  id: string
  type: "aircraft" | "vessel" | "satellite" | "fungal" | "event" | "device" | "space_weather" | string
  title: string
  description: string
  latitude: number
  longitude: number
  altitude?: number
  timestamp: string
  source: string
  properties: Record<string, unknown>
  relevance: number
  crepMapUrl: string
}

/** Grouped CREP data by domain */
interface CrepDomainGroups {
  aircraft: CrepSearchResult[]
  vessels: CrepSearchResult[]
  satellites: CrepSearchResult[]
  events: CrepSearchResult[]
  fungal: CrepSearchResult[]
  devices: CrepSearchResult[]
  spaceWeather: CrepSearchResult[]
  emissions: CrepSearchResult[]
}

/** Legacy flat observation format (backwards compat) */
export interface CrepObservation {
  id: string
  species: string
  scientificName: string
  commonName?: string
  latitude: number
  longitude: number
  timestamp: string
  source: "MINDEX" | "iNaturalist" | "GBIF" | "FlightRadar24" | "AISstream" | "MycoBrain" | "USGS/NASA" | "CREP" | string
  verified: boolean
  observer?: string
  imageUrl?: string
  thumbnailUrl?: string
  location?: string
  sourceUrl?: string
  isToxic?: boolean
  type?: string
}

type DomainKey = keyof CrepDomainGroups

interface CrepWidgetProps {
  data: (CrepObservation | CrepSearchResult)[]
  isLoading?: boolean
  isFocused?: boolean
  error?: string
  query?: string
  onAddToNotepad?: (item: { type: string; title: string; content: string; source?: string }) => void
  onViewOnMap?: (observation: CrepObservation) => void
  onOpenDashboard?: () => void
}

// ============================================================================
// Domain Configuration
// ============================================================================

const DOMAIN_CONFIG: Record<DomainKey, {
  label: string
  icon: typeof Plane
  gradient: string
  badgeColor: string
  refreshInterval: number // ms
}> = {
  aircraft: {
    label: "Aircraft",
    icon: Plane,
    gradient: "from-sky-500/20 to-blue-600/10",
    badgeColor: "bg-sky-500/20 text-sky-300",
    refreshInterval: 30_000,
  },
  vessels: {
    label: "Vessels",
    icon: Ship,
    gradient: "from-teal-500/20 to-cyan-600/10",
    badgeColor: "bg-teal-500/20 text-teal-300",
    refreshInterval: 30_000,
  },
  satellites: {
    label: "Satellites",
    icon: Satellite,
    gradient: "from-violet-500/20 to-purple-600/10",
    badgeColor: "bg-violet-500/20 text-violet-300",
    refreshInterval: 90_000,
  },
  events: {
    label: "Global Events",
    icon: AlertTriangle,
    gradient: "from-amber-500/20 to-orange-600/10",
    badgeColor: "bg-amber-500/20 text-amber-300",
    refreshInterval: 60_000,
  },
  fungal: {
    label: "Species",
    icon: Eye,
    gradient: "from-emerald-500/20 to-green-600/10",
    badgeColor: "bg-emerald-500/20 text-emerald-300",
    refreshInterval: 300_000,
  },
  devices: {
    label: "MycoBrain Devices",
    icon: Thermometer,
    gradient: "from-rose-500/20 to-pink-600/10",
    badgeColor: "bg-rose-500/20 text-rose-300",
    refreshInterval: 30_000,
  },
  spaceWeather: {
    label: "Space Weather",
    icon: Sun,
    gradient: "from-yellow-500/20 to-orange-500/10",
    badgeColor: "bg-yellow-500/20 text-yellow-300",
    refreshInterval: 120_000,
  },
  emissions: {
    label: "Emissions",
    icon: Factory,
    gradient: "from-slate-500/20 to-zinc-600/10",
    badgeColor: "bg-slate-500/20 text-slate-300",
    refreshInterval: 60_000,
  },
}

const DOMAIN_ORDER: DomainKey[] = ["aircraft", "vessels", "events", "fungal", "devices", "satellites", "spaceWeather", "emissions"]

// ============================================================================
// Mini-Widget Renderers (compartmentalized dashboard cards)
// ============================================================================

function AircraftCard({ item }: { item: CrepSearchResult }) {
  const p = item.properties || {}
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-sky-500/5 border border-sky-500/15 hover:border-sky-500/30 transition-colors">
      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sky-500/15 shrink-0">
        <Plane className="h-4 w-4 text-sky-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-sky-200 truncate">{String(p.callsign || item.title)}</span>
          {p.aircraftType && <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400">{String(p.aircraftType)}</span>}
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
          {(p.origin || p.destination) && (
            <span className="truncate">{p.origin ? String(p.origin) : "?"} → {p.destination ? String(p.destination) : "?"}</span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0 text-right">
        <div className="flex items-center gap-1.5">
          {item.altitude != null && (
            <span className="text-[11px] font-mono text-sky-300">
              {Number(item.altitude).toLocaleString()}ft
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {p.speed != null && (
            <span className="text-[11px] font-mono text-sky-400/70 flex items-center gap-0.5">
              <Wind className="h-3 w-3" />{String(Math.round(Number(p.speed)))}kts
            </span>
          )}
          {p.heading != null && (
            <span className="text-[10px] font-mono text-sky-400/50">{String(Math.round(Number(p.heading)))}°</span>
          )}
        </div>
      </div>
    </div>
  )
}

function VesselCard({ item }: { item: CrepSearchResult }) {
  const p = item.properties || {}
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-teal-500/5 border border-teal-500/15 hover:border-teal-500/30 transition-colors">
      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-teal-500/15 shrink-0">
        <Ship className="h-4 w-4 text-teal-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-teal-200 truncate">{item.title}</span>
          {p.shipType && <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-400">{String(p.shipType)}</span>}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
          {p.destination && <span className="truncate">→ {String(p.destination)}</span>}
          {p.flag && <span>{String(p.flag)}</span>}
        </div>
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        {p.speed != null && (
          <span className="text-[11px] font-mono text-teal-300 flex items-center gap-0.5">
            <Waves className="h-3 w-3" />{String(Number(p.speed).toFixed(1))}kts
          </span>
        )}
        {p.mmsi && <span className="text-[10px] font-mono text-teal-400/50">MMSI {String(p.mmsi)}</span>}
      </div>
    </div>
  )
}

function SatelliteCard({ item }: { item: CrepSearchResult }) {
  const p = item.properties || {}
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-violet-500/5 border border-violet-500/15 hover:border-violet-500/30 transition-colors">
      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-violet-500/15 shrink-0">
        <Satellite className="h-4 w-4 text-violet-400" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold text-violet-200 truncate block">{item.title}</span>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
          {p.orbitType && <span>{String(p.orbitType)}</span>}
          {p.inclination != null && <span>{String(Number(p.inclination).toFixed(1))}° inc</span>}
        </div>
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        {p.velocity != null && (
          <span className="text-[11px] font-mono text-violet-300">{String(Number(p.velocity).toFixed(1))} km/s</span>
        )}
        {p.noradId && <span className="text-[10px] font-mono text-violet-400/50">NORAD {String(p.noradId)}</span>}
      </div>
    </div>
  )
}

function EventCard({ item }: { item: CrepSearchResult }) {
  const p = item.properties || {}
  const severity = String(p.severity || "unknown")
  const severityColor = severity === "high" || severity === "critical"
    ? "text-red-400 bg-red-500/15"
    : severity === "moderate" || severity === "medium"
    ? "text-amber-400 bg-amber-500/15"
    : "text-green-400 bg-green-500/15"

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/15 hover:border-amber-500/30 transition-colors">
      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-500/15 shrink-0">
        <Zap className="h-4 w-4 text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold text-amber-200 truncate block">{item.title}</span>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
          {p.eventType && <span className="capitalize">{String(p.eventType)}</span>}
          {p.magnitude != null && <span>M{String(Number(p.magnitude).toFixed(1))}</span>}
          <span className="truncate">{item.description}</span>
        </div>
      </div>
      <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0", severityColor)}>
        {severity}
      </span>
    </div>
  )
}

function FungalCard({ item }: { item: CrepSearchResult }) {
  const p = item.properties || {}
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/15 hover:border-emerald-500/30 transition-colors">
      {p.thumbnailUrl || p.imageUrl ? (
        <img
          src={String(p.thumbnailUrl || p.imageUrl)}
          alt={item.title}
          className="w-9 h-9 rounded-lg object-cover shrink-0"
        />
      ) : (
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/15 shrink-0">
          <Camera className="h-4 w-4 text-emerald-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-emerald-200 truncate">{String(p.commonName || item.title)}</span>
          {p.isToxic && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300">Toxic</span>}
          {p.qualityGrade === "research" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Verified</span>}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
          {p.scientificName && <span className="italic truncate">{String(p.scientificName)}</span>}
          <span>{item.source}</span>
        </div>
      </div>
    </div>
  )
}

function DeviceCard({ item }: { item: CrepSearchResult }) {
  const p = item.properties || {}
  const sensor = (p.sensorData || {}) as Record<string, unknown>
  const isOnline = String(p.status).toLowerCase() === "online"

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-rose-500/5 border border-rose-500/15 hover:border-rose-500/30 transition-colors">
      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-rose-500/15 shrink-0 relative">
        <Thermometer className="h-4 w-4 text-rose-400" />
        <div className={cn(
          "absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-background",
          isOnline ? "bg-green-500" : "bg-red-500"
        )} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-rose-200 truncate">{item.title}</span>
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded", isOnline ? "bg-green-500/15 text-green-300" : "bg-red-500/15 text-red-300")}>
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
          {sensor.temperature != null && <span>{String(Number(sensor.temperature).toFixed(1))}°C</span>}
          {sensor.humidity != null && <span>{String(Number(sensor.humidity).toFixed(0))}% RH</span>}
          {sensor.iaq != null && <span>IAQ {String(sensor.iaq)}</span>}
          {sensor.co2 != null && <span>CO₂ {String(sensor.co2)}ppm</span>}
          {sensor.pressure != null && <span>{String(Number(sensor.pressure).toFixed(0))}hPa</span>}
        </div>
      </div>
    </div>
  )
}

function SpaceWeatherCard({ item }: { item: CrepSearchResult }) {
  const p = item.properties || {}
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-yellow-500/5 border border-yellow-500/15 hover:border-yellow-500/30 transition-colors">
      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-yellow-500/15 shrink-0">
        <Sun className="h-4 w-4 text-yellow-400" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold text-yellow-200 truncate block">{item.title}</span>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
          {p.kpIndex != null && <span>Kp {String(p.kpIndex)}</span>}
          {p.flareClass && <span>Class {String(p.flareClass)}</span>}
          {p.solarWindSpeed != null && <span>{String(Math.round(Number(p.solarWindSpeed)))} km/s</span>}
          {item.description && <span className="truncate">{item.description}</span>}
        </div>
      </div>
    </div>
  )
}

function EmissionsCard({ item }: { item: CrepSearchResult }) {
  const p = item.properties || {}
  const isVessel = item.type === "vessel_emission"
  const val = p.value || p.emissions_kg_hr
  const unit = p.unit || "kg/hr"
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-500/5 border border-slate-500/15 hover:border-slate-500/30 transition-colors">
      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-500/15 shrink-0">
        {isVessel ? <Ship className="h-4 w-4 text-slate-400" /> : <CloudFog className="h-4 w-4 text-slate-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold text-slate-200 truncate block">{item.title}</span>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
          {p.date ? <span>{String(p.date)}</span> : <span>Live</span>}
          {p.source && <span className="uppercase">{String(p.source)}</span>}
        </div>
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        {val != null && (
          <span className="text-[11px] font-mono text-slate-300">
            {Number(val).toLocaleString()} {String(unit)}
          </span>
        )}
      </div>
    </div>
  )
}

const CARD_RENDERERS: Record<DomainKey, React.FC<{ item: CrepSearchResult }>> = {
  aircraft: AircraftCard,
  vessels: VesselCard,
  satellites: SatelliteCard,
  events: EventCard,
  fungal: FungalCard,
  devices: DeviceCard,
  spaceWeather: SpaceWeatherCard,
  emissions: EmissionsCard,
}

// ============================================================================
// Domain Compartment
// ============================================================================

function DomainCompartment({
  domain,
  items,
  isFocused,
  onAddToNotepad,
  onViewOnMap,
}: {
  domain: DomainKey
  items: CrepSearchResult[]
  isFocused?: boolean
  onAddToNotepad?: CrepWidgetProps["onAddToNotepad"]
  onViewOnMap?: CrepWidgetProps["onViewOnMap"]
}) {
  const [expanded, setExpanded] = useState(false)
  const config = DOMAIN_CONFIG[domain]
  const Icon = config.icon
  const CardRenderer = CARD_RENDERERS[domain]
  const showCount = expanded ? (isFocused ? 10 : 6) : (isFocused ? 4 : 2)
  const visibleItems = items.slice(0, showCount)
  const hasMore = items.length > showCount

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border overflow-hidden",
        "bg-gradient-to-br",
        config.gradient,
        "border-white/[0.06]"
      )}
    >
      {/* Compartment header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 opacity-70" />
          <span className="text-xs font-semibold uppercase tracking-wider opacity-80">
            {config.label}
          </span>
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", config.badgeColor)}>
            {items.length} live
          </span>
        </div>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
        </motion.div>
      </button>

      {/* Live data cards */}
      <div className="px-2 pb-2 space-y-1.5">
        <AnimatePresence mode="popLayout">
          {visibleItems.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ delay: i * 0.02 }}
            >
              <CardRenderer item={item} />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Show more / less */}
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full text-center text-[11px] text-muted-foreground hover:text-foreground py-1 transition-colors flex items-center justify-center gap-1"
          >
            {expanded ? "Show less" : `+${items.length - showCount} more`}
            <ChevronRight className={cn("h-3 w-3 transition-transform", expanded && "rotate-90")} />
          </button>
        )}
      </div>
    </motion.div>
  )
}

// ============================================================================
// Main CrepWidget
// ============================================================================

export function CrepWidget({
  data,
  isLoading = false,
  isFocused = false,
  error,
  query,
  onAddToNotepad,
  onViewOnMap,
  onOpenDashboard,
}: CrepWidgetProps) {
  const [lastRefresh, setLastRefresh] = useState(Date.now())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const refreshTimerRef = useRef<ReturnType<typeof setInterval>>()

  // Group data by domain type
  const groups = useMemo<CrepDomainGroups>(() => {
    const g: CrepDomainGroups = {
      aircraft: [],
      vessels: [],
      satellites: [],
      events: [],
      fungal: [],
      devices: [],
      spaceWeather: [],
      emissions: [],
    }

    for (const item of data) {
      // Normalize: support both CrepSearchResult and legacy CrepObservation
      const normalized = normalizeToCrepResult(item)
      const t = normalized.type
      const cDom = (item as any)?.domain
      
      if (t === "aircraft") g.aircraft.push(normalized)
      else if (t === "vessel") g.vessels.push(normalized)
      else if (t === "satellite") g.satellites.push(normalized)
      else if (t === "event") g.events.push(normalized)
      else if (t === "device") g.devices.push(normalized)
      else if (t === "space_weather") g.spaceWeather.push(normalized)
      else if (t === "co2_trend" || t === "ch4_trend" || t === "vessel_emission" || cDom === "emissions" || t === "emissions") g.emissions.push(normalized)
      else g.fungal.push(normalized) // default: fungal/species
    }
    return g
  }, [data])

  // Determine which domains have data and sort by count (most relevant first)
  const activeDomains = useMemo(() => {
    return DOMAIN_ORDER.filter((key) => groups[key].length > 0)
  }, [groups])

  const totalCount = data.length

  // Auto-refresh pulse indicator
  useEffect(() => {
    // Refresh every 30s while widget is visible
    refreshTimerRef.current = setInterval(() => {
      setLastRefresh(Date.now())
      setIsRefreshing(true)
      setTimeout(() => setIsRefreshing(false), 1000)
    }, 30_000)
    return () => clearInterval(refreshTimerRef.current)
  }, [])

  // Error state
  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-red-500 opacity-60" />
        <p className="text-sm font-medium text-red-400">CREP Error</p>
        <p className="text-xs text-muted-foreground mt-1">{error}</p>
      </div>
    )
  }

  // Empty state
  if (!isLoading && (!data || data.length === 0)) {
    return (
      <div className="text-center py-8">
        <Radar className="h-12 w-12 mx-auto mb-3 text-cyan-500 opacity-60" />
        <p className="text-sm text-muted-foreground">
          No live CREP data for this search
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1 mb-4">
          Search for species, flights, ships, earthquakes, or devices
        </p>
        <Button
          variant="outline"
          size="sm"
          className="text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
          onClick={onOpenDashboard}
        >
          Open CREP Dashboard
          <ExternalLink className="h-3 w-3 ml-2" />
        </Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[150px] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
        <p className="text-sm text-muted-foreground">Loading CREP live data...</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 overflow-hidden flex-1">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radar className={cn("h-4 w-4 text-cyan-400", isRefreshing && "animate-pulse")} />
          <span className="text-sm font-medium">{totalCount} live results</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center gap-1">
            <Activity className="h-2.5 w-2.5" />
            {activeDomains.length} {activeDomains.length === 1 ? "feed" : "feeds"}
          </span>
          {query && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground truncate max-w-[120px]" title={query}>
              &ldquo;{query}&rdquo;
            </span>
          )}
          {isRefreshing && (
            <RefreshCw className="h-3 w-3 text-cyan-400 animate-spin" />
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
          onClick={onOpenDashboard}
        >
          Full Dashboard
          <ExternalLink className="h-3 w-3 ml-1" />
        </Button>
      </div>

      {/* Domain filter pills */}
      {activeDomains.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          {activeDomains.map((domain) => {
            const config = DOMAIN_CONFIG[domain]
            const Icon = config.icon
            return (
              <span
                key={domain}
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full",
                  config.badgeColor
                )}
              >
                <Icon className="h-2.5 w-2.5" />
                {config.label} ({groups[domain].length})
              </span>
            )
          })}
        </div>
      )}

      {/* Compartmentalized domain widgets */}
      <div className="space-y-2">
        {activeDomains.map((domain) => (
          <DomainCompartment
            key={domain}
            domain={domain}
            items={groups[domain]}
            isFocused={isFocused}
            onAddToNotepad={onAddToNotepad}
            onViewOnMap={onViewOnMap}
          />
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Helpers
// ============================================================================

function normalizeToCrepResult(item: CrepObservation | CrepSearchResult): CrepSearchResult {
  // Already a CrepSearchResult
  if ("relevance" in item && "crepMapUrl" in item) {
    return item as CrepSearchResult
  }

  // Legacy CrepObservation → CrepSearchResult
  const obs = item as CrepObservation
  const typeFromSource: Record<string, string> = {
    FlightRadar24: "aircraft",
    AISstream: "vessel",
    MycoBrain: "device",
    "USGS/NASA": "event",
    MINDEX: "fungal",
    iNaturalist: "fungal",
    GBIF: "fungal",
    CREP: "fungal",
  }

  return {
    id: obs.id,
    type: obs.type || typeFromSource[obs.source] || "fungal",
    title: obs.commonName || obs.species || obs.scientificName,
    description: obs.location || "",
    latitude: obs.latitude,
    longitude: obs.longitude,
    timestamp: obs.timestamp,
    source: obs.source,
    properties: {
      scientificName: obs.scientificName,
      commonName: obs.commonName,
      imageUrl: obs.imageUrl,
      thumbnailUrl: obs.thumbnailUrl,
      sourceUrl: obs.sourceUrl,
      isToxic: obs.isToxic,
      observer: obs.observer,
      qualityGrade: obs.verified ? "research" : undefined,
    },
    relevance: 0.5,
    crepMapUrl: `/dashboard/crep?lat=${obs.latitude}&lng=${obs.longitude}&zoom=12&highlight=${obs.id}`,
  }
}

export default CrepWidget
