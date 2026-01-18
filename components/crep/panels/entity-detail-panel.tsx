"use client";

/**
 * Entity Detail Panel - Centered Modal for CREP Dashboard
 * 
 * Universal detail panel that displays detailed information for any selected entity
 * (fungal observations, events, devices, aircraft, vessels, satellites).
 * 
 * DESIGN PRINCIPLES:
 * - Always centered on screen
 * - Consistent sizing regardless of entity type
 * - Rich data display with live metrics
 * - Does not move/affect the map
 */

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  Leaf, Clock, MapPin, Camera, User, ExternalLink, Award,
  Database, Globe, TreePine, CheckCircle2, AlertCircle, X,
  Plane, Ship, Satellite, AlertTriangle, Activity, ThermometerSun,
  Wind, Waves, Zap, Flame, Mountain,
} from "lucide-react";
import Link from "next/link";
import { FungalObservation } from "../markers/fungal-marker";

// Types for different entities
// Note: Some code uses lat/lng, others use latitude/longitude - support both
export interface GlobalEvent {
  id: string;
  type: string;
  title: string;
  description?: string;
  severity: "critical" | "high" | "medium" | "low" | "info" | string;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  timestamp?: string;
  source?: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export interface AircraftEntity {
  id: string;
  callsign: string;
  registration?: string;
  airline?: string;
  aircraft_type?: string;
  origin?: string;
  destination?: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  on_ground?: boolean;
  squawk?: string;
  last_updated?: string;
}

export interface VesselEntity {
  id: string;
  name: string;
  mmsi?: string;
  imo?: string;
  callsign?: string;
  ship_type?: string;
  destination?: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  status?: string;
  last_updated?: string;
}

export interface SatelliteEntity {
  id: string;
  name: string;
  norad_id?: string;
  type: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  velocity?: number;
  inclination?: number;
  period?: number;
  launch_date?: string;
  country?: string;
}

interface EntityDetailPanelProps {
  // Close handler
  onClose: () => void;
  
