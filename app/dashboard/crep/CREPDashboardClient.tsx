"use client";

/**
 * CREP - Common Relevant Environmental Picture
 * 
 * Intelligence-grade operational environmental awareness dashboard.
 * Built on mapcn/MapLibre GL with comprehensive data overlays and tactical UI.
 * 
 * Features:
 * - MapLibre GL powered world map with dark tactical styling
 * - Floating left Intel Feed with real-time event data
 * - Right Control Panel with layers, mission context, and integrations
 * - Real-time global event markers with clustering
 * - Device location tracking with status indicators
 * - MYCA agent integration for mission planning
 * - NatureOS/MINDEX data integration
 * 
 * Route: /dashboard/crep
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Map as MapComponent, MapControls, MapMarker, MarkerContent, MarkerPopup } from "@/components/ui/map";
import Link from "next/link";
import { 
  ArrowLeft, 
  ArrowDown,
  Maximize2, 
  Minimize2, 
  Shield, 
  Globe, 
  Activity, 
  Radio, 
  Zap,
  Sun,
  ChevronDown,
  ChevronUp,
  Layers,
  Eye,
  EyeOff,
  AlertTriangle,
  Radar,
  Satellite,
  Cloud,
  Thermometer,
  Wind,
  Droplets,
  Flame,
  Mountain,
  TreePine,
  Fish,
  Bug,
  CircleDot,
  MapPin,
  Filter,
  Settings,
  Download,
  Search,
  Crosshair,
  Grid3X3,
  Map as MapIcon,
  X,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Bell,
  Clock,
  ExternalLink,
  Target,
  Cpu,
  Database,
  Wifi,
  Bot,
  Brain,
  Compass,
  Play,
  Pause,
  RotateCcw,
  Users,
  Microscope,
  Leaf,
  Heart,
  Bird,
  PawPrint,
  Waves,
  Sparkles,
  TrendingUp,
  Hash,
  Navigation,
  PanelRightClose,
  PanelRightOpen,
  FileText,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  Info,
  HelpCircle,
  MoreHorizontal,
  Anchor,
  Plane,
  Car,
  Ship,
  Factory,
  Siren,
  Container,
  Gauge,
  Shield as ShieldIcon,
  Crosshair as CrosshairIcon,
  Bomb,
  Truck as TruckIcon,
  Bike,
  Train,
  Rocket,
  Skull,
  Radiation,
  Baby,
  Fuel,
  CircleAlert,
  Timer,
  Signal,
  Building2,
  Warehouse,
  Landmark,
  Wrench,
  Cable,
  Power,
  Droplet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// OEI Real-time Data Widgets
import { SpaceWeatherWidget } from "@/components/crep/space-weather-widget";
import { FlightTrackerWidget } from "@/components/crep/flight-tracker-widget";
import { VesselTrackerWidget } from "@/components/crep/vessel-tracker-widget";
import { SatelliteTrackerWidget } from "@/components/crep/satellite-tracker-widget";

// Conservation Demo Widgets (Feb 05, 2026)
import { SmartFenceWidget, type FenceSegment } from "@/components/crep/smart-fence-widget";
import { PresenceDetectionWidget, type PresenceReading } from "@/components/crep/presence-detection-widget";
import { BiosignalWidget } from "@/components/crep/biosignal-widget";

// Map Markers for OEI Data
import { type FungalObservation } from "@/components/crep/markers";

// Elephant Conservation Marker (Feb 05, 2026)
import { ElephantMarker, type ElephantData } from "@/components/crep/markers/elephant-marker";

// Centered Detail Panel for entity popups
import { EntityDetailPanel } from "@/components/crep/panels/entity-detail-panel";

// Trajectory Lines for flight paths and ship routes
import { TrajectoryLines } from "@/components/crep/trajectory-lines";

// Satellite Orbit Lines for ground track visualization
import { SatelliteOrbitLines } from "@/components/crep/satellite-orbit-lines";

// NVIDIA Earth-2 AI Weather Components
import { 
  Earth2LayerControl,
  WeatherHeatmapLayer,
  SporeDispersalLayer,
  WindVectorLayer,
  CloudLayer,
  PrecipitationLayer,
  PressureLayer,
  StormCellsLayer,
  HumidityLayer,
  ForecastTimeline,
  AlertPanel,
  useEarth2Alerts,
  DEFAULT_EARTH2_FILTER,
  type Earth2Filter,
} from "@/components/crep/earth2";

// Device Type to Widget Mapper (Feb 12, 2026)
import { 
  getDeviceWidgetConfig, 
  getDeviceEmoji, 
  getIAQQuality,
  formatSensorValue,
  type MycoBrainDeviceRole 
} from "@/lib/crep/device-widget-mapper";
import { EntityDeckLayer } from "@/components/crep/layers/deck-entity-layer";
import { EntityStreamClient } from "@/lib/crep/streaming/entity-websocket-client";
import type { UnifiedEntity } from "@/lib/crep/entities/unified-entity-schema";

// Voice Map Controls (Feb 6, 2026)
import { VoiceMapControls } from "@/components/crep/voice-map-controls";

// Map Controls with streaming status
import { MapControls as OEIMapControls, StreamingStatusBar } from "@/components/crep/map-controls";
import type { AircraftFilter, VesselFilter, SatelliteFilter, SpaceWeatherFilter, NOAAScales } from "@/components/crep/map-controls";

// OEI Types
import type { AircraftEntity, VesselEntity } from "@/types/oei"
import type { SatelliteEntity } from "@/lib/oei/connectors/satellite-tracking";

// Types
interface GlobalEvent {
    id: string;
    type: string;
    title: string;
    description?: string;
    severity: string;
    lat: number;
    lng: number;
    timestamp?: string;
    link?: string;
    // Extended fields from API
    source?: string; // USGS, NOAA, NASA EONET, etc.
    sourceUrl?: string; // Link to source website
    magnitude?: number; // For earthquakes, storms, fires (acres)
    locationName?: string; // Place name
    depth?: number; // For earthquakes (km)
    windSpeed?: number; // For storms (mph)
    containment?: number; // For wildfires (%)
    affectedArea?: number; // kmÂ² affected
    affectedPopulation?: number; // People affected
}

interface Device {
    id: string;
    name: string;
    lat: number;
    lng: number;
    status: "online" | "offline";
  type?: string;
  port?: string;
  firmware?: string;
  protocol?: string;
  // Sensor data from MycoBrain (Feb 05, 2026)
  sensorData?: {
    temperature?: number;
    humidity?: number;
    pressure?: number;
    gasResistance?: number;
    iaq?: number;
    iaqAccuracy?: number;
    co2Equivalent?: number;
    vocEquivalent?: number;
    uptime?: number;
  };
  lastUpdate?: string;
}

interface LayerConfig {
  id: string;
  name: string;
  category: "events" | "devices" | "environment" | "infrastructure" | "human" | "military" | "pollution";
  icon: React.ReactNode;
  enabled: boolean;
  opacity: number;
  color: string;
  description: string;
}

interface MissionContext {
  id: string;
  name: string;
  type: "monitoring" | "research" | "alert" | "tracking" | "analysis";
  status: "active" | "paused" | "completed";
  objective: string;
  progress: number;
  targets: number;
  alerts: number;
  startTime: Date;
}

interface MYCAMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

// Event type configurations
// COLORS: Each event type MUST have a distinctly different color for instant visual recognition
// - Earthquake: Amber/Brown (earth/seismic)
// - Wildfire: Orange-red (flame)
// - Volcano: Deep orange
// - Storm: Indigo/purple
// - Lightning: Bright yellow
const eventTypeConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  // Seismic
  earthquake: { color: "#b45309", icon: <Activity className="w-3 h-3" />, label: "Earthquake" }, // Amber-700 (distinct from fire)
  // Volcanic
  volcano: { color: "#ea580c", icon: <Mountain className="w-3 h-3" />, label: "Volcano" }, // Orange-600
  // Fire
  wildfire: { color: "#dc2626", icon: <Flame className="w-3 h-3" />, label: "Wildfire" }, // Red-600 (fire stays red)
  fire: { color: "#dc2626", icon: <Flame className="w-3 h-3" />, label: "Fire" }, // Alias for wildfire
  // Weather - Storms
  storm: { color: "#6366f1", icon: <Cloud className="w-3 h-3" />, label: "Storm" },
  hurricane: { color: "#4f46e5", icon: <Cloud className="w-3 h-3" />, label: "Hurricane" }, // Deeper indigo
  flood: { color: "#0284c7", icon: <Droplet className="w-3 h-3" />, label: "Flood" }, // Sky blue
  // Weather - Lightning/Tornado
  lightning: { color: "#facc15", icon: <Zap className="w-3 h-3" />, label: "Lightning" },
  tornado: { color: "#7c3aed", icon: <Wind className="w-3 h-3" />, label: "Tornado" },
  // Space Weather
  solar_flare: { color: "#fbbf24", icon: <Satellite className="w-3 h-3" />, label: "Solar Flare" },
  geomagnetic_storm: { color: "#f59e0b", icon: <Sun className="w-3 h-3" />, label: "Geomagnetic Storm" },
  cme: { color: "#d97706", icon: <Sun className="w-3 h-3" />, label: "Coronal Mass Ejection" },
  // Biological
  fungal_bloom: { color: "#22c55e", icon: <TreePine className="w-3 h-3" />, label: "Fungal Bloom" },
  migration: { color: "#06b6d4", icon: <Fish className="w-3 h-3" />, label: "Migration" },
  // Default fallback
  default: { color: "#3b82f6", icon: <CircleDot className="w-3 h-3" />, label: "Event" },
};

// Severity badge colors
const severityColors: Record<string, string> = {
  info: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  low: "bg-green-500/20 text-green-400 border-green-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  extreme: "bg-red-600/20 text-red-300 border-red-600/30",
};

// Layer categories with icons - ORDERED: Fungal/Devices FIRST, Transport/Military LAST
const layerCategories = {
  // PRIMARY - Fungal data and devices (shown first)
  environment: { label: "Fungal & Environment", icon: <Leaf className="w-3.5 h-3.5" />, color: "text-emerald-400" },
  devices: { label: "MycoBrain Devices", icon: <Radar className="w-3.5 h-3.5" />, color: "text-green-400" },
  // CONTEXT - Natural events for correlation
  events: { label: "Natural Events", icon: <AlertTriangle className="w-3.5 h-3.5" />, color: "text-red-400" },
  // SECONDARY - Transport & Human (demo layers, off by default)
  infrastructure: { label: "[DEMO] Transport & Vehicles", icon: <Plane className="w-3.5 h-3.5" />, color: "text-sky-400" },
  human: { label: "Human Activity", icon: <Users className="w-3.5 h-3.5" />, color: "text-blue-400" },
  military: { label: "[DEMO] Military & Defense", icon: <Shield className="w-3.5 h-3.5" />, color: "text-amber-400" },
  pollution: { label: "Pollution & Industry", icon: <Factory className="w-3.5 h-3.5" />, color: "text-orange-400" },
};

// Event marker component with detailed popup
function EventMarker({ event, isSelected, onClick, onClose, onFlyTo }: { 
  event: GlobalEvent; 
  isSelected: boolean;
  onClick: () => void;
  onClose: () => void;
  onFlyTo?: (lat: number, lng: number, zoom?: number) => void;
}) {
  const config = eventTypeConfig[event.type] || eventTypeConfig.default;
  const isCritical = event.severity === "critical" || event.severity === "extreme";
  
  // Guard against missing coordinates
  if (event.lat === undefined || event.lng === undefined || isNaN(event.lat) || isNaN(event.lng)) {
    return null;
  }

  // Get event-type-specific data fields
  const getEventSpecificData = () => {
    switch (event.type) {
      case "earthquake":
        return [
          { label: "Magnitude", value: event.magnitude ? `M${event.magnitude.toFixed(1)}` : "N/A", icon: <Activity className="w-3 h-3" /> },
          { label: "Depth", value: event.depth ? `${event.depth.toFixed(1)} km` : "N/A", icon: <ArrowDown className="w-3 h-3" /> },
          { label: "Location", value: event.locationName || "Unknown", icon: <MapPin className="w-3 h-3" /> },
        ];
      case "wildfire":
        return [
          { label: "Area", value: event.magnitude ? `${event.magnitude.toLocaleString()} acres` : "N/A", icon: <Flame className="w-3 h-3" /> },
          { label: "Containment", value: event.containment !== undefined ? `${event.containment}%` : "N/A", icon: <Shield className="w-3 h-3" /> },
          { label: "Location", value: event.locationName || "Unknown", icon: <MapPin className="w-3 h-3" /> },
        ];
      case "storm":
      case "hurricane":
      case "tornado":
        return [
          { label: "Wind Speed", value: event.magnitude ? `${event.magnitude} mph` : "N/A", icon: <Wind className="w-3 h-3" /> },
          { label: "Location", value: event.locationName || "Unknown", icon: <MapPin className="w-3 h-3" /> },
        ];
      case "volcano":
        return [
          { label: "Status", value: event.description?.match(/Aviation color code: (\w+)/)?.[1] || "Active", icon: <Mountain className="w-3 h-3" /> },
          { label: "Location", value: event.locationName || "Unknown", icon: <MapPin className="w-3 h-3" /> },
        ];
      case "solar_flare":
      case "geomagnetic_storm":
        return [
          { label: "Class/Kp", value: event.magnitude ? `Kp ${event.magnitude.toFixed(0)}` : event.title.match(/[MCXAB]\d+\.\d+/)?.[0] || "N/A", icon: <Sun className="w-3 h-3" /> },
          { label: "Effect", value: "Aurora visible at high latitudes", icon: <Sparkles className="w-3 h-3" /> },
        ];
      case "lightning":
        return [
          { label: "Strikes", value: event.magnitude ? `${event.magnitude.toLocaleString()}` : "N/A", icon: <Zap className="w-3 h-3" /> },
          { label: "Location", value: event.locationName || "Unknown", icon: <MapPin className="w-3 h-3" /> },
        ];
      case "flood":
        return [
          { label: "Status", value: "Active Flooding", icon: <Droplet className="w-3 h-3" /> },
          { label: "Location", value: event.locationName || "Unknown", icon: <MapPin className="w-3 h-3" /> },
        ];
      default:
        return [
          { label: "Location", value: event.locationName || "Unknown", icon: <MapPin className="w-3 h-3" /> },
        ];
    }
  };

  // Get source icon and label
  const getSourceInfo = () => {
    const sourceMap: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
      "USGS": { icon: <Globe className="w-3 h-3" />, label: "USGS Earthquake Hazards", color: "text-amber-400" },
      "NOAA SWPC": { icon: <Sun className="w-3 h-3" />, label: "NOAA Space Weather", color: "text-yellow-400" },
      "NASA EONET": { icon: <Satellite className="w-3 h-3" />, label: "NASA Earth Observatory", color: "text-blue-400" },
      "NHC": { icon: <Cloud className="w-3 h-3" />, label: "National Hurricane Center", color: "text-indigo-400" },
      "NWS": { icon: <Cloud className="w-3 h-3" />, label: "National Weather Service", color: "text-cyan-400" },
      "FIRMS": { icon: <Flame className="w-3 h-3" />, label: "NASA Fire Information", color: "text-orange-400" },
      "Smithsonian GVP": { icon: <Mountain className="w-3 h-3" />, label: "Global Volcanism Program", color: "text-red-400" },
      "Blitzortung": { icon: <Zap className="w-3 h-3" />, label: "Blitzortung Lightning", color: "text-yellow-400" },
      "GDACS": { icon: <AlertTriangle className="w-3 h-3" />, label: "Global Disaster Alert", color: "text-red-400" },
      "MycoBrain Network": { icon: <Radar className="w-3 h-3" />, label: "MycoBrain Sensors", color: "text-green-400" },
      "Movebank": { icon: <Navigation className="w-3 h-3" />, label: "Movebank Animal Tracking", color: "text-emerald-400" },
    };
    return sourceMap[event.source || ""] || { icon: <Database className="w-3 h-3" />, label: event.source || "Unknown Source", color: "text-gray-400" };
  };

  const sourceInfo = getSourceInfo();
  const eventData = getEventSpecificData();
  
  return (
    <MapMarker 
      longitude={event.lng} 
      latitude={event.lat}
      onClick={onClick}
    >
      <MarkerContent className="relative" data-marker="event">
        <div className={cn(
          "relative flex items-center justify-center transition-transform",
          isSelected ? "scale-150" : "scale-100"
        )}>
          {/* Pulsing ring ONLY for critical events - REDUCED opacity */}
          {isCritical && (
            <div 
              className="absolute w-6 h-6 rounded-full animate-ping pointer-events-none"
              style={{ backgroundColor: `${config.color}20` }}
            />
          )}
          {/* Subtle glow - REDUCED */}
          <div 
            className="absolute w-5 h-5 rounded-full blur-[2px]"
            style={{ backgroundColor: `${config.color}25` }}
          />
          <div 
            className={cn(
              "relative w-4 h-4 rounded-full border flex items-center justify-center",
              isSelected && "ring-2 ring-white"
            )}
            style={{ 
              backgroundColor: config.color,
              borderColor: isSelected ? "#fff" : `${config.color}80`,
              boxShadow: isSelected ? `0 0 8px ${config.color}` : `0 0 4px ${config.color}40`
            }}
          >
            <span className="text-[8px] text-white">{config.icon}</span>
          </div>
        </div>
      </MarkerContent>
      
      {/* ENHANCED EVENT POPUP - Much larger with more data */}
      {isSelected && (
        <MarkerPopup 
          className={cn(
            "min-w-[320px] max-w-[380px] bg-[#0a1628]/98 backdrop-blur-md shadow-2xl p-0 overflow-hidden",
            "border-2 border-gray-600/40"
          )}
          closeButton
          closeOnClick={false}
          anchor="bottom"
          offset={[0, -12]}
          onClose={onClose}
        >
        {/* Header with severity gradient */}
        <div 
          className="px-3 py-2 border-b border-gray-700/50"
          style={{ 
            background: `linear-gradient(135deg, ${config.color}40 0%, ${config.color}15 100%)`,
          }}
        >
          <div className="flex items-start gap-2">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${config.color}50` }}
            >
              {config.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-white leading-tight">{event.title}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-gray-400 uppercase">{config.label}</span>
            <Badge 
              variant="outline" 
                  className={cn("text-[8px] px-1.5 py-0", severityColors[event.severity || "medium"])}
            >
                  {(event.severity || "medium").toUpperCase()}
            </Badge>
          </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {event.description && (
          <div className="px-3 py-2 border-b border-gray-700/30">
            <p className="text-[11px] text-gray-300 leading-relaxed line-clamp-3">
              {event.description}
            </p>
            </div>
          )}

        {/* Event-specific data grid */}
        <div className="px-3 py-2 border-b border-gray-700/30">
          <div className="grid grid-cols-3 gap-2">
            {eventData.map((item, idx) => (
              <div key={idx} className="bg-black/40 rounded p-1.5 border border-gray-700/40">
                <div className="flex items-center gap-1 text-[8px] text-gray-500 uppercase mb-0.5">
                  {item.icon}
                  {item.label}
                </div>
                <div className="text-[11px] text-white font-medium truncate">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Coordinates - CLICKABLE to fly to location */}
        <div className="px-3 py-2 border-b border-gray-700/30">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFlyTo?.(event.lat, event.lng, 10);
            }}
            className="w-full flex items-center justify-between p-2 rounded bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-colors group"
          >
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              <div className="text-left">
                <div className="text-[9px] text-gray-500 uppercase">Coordinates</div>
                <div className="text-[11px] text-cyan-400 font-mono">
                  {(event.lat ?? 0).toFixed(5)}Â°, {(event.lng ?? 0).toFixed(5)}Â°
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[9px] text-cyan-400 group-hover:text-cyan-300">
              <Navigation className="w-3 h-3" />
              <span>FLY TO</span>
            </div>
          </button>
        </div>

        {/* Timestamp */}
        <div className="px-3 py-2 border-b border-gray-700/30 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Detected</span>
          </div>
          <span className="text-[11px] text-white">
            {event.timestamp ? new Date(event.timestamp).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true
            }) : "Unknown"}
          </span>
        </div>

        {/* Source and Links */}
        <div className="px-3 py-2 space-y-2">
          {/* Source info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className={cn("flex items-center gap-1 text-[10px]", sourceInfo.color)}>
                {sourceInfo.icon}
                {sourceInfo.label}
              </span>
            </div>
            {event.sourceUrl && (
              <a
                href={event.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                Source <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
          {event.link && (
            <a
              href={event.link}
              target="_blank"
              rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-3 h-3" />
                View on {event.source || "Source"}
              </a>
            )}
            {event.sourceUrl && !event.link && (
              <a
                href={event.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-3 h-3" />
                Visit {event.source || "Source"}
            </a>
          )}
          </div>
        </div>
      </MarkerPopup>
      )}
    </MapMarker>
  );
}

// Device marker component - uses device-widget-mapper for type-specific visuals (Feb 12, 2026)
function DeviceMarker({ device, isSelected, onClick }: { 
  device: Device; 
  isSelected: boolean;
  onClick: () => void;
}) {
  const isOnline = device.status === "online";
  const [controlLoading, setControlLoading] = useState<string | null>(null);
  
  // Get device-specific widget configuration based on device type (Feb 12, 2026)
  const widgetConfig = getDeviceWidgetConfig(device.type);
  const deviceEmoji = getDeviceEmoji(device.type);
  
  // Control functions for MycoBrain device
  const sendControl = async (peripheral: string, params?: Record<string, any>) => {
    if (!device.port) return;
    setControlLoading(peripheral);
    try {
      const response = await fetch(`/api/mycobrain/${encodeURIComponent(device.port)}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peripheral, ...params }),
      });
      const result = await response.json();
      console.log(`[MycoBrain] ${peripheral} command result:`, result);
      if (!result.success) {
        console.error(`[MycoBrain] ${peripheral} command failed:`, result.error || result.message);
      }
    } catch (e) {
      console.error("Control error:", e);
    } finally {
      setControlLoading(null);
    }
  };
  
  // Use device-widget-mapper for IAQ quality (Feb 12, 2026)
  const iaqInfo = getIAQQuality(device.sensorData?.iaq);
  
  return (
    <MapMarker 
      longitude={device.lng} 
      latitude={device.lat}
      onClick={onClick}
    >
      <MarkerContent className="relative" data-marker="device">
        <div className={cn(
          "relative flex items-center justify-center transition-transform",
          isSelected ? "scale-150" : "scale-100"
        )}>
          {isOnline && (
            <div className={cn(
              "absolute w-6 h-6 rounded-sm animate-ping",
              widgetConfig.bgColor.replace("/20", "/30")
            )} />
          )}
          <div 
            className={cn(
              "relative w-5 h-5 rounded-sm border-2 flex items-center justify-center text-[10px]",
              isOnline 
                ? cn(widgetConfig.bgColor.replace("/20", "/80"), widgetConfig.borderColor)
                : "bg-red-500/80 border-red-400",
              isSelected && "ring-2 ring-white"
            )}
            style={{ boxShadow: `0 0 10px ${isOnline ? widgetConfig.glowColor : "#ef4444"}` }}
          >
            {deviceEmoji}
          </div>
        </div>
      </MarkerContent>
      {isSelected && (
        <MarkerPopup
          className="min-w-[280px] bg-[#0a1628]/95 backdrop-blur border-green-500/30"
          closeButton
          onClose={onClick}
        >
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded flex items-center justify-center text-lg",
              isOnline ? widgetConfig.bgColor : "bg-red-500/20"
            )}>
              {deviceEmoji}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-white">{device.name}</div>
              <div className={cn("text-[9px] mb-0.5", widgetConfig.color)}>{widgetConfig.label}</div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-[10px] uppercase font-mono",
                  isOnline ? widgetConfig.color : "text-red-400"
                )}>
                  ● {device.status}
                </span>
                {device.port && (
                  <span className="text-[9px] text-cyan-400 font-mono">{device.port}</span>
                )}
              </div>
            </div>
            {device.firmware && (
              <Badge variant="outline" className="text-[8px] h-4 px-1 border-cyan-500/30 text-cyan-400">
                v{device.firmware}
              </Badge>
            )}
          </div>
          
          {/* Live Sensor Data */}
          {isOnline && device.sensorData && (
            <div className="bg-slate-800/50 rounded-lg p-2 space-y-2">
              <div className="text-[9px] text-gray-400 uppercase font-mono flex items-center gap-1">
                <Activity className="w-3 h-3" /> Live Sensor Data
              </div>
              
              {/* Temperature & Humidity Row */}
              <div className="grid grid-cols-2 gap-2">
                {device.sensorData.temperature !== undefined && (
                  <div className="bg-slate-900/50 rounded p-1.5">
                    <div className="flex items-center gap-1">
                      <Thermometer className="w-3 h-3 text-orange-400" />
                      <span className="text-[8px] text-gray-500">TEMP</span>
                    </div>
                    <div className="text-sm font-bold text-orange-400">
                      {device.sensorData.temperature.toFixed(1)}Â°C
                    </div>
                  </div>
                )}
                {device.sensorData.humidity !== undefined && (
                  <div className="bg-slate-900/50 rounded p-1.5">
                    <div className="flex items-center gap-1">
                      <Droplets className="w-3 h-3 text-cyan-400" />
                      <span className="text-[8px] text-gray-500">HUMIDITY</span>
                    </div>
                    <div className="text-sm font-bold text-cyan-400">
                      {device.sensorData.humidity.toFixed(1)}%
                    </div>
                  </div>
                )}
              </div>
              
              {/* IAQ & CO2 Row */}
              <div className="grid grid-cols-2 gap-2">
                {device.sensorData.iaq !== undefined && (
                  <div className="bg-slate-900/50 rounded p-1.5">
                    <div className="flex items-center gap-1">
                      <Wind className="w-3 h-3 text-purple-400" />
                      <span className="text-[8px] text-gray-500">IAQ</span>
                    </div>
                    <div className={cn("text-sm font-bold", iaqInfo.color)}>
                      {device.sensorData.iaq} <span className="text-[8px] font-normal">{iaqInfo.label}</span>
                    </div>
                  </div>
                )}
                {device.sensorData.co2Equivalent !== undefined && (
                  <div className="bg-slate-900/50 rounded p-1.5">
                    <div className="flex items-center gap-1">
                      <Cloud className="w-3 h-3 text-blue-400" />
                      <span className="text-[8px] text-gray-500">eCOâ‚‚</span>
                    </div>
                    <div className="text-sm font-bold text-blue-400">
                      {device.sensorData.co2Equivalent} <span className="text-[8px] font-normal">ppm</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Pressure & VOC Row */}
              <div className="grid grid-cols-2 gap-2">
                {device.sensorData.pressure !== undefined && (
                  <div className="bg-slate-900/50 rounded p-1.5">
                    <div className="flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-amber-400" />
                      <span className="text-[8px] text-gray-500">PRESSURE</span>
                    </div>
                    <div className="text-sm font-bold text-amber-400">
                      {device.sensorData.pressure.toFixed(0)} <span className="text-[8px] font-normal">hPa</span>
                    </div>
                  </div>
                )}
                {device.sensorData.vocEquivalent !== undefined && (
                  <div className="bg-slate-900/50 rounded p-1.5">
                    <div className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-pink-400" />
                      <span className="text-[8px] text-gray-500">bVOC</span>
                    </div>
                    <div className="text-sm font-bold text-pink-400">
                      {device.sensorData.vocEquivalent.toFixed(2)} <span className="text-[8px] font-normal">ppm</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Uptime */}
              {device.sensorData.uptime !== undefined && (
                <div className="flex items-center justify-between text-[8px] text-gray-500 pt-1 border-t border-slate-700/50">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Uptime
                  </span>
                  <span className="text-cyan-400 font-mono">
                    {Math.floor(device.sensorData.uptime / 3600)}h {Math.floor((device.sensorData.uptime % 3600) / 60)}m
                  </span>
                </div>
              )}
            </div>
          )}
          
          {/* Quick Controls */}
          {isOnline && device.port && (
            <div className="space-y-1.5">
              <div className="text-[9px] text-gray-400 uppercase font-mono flex items-center gap-1">
                <Zap className="w-3 h-3" /> Quick Controls
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-6 px-2 text-[9px] border-green-500/30 text-green-400 hover:bg-green-500/20"
                  disabled={controlLoading !== null}
                  onClick={(e) => {
                    e.stopPropagation();
                    sendControl("neopixel", { effect: "rainbow" });
                  }}
                >
                  {controlLoading === "neopixel" ? "..." : "ðŸŒˆ Rainbow"}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-6 px-2 text-[9px] border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
                  disabled={controlLoading !== null}
                  onClick={(e) => {
                    e.stopPropagation();
                    sendControl("buzzer", { action: "beep", frequency: 1000, duration: 100 });
                  }}
                >
                  {controlLoading === "buzzer" ? "..." : "ðŸ”” Beep"}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-6 px-2 text-[9px] border-red-500/30 text-red-400 hover:bg-red-500/20"
                  disabled={controlLoading !== null}
                  onClick={(e) => {
                    e.stopPropagation();
                    sendControl("neopixel", { effect: "off" });
                  }}
                >
                  LED Off
                </Button>
              </div>
            </div>
          )}
          
          {/* Device Info Footer */}
          <div className="pt-2 border-t border-slate-700/50 space-y-1">
            <div className="flex items-center justify-between text-[8px]">
              <span className="text-gray-500">Location</span>
              <span className="text-gray-400 font-mono">
                {typeof device.lat === 'number' ? device.lat.toFixed(4) : 'â€”'}Â°, {typeof device.lng === 'number' ? device.lng.toFixed(4) : 'â€”'}Â°
              </span>
            </div>
            <div className="text-[7px] text-gray-600 font-mono truncate">{device.id}</div>
            <div className="text-[7px] text-emerald-500/60">ðŸ“ Chula Vista, San Diego CA 91910</div>
          </div>
        </div>
      </MarkerPopup>
      )}
    </MapMarker>
  );
}

