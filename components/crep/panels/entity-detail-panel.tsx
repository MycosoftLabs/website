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
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  Leaf, Clock, MapPin, Camera, User, ExternalLink, Award,
  Database, Globe, TreePine, CheckCircle2, AlertCircle, X,
  Plane, Ship, Satellite, AlertTriangle, Activity, ThermometerSun,
  Wind, Waves, Zap, Flame, Mountain, Target,
} from "lucide-react";
import Link from "next/link";
import { FungalObservation } from "../markers/fungal-marker";
import { fetchSatelliteMeta, fetchAircraftMeta, fetchVesselMeta, type SatelliteMeta } from "@/lib/crep/satellite-meta";

// Kingdom-based emoji for all-life observation display
function getObservationEmoji(obs: FungalObservation): string {
  const key = obs.iconicTaxon || obs.kingdom || "Fungi";
  const map: Record<string, string> = {
    Fungi: "🍄", Plantae: "🌿", Aves: "🐦", Mammalia: "🦊", Reptilia: "🦎",
    Amphibia: "🐸", Actinopterygii: "🐟", Mollusca: "🐚", Arachnida: "🕷️",
    Insecta: "🦋", Animalia: "🦌",
  };
  return map[key] ?? "🌿";
}

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
  aircraftType?: string;
  flightNumber?: string;
  origin?: string;
  destination?: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  speed?: number;
  velocity?: number;
  heading?: number;
  on_ground?: boolean;
  onGround?: boolean;
  squawk?: string;
  last_updated?: string;
  location?: { longitude?: number; latitude?: number; coordinates?: [number, number] };
  properties?: Record<string, unknown>;
}

export interface VesselEntity {
  id: string;
  name: string;
  mmsi?: string;
  imo?: string;
  callsign?: string;
  ship_type?: string;
  shipType?: string;
  destination?: string;
  eta?: string;
  flag?: string;
  latitude: number;
  longitude: number;
  speed?: number;
  sog?: number;
  heading?: number;
  cog?: number;
  course?: number;
  status?: string;
  last_updated?: string;
  location?: { longitude?: number; latitude?: number; coordinates?: [number, number] };
  properties?: Record<string, unknown>;
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
  const speciesName = observation.taxon?.preferred_common_name || observation.species || observation.taxon?.name || "Unknown Species";
  const scientificName = observation.taxon?.name || observation.species || "Unknown";
  const photoUrl = observation.photos?.[0]?.url;
  const sourceInfo = getSourceInfo(observation.source);
  const isResearchGrade = observation.quality_grade === "research";