  // Entity types - only one should be set at a time
  fungal?: FungalObservation | null;
  event?: GlobalEvent | null;
  aircraft?: AircraftEntity | null;
  vessel?: VesselEntity | null;
  satellite?: SatelliteEntity | null;
}

// Helper functions
function formatDate(dateStr: string): string {
  if (!dateStr) return "Unknown date";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function getQualityLabel(grade: string): string {
  switch (grade) {
    case "research": return "Research Grade";
    case "needs_id": return "Needs ID";
    case "casual": return "Casual";
    default: return "Unknown";
  }
}

function getSourceInfo(source?: string) {
  switch (source) {
    case "MINDEX": return { icon: <Database className="w-4 h-4" />, color: "text-purple-400", bg: "bg-purple-500/20", label: "MINDEX" };
    case "iNaturalist": return { icon: <Leaf className="w-4 h-4" />, color: "text-green-400", bg: "bg-green-500/20", label: "iNaturalist" };
    case "GBIF": return { icon: <Globe className="w-4 h-4" />, color: "text-blue-400", bg: "bg-blue-500/20", label: "GBIF" };
    default: return { icon: <Database className="w-4 h-4" />, color: "text-gray-400", bg: "bg-gray-500/20", label: "Unknown" };
  }
}

function getEventIcon(type: string) {
  switch (type) {
    case "earthquake": return <Activity className="w-5 h-5 text-red-400" />;
    case "volcano": return <Mountain className="w-5 h-5 text-orange-400" />;
    case "wildfire": return <Flame className="w-5 h-5 text-red-500" />;
    case "storm": return <Wind className="w-5 h-5 text-blue-400" />;
    case "flood": return <Waves className="w-5 h-5 text-cyan-400" />;
    case "lightning": return <Zap className="w-5 h-5 text-yellow-400" />;
    default: return <AlertTriangle className="w-5 h-5 text-amber-400" />;
  }
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case "critical": return "bg-red-500 text-red-50";
    case "high": return "bg-orange-500 text-orange-50";
    case "medium": return "bg-yellow-500 text-yellow-900";
    case "low": return "bg-blue-500 text-blue-50";
    default: return "bg-gray-500 text-gray-50";
  }
}

// Fungal Observation Detail Content - COMPACT VERSION (no scrolling, fits on screen)
function FungalDetail({ observation, onClose }: { observation: FungalObservation; onClose: () => void }) {
  const speciesName = observation.taxon?.preferred_common_name || observation.species || observation.taxon?.name || "Unknown Fungus";
  const scientificName = observation.taxon?.name || observation.species || "Unknown";
  const photoUrl = observation.photos?.[0]?.url;
  const sourceInfo = getSourceInfo(observation.source);
  const isResearchGrade = observation.quality_grade === "research";

  return (
    <div className="bg-[#0a1628] border border-green-500/30 rounded-lg overflow-hidden shadow-2xl">
      {/* Compact Header */}
      <div className="bg-gradient-to-r from-green-600/40 to-emerald-600/20 px-3 py-2 border-b border-green-500/30 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">🍄</span>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-white truncate">{speciesName}</h2>
            <p className="text-xs text-gray-400 italic truncate">{scientificName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isResearchGrade ? (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/50 text-[10px] px-1.5 py-0.5">
              <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
              VERIFIED
            </Badge>
          ) : (
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50 text-[10px] px-1.5 py-0.5">
              <AlertCircle className="w-2.5 h-2.5 mr-0.5" />
              UNVERIFIED
            </Badge>
          )}
          <button
            onClick={onClose}
            className="p-0.5 rounded hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Compact Photo - smaller height */}
      {photoUrl && (
        <div className="relative">
          <img
            src={photoUrl}
            alt={speciesName}
            className="w-full h-28 object-cover"
            loading="lazy"
          />
          {observation.photos && observation.photos.length > 1 && (
            <Badge className="absolute bottom-1 right-1 bg-black/60 text-white backdrop-blur text-[10px] px-1 py-0.5">
              <Camera className="w-2.5 h-2.5 mr-0.5" />
              {observation.photos.length}
            </Badge>
          )}
        </div>
      )}

      {/* Compact Data Grid */}
      <div className="p-2 space-y-1.5">
        {/* Source, Quality, Coords, Date - 2x2 compact grid */}
        <div className="grid grid-cols-4 gap-1.5">
          <div className={cn("rounded p-1.5 border border-gray-700/50", sourceInfo.bg)}>
            <div className="text-[9px] text-gray-500 uppercase">Source</div>
            <div className={cn("text-xs font-semibold flex items-center gap-1", sourceInfo.color)}>
              {sourceInfo.label}
            </div>
          </div>
          <div className={cn("rounded p-1.5 border border-gray-700/50", isResearchGrade ? "bg-green-500/10" : "bg-yellow-500/10")}>
            <div className="text-[9px] text-gray-500 uppercase">Quality</div>
            <div className={cn("text-xs font-semibold", isResearchGrade ? "text-green-400" : "text-yellow-400")}>
              {observation.quality_grade === "research" ? "Research" : observation.quality_grade === "needs_id" ? "Needs ID" : "Casual"}
            </div>
          </div>
          <div className="bg-black/40 rounded p-1.5 border border-gray-700/50">
            <div className="text-[9px] text-gray-500 uppercase">Coords</div>
            <div className="text-[10px] text-cyan-400 font-mono leading-tight">
              {typeof observation.latitude === 'number' ? observation.latitude.toFixed(3) : '—'}°, {typeof observation.longitude === 'number' ? observation.longitude.toFixed(3) : '—'}°
            </div>
          </div>
          <div className="bg-black/40 rounded p-1.5 border border-gray-700/50">
            <div className="text-[9px] text-gray-500 uppercase">Date</div>
            <div className="text-[10px] text-white">
              {new Date(observation.observed_on).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
            </div>
          </div>
        </div>

        {/* Compact Details Row */}
        <div className="bg-black/40 rounded p-1.5 border border-gray-700/50">
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px]">
            {observation.user && (
              <span className="flex items-center gap-0.5">
                <User className="w-2.5 h-2.5 text-gray-500" />
                <span className="text-gray-400">Observer:</span>
                <span className="text-white">{observation.user}</span>
              </span>
            )}
            {observation.location && (
              <span className="flex items-center gap-0.5 max-w-[140px]">
                <MapPin className="w-2.5 h-2.5 text-gray-500 shrink-0" />
                <span className="text-white truncate" title={observation.location}>{observation.location}</span>
              </span>
            )}
            {observation.taxon?.rank && (
              <span className="flex items-center gap-0.5">
                <Leaf className="w-2.5 h-2.5 text-gray-500" />
                <span className="text-white capitalize">{observation.taxon.rank}</span>
              </span>
            )}
          </div>
        </div>

        {/* Compact Action Button */}
        <Link
          href={
            observation.source === "MINDEX"
              ? `/mindex/observations/${observation.id}`
              : observation.source === "GBIF"
                ? `https://www.gbif.org/occurrence/${String(observation.id).replace("gbif-", "")}`
                : `https://www.inaturalist.org/observations/${String(observation.id).replace("inat-", "")}`
          }
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1 w-full py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded text-xs font-medium transition-colors border border-green-500/30"
        >
          View on {observation.source || "iNaturalist"} <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

// Event Detail Content - COMPACT VERSION (no scrolling, fits on screen)
function EventDetail({ event, onClose }: { event: GlobalEvent; onClose: () => void }) {
  return (
    <div className="bg-[#0a1628] border border-amber-500/30 rounded-lg overflow-hidden shadow-2xl">
      {/* Compact Header */}
      <div className={cn(
        "px-3 py-2 border-b border-gray-700/50 flex items-center justify-between",
        event.severity === "critical" ? "bg-gradient-to-r from-red-600/40 to-red-600/20" :
        event.severity === "high" ? "bg-gradient-to-r from-orange-600/40 to-orange-600/20" :
        "bg-gradient-to-r from-amber-600/40 to-amber-600/20"
      )}>
        <div className="flex items-center gap-2 min-w-0">
          {getEventIcon(event.type)}
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-white truncate">{event.title}</h2>
            <p className="text-xs text-gray-400 capitalize">{event.type} Event</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge className={cn(getSeverityColor(event.severity || "medium"), "text-[10px] px-1.5 py-0.5")}>
            {(event.severity || "medium").toUpperCase()}
          </Badge>
          <button
            onClick={onClose}
            className="p-0.5 rounded hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Compact Content */}
      <div className="p-2 space-y-1.5">
        {/* Description - limited to 2 lines */}
        {event.description && (
          <div className="bg-black/40 rounded p-1.5 border border-gray-700/50">
            <p className="text-[10px] text-gray-300 line-clamp-2">{event.description}</p>
          </div>
        )}

        {/* Compact stats row */}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="bg-black/40 rounded p-1.5 border border-gray-700/50">
            <div className="text-[9px] text-gray-500 uppercase">Coords</div>
            <div className="text-[10px] text-cyan-400 font-mono">
              {(event.latitude ?? event.lat ?? 0).toFixed(3)}°, {(event.longitude ?? event.lng ?? 0).toFixed(3)}°
            </div>
          </div>
          {event.timestamp && (
            <div className="bg-black/40 rounded p-1.5 border border-gray-700/50">
              <div className="text-[9px] text-gray-500 uppercase">Detected</div>
              <div className="text-[10px] text-white">
                {new Date(event.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          )}
          {event.source && (
            <div className="bg-black/40 rounded p-1.5 border border-gray-700/50">
              <div className="text-[9px] text-gray-500 uppercase">Source</div>
              <div className="text-[10px] text-blue-400 truncate">{event.source}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Aircraft Detail Content - COMPACT VERSION
function AircraftDetail({ aircraft, onClose }: { aircraft: AircraftEntity; onClose: () => void }) {
  // Extract coordinates from nested location - handle both GeoJSON and direct properties
  const longitude = (aircraft.location as any)?.longitude ?? 
                    aircraft.location?.coordinates?.[0] ?? 
                    (aircraft as any).longitude ?? null;
  const latitude = (aircraft.location as any)?.latitude ?? 
                   aircraft.location?.coordinates?.[1] ?? 
                   (aircraft as any).latitude ?? null;
  // Handle both velocity (standard) and speed (alternative)
  const speed = aircraft.velocity ?? (aircraft as any).speed ?? 0;
  // Handle aircraft type variations
  const aircraftType = aircraft.aircraftType ?? (aircraft as any).aircraft_type ?? "Unknown Aircraft";
  // Handle on_ground variations
  const onGround = aircraft.onGround ?? (aircraft as any).on_ground ?? false;
  
  return (
    <div className="bg-[#0a1628] border border-blue-500/30 rounded-lg overflow-hidden shadow-2xl">
      {/* Compact Header */}
      <div className="bg-gradient-to-r from-blue-600/40 to-sky-600/20 px-3 py-2 border-b border-blue-500/30 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Plane className="w-4 h-4 text-blue-400 shrink-0" />
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-white truncate">{aircraft.callsign || aircraft.flightNumber || 'Unknown'}</h2>
            <p className="text-xs text-gray-400 truncate">{aircraftType}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge className={cn("text-[10px] px-1.5 py-0.5", onGround ? "bg-gray-500" : "bg-blue-500")}>
            {onGround ? "GROUND" : "FLIGHT"}
          </Badge>
          <button onClick={onClose} className="p-0.5 rounded hover:bg-white/10 transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Compact Content */}
      <div className="p-2 space-y-1.5">
        {/* Flight Route */}
        <div className="grid grid-cols-2 gap-1.5">
          <div className="bg-black/40 rounded p-1.5 border border-gray-700/50">
            <div className="text-[9px] text-gray-500 uppercase">Origin</div>
            <div className="text-[10px] text-white truncate">{aircraft.origin || "Unknown"}</div>
          </div>
          <div className="bg-black/40 rounded p-1.5 border border-gray-700/50">
            <div className="text-[9px] text-gray-500 uppercase">Destination</div>
            <div className="text-[10px] text-white truncate">{aircraft.destination || "Unknown"}</div>
          </div>
        </div>

        {/* Flight Stats */}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="bg-black/40 rounded p-1.5 border border-gray-700/50">
            <div className="text-[9px] text-gray-500 uppercase">Alt</div>
            <div className="text-xs font-bold text-cyan-400">{typeof aircraft.altitude === 'number' ? aircraft.altitude.toLocaleString() : "0"} ft</div>
          </div>
          <div className="bg-black/40 rounded p-1.5 border border-gray-700/50">
            <div className="text-[9px] text-gray-500 uppercase">Speed</div>
            <div className="text-xs font-bold text-green-400">{typeof speed === 'number' ? speed : 0} kts</div>
          </div>
          <div className="bg-black/40 rounded p-1.5 border border-gray-700/50">
            <div className="text-[9px] text-gray-500 uppercase">Hdg</div>
            <div className="text-xs font-bold text-yellow-400">{typeof aircraft.heading === 'number' ? aircraft.heading : 0}°</div>
          </div>
        </div>

        {/* Details Row */}
        <div className="bg-black/40 rounded p-1.5 border border-gray-700/50">
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px]">
            {aircraft.airline && (
              <span><span className="text-gray-500">Airline:</span> <span className="text-white">{aircraft.airline}</span></span>
            )}
            {aircraft.registration && (
              <span><span className="text-gray-500">Reg:</span> <span className="text-white font-mono">{aircraft.registration}</span></span>
            )}
            <span className="text-cyan-400 font-mono">{typeof latitude === 'number' ? latitude.toFixed(4) : '—'}°, {typeof longitude === 'number' ? longitude.toFixed(4) : '—'}°</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Vessel Detail Content
function VesselDetail({ vessel, onClose }: { vessel: VesselEntity; onClose: () => void }) {
  // Extract coordinates from nested location - handle both GeoJSON and direct properties
  const longitude = (vessel.location as any)?.longitude ?? 
                    vessel.location?.coordinates?.[0] ?? 
                    (vessel as any).longitude ?? null;
  const latitude = (vessel.location as any)?.latitude ?? 
                   vessel.location?.coordinates?.[1] ?? 
                   (vessel as any).latitude ?? null;
  // Handle speed variations (sog = speed over ground, speed = alternative)
  const speed = vessel.sog ?? (vessel as any).speed ?? 0;
  // Handle ship_type variations
  const shipType = vessel.shipType ?? (vessel as any).ship_type ?? "Unknown Vessel";
  // Course over ground
  const cog = vessel.cog ?? (vessel as any).course ?? 0;
  
  return (
    <div className="bg-[#0a1628] border border-cyan-500/30 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-600/40 to-teal-600/20 px-4 py-3 border-b border-cyan-500/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Ship className="w-6 h-6 text-cyan-400" />
          <div>
            <h2 className="text-lg font-bold text-white">{vessel.name || 'Unknown Vessel'}</h2>
            <p className="text-sm text-gray-400">{typeof shipType === 'number' ? `Type ${shipType}` : shipType}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {vessel.flag && <span className="text-sm">{vessel.flag}</span>}
          <Badge className="bg-cyan-500">{(vessel as any).status || "ACTIVE"}</Badge>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Route Info */}
        {vessel.destination && (
          <div className="bg-black/40 rounded-lg p-3 border border-gray-700/50">
            <div className="text-xs text-gray-500 mb-1">DESTINATION</div>
            <div className="text-sm text-white">{vessel.destination}</div>
            {vessel.eta && (
              <div className="text-xs text-gray-400 mt-1">ETA: {new Date(vessel.eta).toLocaleString()}</div>
            )}
          </div>
        )}

        {/* Speed, Heading & COG */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-black/40 rounded-lg p-3 border border-gray-700/50">
            <div className="text-xs text-gray-500 mb-1">SPEED (SOG)</div>
            <div className="text-lg font-bold text-cyan-400">{typeof speed === 'number' ? speed.toFixed(1) : 0} kts</div>
          </div>
          <div className="bg-black/40 rounded-lg p-3 border border-gray-700/50">
            <div className="text-xs text-gray-500 mb-1">HEADING</div>
            <div className="text-lg font-bold text-yellow-400">{typeof vessel.heading === 'number' ? vessel.heading : 0}°</div>
          </div>
          <div className="bg-black/40 rounded-lg p-3 border border-gray-700/50">
            <div className="text-xs text-gray-500 mb-1">COG</div>
            <div className="text-lg font-bold text-green-400">{typeof cog === 'number' ? cog.toFixed(1) : 0}°</div>
          </div>
        </div>

        {/* Vessel Details */}
        <div className="bg-black/40 rounded-lg p-3 border border-gray-700/50">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {vessel.mmsi && (
              <>
                <span className="text-gray-500">MMSI</span>
                <span className="text-white font-mono">{vessel.mmsi}</span>
              </>
            )}
            {vessel.imo && (
              <>
                <span className="text-gray-500">IMO</span>
                <span className="text-white font-mono">{vessel.imo}</span>
              </>
            )}
            {vessel.callsign && (
              <>
                <span className="text-gray-500">Callsign</span>
                <span className="text-white font-mono">{vessel.callsign}</span>
              </>
            )}
            {vessel.length && vessel.width && (
              <>
                <span className="text-gray-500">Dimensions</span>
                <span className="text-white">{vessel.length}m × {vessel.width}m</span>
              </>
            )}
            {vessel.draught && (
              <>
                <span className="text-gray-500">Draught</span>
                <span className="text-white">{typeof vessel.draught === 'number' ? vessel.draught.toFixed(1) : vessel.draught}m</span>
              </>
            )}
            <span className="text-gray-500">Position</span>
            <span className="text-cyan-400 font-mono">
              {typeof latitude === 'number' ? latitude.toFixed(5) : '—'}°, {typeof longitude === 'number' ? longitude.toFixed(5) : '—'}°
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Satellite Detail Content
function SatelliteDetail({ satellite, onClose }: { satellite: SatelliteEntity; onClose: () => void }) {
  // Extract data from nested objects - connector uses estimatedPosition and orbitalParams
  // estimatedPosition.altitude is in meters, orbitalParams.apogee is in km
  const rawAltitude = satellite.estimatedPosition?.altitude ?? null;
  const altitude = rawAltitude !== null ? rawAltitude / 1000 : (satellite.orbitalParams?.apogee ?? 0);
  const velocity = satellite.orbitalParams?.velocity ?? 0;
  const period = satellite.orbitalParams?.period ?? 0;
  const latitude = satellite.estimatedPosition?.latitude;
  const longitude = satellite.estimatedPosition?.longitude;
  const inclination = satellite.orbitalParams?.inclination;
  const noradId = satellite.noradId ?? satellite.properties?.noradId;
  const launchDate = satellite.launchDate ?? satellite.properties?.launchDate;
  const orbitType = satellite.orbitType ?? satellite.properties?.orbitType;
  const objectType = satellite.objectType ?? satellite.properties?.objectType;
  const apogee = satellite.orbitalParams?.apogee ?? satellite.properties?.apogee;
  const perigee = satellite.orbitalParams?.perigee ?? satellite.properties?.perigee;
  const intlDesignator = satellite.intlDesignator ?? satellite.properties?.intlDesignator;
  
  return (
    <div className="bg-[#0a1628] border border-purple-500/30 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600/40 to-indigo-600/20 px-4 py-3 border-b border-purple-500/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Satellite className="w-6 h-6 text-purple-400" />
          <div>
            <h2 className="text-lg font-bold text-white">{satellite.name}</h2>
            <p className="text-sm text-gray-400">{objectType || satellite.type}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {orbitType && <Badge className="bg-purple-500/50 text-purple-200">{orbitType}</Badge>}
          <Badge className="bg-purple-500">{satellite.isActive !== false ? 'ACTIVE' : 'INACTIVE'}</Badge>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Orbital Info */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-black/40 rounded-lg p-3 border border-gray-700/50">
            <div className="text-xs text-gray-500 mb-1">ALTITUDE</div>
            <div className="text-lg font-bold text-purple-400">
              {typeof altitude === 'number' ? Math.round(altitude) : 0} km
            </div>
          </div>
          <div className="bg-black/40 rounded-lg p-3 border border-gray-700/50">
            <div className="text-xs text-gray-500 mb-1">VELOCITY</div>
            <div className="text-lg font-bold text-cyan-400">
              {typeof velocity === 'number' ? velocity.toFixed(1) : 0} km/s
            </div>
          </div>
          <div className="bg-black/40 rounded-lg p-3 border border-gray-700/50">
            <div className="text-xs text-gray-500 mb-1">PERIOD</div>
            <div className="text-lg font-bold text-green-400">
              {typeof period === 'number' ? period.toFixed(1) : 0} min
            </div>
          </div>
        </div>

        {/* Satellite Details */}
        <div className="bg-black/40 rounded-lg p-3 border border-gray-700/50">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {noradId && (
              <>
                <span className="text-gray-500">NORAD ID</span>
                <span className="text-white font-mono">{noradId}</span>
              </>
            )}
            {intlDesignator && (
              <>
                <span className="text-gray-500">Int'l Designator</span>
                <span className="text-white font-mono">{intlDesignator}</span>
              </>
            )}
            {typeof inclination === 'number' && (
              <>
                <span className="text-gray-500">Inclination</span>
                <span className="text-white">{inclination.toFixed(1)}°</span>
              </>
            )}
            {typeof apogee === 'number' && (
              <>
                <span className="text-gray-500">Apogee</span>
                <span className="text-white">{Math.round(apogee)} km</span>
              </>
            )}
            {typeof perigee === 'number' && (
              <>
                <span className="text-gray-500">Perigee</span>
                <span className="text-white">{Math.round(perigee)} km</span>
              </>
            )}
            {satellite.country && (
              <>
                <span className="text-gray-500">Country</span>
                <span className="text-white">{satellite.country}</span>
              </>
            )}
            {launchDate && (
              <>
                <span className="text-gray-500">Launch Date</span>
                <span className="text-white">{new Date(launchDate).toLocaleDateString()}</span>
              </>
            )}
            <span className="text-gray-500">Ground Track</span>
            <span className="text-cyan-400 font-mono">
              {typeof latitude === 'number' ? latitude.toFixed(2) : '—'}°, {typeof longitude === 'number' ? longitude.toFixed(2) : '—'}°
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EntityDetailPanel({ onClose, fungal, event, aircraft, vessel, satellite }: EntityDetailPanelProps) {
  const isOpen = !!(fungal || event || aircraft || vessel || satellite);

  if (!isOpen) return null;

  const getTitle = () => {
    if (fungal) return "Fungal Observation Details";
    if (event) return "Event Details";
    if (aircraft) return "Aircraft Details";
    if (vessel) return "Vessel Details";
    if (satellite) return "Satellite Details";
    return "Details";
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* Compact dialog - max-w-xs (320px) ensures it fits on screen without scrolling */}
      <DialogContent className="max-w-xs p-0 border-0 bg-transparent shadow-2xl">
        <VisuallyHidden>
          <DialogTitle>{getTitle()}</DialogTitle>
        </VisuallyHidden>
        {fungal && <FungalDetail observation={fungal} onClose={onClose} />}
        {event && <EventDetail event={event} onClose={onClose} />}
        {aircraft && <AircraftDetail aircraft={aircraft} onClose={onClose} />}
        {vessel && <VesselDetail vessel={vessel} onClose={onClose} />}
        {satellite && <SatelliteDetail satellite={satellite} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

export default EntityDetailPanel;