// Human & Machines Baseline Data
const HUMAN_MACHINE_DATA = {
  population: { total: 8_123_456_789, birthsPerSec: 4.3, deathsPerSec: 1.8 },
  vehicles: { total: 1_446_000_000, active: 312_000_000, co2PerDay: 18_500_000 },
  aircraft: { total: 468_000, inFlight: 18_500, flightsPerDay: 115_000, co2PerDay: 2_800_000 },
  ships: { total: 108_000, atSea: 62_000, fishing: 4_600_000, co2PerDay: 3_200_000 },
  drones: { registered: 2_800_000, active: 125_000, military: 45_000 },
  factories: { total: 10_500_000, active: 8_200_000, co2PerDay: 58_000_000 },
  totalCO2PerDay: 136_000_000,
  totalMethanePerDay: 1_500_000,
  fuelPerDay: 102_000_000,
};

// Format number helper
function formatNum(num: number): string {
  if (num >= 1e12) return (num / 1e12).toFixed(2) + "T";
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(1) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(1) + "K";
  return num.toLocaleString();
}

// Right Panel - Mission Context Component
function MissionContextPanel({ 
  mission, 
  stats 
}: { 
  mission: MissionContext | null;
  stats: { events: number; devices: number; critical: number; kingdoms: Record<string, number> };
}) {
  return (
    <div className="space-y-2 h-full flex flex-col">
      {/* Current Mission */}
      {mission && (
        <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border border-cyan-500/30 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[10px] font-bold text-white">ACTIVE MISSION</span>
            </div>
            <Badge 
              variant="outline" 
              className={cn(
                "text-[7px] px-1 py-0",
                mission.status === "active" ? "border-green-500/50 text-green-400" : "border-yellow-500/50 text-yellow-400"
              )}
            >
              {mission.status.toUpperCase()}
            </Badge>
          </div>
          <h3 className="text-xs font-semibold text-white mb-0.5">{mission.name}</h3>
          <p className="text-[9px] text-gray-400 mb-1">{mission.objective}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-gray-500">Progress</span>
              <span className="text-cyan-400 font-mono">{mission.progress}%</span>
            </div>
            <Progress value={mission.progress} className="h-1" />
          </div>
          <div className="grid grid-cols-2 gap-1.5 mt-1.5">
            <div className="text-center p-1 rounded bg-black/30">
              <div className="text-xs font-bold text-cyan-400">{mission.targets}</div>
              <div className="text-[7px] text-gray-500">TARGETS</div>
            </div>
            <div className="text-center p-1 rounded bg-black/30">
              <div className="text-xs font-bold text-orange-400">{mission.alerts}</div>
              <div className="text-[7px] text-gray-500">ALERTS</div>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Stats */}
      <div className="p-2 rounded-lg bg-black/40 border border-gray-700/50 flex-shrink-0">
        <div className="flex items-center gap-1.5 mb-1.5">
          <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[10px] font-bold text-white">LIVE STATISTICS</span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          <div className="text-center p-1.5 rounded bg-black/30 border border-red-500/20">
            <AlertTriangle className="w-3 h-3 text-red-400 mx-auto mb-0.5" />
            <div className="text-sm font-bold text-red-400">{stats.events}</div>
            <div className="text-[6px] text-gray-500 uppercase">Events</div>
          </div>
          <div className="text-center p-1.5 rounded bg-black/30 border border-green-500/20">
            <Radar className="w-3 h-3 text-green-400 mx-auto mb-0.5" />
            <div className="text-sm font-bold text-green-400">{stats.devices}</div>
            <div className="text-[6px] text-gray-500 uppercase">Devices</div>
          </div>
          <div className="text-center p-1.5 rounded bg-black/30 border border-orange-500/20">
            <Zap className="w-3 h-3 text-orange-400 mx-auto mb-0.5" />
            <div className="text-sm font-bold text-orange-400">{stats.critical}</div>
            <div className="text-[6px] text-gray-500 uppercase">Critical</div>
          </div>
        </div>
      </div>

      {/* Kingdom Data */}
      <div className="p-2 rounded-lg bg-black/40 border border-gray-700/50 flex-1 min-h-0">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Microscope className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] font-bold text-white">MINDEX KINGDOMS</span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {[
            { key: "fungi", icon: <TreePine className="w-2.5 h-2.5" />, color: "text-green-400", label: "Fungi" },
            { key: "plants", icon: <Leaf className="w-2.5 h-2.5" />, color: "text-emerald-400", label: "Plants" },
            { key: "birds", icon: <Bird className="w-2.5 h-2.5" />, color: "text-sky-400", label: "Birds" },
            { key: "insects", icon: <Bug className="w-2.5 h-2.5" />, color: "text-amber-400", label: "Insects" },
            { key: "animals", icon: <PawPrint className="w-2.5 h-2.5" />, color: "text-orange-400", label: "Animals" },
            { key: "marine", icon: <Waves className="w-2.5 h-2.5" />, color: "text-cyan-400", label: "Marine" },
          ].map(({ key, icon, color, label }) => (
            <div key={key} className="text-center p-1 rounded bg-black/30 hover:bg-black/50 transition-colors cursor-pointer">
              <div className={cn("mx-auto", color)}>{icon}</div>
              <div className={cn("text-[9px] font-bold tabular-nums", color)}>
                {((stats.kingdoms[key] || 0) / 1000).toFixed(0)}K
              </div>
              <div className="text-[6px] text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Right Panel - Human & Machines Intel Component
function HumanMachinesPanel() {
  const [population, setPopulation] = useState(HUMAN_MACHINE_DATA.population.total);
  const [activeData, setActiveData] = useState({
    aircraft: HUMAN_MACHINE_DATA.aircraft.inFlight,
    ships: HUMAN_MACHINE_DATA.ships.atSea,
    vehicles: HUMAN_MACHINE_DATA.vehicles.active,
    drones: HUMAN_MACHINE_DATA.drones.active,
  });

  // Live population counter
  useEffect(() => {
    const interval = setInterval(() => {
      setPopulation(prev => prev + (HUMAN_MACHINE_DATA.population.birthsPerSec - HUMAN_MACHINE_DATA.population.deathsPerSec));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fluctuating active counts
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveData({
        aircraft: HUMAN_MACHINE_DATA.aircraft.inFlight + Math.floor((Math.random() - 0.5) * 500),
        ships: HUMAN_MACHINE_DATA.ships.atSea + Math.floor((Math.random() - 0.5) * 200),
        vehicles: HUMAN_MACHINE_DATA.vehicles.active + Math.floor((Math.random() - 0.5) * 500000),
        drones: HUMAN_MACHINE_DATA.drones.active + Math.floor((Math.random() - 0.5) * 2000),
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-2">
      {/* World Population */}
      <div className="p-2.5 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-gray-400 flex items-center gap-1">
            <Users className="h-3 w-3 text-blue-400" />
            World Population
          </span>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[8px] text-green-400">LIVE</span>
          </div>
        </div>
        <p className="text-xl font-bold text-blue-400 tabular-nums">{formatNum(Math.floor(population))}</p>
        <div className="flex items-center gap-3 mt-1 text-[8px]">
          <span className="text-green-400">+{HUMAN_MACHINE_DATA.population.birthsPerSec.toFixed(1)}/s births</span>
          <span className="text-red-400">-{HUMAN_MACHINE_DATA.population.deathsPerSec.toFixed(1)}/s deaths</span>
        </div>
      </div>

      {/* Transport Grid */}
      <div className="p-2.5 rounded-lg bg-black/40 border border-gray-700/50">
        <div className="flex items-center gap-2 mb-2">
          <Plane className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-[10px] font-bold text-white">GLOBAL TRANSPORT</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {/* Aircraft */}
          <div className="p-2 rounded bg-gradient-to-br from-sky-500/10 to-cyan-500/5 border border-sky-500/20">
            <div className="flex items-center justify-between">
              <Plane className="w-3 h-3 text-sky-400" />
              <span className="text-[8px] text-sky-400">{formatNum(activeData.aircraft)} flying</span>
            </div>
            <div className="text-[11px] font-bold text-sky-300 mt-1">{formatNum(HUMAN_MACHINE_DATA.aircraft.total)}</div>
            <div className="text-[7px] text-gray-500">Total Aircraft</div>
          </div>
          {/* Ships */}
          <div className="p-2 rounded bg-gradient-to-br from-teal-500/10 to-emerald-500/5 border border-teal-500/20">
            <div className="flex items-center justify-between">
              <Ship className="w-3 h-3 text-teal-400" />
              <span className="text-[8px] text-teal-400">{formatNum(activeData.ships)} at sea</span>
            </div>
            <div className="text-[11px] font-bold text-teal-300 mt-1">{formatNum(HUMAN_MACHINE_DATA.ships.total)}</div>
            <div className="text-[7px] text-gray-500">Ships + {formatNum(HUMAN_MACHINE_DATA.ships.fishing)} fishing</div>
          </div>
          {/* Vehicles */}
          <div className="p-2 rounded bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/20">
            <div className="flex items-center justify-between">
              <Car className="w-3 h-3 text-orange-400" />
              <span className="text-[8px] text-orange-400">{formatNum(activeData.vehicles)} active</span>
            </div>
            <div className="text-[11px] font-bold text-orange-300 mt-1">{formatNum(HUMAN_MACHINE_DATA.vehicles.total)}</div>
            <div className="text-[7px] text-gray-500">Land Vehicles</div>
          </div>
          {/* Drones */}
          <div className="p-2 rounded bg-gradient-to-br from-purple-500/10 to-pink-500/5 border border-purple-500/20">
            <div className="flex items-center justify-between">
              <Radio className="w-3 h-3 text-purple-400" />
              <span className="text-[8px] text-purple-400">{formatNum(activeData.drones)} flying</span>
            </div>
            <div className="text-[11px] font-bold text-purple-300 mt-1">{formatNum(HUMAN_MACHINE_DATA.drones.registered)}</div>
            <div className="text-[7px] text-gray-500">Drones/UAVs ({formatNum(HUMAN_MACHINE_DATA.drones.military)} mil)</div>
          </div>
        </div>
      </div>

      {/* Factories & Industry */}
      <div className="p-2.5 rounded-lg bg-gradient-to-br from-orange-500/10 to-red-500/5 border border-orange-500/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-gray-400 flex items-center gap-1">
            <Factory className="h-3 w-3 text-orange-400" />
            Industrial Facilities
          </span>
          <span className="text-[8px] text-orange-400">{formatNum(HUMAN_MACHINE_DATA.factories.active)} active</span>
        </div>
        <div className="text-lg font-bold text-orange-300">{formatNum(HUMAN_MACHINE_DATA.factories.total)}</div>
        <div className="text-[8px] text-gray-500 mt-1">Factories, refineries, power plants worldwide</div>
      </div>

      {/* Pollution Output */}
      <div className="p-2.5 rounded-lg bg-gradient-to-br from-red-500/10 to-orange-500/5 border border-red-500/30">
        <div className="flex items-center gap-2 mb-2">
          <Cloud className="w-3.5 h-3.5 text-red-400" />
          <span className="text-[10px] font-bold text-white">EMISSIONS (DAILY)</span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          <div className="text-center p-1.5 rounded bg-black/30">
            <div className="text-[10px] font-bold text-red-400">{formatNum(HUMAN_MACHINE_DATA.totalCO2PerDay)}</div>
            <div className="text-[7px] text-gray-500">t COâ‚‚</div>
          </div>
          <div className="text-center p-1.5 rounded bg-black/30">
            <div className="text-[10px] font-bold text-amber-400">{formatNum(HUMAN_MACHINE_DATA.totalMethanePerDay)}</div>
            <div className="text-[7px] text-gray-500">t CHâ‚„</div>
          </div>
          <div className="text-center p-1.5 rounded bg-black/30">
            <div className="text-[10px] font-bold text-orange-400">{formatNum(HUMAN_MACHINE_DATA.fuelPerDay)}</div>
            <div className="text-[7px] text-gray-500">bbl fuel</div>
          </div>
        </div>
      </div>

      {/* Data Sources */}
      <div className="pt-1 border-t border-gray-700/30">
        <div className="flex flex-wrap gap-1 text-[7px]">
          <Badge variant="outline" className="px-1 py-0 h-3 border-sky-500/30 text-sky-400">OpenSky</Badge>
          <Badge variant="outline" className="px-1 py-0 h-3 border-teal-500/30 text-teal-400">AISstream</Badge>
          <Badge variant="outline" className="px-1 py-0 h-3 border-green-500/30 text-green-400">GFW</Badge>
          <Badge variant="outline" className="px-1 py-0 h-3 border-purple-500/30 text-purple-400">OSINT</Badge>
          <Badge variant="outline" className="px-1 py-0 h-3 border-amber-500/30 text-amber-400">MIL-INT</Badge>
        </div>
      </div>
    </div>
  );
}

// Right Panel - Layers Component
function LayerControlPanel({
  layers,
  onToggleLayer,
  onOpacityChange
}: {
  layers: LayerConfig[];
  onToggleLayer: (id: string) => void;
  onOpacityChange: (id: string, opacity: number) => void;
}) {
  const [expandedLayer, setExpandedLayer] = useState<string | null>(null);
  
  // Group layers by category
  const groupedLayers = useMemo(() => {
    const groups: Record<string, LayerConfig[]> = {
      events: [],
      devices: [],
      environment: [],
      human: [],
      infrastructure: [],
      military: [],
      pollution: [],
    };
    layers.forEach(layer => {
      groups[layer.category]?.push(layer);
    });
    return groups;
  }, [layers]);

  return (
    <div className="space-y-2">
      {Object.entries(groupedLayers).map(([category, categoryLayers]) => {
        if (categoryLayers.length === 0) return null;
        const categoryConfig = layerCategories[category as keyof typeof layerCategories];
        const activeCount = categoryLayers.filter(l => l.enabled).length;
        
        return (
          <div key={category} className="rounded-lg bg-black/40 border border-gray-700/50 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-black/30">
              <div className="flex items-center gap-2">
                <span className={categoryConfig.color}>{categoryConfig.icon}</span>
                <span className="text-[11px] font-semibold text-white">{categoryConfig.label}</span>
              </div>
              <Badge variant="outline" className="text-[8px] border-gray-600 text-gray-400">
                {activeCount}/{categoryLayers.length}
              </Badge>
            </div>
            <div className="p-2 space-y-1">
              {categoryLayers.map(layer => (
                <div 
                  key={layer.id} 
                  className={cn(
                    "rounded transition-all",
                    expandedLayer === layer.id ? "bg-black/30" : "hover:bg-black/20"
                  )}
                >
                  <div 
                    className="flex items-center justify-between p-2 cursor-pointer"
                    onClick={() => setExpandedLayer(expandedLayer === layer.id ? null : layer.id)}
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-5 h-5 rounded flex items-center justify-center"
                        style={{ backgroundColor: `${layer.color}25` }}
                      >
                        <span style={{ color: layer.color }}>{layer.icon}</span>
                      </div>
                      <span className="text-[10px] text-gray-300">{layer.name}</span>
                    </div>
                    <Switch
                      checked={layer.enabled}
                      onCheckedChange={() => onToggleLayer(layer.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-7 data-[state=checked]:bg-cyan-500"
                    />
                  </div>
                  {expandedLayer === layer.id && (
                    <div className="px-2 pb-2 pt-0 space-y-2">
                      <p className="text-[9px] text-gray-500">{layer.description}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-gray-500">Opacity</span>
                        <Slider
                          value={[layer.opacity * 100]}
                          min={0}
                          max={100}
                          step={5}
                          className="flex-1"
                          onValueChange={(v) => onOpacityChange(layer.id, v[0] / 100)}
                        />
                        <span className="text-[9px] text-gray-400 w-8 text-right">{Math.round(layer.opacity * 100)}%</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Right Panel - Services Integration Component
function ServicesPanel() {
  const services = [
    { id: "mycobrain", name: "MycoBrain", status: "connected", icon: <Brain className="w-3.5 h-3.5" />, color: "text-green-400", devices: 47 },
    { id: "mindex", name: "MINDEX", status: "synced", icon: <Database className="w-3.5 h-3.5" />, color: "text-cyan-400", records: "2.4M" },
    { id: "myca", name: "MYCA Agent", status: "active", icon: <Bot className="w-3.5 h-3.5" />, color: "text-purple-400", tasks: 3 },
    { id: "natureos", name: "NatureOS", status: "online", icon: <Leaf className="w-3.5 h-3.5" />, color: "text-emerald-400" },
    { id: "sporetracker", name: "SporeTracker", status: "monitoring", icon: <Radar className="w-3.5 h-3.5" />, color: "text-amber-400", detections: 128 },
  ];

  return (
    <div className="space-y-2">
      {services.map(service => (
        <div 
          key={service.id} 
          className="flex items-center gap-3 p-2.5 rounded-lg bg-black/40 border border-gray-700/50 hover:border-gray-600/50 transition-colors cursor-pointer"
        >
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center bg-black/50", service.color)}>
            {service.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-white">{service.name}</span>
              <div className="flex items-center gap-1">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  service.status === "connected" || service.status === "synced" || service.status === "online" || service.status === "active" || service.status === "monitoring"
                    ? "bg-green-500"
                    : "bg-red-500"
                )} />
                <span className="text-[9px] text-gray-500 uppercase">{service.status}</span>
              </div>
            </div>
            <div className="text-[9px] text-gray-500 mt-0.5">
              {service.devices && `${service.devices} devices`}
              {service.records && `${service.records} records`}
              {service.tasks && `${service.tasks} active tasks`}
              {service.detections && `${service.detections} detections/hr`}
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
        </div>
      ))}
    </div>
  );
}

// Right Panel - MYCA Chat Component
function MYCAChatPanel({ 
  messages, 
  onSendMessage 
}: { 
  messages: MYCAMessage[]; 
  onSendMessage: (message: string) => void;
}) {
  const [inputValue, setInputValue] = useState("");

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue("");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 pr-2">
        <div className="space-y-2 p-1">
          {messages.map(msg => (
            <div 
              key={msg.id}
              className={cn(
                "p-2 rounded-lg text-[10px]",
                msg.role === "user" 
                  ? "bg-cyan-500/20 border border-cyan-500/30 ml-4" 
                  : msg.role === "assistant"
                    ? "bg-purple-500/20 border border-purple-500/30 mr-4"
                    : "bg-gray-500/20 border border-gray-500/30 text-center text-[9px]"
              )}
            >
              {msg.role !== "system" && (
                <div className="flex items-center gap-1 mb-1">
                  {msg.role === "assistant" ? (
                    <Bot className="w-3 h-3 text-purple-400" />
                  ) : (
                    <Users className="w-3 h-3 text-cyan-400" />
                  )}
                  <span className={msg.role === "assistant" ? "text-purple-400" : "text-cyan-400"}>
                    {msg.role === "assistant" ? "MYCA" : "You"}
                  </span>
                  <span className="text-gray-600 text-[8px] ml-auto">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
              <p className="text-gray-300">{msg.content}</p>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-700/50">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask MYCA..."
          className="h-8 text-[10px] bg-black/40 border-gray-700/50 focus:border-cyan-500/50"
        />
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={handleSend}
          className="h-8 w-8 shrink-0 bg-cyan-500/20 hover:bg-cyan-500/30"
        >
          <Send className="w-3.5 h-3.5 text-cyan-400" />
        </Button>
      </div>
    </div>
  );
}

// Main CREP Page Component
export default function CREPDashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [rightPanelTab, setRightPanelTab] = useState("mission");
  const [leftPanelTab, setLeftPanelTab] = useState<"fungal" | "events">("fungal"); // DEFAULT TO FUNGAL
  const [selectedEvent, setSelectedEvent] = useState<GlobalEvent | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  
  // Map reference for auto-zoom and pan functionality
  const [mapRef, setMapRef] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hasAutoZoomed, setHasAutoZoomed] = useState(false);
  
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // LEVEL OF DETAIL (LOD) SYSTEM - Google Earth-style zoom-based rendering
  // Shows more markers when zoomed in, fewer when zoomed out for performance
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const [mapZoom, setMapZoom] = useState(2);
  const [mapBounds, setMapBounds] = useState<{
    north: number;
    south: number;
    east: number;
    west: number;
  } | null>(null);
  
  // Debounce ref for viewport updates (prevents rapid-fire recalculations)
  const viewportUpdateTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Separate loading state for fungal data to prevent blinking
  const [fungalLoading, setFungalLoading] = useState(true);
  
  // Data states
  const [globalEvents, setGlobalEvents] = useState<GlobalEvent[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [aircraft, setAircraft] = useState<AircraftEntity[]>([]);
  const [vessels, setVessels] = useState<VesselEntity[]>([]);
  const [satellites, setSatellites] = useState<SatelliteEntity[]>([]);
  const [fungalObservations, setFungalObservations] = useState<FungalObservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Elephant Conservation Demo States (Feb 05, 2026)
  const [elephants, setElephants] = useState<ElephantData[]>([]);
  const [fenceSegments, setFenceSegments] = useState<FenceSegment[]>([]);
  const [presenceReadings, setPresenceReadings] = useState<PresenceReading[]>([]);
  const [selectedElephant, setSelectedElephant] = useState<ElephantData | null>(null);
  const [conservationDemoEnabled, setConservationDemoEnabled] = useState(true);
  
  // Individual widget toggle states (Feb 17, 2026) - default OFF per user request
  const [showBiosignalWidget, setShowBiosignalWidget] = useState(false);
  const [showSmartFenceWidget, setShowSmartFenceWidget] = useState(false);
  const [showPresenceWidget, setShowPresenceWidget] = useState(false);
  
  // Selected entity states for map interaction
  const [selectedAircraft, setSelectedAircraft] = useState<AircraftEntity | null>(null);
  const [selectedVessel, setSelectedVessel] = useState<VesselEntity | null>(null);
  const [selectedSatellite, setSelectedSatellite] = useState<SatelliteEntity | null>(null);
  const [selectedFungal, setSelectedFungal] = useState<FungalObservation | null>(null);
  
  // Streaming state
  const [isStreaming, setIsStreaming] = useState(true);
  const [streamedEntities, setStreamedEntities] = useState<UnifiedEntity[]>([]);
  const entityStreamClientRef = useRef<EntityStreamClient | null>(null);
  
  // Space weather state for NOAA scales
  const [noaaScales, setNoaaScales] = useState<NOAAScales>({ radio: 0, solar: 0, geomag: 0 });
  
  // Client-side clock to prevent hydration mismatch
  const [clientTime, setClientTime] = useState<string>("");
  const [clientDate, setClientDate] = useState<string>("");
  
  // Update clock only on client side
  useEffect(() => {
    const updateClock = () => {
      setClientTime(new Date().toLocaleTimeString());
      setClientDate(new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Filter states for map controls
  const [aircraftFilter, setAircraftFilter] = useState<AircraftFilter>({
    showAirborne: true,
    showGround: false,
    minAltitude: 0,
    maxAltitude: 50000,
    airlines: [],
    aircraftTypes: [],
    showMilitary: false,
    showCargo: true,
    showPrivate: true,
    showCommercial: true,
  });
  
  const [vesselFilter, setVesselFilter] = useState<VesselFilter>({
    showCargo: true,
    showTanker: true,
    showPassenger: true,
    showFishing: true,
    showTug: true,
    showMilitary: false,
    showPleasure: true,
    minSpeed: 0,
    showPortAreas: false,
    showShippingLanes: false,
    showAnchorages: false,
  });
  
  const [satelliteFilter, setSatelliteFilter] = useState<SatelliteFilter>({
    showStations: true,
    showWeather: true,
    showComms: false,
    showGPS: false,
    showStarlink: false,
    showDebris: false,
    showActive: true,
    orbitTypes: ["LEO", "GEO"],
  });
  
  const [spaceWeatherFilter, setSpaceWeatherFilter] = useState<SpaceWeatherFilter>({
    showSolarFlares: true,
    showCME: true,
    showGeomagneticStorms: true,
    showRadiationBelts: false,
    showAuroraOval: false,
    showSolarWind: false,
  });
  
  // Mission context
  const [currentMission] = useState<MissionContext>({
    id: "mission-001",
    name: "Global Fungal Network Monitoring",
    type: "monitoring",
    status: "active",
    objective: "Real-time tracking of fungal activity and environmental events across all connected MycoBrain devices",
    progress: 67,
    targets: 47,
    alerts: 3,
    startTime: new Date(),
  });
  
  // MYCA chat messages
  const [mycaMessages, setMycaMessages] = useState<MYCAMessage[]>([
    {
      id: "1",
      role: "system",
      content: "MYCA Agent connected to CREP",
      timestamp: new Date(),
    },
    {
      id: "2",
      role: "assistant",
      content: "I'm monitoring 47 active devices across the global network. Currently tracking 76 environmental events, including 2 critical alerts in the Pacific region. Would you like me to focus on any specific area?",
      timestamp: new Date(),
    },
  ]);
  
  // Layer states - FUNGAL DATA FIRST, transport/military OFF by default
  // Primary layers: Fungal observations and MycoBrain devices
  // Secondary layers: Transport, military - toggleable demos for correlation analysis
  const [layers, setLayers] = useState<LayerConfig[]>([
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // PRIMARY LAYERS - FUNGAL/MINDEX DATA (ENABLED BY DEFAULT)
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // Fungal Observations - THE PRIMARY DATA SOURCE
    { id: "fungi", name: "Fungal Observations", category: "environment", icon: <TreePine className="w-3 h-3" />, enabled: true, opacity: 1, color: "#22c55e", description: "MINDEX fungal data - iNaturalist/GBIF observations with GPS" },
    // MycoBrain Devices - Real-time sensor network
    { id: "mycobrain", name: "MycoBrain Devices", category: "devices", icon: <Radar className="w-3 h-3" />, enabled: true, opacity: 1, color: "#22c55e", description: "Connected fungal monitoring ESP32-S3 devices" },
    { id: "sporebase", name: "SporeBase Sensors", category: "devices", icon: <Cpu className="w-3 h-3" />, enabled: true, opacity: 1, color: "#10b981", description: "Environmental spore detection sensors" },
    { id: "partners", name: "Partner Networks", category: "devices", icon: <Wifi className="w-3 h-3" />, enabled: false, opacity: 0.8, color: "#06b6d4", description: "Third-party research stations" },
    // Elephant Conservation Demo (Feb 05, 2026)
    { id: "elephants", name: "ðŸ˜ Elephant Trackers", category: "devices", icon: <PawPrint className="w-3 h-3" />, enabled: true, opacity: 1, color: "#8b5cf6", description: "GPS collars with biosignal monitoring - Ghana/Africa" },
    { id: "smartfence", name: "Smart Fence Network", category: "devices", icon: <Shield className="w-3 h-3" />, enabled: true, opacity: 1, color: "#06b6d4", description: "MycoBrain fence sensors for wildlife corridors" },
    // Environment - Context for fungal activity
    { id: "biodiversity", name: "Biodiversity Hotspots", category: "environment", icon: <Sparkles className="w-3 h-3" />, enabled: false, opacity: 0.7, color: "#a855f7", description: "High biodiversity concentration areas" },
    { id: "weather", name: "Weather Overlay", category: "environment", icon: <Thermometer className="w-3 h-3" />, enabled: false, opacity: 0.6, color: "#3b82f6", description: "Temperature, precipitation, wind - affects fungal growth" },
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // ENVIRONMENTAL EVENTS - ENABLED BY DEFAULT (natural earth-bound events)
    // These auto-display with LOD scaling for fires, floods, storms, earthquakes, etc.
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    { id: "earthquakes", name: "Seismic Activity", category: "events", icon: <Activity className="w-3 h-3" />, enabled: true, opacity: 1, color: "#b45309", description: "Real-time USGS earthquake data" },
    { id: "volcanoes", name: "Volcanic Activity", category: "events", icon: <Mountain className="w-3 h-3" />, enabled: true, opacity: 1, color: "#f97316", description: "Active volcanoes and eruption alerts" },
    { id: "wildfires", name: "Active Wildfires", category: "events", icon: <Flame className="w-3 h-3" />, enabled: true, opacity: 0.9, color: "#dc2626", description: "NASA FIRMS fire detection data" },
    { id: "storms", name: "Storm Systems", category: "events", icon: <Cloud className="w-3 h-3" />, enabled: true, opacity: 0.8, color: "#6366f1", description: "NOAA storm tracking and forecasts" },
    { id: "solar", name: "Space Weather", category: "events", icon: <Satellite className="w-3 h-3" />, enabled: true, opacity: 0.7, color: "#fbbf24", description: "Solar flares, CME, geomagnetic storms" },
    { id: "lightning", name: "Lightning Activity", category: "events", icon: <Zap className="w-3 h-3" />, enabled: true, opacity: 0.8, color: "#facc15", description: "Real-time lightning strikes globally" },
    { id: "tornadoes", name: "Tornado Tracking", category: "events", icon: <Wind className="w-3 h-3" />, enabled: true, opacity: 0.9, color: "#7c3aed", description: "Active tornado cells and warnings" },
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // SECONDARY LAYERS - TRANSPORT (OFF BY DEFAULT - DEMO/TOGGLEABLE)
    // Click to enable for correlation analysis with fungal data
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    { id: "aviation", name: "Air Traffic (Live)", category: "infrastructure", icon: <Plane className="w-3 h-3" />, enabled: true, opacity: 0.9, color: "#0ea5e9", description: "FlightRadar24 live aircraft positions" },
    { id: "aviationRoutes", name: "Flight Trajectories", category: "infrastructure", icon: <Navigation className="w-3 h-3" />, enabled: true, opacity: 0.7, color: "#38bdf8", description: "Aircraft route paths airport-to-airport" },
    { id: "ships", name: "Ships (AIS Live)", category: "infrastructure", icon: <Ship className="w-3 h-3" />, enabled: true, opacity: 0.9, color: "#14b8a6", description: "AISstream live vessel positions" },
    { id: "shipRoutes", name: "Ship Trajectories", category: "infrastructure", icon: <Anchor className="w-3 h-3" />, enabled: true, opacity: 0.7, color: "#2dd4bf", description: "Vessel route paths port-to-port" },
    { id: "fishing", name: "Fishing Fleets", category: "infrastructure", icon: <Fish className="w-3 h-3" />, enabled: false, opacity: 0.7, color: "#22d3ee", description: "Global Fishing Watch data" },
    { id: "containers", name: "Container Ships", category: "infrastructure", icon: <Container className="w-3 h-3" />, enabled: false, opacity: 0.6, color: "#06b6d4", description: "Shipping container trajectories" },
    { id: "vehicles", name: "Land Vehicles", category: "infrastructure", icon: <Car className="w-3 h-3" />, enabled: false, opacity: 0.4, color: "#f59e0b", description: "Aggregate vehicle traffic patterns" },
    { id: "drones", name: "Drones & UAVs", category: "infrastructure", icon: <Radio className="w-3 h-3" />, enabled: false, opacity: 0.8, color: "#a855f7", description: "Known drone activity and flights" },
    { id: "satellites", name: "Satellites (TLE Live)", category: "infrastructure", icon: <Satellite className="w-3 h-3" />, enabled: true, opacity: 0.9, color: "#c084fc", description: "CelesTrak live satellite positions" },
    // Human Activity
    { id: "population", name: "Population Density", category: "human", icon: <Users className="w-3 h-3" />, enabled: false, opacity: 0.5, color: "#3b82f6", description: "Global population density heatmap" },
    { id: "humanMovement", name: "Human Movement", category: "human", icon: <Navigation className="w-3 h-3" />, enabled: false, opacity: 0.6, color: "#6366f1", description: "Aggregated human mobility patterns" },
    { id: "events_human", name: "Human Events", category: "human", icon: <Bell className="w-3 h-3" />, enabled: false, opacity: 0.7, color: "#8b5cf6", description: "Gatherings, protests, migrations" },
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // MILITARY & DEFENSE (OFF BY DEFAULT - DEMO/TOGGLEABLE)
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    { id: "militaryAir", name: "[DEMO] Military Aircraft", category: "military", icon: <Plane className="w-3 h-3" />, enabled: false, opacity: 0.9, color: "#f59e0b", description: "Military aviation tracking" },
    { id: "militaryNavy", name: "[DEMO] Naval Vessels", category: "military", icon: <Anchor className="w-3 h-3" />, enabled: false, opacity: 0.9, color: "#eab308", description: "Military ship movements" },
    { id: "militaryBases", name: "[DEMO] Military Bases", category: "military", icon: <Shield className="w-3 h-3" />, enabled: false, opacity: 0.7, color: "#ca8a04", description: "Known military installations" },
    { id: "tanks", name: "[DEMO] Ground Forces", category: "military", icon: <CrosshairIcon className="w-3 h-3" />, enabled: false, opacity: 0.8, color: "#d97706", description: "Tanks, carriers, ground vehicles" },
    { id: "militaryDrones", name: "[DEMO] Military UAVs", category: "military", icon: <Target className="w-3 h-3" />, enabled: false, opacity: 0.8, color: "#fbbf24", description: "Military drone operations" },
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // POLLUTION & INDUSTRY (OFF BY DEFAULT)
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    { id: "factories", name: "Factories & Plants", category: "pollution", icon: <Factory className="w-3 h-3" />, enabled: false, opacity: 0.7, color: "#f97316", description: "Industrial facilities globally" },
    { id: "co2Sources", name: "COâ‚‚ Emission Sources", category: "pollution", icon: <Cloud className="w-3 h-3" />, enabled: false, opacity: 0.6, color: "#ef4444", description: "Major COâ‚‚ emitters and hotspots" },
    { id: "methaneSources", name: "Methane Sources", category: "pollution", icon: <Gauge className="w-3 h-3" />, enabled: false, opacity: 0.6, color: "#dc2626", description: "Methane leaks and emission sources" },
    { id: "oilGas", name: "Oil & Gas Infrastructure", category: "pollution", icon: <Fuel className="w-3 h-3" />, enabled: false, opacity: 0.5, color: "#78350f", description: "Refineries, pipelines, platforms" },
    { id: "powerPlants", name: "Power Plants", category: "pollution", icon: <Power className="w-3 h-3" />, enabled: false, opacity: 0.6, color: "#fbbf24", description: "Thermal, nuclear, renewable plants" },
    { id: "metalOutput", name: "Metal & Mining", category: "pollution", icon: <Wrench className="w-3 h-3" />, enabled: false, opacity: 0.5, color: "#a16207", description: "Mining operations and output" },
    { id: "waterPollution", name: "Water Contamination", category: "pollution", icon: <Droplet className="w-3 h-3" />, enabled: false, opacity: 0.6, color: "#0284c7", description: "Water pollution events and sources" },
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // NVIDIA EARTH-2 AI WEATHER LAYERS
    // Advanced AI-powered weather forecasting from NVIDIA Earth-2 platform
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    { id: "earth2Forecast", name: "âš¡ Earth-2 AI Forecast", category: "environment", icon: <Cloud className="w-3 h-3" />, enabled: false, opacity: 0.7, color: "#06b6d4", description: "NVIDIA Atlas: 15-day medium-range AI forecast" },
    { id: "earth2Nowcast", name: "âš¡ Earth-2 Nowcast", category: "environment", icon: <Radar className="w-3 h-3" />, enabled: false, opacity: 0.7, color: "#22d3ee", description: "NVIDIA StormScope: 0-6hr storm prediction" },
    { id: "earth2Spore", name: "âš¡ Spore Dispersal AI", category: "environment", icon: <Wind className="w-3 h-3" />, enabled: false, opacity: 0.6, color: "#10b981", description: "AI-powered fungal spore dispersal modeling" },
    { id: "earth2Wind", name: "âš¡ Wind Vectors", category: "environment", icon: <Wind className="w-3 h-3" />, enabled: false, opacity: 0.5, color: "#3b82f6", description: "High-resolution wind field visualization" },
    { id: "earth2Temp", name: "âš¡ Temperature Heatmap", category: "environment", icon: <Thermometer className="w-3 h-3" />, enabled: false, opacity: 0.6, color: "#ef4444", description: "AI-downscaled temperature overlay" },
    { id: "earth2Precip", name: "âš¡ Precipitation", category: "environment", icon: <Droplets className="w-3 h-3" />, enabled: false, opacity: 0.6, color: "#0ea5e9", description: "CorrDiff high-resolution precipitation" },
  ]);
  
  // Filter states
  const [eventFilter, setEventFilter] = useState<string>("all");
  
  // Earth-2 AI Weather state - use complete default filter with temperature enabled
  const [earth2Filter, setEarth2Filter] = useState<Earth2Filter>({
    ...DEFAULT_EARTH2_FILTER,
    showTemperature: true, // Enable temperature layer by default for visibility
    forecastHours: 24,     // Start at 24 hours forecast
  });
  
  // Use Earth-2 alerts hook for automatic updates
  const { alerts: fetchedEarth2Alerts } = useEarth2Alerts(60000);
  const [earth2Alerts, setEarth2Alerts] = useState<Array<{
    id: string;
    type: "weather" | "spore" | "severe_weather" | "nowcast";
    severity: "low" | "moderate" | "high" | "critical";
    title: string;
    description: string;
    location: { lat: number; lon: number; name?: string };
    timestamp: string;
    expiresAt?: string;
    source: "workflow_48" | "workflow_49" | "workflow_50" | "manual";
  }>>([]);
  
  // Sync fetched alerts to state
  useEffect(() => {
    if (fetchedEarth2Alerts.length > 0) {
      setEarth2Alerts(fetchedEarth2Alerts);
    }
  }, [fetchedEarth2Alerts]);
  
  const [earth2Loading, setEarth2Loading] = useState(false);
  const [earth2ForecastHours, setEarth2ForecastHours] = useState(0);
  const [earth2Available, setEarth2Available] = useState(false);
  
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // EARTH-2 STATUS CHECK - Fetch status on mount
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  useEffect(() => {
    const checkEarth2Status = async () => {
      try {
        const response = await fetch('/api/earth2');
        if (response.ok) {
          const data = await response.json();
          setEarth2Available(data.available !== false);
          console.log('[Earth-2] Status:', data.available ? 'ONLINE' : 'OFFLINE');
        }
      } catch (error) {
        console.log('[Earth-2] Status check failed:', error);
        setEarth2Available(false);
      }
    };
    
    if (mounted) {
      checkEarth2Status();
      // Check status every 60 seconds
      const interval = setInterval(checkEarth2Status, 60000);
      return () => clearInterval(interval);
    }
  }, [mounted]);
  
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // AUTO-ZOOM TO USER LOCATION ON PAGE LOAD
  // Uses browser Geolocation API to get user's position, then zooms to their
  // continent/region to immediately show relevant fungal data
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  useEffect(() => {
    if (hasAutoZoomed || !mounted) return;
    
    // Get user's location via browser Geolocation API
    if (typeof navigator !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log(`[CREP] User location detected: ${latitude.toFixed(4)}Â°, ${longitude.toFixed(4)}Â°`);
          setUserLocation({ lat: latitude, lng: longitude });
          
          // Determine appropriate zoom level based on continent
          // Zoom 4-5 for continent view, showing relevant fungal data
          const zoomLevel = 5;
          
          // If we have a map reference, fly to user's location
          if (mapRef && mapRef.flyTo) {
            mapRef.flyTo({
              center: [longitude, latitude],
              zoom: zoomLevel,
              duration: 2000, // 2 second smooth animation
              essential: true,
            });
            setHasAutoZoomed(true);
            console.log(`[CREP] Auto-zoomed to user location at zoom ${zoomLevel}`);
          }
        },
        (error) => {
          // Fallback: If user denies location, use IP-based approximation or default
          console.log(`[CREP] Geolocation unavailable: ${error.message}. Using default view.`);
          // Default to slightly zoomed out global view
          if (mapRef && mapRef.flyTo) {
            mapRef.flyTo({
              center: [0, 20],
              zoom: 2.5,
              duration: 1500,
            });
            setHasAutoZoomed(true);
          }
        },
        {
          enableHighAccuracy: false, // Don't need precise GPS, just general location
          timeout: 5000,
          maximumAge: 300000, // Cache for 5 minutes
        }
      );
    }
  }, [mounted, mapRef, hasAutoZoomed]);
  
  // Fetch data
  useEffect(() => {
    setMounted(true);
    
    async function fetchData() {
      setIsLoading(true);
      try {
        // Fetch global events - wrapped in try/catch for graceful failure
        try {
          const eventsRes = await fetch("/api/natureos/global-events");
          if (eventsRes.ok) {
            const data = await eventsRes.json();
            const formattedEvents = (data.events || [])
              .filter((e: any) => e.location?.latitude && e.location?.longitude)
              .map((e: any) => ({
                id: e.id,
                type: e.type,
                title: e.title,
                description: e.description,
                severity: e.severity,
                lat: e.location.latitude,
                lng: e.location.longitude,
                timestamp: e.timestamp,
                link: e.link,
                // Extended data from API
                source: e.source,
                sourceUrl: e.sourceUrl,
                magnitude: e.magnitude,
                locationName: e.location?.name,
                depth: e.location?.depth,
                windSpeed: e.type === "storm" ? e.magnitude : undefined,
                containment: e.description?.match(/Containment: (\d+)%/)?.[1] ? parseInt(e.description.match(/Containment: (\d+)%/)[1]) : undefined,
                affectedArea: e.affected?.area_km2,
                affectedPopulation: e.affected?.population,
              }));
            setGlobalEvents(formattedEvents);
          }
        } catch (e) {
          console.warn("[CREP] Failed to fetch global events:", e);
        }

        // Fetch MycoBrain devices - wrapped in try/catch
        try {
          const devicesRes = await fetch("/api/mycobrain/devices");
          if (devicesRes.ok) {
            const data = await devicesRes.json();
            // MycoBrain devices - ALWAYS default to San Diego 91910 (Chula Vista) for the primary device
            // The primary device is on the user's desk in Chula Vista, San Diego, CA 91910
            const formattedDevices = (data.devices || []).map((d: any, index: number) => {
              // Chula Vista 91910 coordinates: 32.6189, -117.0769
              // ALL devices without explicit GPS should default to San Diego HQ
              const SAN_DIEGO_91910 = { lat: 32.6189, lng: -117.0769 };
              
              // Only use device location if explicitly provided AND valid (not 0,0 or null)
              const hasValidLocation = d.location?.lat && d.location?.lng && 
                Math.abs(d.location.lat) > 0.1 && Math.abs(d.location.lng) > 0.1 &&
                // Reject Vancouver default (49, -123) as it's not correct
                !(Math.abs(d.location.lat - 49) < 1 && Math.abs(d.location.lng + 123) < 1);
              
              // Extract sensor data from the device response
              const sensorData = d.sensor_data || {};
              
              return {
                id: d.device_id || d.id || `device-${index}`,
                name: d.info?.board || d.name || `MycoBrain Device ${index + 1}`,
                // ALWAYS use San Diego unless there's a valid explicit location
                lat: hasValidLocation ? d.location.lat : SAN_DIEGO_91910.lat,
                lng: hasValidLocation ? d.location.lng : SAN_DIEGO_91910.lng,
                status: d.connected ? "online" : "offline",
                port: d.port,
                firmware: sensorData.firmware_version || d.info?.firmware,
                protocol: d.protocol || "MDP",
                // Include sensor data for display
                sensorData: {
                  temperature: sensorData.temperature,
                  humidity: sensorData.humidity,
                  pressure: sensorData.pressure,
                  gasResistance: sensorData.gas_resistance,
                  iaq: sensorData.iaq,
                  iaqAccuracy: sensorData.iaq_accuracy,
                  co2Equivalent: sensorData.co2_equivalent,
                  vocEquivalent: sensorData.voc_equivalent,
                  uptime: sensorData.uptime_seconds || sensorData.uptime_s,
                },
                lastUpdate: sensorData.last_update || new Date().toISOString(),
              };
            });
            console.log(`[CREP] Loaded ${formattedDevices.length} MycoBrain devices (Chula Vista 91910)`);
            setDevices(formattedDevices);
          }
        } catch (e) {
          console.warn("[CREP] Failed to fetch MycoBrain devices:", e);
        }

        // Fetch Elephant Conservation Demo Data (Feb 05, 2026)
        try {
          const conservationRes = await fetch("/api/crep/demo/elephant-conservation");
          if (conservationRes.ok) {
            const data = await conservationRes.json();
            if (data.ok) {
              // Set elephants
              setElephants(data.elephants || []);
              // Set fence segments
              setFenceSegments(data.fenceSegments || []);
              // Convert environment monitors to presence readings (deduplicated)
              const readings: PresenceReading[] = (data.environmentMonitors || []).map((m: any) => ({
                monitorId: m.id,
                monitorName: m.name,
                zone: m.zone,
                lat: m.lat,
                lng: m.lng,
                presenceDetected: m.readings?.presenceDetected || false,
                lastMovement: m.readings?.lastMovement || new Date().toISOString(),
                motionIntensity: m.readings?.presenceDetected ? 75 : 0,
                smellDetected: m.readings?.smellDetected,
              }));
              // Deduplicate by monitorId
              const seenMonitors = new Set<string>();
              const uniqueReadings = readings.filter(r => {
                if (seenMonitors.has(r.monitorId)) return false;
                seenMonitors.add(r.monitorId);
                return true;
              });
              setPresenceReadings(uniqueReadings);
              // Add demo devices to devices list (deduplicated to prevent React key errors)
              const demoDevices: Device[] = (data.devices || []).map((d: any) => ({
                id: d.id,
                name: d.name,
                lat: d.lat,
                lng: d.lng,
                status: d.status as "online" | "offline",
                type: d.deviceType,
                port: d.port,
                firmware: d.firmware,
                protocol: d.protocol,
              }));
              setDevices(prev => {
                // Filter out any existing demo devices to prevent duplicates
                const existingIds = new Set(prev.map(d => d.id));
                const newDevices = demoDevices.filter(d => !existingIds.has(d.id));
                return [...prev, ...newDevices];
              });
              console.log(`[CREP] Loaded ${data.elephants?.length || 0} elephants, ${data.fenceSegments?.length || 0} fence segments (Demo)`);
            }
          }
        } catch (e) {
          console.warn("[CREP] Failed to fetch elephant conservation demo:", e);
        }

        // Fetch aircraft data from FlightRadar24 API (NO LIMIT - fetch all available)
        const aviationLayerEnabled = true; // Always fetch, layer toggle controls visibility
        if (aviationLayerEnabled) {
          try {
            // Fetch without limit to get ALL available aircraft data
            const aircraftRes = await fetch("/api/oei/flightradar24");
            if (aircraftRes.ok) {
              const data = await aircraftRes.json();
              if (data.aircraft && Array.isArray(data.aircraft)) {
                console.log(`[CREP] Loaded ${data.aircraft.length} aircraft from FlightRadar24`);
                setAircraft(data.aircraft);
              }
            }
          } catch (e) {
            console.error("Failed to fetch aircraft data:", e);
          }
        }

        // Fetch vessel data from AISstream API (NO LIMIT - fetch all available)
        const shipsLayerEnabled = true;
        if (shipsLayerEnabled) {
          try {
            // Fetch without limit to get ALL available vessel data
            const vesselsRes = await fetch("/api/oei/aisstream");
            if (vesselsRes.ok) {
              const data = await vesselsRes.json();
              if (data.vessels && Array.isArray(data.vessels)) {
                console.log(`[CREP] Loaded ${data.vessels.length} vessels from AISstream${data.sample ? ' (sample data)' : ''}`);
                setVessels(data.vessels);
              }
            }
          } catch (e) {
            console.error("Failed to fetch vessel data:", e);
          }
        }

        // Fetch satellite data from CelesTrak API - ALL categories for comprehensive data
        const satelliteLayerEnabled = true;
        if (satelliteLayerEnabled) {
          try {
            // Fetch multiple satellite categories in parallel (NO LIMITS)
            const categories = ["stations", "starlink", "weather", "gnss", "active", "debris"];
            const allSatellites: SatelliteEntity[] = [];
            
            await Promise.all(
              categories.map(async (category) => {
                try {
                  // NO LIMIT - fetch all available satellites for each category
                  const res = await fetch(`/api/oei/satellites?category=${category}`);
                  if (res.ok) {
                    const data = await res.json();
                    if (data.satellites && Array.isArray(data.satellites)) {
                      console.log(`[CREP] Loaded ${data.satellites.length} ${category} satellites`);
                      allSatellites.push(...data.satellites);
                    }
                  }
                } catch (e) {
                  console.error(`Failed to fetch ${category} satellites:`, e);
                }
              })
            );
            
            // Deduplicate by satellite ID
            const uniqueSatellites = Array.from(
              new Map(allSatellites.map(s => [s.id, s])).values()
            );
            console.log(`[CREP] Total unique satellites: ${uniqueSatellites.length}`);
            setSatellites(uniqueSatellites);
          } catch (e) {
            console.error("Failed to fetch satellite data:", e);
          }
        }

        // Fetch space weather data for NOAA scales
        try {
          const spaceWxRes = await fetch("/api/oei/space-weather");
          if (spaceWxRes.ok) {
            const spaceWxData = await spaceWxRes.json();
            if (spaceWxData.scales) {
              setNoaaScales({
                radio: spaceWxData.scales.radio?.current ?? 0,
                solar: spaceWxData.scales.solar?.current ?? 0,
                geomag: spaceWxData.scales.geomagnetic?.current ?? 0,
              });
            }
          }
        } catch (e) {
          console.error("Failed to fetch space weather data:", e);
        }

        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        // FETCH FUNGAL OBSERVATIONS - PRIMARY DATA SOURCE (MINDEX - NO LIMIT)
        // MINDEX contains THOUSANDS of pre-imported iNaturalist/GBIF observations
        // with photos, coordinates, names, timestamps, and source links
        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        try {
          // Fetch ALL fungal data from MINDEX - no artificial limit!
          // MINDEX is the primary source with pre-imported iNaturalist/GBIF data
          console.log("[CREP] Fetching fungal observations from MINDEX (no limit)...");
          const fungalRes = await fetch("/api/crep/fungal");
          if (fungalRes.ok) {
            const fungalData = await fungalRes.json();
            if (fungalData.observations && Array.isArray(fungalData.observations)) {
              // Map to FungalObservation format expected by FungalMarker
              const formattedObs: FungalObservation[] = fungalData.observations.map((obs: any) => ({
                id: obs.id,
                observed_on: obs.timestamp || obs.observed_on,
                latitude: obs.latitude || obs.lat,
                longitude: obs.longitude || obs.lng,
                species: obs.commonName || obs.species || obs.scientificName || "Unknown",
                taxon_id: obs.taxon_id,
                taxon: {
                  id: obs.taxon_id || 0,
                  name: obs.scientificName || obs.species || "Unknown",
                  preferred_common_name: obs.commonName || obs.species,
                  rank: "species",
                },
                photos: obs.imageUrl || obs.thumbnailUrl ? [{ 
                  id: 1, 
                  url: obs.imageUrl || obs.thumbnailUrl,
                  license: "CC-BY-NC"
                }] : [],
                quality_grade: obs.verified ? "research" : "needs_id",
                user: obs.observer,
                // Source information for rich display
                source: obs.source,
                location: obs.location,
                habitat: obs.habitat,
                notes: obs.notes,
                // Source URL for "View on iNaturalist" / "View on GBIF" links
                sourceUrl: obs.sourceUrl,
                externalId: obs.externalId,
              }));
              
              const sourceInfo = fungalData.meta?.sources || {};
              const dataSource = fungalData.meta?.dataSource || "unknown";
              console.log(`[CREP] Loaded ${formattedObs.length} fungal observations (${dataSource})`);
              console.log(`[CREP] Sources breakdown: MINDEX=${sourceInfo.mindex || 0}, iNaturalist=${sourceInfo.iNaturalist || 0}, GBIF=${sourceInfo.gbif || 0}`);
              
              setFungalObservations(formattedObs);
              setFungalLoading(false);
            }
          } else {
            console.error("[CREP] Failed to fetch from /api/crep/fungal:", fungalRes.status);
            // Fallback: try iNaturalist directly for San Diego area at minimum
            console.log("[CREP] Using iNaturalist fallback...");
            const fallbackRes = await fetch("/api/crep/fungal?fallback=true");
            if (fallbackRes.ok) {
              const data = await fallbackRes.json();
              if (data.observations) {
                console.log(`[CREP] Fallback: Loaded ${data.observations.length} fungal observations`);
                setFungalObservations(data.observations);
                setFungalLoading(false);
              }
            }
          }
        } catch (e) {
          console.error("[CREP] Failed to fetch fungal observations:", e);
          setFungalLoading(false);
        }
      } catch (error) {
        console.error("Failed to fetch CREP data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fullscreen handlers
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // CLICK-AWAY HANDLER: Dismiss popups when clicking outside
  // Uses click event in BUBBLING phase so that marker stopPropagation() works
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  useEffect(() => {
    const handleClickAway = (e: MouseEvent) => {
      const target = e.target;
      
      // Skip if no popups are selected - nothing to dismiss
      if (!selectedEvent && !selectedFungal) return;
      
      // Guard: Ensure target is an Element with closest() method
      if (!target || !(target instanceof Element)) {
        return;
      }
      
      // Check if click is inside any popup (content + close button + tip)
      const isInsidePopup = target.closest(".maplibregl-popup") !== null;
      
      // Check if click is inside a marker button (multiple selectors for robustness)
      const isInsideMarker = target.closest('[data-marker]') !== null || 
                             target.closest('.maplibregl-marker') !== null;

      // Check if click is inside side panels (Intel Feed / right panel)
      const isInsidePanel = target.closest('[data-panel]') !== null;
      
      // Check if click is inside Intel Feed event cards
      const isInsideEventCard = target.closest('[data-event-card]') !== null;
      
      // If clicking outside popup, marker, panel, and event cards - dismiss
      if (!isInsidePopup && !isInsideMarker && !isInsidePanel && !isInsideEventCard) {
        console.log("[CREP] Click-away (doc): dismissing popups");
        setSelectedEvent(null);
        setSelectedFungal(null);
      }
    };

    // Use click event in BUBBLING phase (false/default) so that 
    // marker stopPropagation() can prevent this handler from running
    document.addEventListener('click', handleClickAway, false);
    return () => document.removeEventListener('click', handleClickAway, false);
  }, [selectedEvent, selectedFungal]);

  // Layer handlers
  const toggleLayer = useCallback((layerId: string) => {
    setLayers(prev => prev.map(l => 
      l.id === layerId ? { ...l, enabled: !l.enabled } : l
    ));
  }, []);

  const setLayerOpacity = useCallback((layerId: string, opacity: number) => {
    setLayers(prev => prev.map(l => 
      l.id === layerId ? { ...l, opacity } : l
    ));
  }, []);

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // LOD (LEVEL OF DETAIL) FILTERING - Progressive disclosure system
  // 
  // DESIGN PRINCIPLE: When zoomed in, show MORE markers, not fewer!
  // The user expectation is: zoom in = see more detail = more markers
  // 
  // What's shown in Intel Feed MUST match what's rendered on the map.
  // This is critical for user trust and accurate data representation.
  //
  // Zoom Level Strategy (GENEROUS at higher zoom):
  //   0-2  (world view)       â†’ 50 markers   (global sampling)
  //   2-3  (multi-continent)  â†’ 200 markers  
  //   3-4  (continent view)   â†’ 500 markers
  //   4-5  (large country)    â†’ 1500 markers
  //   5-6  (country/region)   â†’ 3000 markers
  //   6-7  (state/province)   â†’ 6000 markers
  //   7+   (local view)       â†’ ALL in viewport (up to 15000 cap)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const visibleFungalObservations = useMemo(() => {
    // Early return with minimal markers if no bounds yet (Feb 12, 2026 - added debug logging)
    if (!mapBounds || fungalObservations.length === 0) {
      console.log(`[CREP/LOD] No bounds or no observations - showing first 50`);
      return fungalObservations.slice(0, 50);
    }
    
    // Validate bounds are reasonable (Feb 12, 2026 - prevent NaN/Infinity issues)
    const boundsValid = 
      isFinite(mapBounds.north) && isFinite(mapBounds.south) &&
      isFinite(mapBounds.east) && isFinite(mapBounds.west) &&
      mapBounds.north > mapBounds.south;
    
    if (!boundsValid) {
      console.warn(`[CREP/LOD] Invalid bounds detected:`, mapBounds);
      return fungalObservations.slice(0, 100);
    }
    
    // Step 1: Filter to viewport bounds FIRST (fast culling)
    // Add small padding to prevent markers at exact edges from disappearing (Feb 12, 2026)
    const padding = 0.001; // ~100m at equator
    const inViewport = fungalObservations.filter(obs => {
      const lat = obs.latitude;
      const lng = obs.longitude;
      
      // Skip observations with invalid coordinates
      if (!isFinite(lat) || !isFinite(lng)) return false;
      
      // Handle international date line crossing
      if (mapBounds.west > mapBounds.east) {
        return lat >= (mapBounds.south - padding) && lat <= (mapBounds.north + padding) &&
               (lng >= (mapBounds.west - padding) || lng <= (mapBounds.east + padding));
      }
      
      return lat >= (mapBounds.south - padding) && lat <= (mapBounds.north + padding) &&
             lng >= (mapBounds.west - padding) && lng <= (mapBounds.east + padding);
    });
    
    // Step 2: Zoom-based limits - MORE generous at higher zoom levels
    let maxMarkers: number;
    let lodLevel: string;
    if (mapZoom < 2) {
      maxMarkers = 50;
      lodLevel = "world";
    } else if (mapZoom < 3) {
      maxMarkers = 200;
      lodLevel = "multi-continent";
    } else if (mapZoom < 4) {
      maxMarkers = 500;
      lodLevel = "continent";
    } else if (mapZoom < 5) {
      maxMarkers = 1500;
      lodLevel = "large-country";
    } else if (mapZoom < 6) {
      maxMarkers = 3000;
      lodLevel = "country";
    } else if (mapZoom < 7) {
      maxMarkers = 6000;
      lodLevel = "state";
    } else {
      // At high zoom, show everything (with performance cap)
      maxMarkers = 15000;
      lodLevel = "local";
    }
    
    // Step 3: If within limit, show ALL in viewport
    if (inViewport.length <= maxMarkers) {
      // Log occasionally for debugging
      if (Math.random() < 0.05) {
        console.log(`[CREP/LOD] Zoom ${mapZoom.toFixed(1)} (${lodLevel}) â†’ ALL ${inViewport.length} in viewport`);
      }
      return inViewport;
    }
    
    // Step 4: Spatial grid sampling for even geographic distribution (Feb 12, 2026 - added safeguards)
    const gridSize = Math.max(2, Math.ceil(Math.sqrt(maxMarkers)));
    const latRange = Math.max(0.0001, mapBounds.north - mapBounds.south); // Prevent div-by-zero
    const lngRange = Math.max(0.0001, mapBounds.east > mapBounds.west 
      ? mapBounds.east - mapBounds.west 
      : (360 - mapBounds.west + mapBounds.east));
    
    const cellWidth = lngRange / gridSize;
    const cellHeight = latRange / gridSize;
    
    // Skip grid sampling if cells would be too small (very high zoom) - just return subset
    if (cellWidth < 0.00001 || cellHeight < 0.00001) {
      console.log(`[CREP/LOD] Grid cells too small at zoom ${mapZoom.toFixed(1)}, returning first ${maxMarkers}`);
      return inViewport.slice(0, maxMarkers);
    }
    
    // Grid-based sampling: one representative per cell
    const grid = new Map<string, typeof inViewport[0]>();
    
    for (const obs of inViewport) {
      // Clamp cell coordinates to valid range (Feb 12, 2026 - prevent overflow)
      const rawCellX = (obs.longitude - mapBounds.west + (mapBounds.west > mapBounds.east ? 360 : 0)) / cellWidth;
      const rawCellY = (obs.latitude - mapBounds.south) / cellHeight;
      const cellX = Math.max(0, Math.min(gridSize - 1, Math.floor(rawCellX)));
      const cellY = Math.max(0, Math.min(gridSize - 1, Math.floor(rawCellY)));
      const cellKey = `${cellX},${cellY}`;
      
      // Keep the observation with highest quality (research grade preferred)
      const existing = grid.get(cellKey);
      if (!existing || (obs.quality_grade === "research" && existing.quality_grade !== "research")) {
        grid.set(cellKey, obs);
      }
    }
    
    const sampled = Array.from(grid.values()).slice(0, maxMarkers);
    
    // Log sampling info
    if (Math.random() < 0.05) {
      console.log(`[CREP/LOD] Zoom ${mapZoom.toFixed(1)} (${lodLevel}) â†’ Sampled ${sampled.length}/${inViewport.length} in viewport`);
    }
    
    return sampled;
  }, [fungalObservations, mapZoom, mapBounds]);
  
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // SMART MAP AUTO-PAN: Fungal Marker Selection Handler
  // When a user clicks a fungal marker, the popup is attached directly to the marker.
  // This handler ensures the map pans to keep the popup visible and not behind panels.
  // Panel widths: Left = 288px (w-72), Right = 320px (w-80) + 12px margins each
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const handleSelectFungal = useCallback((obs: FungalObservation | null) => {
    // Clear event selection when selecting fungal
    setSelectedEvent(null);

    // If deselecting, just clear selection
    if (!obs) {
      setSelectedFungal(null);
      return;
    }
    
    // Toggle selection
    if (selectedFungal?.id === obs.id) {
      setSelectedFungal(null);
      return;
    }
    
    // Select the new observation
    setSelectedFungal(obs);
    
    // Smart pan: Ensure the marker + popup are visible and not behind panels
    if (mapRef && mapRef.getContainer) {
      const container = mapRef.getContainer();
      if (!container) return;
      
      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;
      
      // Calculate visible viewport accounting for panels
      // Left panel: 288px + 12px margin = 300px when open
      // Right panel: 320px + 12px margin = 332px when open
      const leftPanelWidth = leftPanelOpen ? 300 : 0;
      const rightPanelWidth = rightPanelOpen ? 340 : 0;
      
      // Popup dimensions (approximate) - popup is ~320px wide, ~250px tall
      const popupWidth = 320;
      const popupHeight = 280;
      
      // Convert marker lat/lng to screen position
      const point = mapRef.project([obs.longitude, obs.latitude]);
      
      // Define the "safe zone" where the marker + popup should be visible
      // Adding padding for the popup which appears ABOVE the marker
      const safeZone = {
        left: leftPanelWidth + 20, // 20px extra padding
        right: containerWidth - rightPanelWidth - 20,
        top: popupHeight + 40, // popup height + padding
        bottom: containerHeight - 60 // bottom status bar area
      };
      
      // Calculate if pan is needed
      let panX = 0;
      let panY = 0;
      
      // Check if marker is too far left (behind left panel)
      if (point.x < safeZone.left) {
        panX = safeZone.left - point.x + popupWidth / 2;
      }
      // Check if marker is too far right (behind right panel)
      else if (point.x > safeZone.right - popupWidth / 2) {
        panX = safeZone.right - popupWidth / 2 - point.x;
      }
      
      // Check if marker is too close to top (popup would go off screen)
      if (point.y < safeZone.top) {
        panY = safeZone.top - point.y;
      }
      // Check if marker is too close to bottom
      else if (point.y > safeZone.bottom) {
        panY = safeZone.bottom - point.y;
      }
      
      // If pan is needed, smoothly pan the map
      if (Math.abs(panX) > 10 || Math.abs(panY) > 10) {
        mapRef.panBy([-panX, -panY], { duration: 300 });
      }
    }
  }, [mapRef, leftPanelOpen, rightPanelOpen, selectedFungal]);

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // SMART MAP AUTO-PAN: Event Marker Selection Handler
  // When a user clicks an event marker or event in the list, the popup shows attached.
  // This handler ensures the map pans to keep the popup visible and not behind panels.
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const handleSelectEvent = useCallback((event: GlobalEvent | null, shouldFlyTo = false) => {
    // Clear fungal selection when selecting an event
    setSelectedFungal(null);
    
    // If deselecting, just clear selection
    if (!event) {
      setSelectedEvent(null);
      return;
    }
    
    // Toggle selection if same event
    if (selectedEvent?.id === event.id) {
      setSelectedEvent(null);
      return;
    }
    
    // Select the new event
    setSelectedEvent(event);
    
    // If shouldFlyTo, fly to the event location first
    if (shouldFlyTo && mapRef) {
      mapRef.flyTo({
        center: [event.lng, event.lat],
        zoom: Math.max(mapRef.getZoom?.() || 8, 8), // At least zoom level 8
        duration: 700,
      });
      return; // Pan will happen after flyTo due to flyend event
    }
    
    // Smart pan: Ensure the marker + popup are visible and not behind panels
    if (mapRef && mapRef.getContainer) {
      // Short delay to ensure the popup has rendered
      setTimeout(() => {
        const container = mapRef.getContainer();
        if (!container) return;
        
        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;
        
        // Calculate visible viewport accounting for panels
        const leftPanelWidth = leftPanelOpen ? 300 : 0;
        const rightPanelWidth = rightPanelOpen ? 340 : 0;
        
        // Event popup dimensions (larger than fungal popup)
        const popupWidth = 380;
        const popupHeight = 400;
        
        // Convert marker lat/lng to screen position
        const point = mapRef.project([event.lng, event.lat]);
        
        // Define the "safe zone" where the marker + popup should be visible
        const safeZone = {
          left: leftPanelWidth + 20,
          right: containerWidth - rightPanelWidth - 20,
          top: popupHeight + 60,
          bottom: containerHeight - 60
        };
        
        // Calculate if pan is needed
        let panX = 0;
        let panY = 0;
        
        // Check if marker is too far left (behind left panel)
        if (point.x < safeZone.left) {
          panX = safeZone.left - point.x + popupWidth / 2;
        }
        // Check if marker is too far right (behind right panel)
        else if (point.x > safeZone.right - popupWidth / 2) {
          panX = safeZone.right - popupWidth / 2 - point.x;
        }
        
        // Check if marker is too close to top (popup would go off screen)
        if (point.y < safeZone.top) {
          panY = safeZone.top - point.y;
        }
        // Check if marker is too close to bottom
        else if (point.y > safeZone.bottom) {
          panY = safeZone.bottom - point.y;
        }
        
        // If pan is needed, smoothly pan the map
        if (Math.abs(panX) > 10 || Math.abs(panY) > 10) {
          mapRef.panBy([-panX, -panY], { duration: 300 });
        }
      }, 100);
    }
  }, [mapRef, leftPanelOpen, rightPanelOpen, selectedEvent]);

  // Clear all selections when clicking on empty map area
  const handleMapClick = useCallback(() => {
    // Only clear if something is selected
    if (selectedEvent || selectedFungal) {
      setSelectedEvent(null);
      setSelectedFungal(null);
    }
  }, [selectedEvent, selectedFungal]);

  // MYCA message handler
  const handleMycaMessage = useCallback((content: string) => {
    const userMessage: MYCAMessage = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMycaMessages(prev => [...prev, userMessage]);
    
    // Simulate MYCA response
    setTimeout(() => {
      const responses = [
        "I've analyzed the current event distribution. There are clusters of seismic activity along the Pacific Ring of Fire, and I'm detecting increased fungal activity near 3 of our monitoring stations.",
        "Based on current data patterns, I recommend focusing on the Southeast Asian region where we have 12 devices detecting unusual spore concentrations.",
        "I've cross-referenced the event data with MINDEX records. The fungal bloom events correlate with the recent storm systems in that region.",
      ];
      const assistantMessage: MYCAMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date(),
      };
      setMycaMessages(prev => [...prev, assistantMessage]);
    }, 1500);
  }, []);

  // Filter events by type
  const typeFilteredEvents = globalEvents.filter(event => {
    if (eventFilter !== "all" && event.type !== eventFilter) return false;
    return true;
  });

  // LOD (Level of Detail) filtering for events - same system as fungal data
  const visibleEvents = useMemo(() => {
    // Early return with minimal markers if no bounds yet
    if (!mapBounds || typeFilteredEvents.length === 0) {
      return typeFilteredEvents.slice(0, 30);
    }
    
    // Step 1: Filter to viewport bounds FIRST (fast culling)
    const inViewport = typeFilteredEvents.filter(event => {
      const lat = event.lat;
      const lng = event.lng;
      
      // Skip events with invalid coordinates
      if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) return false;
      
      // Handle international date line crossing
      if (mapBounds.west > mapBounds.east) {
        return lat >= mapBounds.south && lat <= mapBounds.north &&
               (lng >= mapBounds.west || lng <= mapBounds.east);
      }
      
      return lat >= mapBounds.south && lat <= mapBounds.north &&
             lng >= mapBounds.west && lng <= mapBounds.east;
    });
    
    // Step 2: Zoom-based limits - events are typically fewer than fungal data
    // so limits are more conservative
    let maxEvents: number;
    if (mapZoom < 2) {
      maxEvents = 20;  // World view - only most critical events
    } else if (mapZoom < 3) {
      maxEvents = 50;
    } else if (mapZoom < 4) {
      maxEvents = 100;
    } else if (mapZoom < 5) {
      maxEvents = 150;
    } else if (mapZoom < 6) {
      maxEvents = 200;
    } else {
      maxEvents = 500; // Show all at high zoom
    }
    
    // Step 3: If within limit, show ALL in viewport
    if (inViewport.length <= maxEvents) {
      return inViewport;
    }
    
    // Step 4: Prioritize by severity (critical/extreme first) then sample
    const critical = inViewport.filter(e => e.severity === "critical" || e.severity === "extreme");
    const high = inViewport.filter(e => e.severity === "high");
    const rest = inViewport.filter(e => e.severity !== "critical" && e.severity !== "extreme" && e.severity !== "high");
    
    // Take all critical, then fill with high, then rest
    const result = [...critical];
    if (result.length < maxEvents) {
      result.push(...high.slice(0, maxEvents - result.length));
    }
    if (result.length < maxEvents) {
      result.push(...rest.slice(0, maxEvents - result.length));
    }
    
    return result;
  }, [typeFilteredEvents, mapZoom, mapBounds]);

  // For backward compatibility - use visibleEvents for rendering
  const filteredEvents = visibleEvents;

  // Stats
  const criticalCount = globalEvents.filter(e => e.severity === "critical" || e.severity === "extreme").length;
  const highCount = globalEvents.filter(e => e.severity === "high").length;
  const onlineDevices = devices.filter(d => d.status === "online").length;
  
  const stats = {
    events: globalEvents.length,
    devices: onlineDevices,
    critical: criticalCount,
    kingdoms: {
      fungi: 1247000,
      plants: 380000,
      birds: 10000,
      insects: 950000,
      animals: 68000,
      marine: 245000,
    },
  };

  // ===========================================================================
  // FILTER AIRCRAFT based on aircraftFilter state
  // Uses intelligent sampling to prevent map clutter while maintaining coverage
  // ===========================================================================
  const filteredAircraft = useMemo(() => {
    // First, apply type/altitude filters
    let filtered = aircraft.filter(ac => {
      // Filter by airborne/ground status
      const isOnGround = ac.onGround === true;
      if (!aircraftFilter.showAirborne && !isOnGround) return false;
      if (!aircraftFilter.showGround && isOnGround) return false;
      
      // Filter by altitude range (altitude is in feet)
      const altitude = ac.altitude ?? 0;
      if (altitude < aircraftFilter.minAltitude || altitude > aircraftFilter.maxAltitude) return false;
      
      // Filter by aircraft category (commercial, cargo, military, private)
      const category = ac.tags?.find(t => 
        ["Wide-body", "Narrow-body", "Regional", "Cargo", "Helicopter", "Aircraft"].includes(t)
      ) || "Aircraft";
      const isCargo = category === "Cargo" || ac.aircraftType?.includes("F");
      const isMilitary = ac.callsign?.startsWith("RCH") || ac.callsign?.startsWith("DUKE") || 
                         ac.registration?.startsWith("N/A") || false;
      const isPrivate = !ac.airline && !isCargo && !isMilitary;
      const isCommercial = !!ac.airline && !isCargo && !isMilitary;
      
      if (!aircraftFilter.showCargo && isCargo) return false;
      if (!aircraftFilter.showMilitary && isMilitary) return false;
      if (!aircraftFilter.showPrivate && isPrivate) return false;
      if (!aircraftFilter.showCommercial && isCommercial) return false;
      
      return true;
    });
    
    // Intelligent density reduction: limit to 250 aircraft for readable display
    // Sample evenly to maintain global coverage
    const MAX_DISPLAY = 250;
    if (filtered.length > MAX_DISPLAY) {
      // Sample every Nth aircraft to get even distribution
      const step = Math.ceil(filtered.length / MAX_DISPLAY);
      filtered = filtered.filter((_, idx) => idx % step === 0);
    }
    
    return filtered;
  }, [aircraft, aircraftFilter]);

  // ===========================================================================
  // FILTER VESSELS based on vesselFilter state  
  // ===========================================================================
  const filteredVessels = useMemo(() => {
    return vessels.filter(v => {
      // Get ship type
      const shipType = typeof v.shipType === "number" ? v.shipType : 0;
      const shipTypeStr = (v.properties?.shipType || v.description || "").toLowerCase();
      
      const isCargo = (shipType >= 70 && shipType <= 79) || shipTypeStr.includes("cargo");
      const isTanker = (shipType >= 80 && shipType <= 89) || shipTypeStr.includes("tanker");
      const isPassenger = (shipType >= 60 && shipType <= 69) || shipTypeStr.includes("passenger");
      const isFishing = shipType === 30 || shipTypeStr.includes("fishing");
      const isTug = shipType === 52 || shipTypeStr.includes("tug");
      const isMilitary = shipType === 35 || shipTypeStr.includes("military");
      
      if (!vesselFilter.showCargo && isCargo) return false;
      if (!vesselFilter.showTanker && isTanker) return false;
      if (!vesselFilter.showPassenger && isPassenger) return false;
      if (!vesselFilter.showFishing && isFishing) return false;
      if (!vesselFilter.showTug && isTug) return false;
      if (!vesselFilter.showMilitary && isMilitary) return false;
      
      // Filter by minimum speed
      const speed = v.sog ?? v.properties?.sog ?? 0;
      if (speed < vesselFilter.minSpeed) return false;
      
      return true;
    });
  }, [vessels, vesselFilter]);

  // ===========================================================================
  // FILTER SATELLITES based on satelliteFilter state
  // ===========================================================================
  const filteredSatellites = useMemo(() => {
    return satellites.filter(sat => {
      const objectType = (sat.objectType || sat.properties?.objectType || "").toLowerCase();
      const name = (sat.name || "").toLowerCase();
      
      const isStation = objectType.includes("station") || name.includes("iss") || name.includes("tiangong");
      const isWeather = objectType.includes("weather") || name.includes("goes") || name.includes("noaa");
      const isComms = objectType.includes("communication");
      const isGPS = objectType.includes("navigation") || name.includes("gps") || name.includes("glonass") || name.includes("galileo");
      const isStarlink = name.includes("starlink");
      const isDebris = objectType.includes("debris") || name.includes("deb");
      
      if (!satelliteFilter.showStations && isStation) return false;
      if (!satelliteFilter.showWeather && isWeather) return false;
      if (!satelliteFilter.showComms && isComms) return false;
      if (!satelliteFilter.showGPS && isGPS) return false;
      if (!satelliteFilter.showStarlink && isStarlink) return false;
      if (!satelliteFilter.showDebris && isDebris) return false;
      
      // Filter by orbit type
      const orbitType = sat.orbitType || sat.properties?.orbitType || "";
      const orbitMatch = satelliteFilter.orbitTypes.length === 0 || 
        satelliteFilter.orbitTypes.some(ot => orbitType.toUpperCase().includes(ot));
      if (!orbitMatch) return false;
      
      return true;
    });
  }, [satellites, satelliteFilter]);

  const deckEntities = useMemo<UnifiedEntity[]>(() => {
    const sourceEntities: UnifiedEntity[] = [
      ...filteredAircraft.map((aircraftEntity) => ({
        id: aircraftEntity.id,
        type: "aircraft" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [
            aircraftEntity.location?.longitude ?? 0,
            aircraftEntity.location?.latitude ?? 0
          ] as [number, number],
        },
        state: {
          heading: aircraftEntity.heading,
          altitude: aircraftEntity.altitude,
          velocity: aircraftEntity.velocity
            ? {
                x: Math.cos(((aircraftEntity.heading ?? 0) * Math.PI) / 180) * aircraftEntity.velocity,
                y: Math.sin(((aircraftEntity.heading ?? 0) * Math.PI) / 180) * aircraftEntity.velocity,
              }
            : undefined,
        },
        time: {
          observed_at: aircraftEntity.lastSeen,
          valid_from: aircraftEntity.lastSeen,
        },
        confidence: 1,
        source: "opensky",
        properties: aircraftEntity.properties || {},
        s2_cell: "",
      })),
      ...filteredVessels.map((vesselEntity) => ({
        id: vesselEntity.id,
        type: "vessel" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [
            vesselEntity.location?.longitude ?? 0,
            vesselEntity.location?.latitude ?? 0
          ] as [number, number],
        },
        state: {
          heading: vesselEntity.cog,
          velocity:
            vesselEntity.sog !== undefined
              ? {
                  x: Math.cos(((vesselEntity.cog ?? 0) * Math.PI) / 180) * vesselEntity.sog,
                  y: Math.sin(((vesselEntity.cog ?? 0) * Math.PI) / 180) * vesselEntity.sog,
                }
              : undefined,
        },
        time: {
          observed_at: vesselEntity.timestamp,
          valid_from: vesselEntity.timestamp,
        },
        confidence: 1,
        source: "ais",
        properties: vesselEntity.properties || {},
        s2_cell: "",
      })),
      ...filteredSatellites.map((satelliteEntity) => ({
        id: satelliteEntity.id,
        type: "satellite" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [
            satelliteEntity.location?.longitude ?? satelliteEntity.estimatedPosition?.longitude ?? 0,
            satelliteEntity.location?.latitude ?? satelliteEntity.estimatedPosition?.latitude ?? 0
          ] as [number, number],
        },
        state: {
          altitude: satelliteEntity.altitude,
          heading: satelliteEntity.heading,
        },
        time: {
          observed_at: satelliteEntity.lastUpdate,
          valid_from: satelliteEntity.lastUpdate,
        },
        confidence: 1,
        source: "norad",
        properties: satelliteEntity.properties || {},
        s2_cell: "",
      })),
      ...visibleFungalObservations.map((observation) => ({
        id: `fungal-${observation.id}`,
        type: "fungal" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [observation.longitude, observation.latitude] as [number, number],
        },
        state: {},
        time: {
          observed_at: observation.observed_on ?? new Date().toISOString(),
          valid_from: observation.observed_on ?? new Date().toISOString(),
        },
        confidence: 0.95,
        source: "mindex",
        properties: observation,
        s2_cell: "",
      })),
    ];

    const byId = new Map<string, UnifiedEntity>();
    for (const entity of sourceEntities) byId.set(entity.id, entity);
    for (const streamed of streamedEntities) byId.set(streamed.id, streamed);
    return [...byId.values()];
  }, [filteredAircraft, filteredVessels, filteredSatellites, visibleFungalObservations, streamedEntities]);

  useEffect(() => {
    if (!isStreaming) {
      entityStreamClientRef.current?.disconnect();
      entityStreamClientRef.current = null;
      return;
    }

    if (!entityStreamClientRef.current) {
      entityStreamClientRef.current = new EntityStreamClient();
    }

    entityStreamClientRef.current.connect((incomingEntity) => {
      setStreamedEntities((previous) => {
        const next = new Map(previous.map((entity) => [entity.id, entity]));
        next.set(incomingEntity.id, incomingEntity);
        return [...next.values()].slice(-50000);
      });
    });

    return () => {
      entityStreamClientRef.current?.disconnect();
      entityStreamClientRef.current = null;
    };
  }, [isStreaming]);

  useEffect(() => {
    if (!entityStreamClientRef.current || !mapBounds) return;
    entityStreamClientRef.current.updateViewport(mapBounds, mapZoom);
  }, [mapBounds, mapZoom]);

  if (!mounted) {
    return (
      <div className="min-h-dvh bg-[#0a1628] flex items-center justify-center">
        <div className="text-cyan-400 text-sm font-mono animate-pulse">
          INITIALIZING CREP SYSTEM...
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-dvh bg-[#0a1628] overflow-hidden flex flex-col">
      {/* Top Classification Banner */}
      <div className="flex-shrink-0 flex justify-center py-1 bg-black/80 backdrop-blur-sm border-b border-amber-500/30 z-50">
        <Badge variant="outline" className="border-amber-500/50 text-amber-400 text-[9px] tracking-[0.15em] font-mono">
          CREP // COMMON RELEVANT ENVIRONMENTAL PICTURE // UNCLASSIFIED // FOUO
        </Badge>
      </div>

      {/* Top Control Bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-1.5 bg-[#0a1628]/95 border-b border-cyan-500/20 z-40">
        {/* Left controls */}
        <div className="flex items-center gap-2">
          <Link
            href="/natureos"
            className="p-1.5 rounded bg-black/40 border border-cyan-500/30 hover:border-cyan-400/50 transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[9px] text-cyan-400 font-mono hidden sm:inline">NATUREOS</span>
          </Link>
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-black/40 border border-amber-500/30">
            <Shield className="w-3 h-3 text-amber-400" />
            <span className="text-[9px] text-amber-400 font-mono">OEI</span>
          </div>
          <button 
            onClick={() => setIsStreaming(!isStreaming)}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded bg-black/40 border transition-colors",
              isStreaming 
                ? "border-green-500/30 hover:border-green-400/50" 
                : "border-yellow-500/30 hover:border-yellow-400/50"
            )}
          >
            <Radio className={cn(
              "w-3 h-3",
              isStreaming ? "text-green-400 animate-pulse" : "text-yellow-400"
            )} />
            <span className={cn(
              "text-[9px] font-mono",
              isStreaming ? "text-green-400" : "text-yellow-400"
            )}>
              {isStreaming ? "LIVE" : "PAUSED"}
            </span>
          </button>
        </div>

        {/* Center title */}
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-cyan-400" />
          <div className="text-center">
            <h1 className="text-xs font-bold text-white tracking-wide">GLOBAL SITUATIONAL AWARENESS</h1>
            <p className="text-[8px] text-gray-500 font-mono">ENVIRONMENTAL INTELLIGENCE OVERLAY</p>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {/* Entity counts: planes / boats / satellites (visible so user can see when they are 0) */}
          <div
            className="flex items-center gap-2 px-2 py-1 rounded bg-black/40 border border-gray-600/40"
            title="Aircraft from FlightRadar24, vessels from AISStream, satellites from CelesTrak. Only shown when LIVE is on."
          >
            <span className={cn("text-[9px] font-mono", aircraft.length === 0 ? "text-amber-400" : "text-gray-400")}>
              Planes: {aircraft.length}
            </span>
            <span className="text-gray-600">|</span>
            <span className={cn("text-[9px] font-mono", vessels.length === 0 ? "text-amber-400" : "text-gray-400")}>
              Boats: {vessels.length}
            </span>
            <span className="text-gray-600">|</span>
            <span className={cn("text-[9px] font-mono", satellites.length === 0 ? "text-amber-400" : "text-gray-400")}>
              Sats: {satellites.length}
            </span>
          </div>
          {criticalCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-red-500/20 border border-red-500/40 animate-pulse">
              <Zap className="w-3 h-3 text-red-400" />
              <span className="text-[9px] text-red-400 font-mono font-bold">{criticalCount}</span>
            </div>
          )}
          {highCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-orange-500/20 border border-orange-500/30">
              <Activity className="w-3 h-3 text-orange-400" />
              <span className="text-[9px] text-orange-400 font-mono">{highCount}</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLeftPanelOpen(!leftPanelOpen)}
            className="h-7 w-7 border border-gray-600/30 hover:border-cyan-400/50"
          >
            {leftPanelOpen ? <ChevronLeft className="w-4 h-4 text-cyan-400" /> : <ChevronRight className="w-4 h-4 text-cyan-400" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className="h-7 w-7 border border-gray-600/30 hover:border-cyan-400/50"
          >
            {rightPanelOpen ? <PanelRightClose className="w-4 h-4 text-cyan-400" /> : <PanelRightOpen className="w-4 h-4 text-cyan-400" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="h-7 w-7 border border-gray-600/30 hover:border-cyan-400/50"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-cyan-400" /> : <Maximize2 className="w-4 h-4 text-cyan-400" />}
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Floating Left Sidebar - Intel Feed - FUNGAL DATA PRIMARY */}
        <div 
          data-panel="left"
          className={cn(
          "absolute left-3 top-3 bottom-3 z-30 transition-all duration-300 ease-in-out",
          leftPanelOpen ? "w-72 opacity-100 translate-x-0" : "-translate-x-80 opacity-0 pointer-events-none"
          )}
        >
          <div className="h-full bg-[#0a1220]/95 backdrop-blur-md border border-cyan-500/20 rounded-lg overflow-hidden flex flex-col shadow-xl">
            {/* Sidebar Header with Tabs - FUNGAL FIRST */}
            <div className="border-b border-cyan-500/20 bg-black/30">
              <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white">INTEL FEED</span>
              </div>
                <Badge variant="outline" className={cn(
                  "text-[8px]",
                  leftPanelTab === "fungal" 
                    ? "border-green-500/50 text-green-400" 
                    : "border-orange-500/50 text-orange-400"
                )}>
                  {leftPanelTab === "fungal" 
                    ? `${visibleFungalObservations.length}/${fungalObservations.length} FUNGI` 
                    : `${filteredEvents.length} EVENTS`}
              </Badge>
              </div>
              {/* Tab Buttons - FUNGAL is PRIMARY */}
              <div className="flex px-2 pb-2 gap-1">
                <button
                  onClick={() => setLeftPanelTab("fungal")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-[10px] font-semibold transition-all",
                    leftPanelTab === "fungal"
                      ? "bg-green-500/20 text-green-400 border border-green-500/50"
                      : "bg-black/30 text-gray-500 border border-transparent hover:border-gray-600"
                  )}
                >
                  <TreePine className="w-3 h-3" />
                  FUNGAL DATA
                </button>
                <button
                  onClick={() => setLeftPanelTab("events")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-[10px] font-semibold transition-all",
                    leftPanelTab === "events"
                      ? "bg-orange-500/20 text-orange-400 border border-orange-500/50"
                      : "bg-black/30 text-gray-500 border border-transparent hover:border-gray-600"
                  )}
                >
                  <AlertTriangle className="w-3 h-3" />
                  EVENTS
                </button>
              </div>
        </div>

            {/* Quick Stats - Updated for Fungal Priority */}
            <div className="grid grid-cols-3 gap-1 p-2 border-b border-cyan-500/10">
              <div className="text-center p-2 rounded bg-black/30 border border-green-500/20">
                <div className="text-lg font-bold text-green-400">{fungalObservations.length}</div>
                <div className="text-[8px] text-gray-500 uppercase">Fungi</div>
              </div>
              <div className="text-center p-2 rounded bg-black/30">
                <div className="text-lg font-bold text-cyan-400">{onlineDevices}</div>
                <div className="text-[8px] text-gray-500 uppercase">Devices</div>
              </div>
              <div className="text-center p-2 rounded bg-black/30">
                <div className="text-lg font-bold text-orange-400">{globalEvents.length}</div>
                <div className="text-[8px] text-gray-500 uppercase">Events</div>
              </div>
            </div>

            {/* FUNGAL TAB CONTENT - PRIMARY */}
            {leftPanelTab === "fungal" && (
              <>
                {/* What the green dots are — clear explanation for San Diego and everywhere */}
                <div className="p-2 border-b border-green-500/20 bg-green-950/20 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <TreePine className="w-3.5 h-3.5 text-green-400 shrink-0" />
                    <span className="text-[10px] font-semibold text-green-300">What are the green dots?</span>
                  </div>
                  <p className="text-[9px] text-gray-400 leading-snug">
                    Each dot is a <strong className="text-gray-300">fungal observation</strong> with GPS: species sightings from <strong className="text-purple-400">MINDEX</strong>, enriched by <strong className="text-cyan-400">MYCA</strong> and the <strong className="text-amber-400">Nature Learning Model (NLM)</strong>. Click a dot or a list item to see details and source links. Bloom events (e.g. San Diego) also use MycoBrain Network data.
                  </p>
                </div>
                {/* Fungal Filters */}
                <div className="p-2 border-b border-cyan-500/10 space-y-2">
                  <div className="flex items-center gap-2">
                    <Leaf className="w-3 h-3 text-green-500" />
                    <span className="text-[10px] text-green-400 font-semibold">Fungal Observations</span>
                  </div>
                  <div className="flex items-center gap-2 text-[9px]">
                    <Badge variant="outline" className="border-green-500/30 text-green-400 px-1.5 py-0">
                      {fungalObservations.filter(f => f.quality_grade === "research").length} Research Grade
                    </Badge>
                    <Badge variant="outline" className="border-yellow-500/30 text-yellow-400 px-1.5 py-0">
                      {fungalObservations.filter(f => f.quality_grade !== "research").length} Needs ID
                    </Badge>
                  </div>
                </div>

                {/* Fungal Observation List - SCROLLABLE
                    Shows VISIBLE observations (from LOD system) for consistency with map
                    Limited to 50 items max for performance */}
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-1">
                    {fungalLoading ? (
                      <div className="text-center py-8 text-gray-500 text-[10px]">
                        <TreePine className="w-8 h-8 mx-auto mb-2 animate-pulse text-green-500" />
                        <span className="animate-pulse">Loading from MINDEX...</span>
                      </div>
                    ) : visibleFungalObservations.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 text-[10px]">
                        <TreePine className="w-8 h-8 mx-auto mb-2 text-green-500/50" />
                        Zoom in to see observations
                      </div>
                    ) : (
                      visibleFungalObservations.slice(0, 50).map((obs) => {
                        const speciesName = obs.taxon?.preferred_common_name || obs.species || obs.taxon?.name || "Unknown Fungus";
                        const isResearchGrade = obs.quality_grade === "research";
                        const isSelected = selectedFungal?.id === obs.id;
                        
                        return (
                          <div
                            key={`fungal-item-${obs.id}`}
                            onClick={() => handleSelectFungal(isSelected ? null : obs)}
                            className={cn(
                              "p-2 rounded cursor-pointer transition-all border",
                              isSelected
                                ? "bg-green-500/10 border-green-500/40"
                                : "bg-black/30 border-transparent hover:border-green-700/50"
                            )}
                          >
                            <div className="flex items-start gap-2">
                              <div className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                                isResearchGrade ? "bg-green-500/30" : "bg-green-400/20"
                              )}>
                                <TreePine className="w-3 h-3 text-green-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[10px] text-white font-medium truncate">
                                  {speciesName}
                                </div>
                                <div className="flex items-center justify-between mt-0.5">
                                  <span className="text-[8px] text-gray-500 truncate max-w-[100px]">
                                    {obs.location || `${typeof obs.latitude === 'number' ? obs.latitude.toFixed(2) : 'â€”'}Â°, ${typeof obs.longitude === 'number' ? obs.longitude.toFixed(2) : 'â€”'}Â°`}
                                  </span>
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "text-[7px] px-1 py-0",
                                      isResearchGrade 
                                        ? "border-green-500/50 text-green-400" 
                                        : "border-yellow-500/50 text-yellow-400"
                                    )}
                                  >
                                    {isResearchGrade ? "âœ“ verified" : "needs ID"}
                                  </Badge>
                                </div>
                                {obs.observed_on && (
                                  <div className="text-[7px] text-gray-600 mt-0.5">
                                    {new Date(obs.observed_on).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    {visibleFungalObservations.length > 50 && (
                      <div className="text-center py-2 text-[9px] text-gray-500">
                        Showing 50 of {visibleFungalObservations.length} visible â€¢ Zoom in for more
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </>
            )}

            {/* EVENTS TAB CONTENT - SECONDARY */}
            {leftPanelTab === "events" && (
              <>
                {/* Event Filters */}
            <div className="p-2 border-b border-cyan-500/10 space-y-2">
              <div className="flex items-center gap-2">
                <Filter className="w-3 h-3 text-gray-500" />
                    <span className="text-[10px] text-gray-400">Event Filters</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {["all", "earthquake", "volcano", "wildfire", "storm"].map((type) => (
                  <Button
                    key={type}
                    variant="ghost"
                    size="sm"
                    onClick={() => setEventFilter(type)}
                    className={cn(
                      "h-6 px-2 text-[9px]",
                      eventFilter === type 
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50" 
                        : "bg-black/30 text-gray-400 border border-transparent hover:border-gray-600"
                    )}
                  >
                    {type === "all" ? "ALL" : type.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>

                {/* Event List - FIXED OVERFLOW with proper padding */}
            <ScrollArea className="flex-1">
                  <div className="px-2 py-1.5 space-y-1.5">
                    {filteredEvents.slice(0, 50).map((event) => {
                  const config = eventTypeConfig[event.type] || eventTypeConfig.default;
                  const isSelected = selectedEvent?.id === event.id;
                  
                  return (
                  <div
                    key={event.id}
                          onClick={() => handleSelectEvent(isSelected ? null : event, true)}
                    className={cn(
                            "p-2 rounded cursor-pointer transition-all border overflow-hidden",
                        isSelected
                        ? "bg-cyan-500/10 border-cyan-500/40"
                          : "bg-black/30 border-transparent hover:border-gray-700/50"
                      )}
                    >
                          <div className="flex items-start gap-2 overflow-hidden">
                        <div 
                          className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: `${config.color}30` }}
                        >
                          {config.icon}
                        </div>
                            <div className="flex-1 min-w-0 overflow-hidden">
                              {/* Title - click to select and fly to */}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectEvent(isSelected ? null : event, true);
                                }}
                                className="text-[10px] text-white font-medium truncate hover:text-cyan-400 transition-colors text-left w-full"
                              >
                          {event.title}
                              </button>
                              <div className="flex items-center justify-between mt-0.5 overflow-hidden">
                                {/* Clickable coordinates - FLY TO */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectEvent(event, true);
                                  }}
                                  className="text-[8px] text-cyan-500 hover:text-cyan-400 flex items-center gap-0.5 transition-colors"
                                  title="Fly to event and show details"
                                >
                                  <MapPin className="w-2.5 h-2.5" />
                                  <span className="truncate max-w-[80px]">
                                    {(event.lat ?? 0).toFixed(2)}Â°, {(event.lng ?? 0).toFixed(2)}Â°
                            </span>
                                </button>
                      <Badge 
                        variant="outline" 
                                  className={cn("text-[7px] px-1 py-0 flex-shrink-0", severityColors[event.severity || "medium"])}
                      >
                                  {(event.severity || "medium").toUpperCase()}
                      </Badge>
                    </div>
                              {/* Source info */}
                              {event.source && (
                                <div className="flex items-center gap-1 mt-0.5 text-[7px] text-gray-500 truncate">
                                  <Database className="w-2 h-2 flex-shrink-0" />
                                  <span className="truncate">{event.source}</span>
                                </div>
                              )}
                    </div>
                  </div>
                    </div>
                  );
                })}
                    {filteredEvents.length > 50 && (
                      <div className="text-center py-2 text-[9px] text-gray-500">
                        Showing 50 of {filteredEvents.length} visible â€¢ Zoom in for more
                      </div>
                    )}
              </div>
            </ScrollArea>
              </>
            )}

            {/* Sidebar Footer */}
            <div className="px-3 py-2 border-t border-cyan-500/20 bg-black/30">
              <div className="flex items-center justify-between text-[8px] font-mono text-gray-500">
                <span>{leftPanelTab === "fungal" ? "MINDEX SYNC" : "LAST UPDATE"}</span>
                <span className="text-cyan-400">{clientTime || "--:--:--"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Map Container - Full size, panels overlay it */}
        <div className="absolute inset-0 crep-map-container">
          {/* Custom CSS to hide map attribution for military/scientific use */}
          <style jsx global>{`
            .crep-map-container .maplibregl-ctrl-attrib,
            .crep-map-container .maplibregl-ctrl-logo,
            .crep-map-container .maplibregl-ctrl-attrib-button,
            .crep-map-container .maplibregl-ctrl-bottom-right,
            .crep-map-container .maplibregl-ctrl-bottom-left .maplibregl-ctrl-attrib {
              display: none !important;
              visibility: hidden !important;
              opacity: 0 !important;
            }
          `}</style>
          <MapComponent 
            center={userLocation ? [userLocation.lng, userLocation.lat] : [0, 20]} 
            zoom={userLocation ? 5 : 2}
            styles={{
              dark: "https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json",
              light: "https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json"
            }}
            onLoad={(map: any) => {
              setMapRef(map);
              console.log("[CREP] Map loaded, reference captured for auto-zoom");
              
              // Initialize zoom and bounds
              setMapZoom(map.getZoom());
              const bounds = map.getBounds();
              if (bounds) {
                setMapBounds({
                  north: bounds.getNorth(),
                  south: bounds.getSouth(),
                  east: bounds.getEast(),
                  west: bounds.getWest(),
                });
              }
              
              // LOD System: Update viewport on zoom/pan completion
              // Using "moveend" and "zoomend" for reliable updates after gestures complete
              const updateViewport = () => {
                const newZoom = map.getZoom();
                const b = map.getBounds();
                if (b) {
                  console.log(`[CREP/LOD] Viewport update: zoom=${newZoom.toFixed(2)}`);
                  setMapZoom(newZoom);
                  setMapBounds({
                    north: b.getNorth(),
                    south: b.getSouth(),
                    east: b.getEast(),
                    west: b.getWest(),
                  });
                }
              };
              
              // Use "moveend" and "zoomend" for reliable updates after interaction completes
              // These fire once when pan/zoom animation finishes, not continuously
              map.on("moveend", updateViewport);
              map.on("zoomend", updateViewport);
              
              // MAP CLICK-AWAY HANDLER: Direct MapLibre click event for reliable popup dismissal
              // This fires when clicking directly on the map canvas, not on markers/popups
              map.on("click", (e: any) => {
                // Use a longer delay to allow React state updates and popup rendering
                setTimeout(() => {
                  // Check if any popup is open - if so, we might want to close
                  const openPopups = document.querySelectorAll('.maplibregl-popup');
                  if (openPopups.length > 0) {
                    // Use the original event target to check if click was on a marker
                    // This is more reliable than elementFromPoint for overlay markers
                    const target = e.originalEvent?.target as HTMLElement | null;
                    const isOnMarker = target?.closest('[data-marker]') !== null ||
                                       target?.closest('.maplibregl-marker') !== null;
                    const isOnPopup = target?.closest('.maplibregl-popup') !== null;
                    
                    // Also check if click was on canvas (empty map area)
                    const isOnCanvas = target?.tagName === 'CANVAS' || target?.classList?.contains('maplibregl-canvas');
                    
                    // Only dismiss if click was on canvas AND not on a marker or popup
                    if (isOnCanvas && !isOnMarker && !isOnPopup) {
                      console.log("[CREP] Click-away (map): dismissing popups");
                      setSelectedEvent(null);
                      setSelectedFungal(null);
                    }
                  }
                }, 100);
              });
            }}
          >
            <MapControls 
              position="bottom-left" 
              showZoom={true}
              showCompass={true}
              showLocate={true}
              showFullscreen={false}
              className={cn(
                "mb-4 transition-all duration-300",
                // Move controls to the right of left panel when it's open
                leftPanelOpen ? "ml-[310px]" : "ml-4"
              )}
            />

            <EntityDeckLayer
              map={mapRef}
              entities={deckEntities}
              visible={deckEntities.length > 0}
              onEntityClick={(entity) => {
                if (entity.type === "aircraft") {
                  setSelectedAircraft(filteredAircraft.find((aircraftEntity) => aircraftEntity.id === entity.id) ?? null);
                } else if (entity.type === "vessel") {
                  setSelectedVessel(filteredVessels.find((vesselEntity) => vesselEntity.id === entity.id) ?? null);
                } else if (entity.type === "satellite") {
                  setSelectedSatellite(filteredSatellites.find((satelliteEntity) => satelliteEntity.id === entity.id) ?? null);
                } else if (entity.type === "fungal") {
                  const obsId = entity.id?.replace?.("fungal-", "");
                  const obs = visibleFungalObservations.find((o) => String(o.id) === String(obsId));
                  if (obs) {
                    setSelectedFungal(obs);
                    setLeftPanelOpen(true);
                    setLeftPanelTab("fungal");
                    mapRef?.flyTo({
                      center: [obs.longitude, obs.latitude],
                      zoom: Math.max(mapRef.getZoom(), 12),
                      duration: 1000,
                    });
                  }
                }
              }}
            />

            {/* Trajectory Lines - Flight Paths and Ship Routes */}
            <TrajectoryLines
              aircraft={filteredAircraft}
              vessels={filteredVessels}
              showFlightPaths={layers.find(l => l.id === "aviationRoutes")?.enabled ?? false}
              showShipRoutes={layers.find(l => l.id === "shipRoutes")?.enabled ?? false}
            />

            {/* Satellite Orbit Lines - Ground Track Visualization */}
            <SatelliteOrbitLines
              satellites={filteredSatellites}
              showOrbits={layers.find(l => l.id === "satellites")?.enabled ?? true}
              showSelected={selectedSatellite?.id}
            />

            {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                NVIDIA EARTH-2 AI WEATHER LAYERS
                Integrated directly into the MapComponent for real-time visualization
                â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
            
            {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                NVIDIA Earth-2 AI Weather Layers
                Rendered with mapRef when Earth-2 layers are enabled
                â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
            
            {/* Earth-2 Temperature/Precipitation Heatmap */}
            {mapRef && (earth2Filter.showTemperature || earth2Filter.showPrecipitation || earth2Filter.showForecast) && (
              <WeatherHeatmapLayer
                map={mapRef}
                visible={true}
                variable={earth2Filter.showTemperature ? "temperature" : "precipitation"}
                forecastHours={earth2Filter.forecastHours}
                opacity={earth2Filter.opacity}
              />
            )}
            
            {/* Earth-2 Spore Dispersal Layer */}
            {mapRef && earth2Filter.showSporeDispersal && (
              <SporeDispersalLayer
                map={mapRef}
                visible={true}
                forecastHours={earth2Filter.forecastHours}
                opacity={earth2Filter.opacity}
              />
            )}
            
            {/* Earth-2 Wind Vector Layer */}
            {mapRef && earth2Filter.showWind && (
              <WindVectorLayer
                map={mapRef}
                visible={true}
                forecastHours={earth2Filter.forecastHours}
                opacity={earth2Filter.opacity}
              />
            )}
            
            {/* Earth-2 Cloud Cover Layer */}
            {mapRef && earth2Filter.showClouds && (
              <CloudLayer
                map={mapRef}
                visible={true}
                forecastHours={earth2Filter.forecastHours}
                opacity={earth2Filter.opacity}
              />
            )}
            
            {/* Earth-2 Precipitation/Rain Layer */}
            {mapRef && earth2Filter.showPrecipitation && (
              <PrecipitationLayer
                map={mapRef}
                visible={true}
                forecastHours={earth2Filter.forecastHours}
                opacity={earth2Filter.opacity}
                showAnimation={earth2Filter.animated}
              />
            )}
            
            {/* Earth-2 Atmospheric Pressure Layer */}
            {mapRef && earth2Filter.showPressure && (
              <PressureLayer
                map={mapRef}
                visible={true}
                forecastHours={earth2Filter.forecastHours}
                opacity={earth2Filter.opacity}
              />
            )}
            
            {/* Earth-2 Storm Cells Layer (StormScope Nowcast) */}
            {mapRef && earth2Filter.showStormCells && (
              <StormCellsLayer
                map={mapRef}
                visible={true}
                forecastHours={earth2Filter.forecastHours}
                opacity={earth2Filter.opacity}
              />
            )}
            
            {/* Earth-2 Humidity Layer */}
            {mapRef && earth2Filter.showHumidity && (
              <HumidityLayer
                map={mapRef}
                visible={true}
                forecastHours={earth2Filter.forecastHours}
                opacity={earth2Filter.opacity}
              />
            )}

            {/* Event Markers - Only render if corresponding layer is enabled */}
            {filteredEvents.map(event => {
              // Check if the specific event type layer is enabled
              // COMPREHENSIVE MAP: All event types must be mapped to correct layers
              const layerMap: Record<string, string> = {
                // Seismic events
                earthquake: "earthquakes",
                // Volcanic events
                volcano: "volcanoes",
                // Fire events  
                wildfire: "wildfires",
                fire: "wildfires",
                // Storm events
                storm: "storms",
                hurricane: "storms",
                flood: "storms",
                // Lightning events
                lightning: "lightning",
                // Tornado events
                tornado: "tornadoes",
                // Space weather (solar) events
                solar_flare: "solar",
                geomagnetic_storm: "solar",
                cme: "solar",
                // Biological events - NOT in event markers, handled by fungal layer
                fungal_bloom: "fungi",
                migration: "fungi",
                // Default fallback
                default: "earthquakes",
              };
              const layerId = layerMap[event.type] || layerMap.default;
              const isLayerEnabled = layers.find(l => l.id === layerId)?.enabled ?? false;
              
              if (!isLayerEnabled) return null;
              
              return (
                <EventMarker
                  key={event.id}
                  event={event}
                  isSelected={selectedEvent?.id === event.id}
                  onClick={() => handleSelectEvent(selectedEvent?.id === event.id ? null : event)}
                  onClose={() => handleSelectEvent(null)}
                  onFlyTo={(lat, lng, zoom) => {
                    mapRef?.flyTo({
                      center: [lng, lat],
                      zoom: zoom || 10,
                      duration: 1500,
                    });
                  }}
                />
              );
            })}

            {/* Device Markers - deduplicated to prevent React key errors */}
            {layers.find(l => l.id === "mycobrain")?.enabled && (() => {
              const seen = new Set<string>();
              return devices.filter(device => {
                if (seen.has(device.id)) return false;
                seen.add(device.id);
                return true;
              }).map(device => (
                <DeviceMarker
                  key={device.id}
                  device={device}
                  isSelected={selectedDevice?.id === device.id}
                  onClick={() => setSelectedDevice(selectedDevice?.id === device.id ? null : device)}
                />
              ));
            })()}

            {/* Elephant Markers (Conservation Demo - Feb 05, 2026) */}
            {layers.find(l => l.id === "elephants")?.enabled && elephants.map(elephant => (
              <ElephantMarker
                key={elephant.id}
                elephant={elephant}
                isSelected={selectedElephant?.id === elephant.id}
                onClick={() => setSelectedElephant(selectedElephant?.id === elephant.id ? null : elephant)}
              />
            ))}

            {/* Aircraft / Vessel / Satellite / Fungal rendering moved to deck.gl EntityDeckLayer */}
          </MapComponent>

          {/* Map Overlay - Corner Decorations */}
          <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-cyan-500/40 pointer-events-none" />
          <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-cyan-500/40 pointer-events-none" />
          <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-cyan-500/40 pointer-events-none" />
          <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-cyan-500/40 pointer-events-none" />

          {/* Map Status Overlay - Top Center - FUNGAL DATA PRIMARY */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[9px] font-mono pointer-events-none">
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-black/60 backdrop-blur">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-400">LIVE</span>
            </div>
            {/* FUNGAL DATA FIRST - PRIMARY */}
            {fungalObservations.length > 0 && (
              <div className="px-2 py-1 rounded bg-green-500/20 backdrop-blur text-green-400 border border-green-500/30" title={`${fungalObservations.length} fungal observations - PRIMARY DATA`}>
                <TreePine className="w-3 h-3 inline-block mr-1" />
                {fungalObservations.length} FUNGI
              </div>
            )}
            <div className="px-2 py-1 rounded bg-black/60 backdrop-blur text-orange-400">
              {filteredEvents.length} EVENTS
            </div>
            <div className="px-2 py-1 rounded bg-black/60 backdrop-blur text-cyan-400">
              {onlineDevices} DEVICES
            </div>
            {/* Transport/Satellite data - SECONDARY (only show if enabled) */}
            {layers.find(l => l.id === "aviation")?.enabled && aircraft.length > 0 && (
              <div className="px-2 py-1 rounded bg-black/60 backdrop-blur text-sky-400" title={`${filteredAircraft.length} shown / ${aircraft.length} total`}>
                <Plane className="w-3 h-3 inline-block mr-1" />
                {filteredAircraft.length}/{aircraft.length}
              </div>
            )}
            {layers.find(l => l.id === "ships")?.enabled && vessels.length > 0 && (
              <div className="px-2 py-1 rounded bg-black/60 backdrop-blur text-teal-400" title={`${filteredVessels.length} shown / ${vessels.length} total`}>
                <Ship className="w-3 h-3 inline-block mr-1" />
                {filteredVessels.length}/{vessels.length}
              </div>
            )}
            {layers.find(l => l.id === "satellites")?.enabled && satellites.length > 0 && (
              <div className="px-2 py-1 rounded bg-black/60 backdrop-blur text-purple-400" title={`${filteredSatellites.length} shown / ${satellites.length} total`}>
                <Satellite className="w-3 h-3 inline-block mr-1" />
                {filteredSatellites.length}/{satellites.length}
              </div>
            )}
          </div>
        </div>

        {/* Right Side Panel - Overlays Map with slide animation */}
        <div 
          data-panel="right"
          className={cn(
          "absolute right-3 top-3 bottom-3 w-80 z-30 transition-all duration-300 ease-in-out border border-cyan-500/20 bg-[#0a1220]/95 backdrop-blur-md rounded-lg shadow-xl overflow-hidden",
          rightPanelOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
          )}
        >
          <div className="h-full flex flex-col">
            {/* Tab Navigation */}
            <Tabs value={rightPanelTab} onValueChange={setRightPanelTab} className="flex flex-col h-full">
              <TabsList className="w-full grid grid-cols-7 rounded-none bg-black/40 border-b border-cyan-500/20 h-9">
                <TabsTrigger 
                  value="mission" 
                  className="text-[7px] px-0.5 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 rounded-none"
                >
                  <Target className="w-3 h-3" />
                </TabsTrigger>
                <TabsTrigger 
                  value="data" 
                  className="text-[7px] px-0.5 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400 rounded-none"
                >
                  <Signal className="w-3 h-3" />
                </TabsTrigger>
                <TabsTrigger 
                  value="intel" 
                  className="text-[7px] px-0.5 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 rounded-none"
                >
                  <Users className="w-3 h-3" />
                </TabsTrigger>
                <TabsTrigger 
                  value="layers" 
                  className="text-[7px] px-0.5 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 rounded-none"
                >
                  <Layers className="w-3 h-3" />
                </TabsTrigger>
                <TabsTrigger 
                  value="earth2" 
                  className="text-[7px] px-0.5 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 rounded-none"
                  title="NVIDIA Earth-2 AI Weather"
                >
                  <Zap className="w-3 h-3" />
                </TabsTrigger>
                <TabsTrigger 
                  value="services" 
                  className="text-[7px] px-0.5 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 rounded-none"
                >
                  <Cpu className="w-3 h-3" />
                </TabsTrigger>
                <TabsTrigger 
                  value="myca" 
                  className="text-[7px] px-0.5 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400 rounded-none"
                >
                  <Bot className="w-3 h-3" />
                </TabsTrigger>
              </TabsList>

              {/* Tab Content */}
              <div className="flex-1 overflow-hidden">
                <TabsContent value="mission" className="h-full m-0 p-3 overflow-hidden flex flex-col">
                  <MissionContextPanel mission={currentMission} stats={stats} />
                </TabsContent>

                <TabsContent value="data" className="h-full m-0 p-2 overflow-auto">
                  <ScrollArea className="h-full">
                    <div className="space-y-3">
                      {/* Real-time Data Feeds Header */}
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <Signal className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-[10px] font-bold text-white">LIVE DATA FEEDS</span>
                        </div>
                        <StreamingStatusBar
                          statuses={[
                            { type: "aircraft", connected: isStreaming, messageCount: aircraft.length },
                            { type: "vessels", connected: isStreaming, messageCount: vessels.length },
                            { type: "satellites", connected: isStreaming, messageCount: satellites.length },
                          ]}
                          isLive={isStreaming}
                          onToggle={() => setIsStreaming(!isStreaming)}
                        />
                      </div>
                      
                      {/* Map Controls - Filter Panel */}
                      <OEIMapControls
                        aircraftFilter={aircraftFilter}
                        vesselFilter={vesselFilter}
                        satelliteFilter={satelliteFilter}
                        spaceWeatherFilter={spaceWeatherFilter}
                        streamStatuses={[
                          { type: "aircraft", connected: isStreaming, messageCount: aircraft.length },
                          { type: "vessels", connected: isStreaming, messageCount: vessels.length },
                          { type: "satellites", connected: isStreaming, messageCount: satellites.length },
                        ]}
                        isStreaming={isStreaming}
                        noaaScales={noaaScales}
                        onAircraftFilterChange={(f) => setAircraftFilter({ ...aircraftFilter, ...f })}
                        onVesselFilterChange={(f) => setVesselFilter({ ...vesselFilter, ...f })}
                        onSatelliteFilterChange={(f) => setSatelliteFilter({ ...satelliteFilter, ...f })}
                        onSpaceWeatherFilterChange={(f) => setSpaceWeatherFilter({ ...spaceWeatherFilter, ...f })}
                        onToggleStreaming={() => setIsStreaming(!isStreaming)}
                        onRefresh={() => {
                          // Trigger a refresh by re-fetching data
                          window.location.reload();
                        }}
                      />
                      
                      {/* Space Weather Widget */}
                      <SpaceWeatherWidget compact />
                      
                      {/* Flight Tracker Widget */}
                      <FlightTrackerWidget compact limit={10} />
                      
                      {/* Vessel Tracker Widget */}
                      <VesselTrackerWidget compact limit={10} />
                      
                      {/* Satellite Tracker Widget */}
                      <SatelliteTrackerWidget compact limit={10} />
                      
                      {/* Conservation Demo Widgets (Feb 05, 2026) - Individual toggles (Feb 17, 2026) */}
                      {/* Elephant Biosignal Widget - toggled individually */}
                      {showBiosignalWidget && elephants.length > 0 && (
                        <BiosignalWidget 
                          elephants={elephants}
                          onElephantClick={(elephant) => {
                            setSelectedElephant(elephant);
                            mapRef?.flyTo({
                              center: [elephant.lng, elephant.lat],
                              zoom: 12,
                              duration: 1500,
                            });
                          }}
                        />
                      )}
                      
                      {/* Smart Fence Network Widget - toggled individually */}
                      {showSmartFenceWidget && fenceSegments.length > 0 && (
                        <SmartFenceWidget 
                          fenceSegments={fenceSegments}
                          onSegmentClick={(segment) => {
                            const midLat = (segment.startLat + segment.endLat) / 2;
                            const midLng = (segment.startLng + segment.endLng) / 2;
                            mapRef?.flyTo({
                              center: [midLng, midLat],
                              zoom: 13,
                              duration: 1500,
                            });
                          }}
                        />
                      )}
                      
                      {/* Presence Detection Widget - toggled individually */}
                      {showPresenceWidget && presenceReadings.length > 0 && (
                        <PresenceDetectionWidget 
                          readings={presenceReadings}
                          onMonitorClick={(reading) => {
                            mapRef?.flyTo({
                              center: [reading.lng, reading.lat],
                              zoom: 14,
                              duration: 1500,
                            });
                          }}
                        />
                      )}
                      
                      {/* Data Sources Footer */}
                      <div className="pt-2 border-t border-gray-700/30">
                        <div className="flex flex-wrap gap-1 text-[7px]">
                          <Badge variant="outline" className="px-1 py-0 h-3 border-amber-500/30 text-amber-400">SWPC</Badge>
                          <Badge variant="outline" className="px-1 py-0 h-3 border-sky-500/30 text-sky-400">FR24</Badge>
                          <Badge variant="outline" className="px-1 py-0 h-3 border-blue-500/30 text-blue-400">AIS</Badge>
                          <Badge variant="outline" className="px-1 py-0 h-3 border-purple-500/30 text-purple-400">TLE</Badge>
                          {(showBiosignalWidget || showSmartFenceWidget || showPresenceWidget) && <Badge variant="outline" className="px-1 py-0 h-3 border-green-500/30 text-green-400">GHANA</Badge>}
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="intel" className="h-full m-0 p-3 overflow-auto">
                  <ScrollArea className="h-full">
                    <HumanMachinesPanel />
            </ScrollArea>
                </TabsContent>

                <TabsContent value="layers" className="h-full m-0 p-3 overflow-auto">
                  <ScrollArea className="h-full">
                    <LayerControlPanel 
                      layers={layers}
                      onToggleLayer={toggleLayer}
                      onOpacityChange={setLayerOpacity}
                    />
                    
                    {/* Conservation Widget Toggles (Feb 17, 2026) */}
                    <div className="mt-4 rounded-lg bg-black/40 border border-gray-700/50 overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 bg-black/30">
                        <div className="flex items-center gap-2">
                          <Leaf className="w-3.5 h-3.5 text-green-400" />
                          <span className="text-[11px] font-semibold text-white">Conservation Widgets</span>
                        </div>
                        <Badge variant="outline" className="text-[8px] border-green-600 text-green-400">
                          {(showBiosignalWidget ? 1 : 0) + (showSmartFenceWidget ? 1 : 0) + (showPresenceWidget ? 1 : 0)}/3
                        </Badge>
                      </div>
                      <div className="p-2 space-y-1">
                        {/* Biosignal Widget Toggle */}
                        <div className="flex items-center justify-between p-2 rounded hover:bg-black/20">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded flex items-center justify-center bg-green-500/20">
                              <Heart className="w-3 h-3 text-green-400" />
                            </div>
                            <span className="text-[10px] text-gray-300">Elephant Biosignals</span>
                          </div>
                          <Switch
                            checked={showBiosignalWidget}
                            onCheckedChange={setShowBiosignalWidget}
                            className="h-4 w-7 data-[state=checked]:bg-green-500"
                          />
                        </div>
                        
                        {/* Smart Fence Widget Toggle */}
                        <div className="flex items-center justify-between p-2 rounded hover:bg-black/20">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded flex items-center justify-center bg-amber-500/20">
                              <Zap className="w-3 h-3 text-amber-400" />
                            </div>
                            <span className="text-[10px] text-gray-300">SmartFence Network</span>
                          </div>
                          <Switch
                            checked={showSmartFenceWidget}
                            onCheckedChange={setShowSmartFenceWidget}
                            className="h-4 w-7 data-[state=checked]:bg-amber-500"
                          />
                        </div>
                        
                        {/* Presence Detection Widget Toggle */}
                        <div className="flex items-center justify-between p-2 rounded hover:bg-black/20">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded flex items-center justify-center bg-purple-500/20">
                              <Radio className="w-3 h-3 text-purple-400" />
                            </div>
                            <span className="text-[10px] text-gray-300">Presence Detection</span>
                          </div>
                          <Switch
                            checked={showPresenceWidget}
                            onCheckedChange={setShowPresenceWidget}
                            className="h-4 w-7 data-[state=checked]:bg-purple-500"
                          />
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* NVIDIA Earth-2 AI Weather Tab */}
                <TabsContent value="earth2" className="h-full m-0 p-2 overflow-auto">
                  <ScrollArea className="h-full">
                    <div className="space-y-3">
                      {/* Earth-2 Header */}
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <Zap className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-[10px] font-bold text-white">NVIDIA EARTH-2</span>
                        </div>
                        <Badge variant="outline" className="px-1.5 py-0 h-4 border-emerald-500/30 text-emerald-400 text-[8px]">
                          AI WEATHER
                        </Badge>
                      </div>
                      
                      {/* Earth-2 Layer Controls */}
                      <Earth2LayerControl 
                        filter={earth2Filter}
                        onFilterChange={(filter) => {
                          setEarth2Filter(prev => ({ ...prev, ...filter }));
                          // Sync layer visibility with filter state
                          if (filter.showForecast !== undefined) {
                            setLayers(prev => prev.map(l => 
                              l.id === "earth2Forecast" ? { ...l, enabled: filter.showForecast! } : l
                            ));
                          }
                          if (filter.showNowcast !== undefined) {
                            setLayers(prev => prev.map(l => 
                              l.id === "earth2Nowcast" ? { ...l, enabled: filter.showNowcast! } : l
                            ));
                          }
                          if (filter.showSporeDispersal !== undefined) {
                            setLayers(prev => prev.map(l => 
                              l.id === "earth2Spore" ? { ...l, enabled: filter.showSporeDispersal! } : l
                            ));
                          }
                          if (filter.showWind !== undefined) {
                            setLayers(prev => prev.map(l => 
                              l.id === "earth2Wind" ? { ...l, enabled: filter.showWind! } : l
                            ));
                          }
                          if (filter.showTemperature !== undefined) {
                            setLayers(prev => prev.map(l => 
                              l.id === "earth2Temp" ? { ...l, enabled: filter.showTemperature! } : l
                            ));
                          }
                          if (filter.showPrecipitation !== undefined) {
                            setLayers(prev => prev.map(l => 
                              l.id === "earth2Precip" ? { ...l, enabled: filter.showPrecipitation! } : l
                            ));
                          }
                          console.log('[Earth-2] Layer filter changed:', filter);
                        }}
                        onRefresh={() => {
                          setEarth2Loading(true);
                          // Refresh Earth-2 data
                          fetch('/api/earth2')
                            .then(r => r.json())
                            .then(data => {
                              console.log('[Earth-2] Status refreshed:', data);
                              setEarth2Available(data.available !== false);
                            })
                            .catch(e => {
                              console.warn('[Earth-2] Failed to refresh status:', e);
                              setEarth2Available(false);
                            })
                            .finally(() => setEarth2Loading(false));
                        }}
                        isLoading={earth2Loading}
                        serviceAvailable={earth2Available}
                        activeAlerts={earth2Alerts.length}
                      />
                      
                      {/* Forecast Timeline */}
                      <ForecastTimeline 
                        minHours={0}
                        maxHours={360}
                        stepHours={6}
                        currentHours={earth2ForecastHours}
                        modelType="forecast"
                        forecastStartTime={new Date()}
                        onTimeChange={(hours) => {
                          setEarth2ForecastHours(hours);
                          console.log("[Earth-2] Forecast time changed:", hours, "hours");
                        }}
                      />
                      
                      {/* Weather Alerts Panel */}
                      <AlertPanel 
                        alerts={earth2Alerts}
                        onAlertClick={(alert) => {
                          console.log("[Earth-2] Alert clicked:", alert);
                          // Fly to alert location on map
                          if (alert.location && mapRef) {
                            mapRef.flyTo({
                              center: [alert.location.lon, alert.location.lat],
                              zoom: 8,
                              duration: 1500,
                            });
                          }
                        }}
                        onDismiss={(alertId) => {
                          setEarth2Alerts(prev => prev.filter(a => a.id !== alertId));
                        }}
                        compact={true}
                      />
                      
                      {/* Earth-2 Model Status */}
                      <div className="pt-2 border-t border-gray-700/30">
                        <div className="text-[9px] text-gray-400 mb-2">Active Models</div>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="px-1 py-0 h-3 border-cyan-500/30 text-cyan-400 text-[7px]">Atlas</Badge>
                          <Badge variant="outline" className="px-1 py-0 h-3 border-yellow-500/30 text-yellow-400 text-[7px]">StormScope</Badge>
                          <Badge variant="outline" className="px-1 py-0 h-3 border-green-500/30 text-green-400 text-[7px]">CorrDiff</Badge>
                          <Badge variant="outline" className="px-1 py-0 h-3 border-purple-500/30 text-purple-400 text-[7px]">HealDA</Badge>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="services" className="h-full m-0 p-3 overflow-auto">
                  <ScrollArea className="h-full">
                    <ServicesPanel />
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="myca" className="h-full m-0 p-3 flex flex-col">
                  <MYCAChatPanel 
                    messages={mycaMessages}
                    onSendMessage={handleMycaMessage}
                  />
                </TabsContent>
            </div>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-1 bg-black/80 border-t border-cyan-500/20 z-50">
        <div className="flex items-center gap-4 text-[8px] font-mono">
          <span className="text-green-400">● SYSTEM OPERATIONAL</span>
          <span className="text-gray-600">|</span>
          <span className="text-cyan-400">UPTIME: 99.9%</span>
          <span className="text-gray-600">|</span>
          <span className="text-cyan-400">MYCOBRAIN: CONNECTED</span>
          <span className="text-gray-600">|</span>
          <span className="text-cyan-400">MINDEX: SYNCED</span>
          <span className="text-gray-600">|</span>
          <span className="text-purple-400">MYCA: ACTIVE</span>
        </div>
        <div className="flex items-center gap-3 text-[8px] font-mono text-gray-500">
          <span>{clientDate || "Loading..."}</span>
          <span className="text-cyan-400 tabular-nums">{new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Centered Entity Detail Panel - for transport entities only
          NOTE: Events and Fungal observations use attached MarkerPopup widgets instead of this centered modal.
          This provides a better UX where the popup is connected to the marker icon. */}
      <EntityDetailPanel 
        onClose={() => {
          setSelectedAircraft(null);
          setSelectedVessel(null);
          setSelectedSatellite(null);
        }}
        aircraft={selectedAircraft}
        vessel={selectedVessel}
        satellite={selectedSatellite}
      />
    </div>
  );
}