  return (
    <div className="bg-[#0a1628] border border-green-500/30 rounded-lg overflow-hidden shadow-2xl">
      {/* Compact Header */}
      <div className="bg-gradient-to-r from-green-600/40 to-emerald-600/20 px-3 py-2 border-b border-green-500/30 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">{getObservationEmoji(observation)}</span>
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
          <Image
            src={photoUrl}
            alt={speciesName}
            className="w-full h-28 object-cover"
            width={560}
            height={224}
            sizes="(max-width: 768px) 100vw, 560px"
            unoptimized
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
  const longitude = aircraft.location?.longitude ??
                    aircraft.location?.coordinates?.[0] ??
                    aircraft.longitude ?? null;
  const latitude = aircraft.location?.latitude ??
                   aircraft.location?.coordinates?.[1] ??
                   aircraft.latitude ?? null;
  // Handle both velocity (standard) and speed; FR24/OpenSky may use properties
  const speed = aircraft.velocity ?? aircraft.speed ?? (aircraft.properties?.velocity as number) ?? (aircraft.properties?.groundSpeed as number) ?? 0;
  // Heading from top-level or properties
  const heading = typeof aircraft.heading === "number" ? aircraft.heading : (aircraft.properties?.heading as number) ?? 0;
  // Handle aircraft type variations
  const aircraftType = aircraft.aircraftType ?? aircraft.aircraft_type ?? "Unknown Aircraft";
  // Handle on_ground variations
  const onGround = aircraft.onGround ?? aircraft.on_ground ?? false;

  // Apr 20, 2026 (Morgan: "all vessles planes and satelites need images in
  // widget of that object if available"). Wikipedia lookup by ICAO type
  // code; falls back to raw string if the code isn't in our lookup table.
  const [meta, setMeta] = useState<SatelliteMeta | null>(null);
  useEffect(() => {
    let cancelled = false;
    const typeCode = String(aircraftType).split(/[\s(/]/)[0]; // "B738" out of "B738 (737-800)"
    if (typeCode && typeCode !== "Unknown") {
      fetchAircraftMeta(typeCode).then((m) => { if (!cancelled) setMeta(m); });
    }
    return () => { cancelled = true; };
  }, [aircraftType]);

  // Apr 20, 2026 (Morgan: "all plane data on crep needs this stuff live
  // on widget and map of history" + https://www.airnavradar.com/data/
  // flights/SHWK425). Fetch full trail + profile from FR24 clickhandler /
  // OpenSky tracks, then render altitude + speed sparklines alongside
  // the position trail on the map.
  const [history, setHistory] = useState<any | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  useEffect(() => {
    if (!aircraft?.id) return;
    let cancelled = false;
    setHistoryLoading(true);
    const idForLookup = aircraft.callsign || aircraft.flightNumber || aircraft.id;
    fetch(`/api/oei/flight-history/${encodeURIComponent(String(idForLookup))}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((h) => { if (!cancelled) { setHistory(h); setHistoryLoading(false); } })
      .catch(() => { if (!cancelled) setHistoryLoading(false); });
    return () => { cancelled = true; };
  }, [aircraft?.id, aircraft?.callsign, aircraft?.flightNumber]);

  // Emit a CustomEvent so the map can render a trail for this aircraft.
  // The dashboard listens and paints a line+points layer on `crep-flight-
  // history` source for the currently-selected plane.
  useEffect(() => {
    try {
      if (history?.trail?.length) {
        window.dispatchEvent(new CustomEvent("crep:flight-history:trail", {
          detail: {
            id: aircraft.id,
            callsign: history.callsign,
            trail: history.trail,
          },
        }));
      }
    } catch { /* ignore */ }
    return () => {
      try { window.dispatchEvent(new CustomEvent("crep:flight-history:clear")); } catch { /* ignore */ }
    };
  }, [history?.trail, aircraft?.id]);

  // Render a tiny inline sparkline SVG (no recharts). cap points at 200
  // so very long-haul flights don't overdraw.
  const Sparkline = ({ values, color, label, unit }: { values: number[]; color: string; label: string; unit: string }) => {
    if (!values.length) return null
    const w = 160, h = 28
    const max = Math.max(...values)
    const min = Math.min(...values)
    const range = max - min || 1
    const step = w / Math.max(1, values.length - 1)
    const d = values.map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`).join(" ")
    const last = values[values.length - 1]
    return (
      <div className="bg-black/40 rounded p-1.5 border border-gray-700/50">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[9px] text-gray-500 uppercase">{label}</span>
          <span className="text-[10px] font-mono" style={{ color }}>
            {Math.round(last)} {unit}
          </span>
        </div>
        <svg width={w} height={h} className="block">
          <path d={d} stroke={color} strokeWidth={1.2} fill="none" />
          <circle cx={(values.length - 1) * step} cy={h - ((last - min) / range) * h} r={1.8} fill={color} />
        </svg>
        <div className="flex justify-between text-[8px] text-gray-500 mt-0.5">
          <span>min {Math.round(min)}</span>
          <span>max {Math.round(max)}</span>
        </div>
      </div>
    )
  }
  
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
          <button onClick={onClose} className="p-0.5 rounded hover:bg-white/10 transition-colors" aria-label="Close">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Aircraft type photo from Wikimedia Commons */}
      {meta?.imageUrl ? (
        <div className="relative bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={meta.imageUrl} alt={meta.family || aircraftType} className="w-full h-24 object-cover" loading="lazy" />
          {meta.family ? (
            <div className="absolute bottom-1 left-2 text-[10px] text-white/90 bg-black/50 px-1.5 py-0.5 rounded">
              {meta.family}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Compact Content */}
      <div className="p-2 space-y-1.5">
        {/* Flight Route — prefer rich history data when available */}
        <div className="grid grid-cols-2 gap-1.5">
          <div className="bg-black/40 rounded p-1.5 border border-gray-700/50">
            <div className="text-[9px] text-gray-500 uppercase">Origin</div>
            <div className="text-[10px] text-white truncate">
              {history?.origin?.iata ? `${history.origin.iata} · ${history.origin.city || history.origin.country || ""}` : (aircraft.origin || "Unknown")}
            </div>
          </div>
          <div className="bg-black/40 rounded p-1.5 border border-gray-700/50">
            <div className="text-[9px] text-gray-500 uppercase">Destination</div>
            <div className="text-[10px] text-white truncate">
              {history?.destination?.iata ? `${history.destination.iata} · ${history.destination.city || history.destination.country || ""}` : (aircraft.destination || "Unknown")}
            </div>
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
            <div className="text-xs font-bold text-yellow-400">{typeof heading === 'number' ? heading : 0}°</div>
          </div>
        </div>

        {/* Details Row */}
        <div className="bg-black/40 rounded p-1.5 border border-gray-700/50">
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px]">
            {(history?.airline || aircraft.airline) && (
              <span><span className="text-gray-500">Airline:</span> <span className="text-white">{history?.airline || aircraft.airline}</span></span>
            )}
            {(history?.registration || aircraft.registration) && (
              <span><span className="text-gray-500">Reg:</span> <span className="text-white font-mono">{history?.registration || aircraft.registration}</span></span>
            )}
            {history?.icao24 && (
              <span><span className="text-gray-500">ICAO24:</span> <span className="text-white font-mono uppercase">{history.icao24}</span></span>
            )}
            <span className="text-cyan-400 font-mono">{typeof latitude === 'number' ? latitude.toFixed(4) : '—'}°, {typeof longitude === 'number' ? longitude.toFixed(4) : '—'}°</span>
          </div>
        </div>

        {/* Flight history profile — altitude + speed sparklines (Apr 20, 2026) */}
        {history?.trail?.length >= 3 ? (
          <div className="grid grid-cols-2 gap-1.5">
            <Sparkline
              label="Altitude profile"
              values={history.trail.map((p: any) => p.alt_ft).filter((v: number | null) => v != null)}
              color="#22d3ee"
              unit="ft"
            />
            <Sparkline
              label="Speed profile"
              values={history.trail.map((p: any) => p.speed_kts).filter((v: number | null) => v != null)}
              color="#4ade80"
              unit="kts"
            />
          </div>
        ) : historyLoading ? (
          <div className="text-[10px] text-gray-500 italic text-center py-1">Loading flight history…</div>
        ) : null}

        {/* Flight stats summary (distance / duration / min-max) */}
        {history?.stats?.distance_nm != null && history.stats.distance_nm > 0 ? (
          <div className="bg-black/40 rounded p-1.5 border border-gray-700/50 text-[9px] text-gray-300 flex flex-wrap gap-x-3 gap-y-0.5">
            <span><span className="text-gray-500">Dist:</span> <span className="text-white font-mono">{history.stats.distance_nm} nm</span></span>
            {history.stats.duration_sec ? (
              <span><span className="text-gray-500">Dur:</span> <span className="text-white font-mono">{Math.floor(history.stats.duration_sec / 3600)}h {Math.floor((history.stats.duration_sec % 3600) / 60)}m</span></span>
            ) : null}
            {history.stats.max_alt != null ? (
              <span><span className="text-gray-500">Max FL:</span> <span className="text-white font-mono">FL{Math.round(history.stats.max_alt / 100)}</span></span>
            ) : null}
            <span className="text-gray-500">Trail:</span> <span className="text-white font-mono">{history.trail.length} pts</span>
            <span className="text-gray-500">Src:</span> <span className="text-amber-400 font-mono">{history.source}</span>
          </div>
        ) : null}

        {/* External tracker links — click through to full page */}
        {history ? (
          <div className="flex gap-1 text-[9px]">
            <a href={history.external_links.airnavradar} target="_blank" rel="noopener noreferrer" className="flex-1 bg-cyan-900/40 hover:bg-cyan-700/60 text-cyan-200 hover:text-white px-1.5 py-1 rounded text-center border border-cyan-500/30 transition-colors" title="Open on AirNavRadar">
              AirNavRadar ↗
            </a>
            <a href={history.external_links.flightradar24} target="_blank" rel="noopener noreferrer" className="flex-1 bg-amber-900/40 hover:bg-amber-700/60 text-amber-200 hover:text-white px-1.5 py-1 rounded text-center border border-amber-500/30 transition-colors" title="Open on FlightRadar24">
              FR24 ↗
            </a>
            <a href={history.external_links.flightaware} target="_blank" rel="noopener noreferrer" className="flex-1 bg-sky-900/40 hover:bg-sky-700/60 text-sky-200 hover:text-white px-1.5 py-1 rounded text-center border border-sky-500/30 transition-colors" title="Open on FlightAware">
              FlightAware ↗
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// Vessel Detail Content
function VesselDetail({ vessel, onClose }: { vessel: VesselEntity; onClose: () => void }) {
  // Extract coordinates from nested location - handle both GeoJSON and direct properties
  const longitude = vessel.location?.longitude ??
                    vessel.location?.coordinates?.[0] ??
                    vessel.longitude ?? null;
  const latitude = vessel.location?.latitude ??
                   vessel.location?.coordinates?.[1] ??
                   vessel.latitude ?? null;
  // Handle speed variations (sog = speed over ground; AIS often in properties)
  const speed = vessel.sog ?? vessel.speed ?? (vessel.properties?.sog as number) ?? 0;
  // Handle ship_type variations
  const shipType = vessel.shipType ?? vessel.ship_type ?? "Unknown Vessel";
  const shipTypeNum = typeof shipType === "number" ? shipType : (typeof (vessel as any).ship_type === "number" ? (vessel as any).ship_type : null);
  // Course over ground (AIS: cog often in properties)
  const cog = vessel.cog ?? vessel.course ?? (vessel.properties?.cog as number) ?? 0;
  const heading = vessel.heading ?? (vessel.properties?.heading as number) ?? cog;

  // Apr 20, 2026 (Morgan: "all vessles planes and satelites need images in
  // widget"). Wikipedia lookup by vessel name + AIS ship_type code.
  const [meta, setMeta] = useState<SatelliteMeta | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchVesselMeta(vessel.name || null, shipTypeNum).then((m) => { if (!cancelled) setMeta(m); });
    return () => { cancelled = true; };
  }, [vessel.name, shipTypeNum]);

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
          <Badge className="bg-cyan-500">{vessel.status || "ACTIVE"}</Badge>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10 transition-colors" aria-label="Close">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Vessel-class photo from Wikimedia Commons (e.g. Arleigh Burke-class
          for a DDG, Maersk container ship, generic "Cargo ship" for AIS 7x) */}
      {meta?.imageUrl ? (
        <div className="relative bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={meta.imageUrl} alt={meta.family || vessel.name || "Vessel"} className="w-full h-32 object-cover" loading="lazy" />
          {meta.family ? (
            <div className="absolute bottom-1 left-2 text-[11px] text-white/90 bg-black/50 px-2 py-0.5 rounded">
              {meta.family}
            </div>
          ) : null}
        </div>
      ) : null}

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
            <div className="text-lg font-bold text-yellow-400">{typeof heading === 'number' ? heading : 0}°</div>
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
            {(vessel as any).length && (vessel as any).width && (
              <>
                <span className="text-gray-500">Dimensions</span>
                <span className="text-white">{(vessel as any).length}m × {(vessel as any).width}m</span>
              </>
            )}
            {(vessel as any).draught && (
              <>
                <span className="text-gray-500">Draught</span>
                <span className="text-white">{typeof (vessel as any).draught === 'number' ? (vessel as any).draught.toFixed(1) : (vessel as any).draught}m</span>
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
  const sat = satellite as SatelliteEntity & {
    estimatedPosition?: { latitude?: number; longitude?: number; altitude?: number };
    orbitalParams?: { apogee?: number; perigee?: number; velocity?: number; period?: number; inclination?: number };
    properties?: Record<string, unknown>;
    location?: { latitude?: number; longitude?: number };
  };
  // Extract data from nested objects - connector uses estimatedPosition and orbitalParams
  const rawAltitude = sat.estimatedPosition?.altitude ?? null;
  const altitude = rawAltitude !== null ? rawAltitude / 1000 : (sat.orbitalParams?.apogee ?? 0);
  const velocity = sat.orbitalParams?.velocity ?? sat.properties?.velocity ?? 0;
  const period = sat.orbitalParams?.period ?? sat.properties?.period ?? 0;
  const latitude = sat.estimatedPosition?.latitude ?? sat.location?.latitude ?? (satellite as { latitude?: number }).latitude;
  const longitude = sat.estimatedPosition?.longitude ?? sat.location?.longitude ?? (satellite as { longitude?: number }).longitude;
  const inclination = sat.orbitalParams?.inclination;
  const noradId = satellite.norad_id ?? (sat.properties?.noradId as string | undefined);
  const launchDate = satellite.launch_date ?? (sat.properties?.launchDate as string | undefined);
  const orbitType = (satellite as { orbitType?: string }).orbitType ?? (sat.properties?.orbitType as string | undefined);
  const objectType = (satellite as { objectType?: string }).objectType ?? (sat.properties?.objectType as string | undefined);
  const apogee = sat.orbitalParams?.apogee ?? (sat.properties?.apogee as number | undefined);
  const perigee = sat.orbitalParams?.perigee ?? (sat.properties?.perigee as number | undefined);
  const intlDesignator = (satellite as { intlDesignator?: string }).intlDesignator ?? (sat.properties?.intlDesignator as string | undefined);

  // Apr 19, 2026 (Morgan: "look at how a satelite picture and live data is
  // on the satelite widget this is minimum needed in crep" + "button called
  // space piggyback that zooms in follows and changes close up angle").
  // Wikimedia lookup: fetchSatelliteMeta() strips "STARLINK-5742" → Starlink,
  // "NOAA 21" → NOAA-21, etc., and hits en.wikipedia.org/api/rest_v1 for a
  // page summary (thumbnail + extract). 30 min in-memory cache.
  const [meta, setMeta] = useState<SatelliteMeta | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (satellite?.name) {
      fetchSatelliteMeta(satellite.name).then((m) => {
        if (!cancelled) setMeta(m);
      });
    }
    return () => { cancelled = true; };
  }, [satellite?.name]);

  // Piggyback: dispatch a global event the parent dashboard picks up to
  // flyTo the satellite + follow its position every SGP4 tick.
  const triggerPiggyback = () => {
    try {
      window.dispatchEvent(new CustomEvent("crep:satellite:piggyback", {
        detail: {
          id: satellite.id || noradId || satellite.name,
          noradId,
          name: satellite.name,
          lat: latitude,
          lng: longitude,
          altitude: typeof altitude === "number" ? altitude : null,
        },
      }));
    } catch { /* ignore */ }
  };

  return (
    <div className="bg-[#0a1628] border border-purple-500/30 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600/40 to-indigo-600/20 px-4 py-3 border-b border-purple-500/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Satellite className="w-6 h-6 text-purple-400" />
          <div>
            <h2 className="text-lg font-bold text-white">{satellite.name}</h2>
            <p className="text-sm text-gray-400">
              {meta?.family ? `${meta.family}` : (objectType as string) || satellite.type}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {orbitType && <Badge className="bg-purple-500/50 text-purple-200">{orbitType as string}</Badge>}
          <Badge className="bg-purple-500">{(satellite as any).isActive !== false ? 'ACTIVE' : 'INACTIVE'}</Badge>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10 transition-colors" aria-label="Close">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Satellite image (Wikimedia Commons) — OpenGridView parity */}
      {meta?.imageUrl ? (
        <div className="relative bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={meta.imageUrl}
            alt={satellite.name || "Satellite"}
            className="w-full h-40 object-cover"
            loading="lazy"
          />
          {meta.imageAttribution ? (
            <div className="absolute bottom-1 right-2 text-[10px] text-white/70 bg-black/40 px-2 py-0.5 rounded">
              {meta.imageAttribution}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Mission / Purpose block from Wikipedia */}
        {(meta?.mission || meta?.purpose) ? (
          <div className="bg-black/40 rounded-lg p-3 border border-gray-700/50 space-y-2">
            {meta.mission ? (
              <div className="text-sm">
                <span className="text-purple-400 font-semibold">Mission </span>
                <span className="text-gray-200">{meta.mission}</span>
              </div>
            ) : null}
            {meta.purpose ? (
              <div className="text-sm">
                <span className="text-purple-400 font-semibold">Purpose </span>
                <span className="text-gray-300">{meta.purpose}</span>
              </div>
            ) : null}
            {meta.wikipediaUrl ? (
              <a
                href={meta.wikipediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-purple-300 hover:text-purple-200"
              >
                Read more on Wikipedia <ExternalLink className="w-3 h-3" />
              </a>
            ) : null}
          </div>
        ) : null}

        {/* Source / constellation tags */}
        <div className="flex flex-wrap gap-2">
          {meta?.family ? (
            <Badge className="bg-rose-500/60 text-white text-[10px] tracking-wider uppercase">
              {meta.family}
            </Badge>
          ) : null}
          {(() => {
            const src = (satellite as any).source;
            if (!src) return null;
            const tags: string[] = String(src).split("+").map((s: string) => s.trim()).filter(Boolean);
            return Array.from(new Set(tags)).map((t) => (
              <Badge key={t} className="bg-rose-500/40 text-rose-100 text-[10px] tracking-wider uppercase">
                {t.replace(/-/g, " ")}
              </Badge>
            ));
          })()}
        </div>

        {/* Piggyback button — fly to + follow */}
        <button
          onClick={triggerPiggyback}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded border border-purple-500/50 bg-purple-500/10 hover:bg-purple-500/20 text-purple-200 text-sm font-medium transition-colors"
        >
          <Target className="w-4 h-4" />
          Space piggyback — zoom in + follow orbit
        </button>

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
                <span className="text-white font-mono">{intlDesignator as string}</span>
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
    if (fungal) return "Observation Details";
    if (event) return "Event Details";
    if (aircraft) return "Aircraft Details";
    if (vessel) return "Vessel Details";
    if (satellite) return "Satellite Details";
    return "Details";
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* Compact dialog - max-w-xs (320px) ensures it fits on screen without scrolling */}
      <DialogContent
        showCloseButton={false}
        className="max-w-xs p-0 border-0 bg-transparent shadow-2xl"
      >
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
