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
import dynamic from "next/dynamic";
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
  Cross,
  BookOpen,
  Server,
  Moon,
  GraduationCap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { gridResolutionDegrees } from "@/lib/earth2/resolution-from-filter";
import { toast } from "sonner";

// OEI Real-time Data Widgets (lazy-loaded per tab)
const SpaceWeatherWidget = dynamic(() => import("@/components/crep/space-weather-widget").then((m) => ({ default: m.SpaceWeatherWidget })), { ssr: false });
const FlightTrackerWidget = dynamic(() => import("@/components/crep/flight-tracker-widget").then((m) => ({ default: m.FlightTrackerWidget })), { ssr: false });
const VesselTrackerWidget = dynamic(() => import("@/components/crep/vessel-tracker-widget").then((m) => ({ default: m.VesselTrackerWidget })), { ssr: false });
const SatelliteTrackerWidget = dynamic(() => import("@/components/crep/satellite-tracker-widget").then((m) => ({ default: m.SatelliteTrackerWidget })), { ssr: false });

// Conservation Demo Widgets (Feb 05, 2026) - lazy loaded
const SmartFenceWidget = dynamic(() => import("@/components/crep/smart-fence-widget").then((m) => ({ default: m.SmartFenceWidget })), { ssr: false });
const PresenceDetectionWidget = dynamic(() => import("@/components/crep/presence-detection-widget").then((m) => ({ default: m.PresenceDetectionWidget })), { ssr: false });

// Ground Station Integration (Mar 2026) - lazy loaded
const GSOverlayPanel = dynamic(() => import("@/components/crep/ground-station/GSOverlayPanel").then((m) => ({ default: m.GSOverlayPanel })), { ssr: false });
const GSPassTimeline = dynamic(() => import("@/components/crep/ground-station/GSPassTimeline").then((m) => ({ default: m.GSPassTimeline })), { ssr: false });
const GSSatelliteInfoPanel = dynamic(() => import("@/components/crep/ground-station/GSSatelliteInfoPanel").then((m) => ({ default: m.GSSatelliteInfoPanel })), { ssr: false });
import type { FenceSegment } from "@/components/crep/smart-fence-widget";
import type { PresenceReading } from "@/components/crep/presence-detection-widget";

// Map Markers for OEI Data
import { FungalMarker, type FungalObservation } from "@/components/crep/markers";

// Centered Detail Panel for entity popups
import { EntityDetailPanel } from "@/components/crep/panels/entity-detail-panel";

// Trajectory Lines for flight paths and ship routes
import { TrajectoryLines } from "@/components/crep/trajectory-lines";

// Satellite Orbit Lines for ground track visualization

// NVIDIA Earth-2 AI Weather Components
import { 
  Earth2LayerControl,
  Earth2TileRasterLayers,
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
  type EoImageryFilter,
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
import { getOrbitPath } from "@/lib/crep/orbit-path";
import {
  startSatelliteAnimation,
  stopSatelliteAnimation,
  updateSatelliteAnimation,
  isSatelliteAnimationRunning,
} from "@/lib/crep/satellite-animation";
import { useGroundStation } from "@/lib/ground-station/context";

// Phase 2-6: New CREP layers and panels
const GibsBaseLayers = dynamic(() => import("@/components/crep/layers/gibs-base-layers"), { ssr: false });
const AuroraOverlay = dynamic(() => import("@/components/crep/layers/aurora-overlay"), { ssr: false });
const SignalHeatmapLayer = dynamic(() => import("@/components/crep/layers/signal-heatmap-layer"), { ssr: false });
const ServicesPanelLive = dynamic(() => import("@/components/crep/panels/services-panel-live"), { ssr: false });
import ViewportStats from "@/components/crep/stats/viewport-stats";
import {
  useInfrastructureData,
  INFRA_TYPE_COLORS,
  INFRA_TYPE_ICONS,
  getInfraWidgetContent,
  type InfrastructureFeature,
} from "@/components/crep/layers/infrastructure-layer";

// Voice Map Controls (Feb 6, 2026)
import { VoiceMapControls } from "@/components/crep/voice-map-controls";

// Globe/Map Projection Toggle (Apr 2026 — OpenGridWorks-style)
import { GlobeToggle, type ProjectionMode } from "@/components/crep/controls/globe-toggle";

// PMTiles Protocol Registration (Apr 2026)
import { registerPMTilesProtocol } from "@/lib/crep/pmtiles-source";

// OpenGridWorks-style Infrastructure Layers (Apr 2026)
import { usePowerPlantLayers, type PowerPlant } from "@/components/crep/layers/power-plant-bubbles";
import { ScatterplotLayer as InfraScatterplotLayer, PathLayer as InfraPathLayer } from "@deck.gl/layers";
import { PlantPopup } from "@/components/crep/popups/plant-popup";
import { InfraDetailWidget, type InfraAsset } from "@/components/crep/popups/infra-detail-widget";
import { UnifiedSearch, type SearchResult } from "@/components/crep/search/unified-search";
import { FlyToButtons } from "@/components/crep/controls/fly-to-buttons";
import { MapLayersPopup } from "@/components/crep/controls/map-layers-popup";
import { InfrastructureStatsPanel } from "@/components/crep/panels/infrastructure-stats-panel";
import { mindexFetch } from "@/lib/crep/mindex-cache-client";
import { ALL_FETCH_REGIONS, regionToBounds, TOTAL_FETCH_REGIONS } from "@/lib/crep/geo-regions";
import { addJurisdictionLayers } from "@/lib/crep/jurisdiction-layers";
import { initHighlightLayers, highlightPoint, highlightLine, highlightFromEvent, clearHighlight } from "@/lib/crep/infra-highlight";
import { executeCrepCommand, type MapCommandHandlers } from "@/hooks/useMapWebSocket";
import type { FrontendCommand } from "@/lib/voice/map-websocket-client";
import { VOICE_ENDPOINTS } from "@/lib/config/api-urls";

// Map Controls with streaming status
import { MapControls as OEIMapControls, StreamingStatusBar } from "@/components/crep/map-controls";
import { WorldstateSourcesBadge } from "@/components/crep/WorldstateSourcesBadge";
import type { AircraftFilter, VesselFilter, SatelliteFilter, SpaceWeatherFilter, GroundFilter, NOAAScales } from "@/components/crep/map-controls";
import { CrepMapPreferencesPanel, type CrepMapPreferences } from "@/components/crep/CrepMapPreferencesPanel";
import { MYCAChatWidget } from "@/components/myca/MYCAChatWidget";

// OEI Types
import type { AircraftEntity, VesselEntity } from "@/types/oei"
import type { SatelliteEntity } from "@/lib/oei/connectors/satellite-tracking";

/** Map kingdom/iconicTaxon from iNaturalist to display keys for biodiversity counts */
function kingdomToDisplayKey(kingdom: string, iconicTaxon: string): string | null {
  const k = kingdom.toLowerCase();
  const i = iconicTaxon.toLowerCase();
  if (k === "fungi" || i === "fungi") return "fungi";
  if (k === "plantae" || i === "plantae" || i === "magnoliophyta") return "plants";
  if (k === "aves" || i === "aves") return "birds";
  if (k === "insecta" || k === "arachnida" || i === "insecta" || i === "arachnida") return "insects";
  if (["mammalia", "reptilia", "amphibia", "animalia"].includes(k) || ["mammalia", "reptilia", "amphibia"].includes(i)) return "animals";
  if (["actinopterygii", "mollusca", "chromista"].includes(k) || i === "actinopterygii" || i === "mollusca") return "marine";
  return null;
}

const KINGDOM_LIST_ICONS: Record<string, { Icon: React.ComponentType<{ className?: string }>; color: string }> = {
  fungi: { Icon: TreePine, color: "text-green-400" },
  plants: { Icon: Leaf, color: "text-emerald-400" },
  birds: { Icon: Bird, color: "text-sky-400" },
  insects: { Icon: Bug, color: "text-amber-400" },
  animals: { Icon: PawPrint, color: "text-orange-400" },
  marine: { Icon: Waves, color: "text-cyan-400" },
};

function getObservationListIcon(obs: { kingdom?: string; iconicTaxon?: string; taxon?: { kingdom?: string; iconic_taxon_name?: string } }) {
  const kingdom = obs.kingdom || obs.taxon?.kingdom || "";
  const iconic = obs.iconicTaxon || obs.taxon?.iconic_taxon_name || "";
  const key = kingdomToDisplayKey(kingdom, iconic) || "fungi";
  return KINGDOM_LIST_ICONS[key] || KINGDOM_LIST_ICONS.fungi;
}

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

type LayerDataStatus = "real" | "planned_real" | "mock";

interface LayerConfig {
  id: string;
  name: string;
  category: "events" | "devices" | "environment" | "infrastructure" | "human" | "military" | "pollution" | "imagery" | "telecom" | "facilities";
  icon: React.ReactNode;
  enabled: boolean;
  opacity: number;
  color: string;
  description: string;
  dataStatus?: LayerDataStatus;
  dataSource?: string;
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

// =============================================================================
// MISSION PROMPT MODAL - shown on first CREP use
// =============================================================================
const MISSION_TYPES = [
  { value: "monitoring" as const, label: "Monitoring", icon: <Radar className="w-4 h-4" />, description: "Track environmental activity and sensor networks" },
  { value: "research" as const, label: "Research", icon: <Microscope className="w-4 h-4" />, description: "Investigate biodiversity patterns and ecosystems" },
  { value: "tracking" as const, label: "Tracking", icon: <Navigation className="w-4 h-4" />, description: "Follow species, events, or transport movements" },
  { value: "analysis" as const, label: "Analysis", icon: <BarChart3 className="w-4 h-4" />, description: "Analyze correlations across data layers" },
  { value: "alert" as const, label: "Alert Response", icon: <AlertTriangle className="w-4 h-4" />, description: "Respond to critical environmental events" },
];

function MissionPromptModal({
  onCreateMission
}: {
  onCreateMission: (mission: MissionContext) => void;
}) {
  const [step, setStep] = useState(1);
  const [missionName, setMissionName] = useState("");
  const [missionType, setMissionType] = useState<MissionContext["type"]>("monitoring");
  const [missionObjective, setMissionObjective] = useState("");

  const handleCreate = () => {
    onCreateMission({
      id: `mission-${Date.now()}`,
      name: missionName || "Untitled Mission",
      type: missionType,
      status: "active",
      objective: missionObjective || `${MISSION_TYPES.find(t => t.value === missionType)?.description || "Environmental monitoring mission"}`,
      progress: 0,
      targets: 0,
      alerts: 0,
      startTime: new Date(),
    });
  };

  const handleSkip = () => {
    onCreateMission({
      id: `mission-${Date.now()}`,
      name: "Global Environmental Monitoring",
      type: "monitoring",
      status: "active",
      objective: "Real-time tracking of environmental activity and biodiversity across all connected sensors and data feeds",
      progress: 0,
      targets: 0,
      alerts: 0,
      startTime: new Date(),
    });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 bg-[#0a0f1e] border border-cyan-500/30 rounded-xl overflow-hidden shadow-2xl shadow-cyan-500/10">
        {/* Header */}
        <div className="px-6 py-4 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 to-blue-500/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <Target className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Initialize CREP Mission</h2>
              <p className="text-[10px] text-gray-400">Define your operational objectives</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <label className="text-[10px] text-cyan-400/70 uppercase font-medium">Mission Type</label>
                <div className="grid grid-cols-1 gap-2">
                  {MISSION_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setMissionType(type.value)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left",
                        missionType === type.value
                          ? "border-cyan-500/50 bg-cyan-500/10 text-white"
                          : "border-gray-700/50 bg-black/20 text-gray-400 hover:border-gray-600"
                      )}
                    >
                      <div className={cn(
                        "p-1.5 rounded",
                        missionType === type.value ? "bg-cyan-500/20 text-cyan-400" : "bg-gray-700/30 text-gray-500"
                      )}>
                        {type.icon}
                      </div>
                      <div>
                        <div className="text-xs font-medium">{type.label}</div>
                        <div className="text-[9px] text-gray-500">{type.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="ghost" size="sm" onClick={handleSkip} className="text-[10px] text-gray-500 hover:text-gray-300">
                  Skip — use defaults
                </Button>
                <Button size="sm" onClick={() => setStep(2)} className="text-[10px] bg-cyan-600 hover:bg-cyan-700">
                  Next
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-cyan-400/70 uppercase font-medium">Mission Name</label>
                  <Input
                    value={missionName}
                    onChange={(e) => setMissionName(e.target.value)}
                    placeholder="e.g. Pacific Rim Fungal Survey"
                    className="h-9 text-xs bg-black/40 border-gray-700/50 focus:border-cyan-500/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-cyan-400/70 uppercase font-medium">Objective</label>
                  <textarea
                    value={missionObjective}
                    onChange={(e) => setMissionObjective(e.target.value)}
                    placeholder="Describe what you want to accomplish..."
                    rows={3}
                    className="w-full px-3 py-2 text-xs bg-black/40 border border-gray-700/50 rounded-md focus:border-cyan-500/50 focus:outline-none text-white placeholder:text-gray-600 resize-none"
                  />
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-[10px] text-gray-500">
                  Back
                </Button>
                <Button size="sm" onClick={handleCreate} className="text-[10px] bg-cyan-600 hover:bg-cyan-700">
                  Launch Mission
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
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

// Layer categories with icons - ORDERED: Biodiversity/Devices FIRST, Transport/Military LAST
const layerCategories = {
  // PRIMARY - Biodiversity and devices (shown first)
  environment: { label: "Biodiversity & Environment", icon: <Leaf className="w-3.5 h-3.5" />, color: "text-emerald-400" },
  devices: { label: "MycoBrain Devices", icon: <Radar className="w-3.5 h-3.5" />, color: "text-green-400" },
  // CONTEXT - Natural events for correlation
  events: { label: "Natural Events", icon: <AlertTriangle className="w-3.5 h-3.5" />, color: "text-red-400" },
  // SECONDARY - Transport & Human (demo layers, off by default)
  infrastructure: { label: "Transport & Vehicles", icon: <Plane className="w-3.5 h-3.5" />, color: "text-sky-400" },
  human: { label: "Human Activity", icon: <Users className="w-3.5 h-3.5" />, color: "text-blue-400" },
  military: { label: "[DEMO] Military & Defense", icon: <Shield className="w-3.5 h-3.5" />, color: "text-amber-400" },
  pollution: { label: "Pollution & Industry", icon: <Factory className="w-3.5 h-3.5" />, color: "text-orange-400" },
  imagery: { label: "Earth Observation", icon: <Globe className="w-3.5 h-3.5" />, color: "text-teal-400" },
  telecom: { label: "Telecom & Infrastructure", icon: <Radio className="w-3.5 h-3.5" />, color: "text-violet-400" },
  facilities: { label: "Facilities", icon: <MapPin className="w-3.5 h-3.5" />, color: "text-pink-400" },
};

// Event marker component with detailed popup
function EventMarker({ event, isSelected, isNew, onClick, onClose, onFlyTo }: { 
  event: GlobalEvent; 
  isSelected: boolean;
  isNew?: boolean;
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
          {/* Blinking "NEW" ring – event just appeared on map (within viewport) */}
          {isNew && (
            <div 
              className="absolute w-7 h-7 rounded-full border-2 border-amber-400/80 pointer-events-none animate-pulse"
              style={{ animationDuration: "1.2s" }}
            />
          )}
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
      if (!result.success) {
        // Short message only - avoid description; Next.js dev overlay intercepts console.error
        toast("Device may be offline. Check MycoBrain connection.", { duration: 5000 });
      }
    } catch {
      toast("Device may be offline. Check MycoBrain connection.", { duration: 5000 });
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
// STATIC REFERENCE ESTIMATES — not live data. These are approximate global totals
// sourced from public statistics (World Bank, ICAO, IMO, FAA, IEA). The "active"
// counters below use random jitter to simulate variation but are NOT real-time feeds.
// TODO: Replace with real API data (WorldPop, FlightAware stats, IMO/AIS global count).
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
  stats,
  liveTracking,
}: {
  mission: MissionContext | null;
  stats: { events: number; devices: number; critical: number; kingdoms: Record<string, number> };
  liveTracking?: { aircraft: number; satellites: number; vessels: number };
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

      {/* Live Tracking — aircraft, satellites, vessels */}
      <div className="p-2 rounded-lg bg-black/40 border border-gray-700/50 flex-1 min-h-0">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Radar className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[10px] font-bold text-white">LIVE TRACKING</span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {[
            { icon: <Plane className="w-3.5 h-3.5" />, color: "text-amber-400", borderColor: "border-amber-500/20", label: "Aircraft", count: liveTracking?.aircraft ?? 0 },
            { icon: <Satellite className="w-3.5 h-3.5" />, color: "text-purple-400", borderColor: "border-purple-500/20", label: "Satellites", count: liveTracking?.satellites ?? 0 },
            { icon: <Ship className="w-3.5 h-3.5" />, color: "text-cyan-400", borderColor: "border-cyan-500/20", label: "Vessels", count: liveTracking?.vessels ?? 0 },
          ].map(({ icon, color, borderColor, label, count }) => {
            const displayCount = count >= 1000 ? `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}K` : String(count);
            return (
              <div key={label} className={cn("text-center p-1.5 rounded bg-black/30 border", borderColor)}>
                <div className={cn("mx-auto flex items-center justify-center", color)}>{icon}</div>
                <div className={cn("text-sm font-bold tabular-nums", color)}>
                  {displayCount}
                </div>
                <div className="text-[6px] text-gray-500 uppercase">{label}</div>
              </div>
            );
          })}
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
      imagery: [],
      telecom: [],
      facilities: [],
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

// Right Panel - Services Integration Component (MycoBrain status from real API)
// Poll only when tab is visible; 30s interval to reduce load (main CREP fetchData also hits /api/mycobrain at 60s)
function ServicesPanel() {
  const [mycoStatus, setMycoStatus] = useState<{ connected: boolean; devices: number }>({ connected: false, devices: 0 });
  useEffect(() => {
    const check = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const res = await fetch("/api/mycobrain", { signal: AbortSignal.timeout(5000) });
        const data = await res.json();
        const connected = data.serviceHealthy === true || (data.devices?.length > 0 && !data.error);
        setMycoStatus({ connected, devices: data.devices?.length ?? 0 });
      } catch {
        setMycoStatus({ connected: false, devices: 0 });
      }
    };
    check();
    const interval = setInterval(check, 30000);
    const onVisibility = () => {
      if (!document.hidden) check();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const services = [
    { id: "mycobrain", name: "MycoBrain", status: mycoStatus.connected ? "connected" : "offline", icon: <Brain className="w-3.5 h-3.5" />, color: "text-green-400", devices: mycoStatus.devices },
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

// Right Panel - CREP MYCA Integration (full real MYCA with map context)
function CREPMycaPanel({
  mapRef,
  layers,
  toggleLayer,
  groundFilter,
  onGroundFilterChange,
  fungalObservations = [],
  globalEvents = [],
  onSelectFungal,
  mission,
}: {
  mapRef: React.RefObject<any>;
  layers: LayerConfig[];
  toggleLayer: (id: string) => void;
  groundFilter: GroundFilter;
  onGroundFilterChange: (filter: Partial<GroundFilter>) => void;
  fungalObservations: any[];
  globalEvents: any[];
  onSelectFungal: (obs: any) => void;
  mission: MissionContext | null;
}) {
  // Build CREP context text that MYCA can use to understand the current state
  const getContextText = useCallback(() => {
    const enabledLayers = layers.filter(l => l.enabled).map(l => l.name).join(", ");
    const obsCount = fungalObservations.length;
    const eventCount = globalEvents.length;
    const missionInfo = mission
      ? `Active Mission: "${mission.name}" (${mission.type}) - ${mission.objective}`
      : "No active mission";

    return [
      `[CREP Dashboard Context]`,
      missionInfo,
      `Observations: ${obsCount} biodiversity records visible`,
      `Events: ${eventCount} environmental events active`,
      `Enabled layers: ${enabledLayers || "none"}`,
      ``,
      `You are MYCA, the AI agent integrated into the CREP (Common Relevant Environmental Picture) dashboard.`,
      `You can help the user navigate the map, toggle data layers, search for species or locations,`,
      `filter observations by kingdom, and analyze environmental patterns.`,
      `When the user asks to go to a location, fly to coordinates, or navigate - respond with the location name and coordinates.`,
      `When the user asks about species, provide information from MINDEX biodiversity data.`,
      `When the user asks to enable/disable layers or filters, describe what to change.`,
    ].join("\n");
  }, [layers, fungalObservations.length, globalEvents.length, mission]);

  // Listen for MYCA search actions and execute them on the map
  useEffect(() => {
    const handler = (e: Event) => {
      const action = (e as CustomEvent).detail;
      if (!action) return;

      if (action.type === "search" && action.query) {
        // Try to find matching observation
        const query = action.query.toLowerCase();
        const match = fungalObservations.find(obs =>
          obs.species_guess?.toLowerCase().includes(query) ||
          obs.taxon_name?.toLowerCase().includes(query) ||
          obs.species?.toLowerCase().includes(query) ||
          obs.taxon?.name?.toLowerCase().includes(query)
        );
        if (match) {
          onSelectFungal(match);
        }
      }
    };

    window.addEventListener("myca-search-action", handler);
    return () => window.removeEventListener("myca-search-action", handler);
  }, [fungalObservations, onSelectFungal]);

  return (
    <div className="flex flex-col h-full">
      <MYCAChatWidget
        className="h-full border-0 bg-transparent shadow-none"
        title="MYCA"
        showHeader={true}
        getContextText={getContextText}
      />
    </div>
  );
}

/**
 * Client-side MINDEX sync -- pushes fetched entity data to MINDEX proxy as a
 * safety net in case the server-side ingest (inside the API routes) failed.
 * Fire-and-forget: failures are silently caught so the UI is never blocked.
 */
function syncToMINDEX(source: "aircraft" | "vessels" | "satellites", entities: Record<string, unknown>[]) {
  if (!entities || entities.length === 0) return;
  const now = new Date().toISOString();
  fetch(`/api/mindex/proxy/${source}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      entities: entities.map(e => ({
        ...e,
        lat: e.lat ?? e.latitude ?? null,
        lng: e.lng ?? e.longitude ?? null,
        timestamp: e.timestamp || now,
      })),
    }),
  }).catch(() => {
    // Silent -- server-side ingest is the primary path; this is a fallback
  });
}

// Main CREP Page Component
export default function CREPDashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [rightPanelTab, setRightPanelTab] = useState("mission");
  const [leftPanelTab, setLeftPanelTab] = useState<"fungal" | "events" | "infra">("fungal"); // DEFAULT TO FUNGAL
  const [selectedEvent, setSelectedEvent] = useState<GlobalEvent | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  
  // Map reference for auto-zoom and pan functionality
  const [mapRef, setMapRef] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hasAutoZoomed, setHasAutoZoomed] = useState(false);

  // Globe/Map projection mode (Apr 2026 — OpenGridWorks-style)
  // Globe always — shows 3D sphere zoomed out, naturally flat 2D when zoomed in
  const [projectionMode, setProjectionMode] = useState<ProjectionMode>("globe");
  
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
  // Persistent event store — merge incoming, never fully replace (prevents blink)
  const eventStoreRef = useRef<Map<string, GlobalEvent>>(new Map());
  const [devices, setDevices] = useState<Device[]>([]);
  const [aircraft, setAircraft] = useState<AircraftEntity[]>([]);
  const [vessels, setVessels] = useState<VesselEntity[]>([]);
  const [buoys, setBuoys] = useState<any[]>([]);
  const [satellites, setSatellites] = useState<SatelliteEntity[]>([]);
  const [fungalObservations, setFungalObservations] = useState<FungalObservation[]>([]);
  // Persistent observation store — merge incoming data, never fully replace (prevents blink)
  const fungalStoreRef = useRef<Map<string, FungalObservation>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  
  // Conservation Demo widget data (fence/presence - empty until real MAS devices exist)
  const [fenceSegments, setFenceSegments] = useState<FenceSegment[]>([]);
  const [presenceReadings, setPresenceReadings] = useState<PresenceReading[]>([]);
  
  // Individual widget toggle states (Feb 17, 2026) - default OFF per user request
  const [showSmartFenceWidget, setShowSmartFenceWidget] = useState(false);
  const [showPresenceWidget, setShowPresenceWidget] = useState(false);

  // Ground Station overlay state (Mar 2026)
  const [showGroundStation, setShowGroundStation] = useState(false); // Hidden by default — only show when user opens it

  
  // Selected entity states for map interaction
  const [selectedAircraft, setSelectedAircraft] = useState<AircraftEntity | null>(null);
  const [selectedVessel, setSelectedVessel] = useState<VesselEntity | null>(null);
  const [selectedSatellite, setSelectedSatellite] = useState<SatelliteEntity | null>(null);
  const [selectedFungal, setSelectedFungal] = useState<FungalObservation | null>(null);
  const [selectedBuoy, setSelectedBuoy] = useState<any | null>(null);
  const [selectedOther, setSelectedOther] = useState<UnifiedEntity | null>(null);
  
  // Live events: IDs that appeared after initial load (show blinking indicator; pop-up)
  const initialEventIdsRef = useRef<Set<string> | null>(null);
  const initialSatelliteLoadDoneRef = useRef(false);
  const [newEventIds, setNewEventIds] = useState<Set<string>>(new Set());
  // Timestamp when deck.gl entity was clicked - used to avoid map click-away dismissing the popup
  const lastEntityPickTimeRef = useRef(0);

  // Streaming state
  const [isStreaming, setIsStreaming] = useState(true);
  const [streamedEntities, setStreamedEntities] = useState<UnifiedEntity[]>([]);
  const entityStreamClientRef = useRef<EntityStreamClient | null>(null);

  // Position extrapolation so planes/vessels/satellites move smoothly between API fetches
  const [extrapolatedCoords, setExtrapolatedCoords] = useState<Record<string, [number, number]>>({});
  const lastKnownRef = useRef<Record<string, { lng: number; lat: number; velLng: number; velLat: number; ts: number }>>({});
  const MAX_EXTRAPOLATION_MS = 30000; // cap at 30s — positions older than this use API data directly
  // Direct map ref for live entity data pump — bypasses React state propagation issues.
  // Set in onLoad callback, read in the data pump effect.
  const mapNativeRef = useRef<any>(null);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // INFRASTRUCTURE STATE — OpenGridWorks-style layers (Apr 2026)
  // ═══════════════════════════════════════════════════════════════════════════
  const [powerPlants, setPowerPlants] = useState<import("@/components/crep/layers/power-plant-bubbles").PowerPlant[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<import("@/components/crep/layers/power-plant-bubbles").PowerPlant | null>(null);
  const [infraSubstations, setInfraSubstations] = useState<any[]>([]);
  const [infraCableRoutes, setInfraCableRoutes] = useState<any[]>([]);
  const [infraTransmissionLines, setInfraTransmissionLines] = useState<any[]>([]);
  const [selectedInfraAsset, setSelectedInfraAsset] = useState<InfraAsset | null>(null);
  const [showInfraLayers, setShowInfraLayers] = useState(true);
  const [bubbleScale, setBubbleScale] = useState(1.0);
  const [searchOpen, setSearchOpen] = useState(false);

  // Power plant layers now integrated directly into infraDeckLayers below
  // with OpenGridWorks-style LOD rendering (bubbles only at zoom 3+)

  // ═══════════════════════════════════════════════════════════════════════════
  // INFRASTRUCTURE DECK.GL LAYERS — OpenGridWorks-style LOD rendering
  //
  // Zoom 0-3:  Submarine cables only (thin cyan lines across oceans)
  // Zoom 3-5:  + Power plant bubbles (large, colored by fuel, sized by MW)
  // Zoom 5-7:  + Substations appear (small voltage-colored dots)
  // Zoom 7-9:  + Plant labels, substation labels, cable names
  // Zoom 10+:  + Everything at full detail
  //
  // This matches OpenGridWorks visual hierarchy exactly.
  // ═══════════════════════════════════════════════════════════════════════════
  // Infrastructure rendered via MapLibre native layers (not deck.gl) — NO FLICKERING.
  // Layers added directly to map in onLoad handler via map.addSource/addLayer.
  // infraDeckLayers is empty — deck.gl only handles dynamic entities.
  const infraDeckLayers: any[] = [];
  // Old deck.gl infra code removed — now using MapLibre native layers
  // See onLoad handler above for map.addSource/addLayer calls

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
    showComms: true,
    showGPS: true,
    showStarlink: true,
    showDebris: true,
    showActive: false, // Off by default so toggling e.g. "only Debris" shows only debris
    orbitTypes: [],
  });
  
  const [spaceWeatherFilter, setSpaceWeatherFilter] = useState<SpaceWeatherFilter>({
    showSolarFlares: true,
    showCME: true,
    showGeomagneticStorms: true,
    showRadiationBelts: false,
    showAuroraOval: false,
    showSolarWind: false,
  });

  const [groundFilter, setGroundFilter] = useState<GroundFilter>({
    // Biodiversity – all on by default
    showFungi: true,
    showPlants: true,
    showBirds: true,
    showMammals: true,
    showReptiles: true,
    showInsects: true,
    showMarineLife: true,
    // Natural Events – on by default
    showEarthquakes: true,
    showVolcanoes: true,
    showWildfires: true,
    showStorms: true,
    showLightning: true,
    showTornadoes: true,
    showFloods: true,
    // Infrastructure – off by default
    showFactories: false,
    showPowerPlants: false,
    showMining: false,
    showOilGas: false,
    showWaterPollution: false,
    // Sensors – on by default
    showMycoBrain: true,
    showSporeBase: true,
    showSmartFence: true,
    showPartnerNetworks: false,
  });

  // Earth Observation imagery (NASA GIBS layers) – all off by default
  const [eoImageryFilter, setEoImageryFilter] = useState<EoImageryFilter>({
    showModis: false,
    showViirs: false,
    showAirs: false,
    showLandsat: false,
    showEonet: false,
  });

  // Basemap preference (dark | satellite) – stored in preferences
  const [basemap, setBasemap] = useState<"dark" | "satellite" | null>(null);

  // Species filter for fungal observations (map overlay dropdown)
  const [fungalSpeciesFilter, setFungalSpeciesFilter] = useState<string | null>(
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("q") : null
  );
  const [fungalDropdownOpen, setFungalDropdownOpen] = useState(false);
  const fungalDropdownCloseTimeout = useRef<NodeJS.Timeout | null>(null);

  // Mission context - prompt-based creation on first use
  const [currentMission, setCurrentMission] = useState<MissionContext | null>(null);
  const [showMissionPrompt, setShowMissionPrompt] = useState(false);

  // Ground Station — consume context to render satellite positions + station on map
  const { state: gsState, selectGroup } = useGroundStation();

  // Check for existing mission in localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("crep_active_mission");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        parsed.startTime = new Date(parsed.startTime);
        setCurrentMission(parsed);
      } catch {
        setShowMissionPrompt(true);
      }
    } else {
      // First time using CREP - show mission prompt
      setShowMissionPrompt(true);
    }
  }, []);

  const handleCreateMission = useCallback((mission: MissionContext) => {
    setCurrentMission(mission);
    setShowMissionPrompt(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("crep_active_mission", JSON.stringify(mission));
    }
  }, []);
  
  // Map ref for MYCA map control
  const mapControlRef = useRef<any>(null);
  
  const layerMetadataById: Record<string, { status: LayerDataStatus; source: string }> = {
    fungi: { status: "real", source: "MINDEX" },
    mycobrain: { status: "real", source: "MAS Devices" },
    sporebase: { status: "planned_real", source: "SporeBase" },
    partners: { status: "planned_real", source: "Partner Networks" },
    smartfence: { status: "planned_real", source: "MycoBrain Fence" },
    biodiversity: { status: "planned_real", source: "Biodiversity Datasets" },
    weather: { status: "planned_real", source: "Weather APIs" },
    earthquakes: { status: "planned_real", source: "USGS" },
    volcanoes: { status: "planned_real", source: "NOAA/Smithsonian" },
    wildfires: { status: "planned_real", source: "NASA FIRMS" },
    storms: { status: "planned_real", source: "NOAA" },
    solar: { status: "planned_real", source: "NOAA SWPC" },
    lightning: { status: "planned_real", source: "Lightning API" },
    tornadoes: { status: "planned_real", source: "NOAA" },
    aviation: { status: "planned_real", source: "OpenSky" },
    aviationRoutes: { status: "planned_real", source: "OpenSky" },
    ships: { status: "planned_real", source: "AISstream" },
    shipRoutes: { status: "planned_real", source: "AISstream" },
    fishing: { status: "planned_real", source: "Global Fishing Watch" },
    containers: { status: "planned_real", source: "Shipping" },
    vehicles: { status: "planned_real", source: "Traffic" },
    drones: { status: "planned_real", source: "UAV Feeds" },
    satellites: { status: "real", source: "CelesTrak" },
    population: { status: "planned_real", source: "Census/WorldPop" },
    humanMovement: { status: "planned_real", source: "Mobility Providers" },
    events_human: { status: "planned_real", source: "Event Feeds" },
    militaryAir: { status: "planned_real", source: "—" },
    militaryNavy: { status: "planned_real", source: "—" },
    militaryBases: { status: "planned_real", source: "—" },
    tanks: { status: "planned_real", source: "—" },
    militaryDrones: { status: "planned_real", source: "—" },
    factories: { status: "planned_real", source: "Industrial Registries" },
    co2Sources: { status: "planned_real", source: "Emissions Inventories" },
    methaneSources: { status: "planned_real", source: "Methane Datasets" },
    oilGas: { status: "planned_real", source: "Energy Infra" },
    powerPlants: { status: "planned_real", source: "Power Plants" },
    metalOutput: { status: "planned_real", source: "Mining Data" },
    waterPollution: { status: "planned_real", source: "Water Quality" },
    earth2Forecast: { status: "planned_real", source: "Earth-2" },
    earth2Nowcast: { status: "planned_real", source: "Earth-2" },
    earth2Spore: { status: "planned_real", source: "Earth-2" },
    earth2Wind: { status: "planned_real", source: "Earth-2" },
    earth2Temp: { status: "planned_real", source: "Earth-2" },
    earth2Precip: { status: "planned_real", source: "Earth-2" },
  };

  // Layer states - NATURE DATA FIRST, transport/military OFF by default
  // Primary layers: Fungal observations and MycoBrain devices
  // Secondary layers: Transport, military - toggleable demos for correlation analysis
  const [layers, setLayers] = useState<LayerConfig[]>([
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // PRIMARY LAYERS - FUNGAL/MINDEX DATA (ENABLED BY DEFAULT)
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // Nature Observations - THE PRIMARY DATA SOURCE (all life forms from MINDEX/iNaturalist/GBIF)
    { id: "fungi", name: "Nature Observations", category: "environment", icon: <TreePine className="w-3 h-3" />, enabled: false, opacity: 0.6, color: "#22c55e", description: "MINDEX biodiversity data - iNaturalist/GBIF observations (fungi, plants, birds, insects, animals, marine) with GPS" },
    // MycoBrain Devices - Real-time sensor network
    { id: "mycobrain", name: "MycoBrain Devices", category: "devices", icon: <Radar className="w-3 h-3" />, enabled: true, opacity: 1, color: "#22c55e", description: "Connected fungal monitoring ESP32-S3 devices" },
    { id: "sporebase", name: "SporeBase Sensors", category: "devices", icon: <Cpu className="w-3 h-3" />, enabled: true, opacity: 1, color: "#10b981", description: "Environmental spore detection sensors" },
    { id: "partners", name: "Partner Networks", category: "devices", icon: <Wifi className="w-3 h-3" />, enabled: false, opacity: 0.8, color: "#06b6d4", description: "Third-party research stations" },
    { id: "smartfence", name: "Smart Fence Network", category: "devices", icon: <Shield className="w-3 h-3" />, enabled: true, opacity: 1, color: "#06b6d4", description: "MycoBrain fence sensors for wildlife corridors" },
    // Environment - Context for fungal activity
    { id: "biodiversity", name: "Biodiversity Hotspots", category: "environment", icon: <Sparkles className="w-3 h-3" />, enabled: false, opacity: 0.7, color: "#a855f7", description: "High biodiversity concentration areas" },
    { id: "weather", name: "Weather Overlay", category: "environment", icon: <Thermometer className="w-3 h-3" />, enabled: false, opacity: 0.6, color: "#3b82f6", description: "Temperature, precipitation, wind - affects fungal growth" },
    { id: "buoys", name: "Ocean Buoys (NDBC)", category: "environment", icon: <Waves className="w-3 h-3" />, enabled: true, opacity: 0.9, color: "#84cc16", description: "NOAA NDBC ocean buoys - wave height, water temp, wind, pressure (~1300 stations)" },
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
    { id: "militaryBases", name: "Military Bases (Live)", category: "military", icon: <Shield className="w-3 h-3" />, enabled: false, opacity: 0.9, color: "#16a34a", description: "Real military installations via OSM — US + global" },
    { id: "militaryAir", name: "Military Aircraft", category: "military", icon: <Plane className="w-3 h-3" />, enabled: false, opacity: 0.9, color: "#f59e0b", description: "Military aviation tracking via ADS-B" },
    { id: "militaryNavy", name: "Naval Vessels", category: "military", icon: <Anchor className="w-3 h-3" />, enabled: false, opacity: 0.9, color: "#eab308", description: "Military ship movements via AIS" },
    { id: "tanks", name: "Ground Forces", category: "military", icon: <CrosshairIcon className="w-3 h-3" />, enabled: false, opacity: 0.8, color: "#d97706", description: "Tanks, carriers, ground vehicles" },
    { id: "militaryDrones", name: "Military UAVs", category: "military", icon: <Target className="w-3 h-3" />, enabled: false, opacity: 0.8, color: "#fbbf24", description: "Military drone operations" },
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // POLLUTION & INDUSTRY (OFF BY DEFAULT)
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    { id: "factories", name: "Factories & Plants", category: "pollution", icon: <Factory className="w-3 h-3" />, enabled: true, opacity: 0.7, color: "#f97316", description: "Industrial facilities globally" },
    { id: "co2Sources", name: "COâ‚‚ Emission Sources", category: "pollution", icon: <Cloud className="w-3 h-3" />, enabled: false, opacity: 0.6, color: "#ef4444", description: "Major COâ‚‚ emitters and hotspots" },
    { id: "methaneSources", name: "Methane Sources", category: "pollution", icon: <Gauge className="w-3 h-3" />, enabled: false, opacity: 0.6, color: "#dc2626", description: "Methane leaks and emission sources" },
    { id: "oilGas", name: "Oil & Gas Infrastructure", category: "pollution", icon: <Fuel className="w-3 h-3" />, enabled: false, opacity: 0.5, color: "#78350f", description: "Refineries, pipelines, platforms" },
    { id: "powerPlants", name: "Power Plants", category: "pollution", icon: <Power className="w-3 h-3" />, enabled: true, opacity: 0.9, color: "#fbbf24", description: "Thermal, nuclear, renewable plants — OpenGridWorks-style" },
    { id: "metalOutput", name: "Metal & Mining", category: "pollution", icon: <Wrench className="w-3 h-3" />, enabled: false, opacity: 0.5, color: "#a16207", description: "Mining operations and output" },
    { id: "waterPollution", name: "Water Contamination", category: "pollution", icon: <Droplet className="w-3 h-3" />, enabled: false, opacity: 0.6, color: "#0284c7", description: "Water pollution events and sources" },
    // TELECOM & INFRASTRUCTURE — OpenGridWorks-style (Apr 2026)
    { id: "submarineCables", name: "Submarine Cables", category: "telecom", icon: <Cable className="w-3 h-3" />, enabled: true, opacity: 0.8, color: "#06b6d4", description: "Undersea fiber optic cables" },
    { id: "dataCenters", name: "Data Centers", category: "telecom", icon: <Server className="w-3 h-3" />, enabled: true, opacity: 0.9, color: "#7c3aed", description: "Data centers worldwide from OSM" },
    { id: "cellTowers", name: "Cell Towers", category: "telecom", icon: <Radio className="w-3 h-3" />, enabled: false, opacity: 0.7, color: "#8b5cf6", description: "Cellular tower locations" },
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // NVIDIA EARTH-2 AI WEATHER LAYERS
    // Advanced AI-powered weather forecasting from NVIDIA Earth-2 platform
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    { id: "earth2Forecast", name: "Earth-2 AI Forecast", category: "environment", icon: <Cloud className="w-3 h-3" />, enabled: false, opacity: 0.7, color: "#06b6d4", description: "NVIDIA Atlas: 15-day medium-range AI forecast" },
    { id: "earth2Nowcast", name: "Earth-2 Nowcast", category: "environment", icon: <Radar className="w-3 h-3" />, enabled: false, opacity: 0.7, color: "#22d3ee", description: "NVIDIA StormScope: 0-6hr storm prediction" },
    { id: "earth2Spore", name: "Spore Dispersal AI", category: "environment", icon: <Wind className="w-3 h-3" />, enabled: false, opacity: 0.6, color: "#10b981", description: "AI-powered fungal spore dispersal modeling" },
    { id: "earth2Wind", name: "Wind Vectors", category: "environment", icon: <Wind className="w-3 h-3" />, enabled: false, opacity: 0.5, color: "#3b82f6", description: "High-resolution wind field visualization" },
    { id: "earth2Temp", name: "Temperature Heatmap", category: "environment", icon: <Thermometer className="w-3 h-3" />, enabled: false, opacity: 0.6, color: "#ef4444", description: "AI-downscaled temperature overlay" },
    { id: "earth2Precip", name: "Precipitation", category: "environment", icon: <Droplets className="w-3 h-3" />, enabled: false, opacity: 0.6, color: "#0ea5e9", description: "CorrDiff high-resolution precipitation" },
    // ═══════════════════════════════════════════════════════════════════════════
    // EARTH OBSERVATION IMAGERY — controlled by on-map MapLayersPopup
    // GIBS rendering handled via eoImageryFilter state + GibsBaseLayers
    // ═══════════════════════════════════════════════════════════════════════════
    // ═══════════════════════════════════════════════════════════════════════════
    // AURORA & SPACE WEATHER VISUAL OVERLAYS
    // ═══════════════════════════════════════════════════════════════════════════
    { id: "auroraOverlay", name: "Aurora Forecast", category: "events", icon: <Sparkles className="w-3 h-3" />, enabled: false, opacity: 0.5, color: "#34d399", description: "NOAA SWPC aurora probability overlay on polar regions" },
    // ═══════════════════════════════════════════════════════════════════════════
    // ADDITIONAL TELECOM (non-duplicate)
    // ═══════════════════════════════════════════════════════════════════════════
    { id: "signalHeatmap", name: "Signal Coverage", category: "telecom", icon: <Wifi className="w-3 h-3" />, enabled: false, opacity: 0.4, color: "#a855f7", description: "Approximate cellular signal coverage heatmap" },
    // ═══════════════════════════════════════════════════════════════════════════
    // ADDITIONAL FACILITIES (real data via Overpass API)
    // ═══════════════════════════════════════════════════════════════════════════
    { id: "hospitals", name: "Hospitals", category: "facilities", icon: <Cross className="w-3 h-3" />, enabled: false, opacity: 0.7, color: "#ec4899", description: "Hospital locations from OpenStreetMap" },
    { id: "fireStations", name: "Fire Stations", category: "facilities", icon: <Flame className="w-3 h-3" />, enabled: false, opacity: 0.7, color: "#ef4444", description: "Fire station locations from OSM" },
    { id: "universities", name: "Universities", category: "facilities", icon: <BookOpen className="w-3 h-3" />, enabled: false, opacity: 0.6, color: "#6d28d9", description: "University and college locations" },
  ]);
  
  // Event filter removed - groundFilter + spaceWeatherFilter drive event visibility
  
  // Earth-2 AI Weather state - use complete default filter with temperature enabled
  const [earth2Filter, setEarth2Filter] = useState<Earth2Filter>({
    ...DEFAULT_EARTH2_FILTER,
    showTemperature: false, // All Earth2 layers off by default — user opts in
    forecastHours: 24,
  });

  const earth2ApiResolutionDeg = useMemo(
    () => gridResolutionDegrees({ resolution: earth2Filter.resolution, gpuMode: earth2Filter.gpuMode }),
    [earth2Filter.resolution, earth2Filter.gpuMode],
  );
  
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
              center: [-98.5, 39.8],
              zoom: 4,
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
  
  // Update map projection when toggle changes (Apr 2026)
  useEffect(() => {
    if (!mapRef?.setProjection) return;
    mapRef.setProjection({ type: projectionMode });
    console.log(`[CREP] Projection set to: ${projectionMode}`);
  }, [mapRef, projectionMode]);

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
            // Allow lat/lng of 0 (solar flares at Sun, geomagnetic at pole) - use typeof check
            let formattedEvents = (data.events || [])
              .filter((e: any) => typeof e.location?.latitude === "number" && typeof e.location?.longitude === "number")
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
              
            // Filter by search query if it came from the overlay parent
            const urlQuery = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("q")?.toLowerCase() : null;
            if (urlQuery) {
              formattedEvents = formattedEvents.filter((e: any) => 
                (e.title && e.title.toLowerCase().includes(urlQuery)) ||
                (e.description && e.description.toLowerCase().includes(urlQuery)) ||
                (e.locationName && e.locationName.toLowerCase().includes(urlQuery)) ||
                (e.type && e.type.toLowerCase().includes(urlQuery))
              );
            }
            
            // Merge into persistent event store (prevents blink on refresh)
            for (const ev of formattedEvents) eventStoreRef.current.set(ev.id, ev);
            setGlobalEvents(Array.from(eventStoreRef.current.values()));
            // Capture IDs at first load so we can detect "new" events on later refreshes
            if (initialEventIdsRef.current === null) {
              initialEventIdsRef.current = new Set(formattedEvents.map((e: GlobalEvent) => e.id));
            }
          }
        } catch (e) {
          console.warn("[CREP] Failed to fetch global events:", e);
        }

        // Fetch MycoBrain devices - use /api/mycobrain (merges local + MAS registry, fallback when service down)
        try {
          const devicesRes = await fetch("/api/mycobrain", { signal: AbortSignal.timeout(8000) });
          if (devicesRes.ok) {
            const data = await devicesRes.json();
            const rawDevices = data.devices || [];
            // MycoBrain devices - default to San Diego 91910 when no GPS
            const SAN_DIEGO_91910 = { lat: 32.6189, lng: -117.0769 };
            const formattedDevices = rawDevices.map((d: any, index: number) => {
              const hasValidLocation = d.location?.lat && d.location?.lng &&
                Math.abs(d.location.lat) > 0.1 && Math.abs(d.location.lng) > 0.1 &&
                !(Math.abs(d.location.lat - 49) < 1 && Math.abs(d.location.lng + 123) < 1);
              const sensorData = d.sensor_data || d.device_info?.sensor_data || {};
              const info = d.device_info || d.info || {};
              const connected = d.connected ?? (d.status === "online");
              return {
                id: d.device_id || d.id || `device-${index}`,
                name: d.display_name || d.device_display_name || info.board_type || info.board || d.device_name || `MycoBrain ${index + 1}`,
                lat: hasValidLocation ? d.location.lat : SAN_DIEGO_91910.lat,
                lng: hasValidLocation ? d.location.lng : SAN_DIEGO_91910.lng,
                status: connected ? "online" : "offline",
                type: d.device_role || "mushroom1",
                port: d.port,
                firmware: info.firmware_version || info.firmware,
                protocol: d.protocol || "MDP",
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
            console.log(`[CREP] Loaded ${formattedDevices.length} MycoBrain devices (source: ${data.source || "mycobrain"})`);
            setDevices(formattedDevices);
          }
        } catch (e) {
          console.warn("[CREP] Failed to fetch MycoBrain devices:", e);
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
                console.log(`[CREP] ✈ ${data.aircraft.length} aircraft loaded from FlightRadar24`);
                setAircraft(data.aircraft);
                // Client-side MINDEX sync (fallback if server-side ingest missed)
                syncToMINDEX("aircraft", data.aircraft);
              } else {
                console.warn("[CREP] ✈ FlightRadar24 returned no aircraft array:", data?.error || "empty");
              }
            } else {
              console.warn(`[CREP] ✈ FlightRadar24 API returned ${aircraftRes.status}`);
            }
          } catch (e) {
            console.warn("[CREP] ✈ Failed to fetch aircraft:", e);
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
                console.log(`[CREP] 🚢 ${data.vessels.length} vessels loaded from AISstream${data.isLive ? ' (LIVE)' : ''}${data.sample ? ' (sample)' : ''}`);
                setVessels(data.vessels);
                // Client-side MINDEX sync (fallback if server-side ingest missed)
                syncToMINDEX("vessels", data.vessels);
              } else {
                console.warn("[CREP] 🚢 AISstream returned no vessels:", data?.error || "empty");
              }
            } else {
              console.warn(`[CREP] 🚢 AISstream API returned ${vesselsRes.status}`);
            }
          } catch (e) {
            console.warn("[CREP] 🚢 Failed to fetch vessels:", e);
          }
        }

        // Satellites: bounded initial load (3 categories), full set on 60s refresh
        const satelliteLayerEnabled = true;
        if (satelliteLayerEnabled) {
          try {
            const isInitial = !initialSatelliteLoadDoneRef.current;
            const categories = isInitial
              ? ["stations", "starlink", "active"]
              : ["stations", "starlink", "weather", "gnss", "active", "debris"];
            if (isInitial) initialSatelliteLoadDoneRef.current = true;
            const allSatellites: SatelliteEntity[] = [];
            for (const category of categories) {
              try {
                const res = await fetch(`/api/oei/satellites?category=${category}`);
                if (res.ok) {
                  const data = await res.json();
                  if (data.satellites && Array.isArray(data.satellites)) {
                    allSatellites.push(...data.satellites);
                  }
                }
              } catch (e) {
                console.warn(`[CREP] Failed to fetch ${category} satellites:`, e);
              }
            }
            const uniqueSatellites = Array.from(
              new Map(allSatellites.map(s => [s.id, s])).values()
            );
            console.log(`[CREP] 🛰 ${uniqueSatellites.length} satellites loaded (${isInitial ? "initial" : "full refresh"})`);
            setSatellites(uniqueSatellites);
            // Client-side MINDEX sync (fallback if server-side ingest missed)
            syncToMINDEX("satellites", uniqueSatellites as unknown as Record<string, unknown>[]);
          } catch (e) {
            console.warn("[CREP] 🛰 Failed to fetch satellites:", e);
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
        // FUNGAL: Fetched ONLY by bounds effect below – viewport-based like iNaturalist.
        // Removed unbounded fetch to prevent overwriting bounds-based data every 15s.
      } catch (error) {
        console.warn("Failed to fetch CREP data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
    // Refresh every 60s to reduce cold-path and polling load (was 15s)
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // BUOY DATA FETCH — NOAA NDBC ocean buoys (every 5 minutes)
  // ~1300 active stations worldwide with wave, wind, temp, pressure data
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const fetchBuoys = async () => {
      try {
        const res = await fetch("/api/oei/buoys");
        if (res.ok) {
          const data = await res.json();
          if (data.buoys && Array.isArray(data.buoys)) {
            console.log(`[CREP] Buoy: ${data.buoys.length} ocean buoys loaded from ${data.source || "ndbc"}`);
            setBuoys(data.buoys);
          }
        }
      } catch (e) {
        console.warn("[CREP] Buoy: Failed to fetch buoy data:", e);
      }
    };

    fetchBuoys();
    // Refresh every 5 minutes (buoy data updates every 5-10 min at NDBC)
    const interval = setInterval(fetchBuoys, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Infrastructure data fetched via map onLoad + moveend handler above (not useEffect)
  // This avoids React strict mode double-render abort issues with AbortController

  // Bounds-based fungal refetch – when map loads or user pans/zooms, fetch observations for viewport only (iNaturalist-style)
  // LOD: Pass zoom-derived limit to API for faster loads – fewer observations when zoomed out (Mar 11, 2026)
  useEffect(() => {
    if (!mapBounds) return;
    const { north, south, east, west } = mapBounds;
    if (![north, south, east, west].every(Number.isFinite) || north <= south) return;

    // Server-side LOD: request more data at every zoom level to fill the map
    const zoomLimit = mapZoom < 2 ? 2000 : mapZoom < 3 ? 5000 : mapZoom < 4 ? 10000 : mapZoom < 5 ? 20000 : undefined; // zoom 5+: no limit

    const ctrl = new AbortController();
    const formatObs = (obs: Record<string, unknown>): FungalObservation => {
      let lat = obs.latitude ?? obs.lat;
      let lng = obs.longitude ?? obs.lng;
      if (lat == null || lng == null) {
        const geom = obs.geometry as { coordinates?: [number, number] } | undefined;
        if (Array.isArray(geom?.coordinates) && geom.coordinates.length >= 2) {
          lng = geom.coordinates[0];
          lat = geom.coordinates[1];
        }
      }
      return {
      id: String(obs.id ?? obs.externalId ?? ""),
      observed_on: (obs.timestamp || obs.observed_on) as string,
      latitude: Number(lat ?? 0),
      longitude: Number(lng ?? 0),
      species: (obs.commonName || obs.species || obs.scientificName || "Unknown") as string,
      taxon_id: Number(obs.taxon_id ?? 0),
      taxon: {
        id: Number(obs.taxon_id ?? 0),
        name: (obs.scientificName || obs.species || "Unknown") as string,
        preferred_common_name: (obs.commonName || obs.species) as string,
        rank: "species",
      },
      photos: (obs.imageUrl || obs.thumbnailUrl) ? [{ id: 1, url: String(obs.imageUrl || obs.thumbnailUrl), license: "CC-BY-NC" }] : [],
      quality_grade: obs.verified ? "research" : "needs_id",
      user: obs.observer as string | undefined,
      source: obs.source as string | undefined,
      location: obs.location as string | undefined,
      habitat: obs.habitat as string | undefined,
      notes: obs.notes as string | undefined,
      sourceUrl: obs.sourceUrl as string | undefined,
      externalId: obs.externalId as string | undefined,
      kingdom: (obs.kingdom || obs.iconicTaxon || "Fungi") as string,
      iconicTaxon: (obs.iconicTaxon || obs.kingdom || "Fungi") as string,
    };
    };

    const t = setTimeout(async () => {
      try {
        setFungalLoading(true);
        const q = new URLSearchParams({
          north: String(north),
          south: String(south),
          east: String(east),
          west: String(west),
          nocache: "true",
        });
        if (zoomLimit) q.set("limit", String(zoomLimit));
        const res = await fetch(`/api/crep/fungal?${q}`, { signal: ctrl.signal });
        if (!res.ok) return;
        const data = await res.json();
        const raw = data.observations && Array.isArray(data.observations) ? data.observations : [];
        const formatted = raw.map((o: Record<string, unknown>) => formatObs(o));
        // MERGE into persistent store — never fully replace (prevents data blink)
        const store = fungalStoreRef.current;
        for (const obs of formatted) {
          store.set(obs.id, obs);
        }
        // TTL cleanup: remove observations older than 24h to prevent unbounded growth
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        for (const [id, obs] of store) {
          const ts = new Date(obs.observed_on || 0).getTime();
          if (ts > 0 && ts < cutoff) store.delete(id);
        }
        setFungalObservations(Array.from(store.values()));
        console.log(`[CREP] Viewport fungal: ${formatted.length} new, ${store.size} total persisted`);
      } catch (e) {
        if ((e as Error).name !== "AbortError") console.warn("[CREP] Bounds fungal fetch failed:", e);
      } finally {
        setFungalLoading(false);
      }
    }, 400);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [mapBounds, mapZoom]);

  // Periodic refresh of live events (earthquakes, lightning, fire, etc.) – new events pop up and blink
  const LIVE_EVENTS_REFRESH_MS = 90_000; // 90s
  useEffect(() => {
    const refreshLiveEvents = async () => {
      try {
        const eventsRes = await fetch("/api/natureos/global-events");
        if (!eventsRes.ok) return;
        const data = await eventsRes.json();
        const formattedEvents: GlobalEvent[] = (data.events || [])
          .filter((e: any) => typeof e.location?.latitude === "number" && typeof e.location?.longitude === "number")
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
        const knownIds = initialEventIdsRef.current;
        const newlySeen = knownIds
          ? formattedEvents.filter((e: GlobalEvent) => !knownIds.has(e.id)).map((e: GlobalEvent) => e.id)
          : [];
        if (newlySeen.length > 0) {
          setNewEventIds((prev) => new Set([...prev, ...newlySeen]));
          knownIds && newlySeen.forEach((id: string) => knownIds.add(id));
        }
        // Merge into persistent event store (prevents blink on live refresh)
        for (const ev of formattedEvents) eventStoreRef.current.set(ev.id, ev);
        setGlobalEvents(Array.from(eventStoreRef.current.values()));
      } catch (e) {
        console.warn("[CREP] Live events refresh failed:", e);
      }
    };
    const t = setTimeout(refreshLiveEvents, LIVE_EVENTS_REFRESH_MS);
    const interval = setInterval(refreshLiveEvents, LIVE_EVENTS_REFRESH_MS);
    return () => {
      clearTimeout(t);
      clearInterval(interval);
    };
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
      if (!selectedEvent && !selectedFungal && !selectedInfraAsset && !selectedOther) return;
      
      // Guard: Ensure target is an Element with closest() method
      if (!target || !(target instanceof Element)) {
        return;
      }
      
      // If we just picked a deck.gl entity (<400ms ago), do NOT dismiss - deck.gl onClick
      // may run after this; clicking species/plane/vessel icons was being cleared immediately.
      if (Date.now() - lastEntityPickTimeRef.current < 400) return;
      
      // Check if click is on the map (MapLibre canvas, deck.gl overlay, etc.) - never dismiss
      // when clicking map area; map's own click handler handles empty-map dismiss with delay.
      const isOnMap = target.closest('[data-crep-map]') !== null;
      if (isOnMap) return;
      
      // Check if click is inside any popup (content + close button + tip)
      const isInsidePopup = target.closest(".maplibregl-popup") !== null;
      
      // Check if click is inside a marker button (multiple selectors for robustness)
      const isInsideMarker = target.closest('[data-marker]') !== null || 
                             target.closest('.maplibregl-marker') !== null;

      // Check if click is inside side panels (Intel Feed / right panel)
      const isInsidePanel = target.closest('[data-panel]') !== null;
      
      // Check if click is inside Intel Feed event cards
      const isInsideEventCard = target.closest('[data-event-card]') !== null;
      
      // If clicking outside popup, marker, panel, and event cards - dismiss all
      if (!isInsidePopup && !isInsideMarker && !isInsidePanel && !isInsideEventCard) {
        console.log("[CREP] Click-away (doc): dismissing popups");
        setSelectedEvent(null);
        setSelectedFungal(null);
        setSelectedInfraAsset(null);
        setSelectedOther(null);
      }
    };

    // Use click event in BUBBLING phase (false/default) so that
    // marker stopPropagation() can prevent this handler from running
    document.addEventListener('click', handleClickAway, false);
    return () => document.removeEventListener('click', handleClickAway, false);
  }, [selectedEvent, selectedFungal, selectedInfraAsset, selectedOther]);

  // ═══════════════════════════════════════════════════════════════════════════
  // ESC KEY HANDLER: Dismiss all popups/selections on Escape
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedEvent || selectedFungal || selectedInfraAsset || selectedOther || selectedAircraft || selectedVessel || selectedSatellite || selectedPlant) {
          setSelectedEvent(null);
          setSelectedFungal(null);
          setSelectedInfraAsset(null);
          setSelectedOther(null);
          setSelectedAircraft(null);
          setSelectedVessel(null);
          setSelectedSatellite(null);
          setSelectedPlant(null);
          if (mapRef) clearHighlight(mapRef);
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedEvent, selectedFungal, selectedInfraAsset, selectedOther, selectedAircraft, selectedVessel, selectedSatellite, selectedPlant, mapRef]);

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

  const handleApplyMapPreferences = useCallback((prefs: CrepMapPreferences) => {
    if (mapRef) {
      const b = prefs.bounds;
      if (b && b.north != null && b.south != null && b.east != null && b.west != null && mapRef.fitBounds) {
        mapRef.fitBounds([[b.west, b.south], [b.east, b.north]], { duration: 1000 });
      } else if (prefs.center_lat != null && prefs.center_lng != null && prefs.zoom != null && mapRef.flyTo) {
        mapRef.flyTo({
          center: [prefs.center_lng, prefs.center_lat],
          zoom: prefs.zoom,
          duration: 1000,
        });
      }
    }
    if (prefs.layers?.length) {
      const enabledIds = new Set(prefs.layers);
      setLayers(prev => prev.map(l => ({ ...l, enabled: enabledIds.has(l.id) })));
    }
    if (prefs.kingdom_filter) {
      try {
        const parsed = JSON.parse(prefs.kingdom_filter) as Partial<GroundFilter>;
        if (parsed && typeof parsed === "object") {
          setGroundFilter(prev => ({ ...prev, ...parsed }));
        }
      } catch {
        /* ignore invalid JSON */
      }
    }
    if (prefs.eo_imagery && typeof prefs.eo_imagery === "object") {
      setEoImageryFilter(prev => ({ ...prev, ...prefs.eo_imagery }));
    }
    if (prefs.basemap === "dark" || prefs.basemap === "satellite") {
      setBasemap(prefs.basemap);
    }
  }, [mapRef]);

  // Sync ground filter toggles with layer visibility
  useEffect(() => {
    const layerMap: Record<string, boolean> = {
      earthquakes: groundFilter.showEarthquakes,
      volcanoes: groundFilter.showVolcanoes,
      wildfires: groundFilter.showWildfires,
      storms: groundFilter.showStorms,
      lightning: groundFilter.showLightning,
      tornadoes: groundFilter.showTornadoes,
      mycobrain: groundFilter.showMycoBrain,
      sporebase: groundFilter.showSporeBase,
      smartfence: groundFilter.showSmartFence,
      partners: groundFilter.showPartnerNetworks,
      factories: groundFilter.showFactories,
      powerPlants: groundFilter.showPowerPlants,
      metalOutput: groundFilter.showMining,
      oilGas: groundFilter.showOilGas,
      waterPollution: groundFilter.showWaterPollution,
    };
    setLayers(prev => prev.map(l =>
      l.id in layerMap ? { ...l, enabled: layerMap[l.id] } : l
    ));
  }, [groundFilter]);

  // Map command handlers for voice/MYCA CREP control (Todo 4 - wire-dashboard-consumers)
  const mapCommandHandlers = useMemo<MapCommandHandlers>(() => {
    const voiceToLayer: Record<string, string> = {
      planes: "aviation", vessels: "ships", ships: "ships", satellites: "satellites",
      fungal: "fungi", fungi: "fungi", earth2: "earth2Forecast",
    };
    const voiceToGround: Record<string, keyof GroundFilter> = {
      earthquakes: "showEarthquakes", volcanoes: "showVolcanoes", wildfires: "showWildfires",
      storms: "showStorms", lightning: "showLightning", tornadoes: "showTornadoes",
      mycobrain: "showMycoBrain", sporebase: "showSporeBase", smartfence: "showSmartFence",
      partners: "showPartnerNetworks",
    };
    const setLayerEnabled = (layerId: string, enabled: boolean) => {
      setLayers((prev) => prev.map((l) => (l.id === layerId ? { ...l, enabled } : l)));
    };
    const setGroundKey = (key: keyof GroundFilter, value: boolean) => {
      setGroundFilter((prev) => ({ ...prev, [key]: value }));
    };
    return {
      onFlyTo: (lng, lat, zoom, duration) => {
        if (mapRef?.flyTo) {
          mapRef.flyTo({ center: [lng, lat], zoom: zoom ?? mapRef.getZoom?.() ?? 4, duration: duration ?? 800 });
        }
      },
      onGeocodeAndFlyTo: async (query, zoom) => {
        try {
          const res = await fetch(`/api/crep/geocode?q=${encodeURIComponent(query)}`);
          const data = await res.json();
          const first = data?.results?.[0];
          if (first?.lat != null && first?.lng != null && mapRef?.flyTo) {
            mapRef.flyTo({ center: [first.lng, first.lat], zoom: zoom ?? 10, duration: 1000 });
          }
        } catch (e) {
          console.warn("[CREP] Geocode failed:", e);
        }
      },
      onZoomBy: (delta, duration) => {
        if (mapRef?.getZoom) {
          const z = mapRef.getZoom() + delta;
          mapRef.easeTo?.({ zoom: Math.max(0, Math.min(22, z)), duration: duration ?? 300 });
        }
      },
      onSetZoom: (zoom, duration) => {
        if (mapRef?.easeTo) mapRef.easeTo({ zoom, duration: duration ?? 300 });
      },
      onPanBy: (offset, duration) => {
        if (mapRef?.panBy) mapRef.panBy(offset, { duration: duration ?? 300 });
      },
      onResetView: () => {
        if (mapRef?.flyTo) mapRef.flyTo({ center: [0, 20], zoom: 2.5, duration: 800 });
      },
      onShowLayer: (layer) => {
        const l = voiceToLayer[layer.toLowerCase()];
        if (l) setLayerEnabled(l, true);
        else if (voiceToGround[layer.toLowerCase()]) setGroundKey(voiceToGround[layer.toLowerCase()], true);
      },
      onHideLayer: (layer) => {
        const l = voiceToLayer[layer.toLowerCase()];
        if (l) setLayerEnabled(l, false);
        else if (voiceToGround[layer.toLowerCase()]) setGroundKey(voiceToGround[layer.toLowerCase()], false);
      },
      onToggleLayer: (layer) => {
        const l = voiceToLayer[layer.toLowerCase()];
        if (l) {
          setLayers((prev) => prev.map((x) => (x.id === l ? { ...x, enabled: !x.enabled } : x)));
        } else if (voiceToGround[layer.toLowerCase()]) {
          const k = voiceToGround[layer.toLowerCase()];
          setGroundFilter((prev) => ({ ...prev, [k]: !prev[k] }));
        }
      },
      onApplyFilter: (filterType, filterValue) => {
        if ((filterType === "fungalSpecies" || filterType === "species") && filterValue) {
          setFungalSpeciesFilter(filterValue);
        }
      },
      onClearFilters: () => setFungalSpeciesFilter(null),
    };
  }, [mapRef, setLayers, setGroundFilter, setFungalSpeciesFilter]);

  useEffect(() => {
    const handler = (e: CustomEvent<FrontendCommand>) => {
      if (e.detail) executeCrepCommand(e.detail, mapCommandHandlers);
    };
    window.addEventListener("myca-crep-action" as any, handler as any);
    return () => window.removeEventListener("myca-crep-action" as any, handler as any);
  }, [mapCommandHandlers]);

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
  //   0-2  (world view)       â†’ 2000 markers  (global sampling)
  //   2-3  (multi-continent)  â†’ 5000 markers
  //   3-4  (continent view)   â†’ 10000 markers
  //   4-5  (large country)    â†’ 20000 markers
  //   5-6  (country/region)   â†’ 30000 markers
  //   6+   (local view)       â†’ ALL in viewport (no cap)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Species stats for Fungi dropdown (per-species counts)
  const fungalSpeciesStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const obs of fungalObservations) {
      const species = obs.taxon?.preferred_common_name || obs.species || obs.taxon?.name || "Unknown Species";
      counts.set(species, (counts.get(species) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [fungalObservations]);

  const visibleFungalObservations = useMemo(() => {
    // Early return with ALL markers if no bounds yet — never hide data before the map initializes
    if (!mapBounds || fungalObservations.length === 0) {
      return fungalObservations;
    }
    
    // Validate bounds are reasonable (Feb 12, 2026 - prevent NaN/Infinity issues)
    const boundsValid = 
      isFinite(mapBounds.north) && isFinite(mapBounds.south) &&
      isFinite(mapBounds.east) && isFinite(mapBounds.west) &&
      mapBounds.north > mapBounds.south;
    
    if (!boundsValid) {
      console.warn(`[CREP/LOD] Invalid bounds detected:`, mapBounds);
      return fungalObservations;
    }
    
    // Step 0: Filter by ground kingdom toggles
    const kingdomFiltered = fungalObservations.filter(obs => {
      const kingdom = obs.iconicTaxon || obs.kingdom || "Fungi";
      switch (kingdom) {
        case "Fungi": return groundFilter.showFungi;
        case "Plantae": return groundFilter.showPlants;
        case "Aves": return groundFilter.showBirds;
        case "Mammalia": return groundFilter.showMammals;
        case "Reptilia": return groundFilter.showReptiles;
        case "Amphibia": return groundFilter.showReptiles; // grouped with reptiles
        case "Insecta": return groundFilter.showInsects;
        case "Arachnida": return groundFilter.showInsects; // grouped with insects
        case "Actinopterygii":
        case "Mollusca": return groundFilter.showMarineLife;
        case "Animalia": return groundFilter.showMammals; // generic animal
        default: return true;
      }
    });

    // Step 0b: Filter by species (Fungi badge dropdown)
    const speciesFiltered = fungalSpeciesFilter
      ? kingdomFiltered.filter(obs => {
          const species = obs.taxon?.preferred_common_name || obs.species || obs.taxon?.name || "Unknown Species";
          return species === fungalSpeciesFilter;
        })
      : kingdomFiltered;

    // Step 1: Filter to viewport bounds FIRST (fast culling)
    // Add small padding to prevent markers at exact edges from disappearing (Feb 12, 2026)
    const padding = 0.001; // ~100m at equator
    const inViewport = speciesFiltered.filter(obs => {
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
      maxMarkers = 2000;
      lodLevel = "world";
    } else if (mapZoom < 3) {
      maxMarkers = 5000;
      lodLevel = "multi-continent";
    } else if (mapZoom < 4) {
      maxMarkers = 10000;
      lodLevel = "continent";
    } else if (mapZoom < 5) {
      maxMarkers = 20000;
      lodLevel = "large-country";
    } else if (mapZoom < 6) {
      maxMarkers = 30000;
      lodLevel = "country";
    } else {
      // At zoom 6+, show everything in viewport
      maxMarkers = Infinity;
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
  }, [fungalObservations, mapZoom, mapBounds, groundFilter, fungalSpeciesFilter]);
  
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
    // Mark this event as "seen" so blinking stops
    setNewEventIds((prev) => (prev.has(event.id) ? new Set([...prev].filter((id) => id !== event.id)) : prev));

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
    if (selectedEvent || selectedFungal || selectedInfraAsset || selectedOther) {
      setSelectedEvent(null);
      setSelectedFungal(null);
      setSelectedInfraAsset(null);
      setSelectedOther(null);
      // Clear OpenGridWorks-style highlight glow
      if (mapRef) {
        clearHighlight(mapRef);
      }
    }
  }, [selectedEvent, selectedFungal, selectedInfraAsset, selectedOther, mapRef]);

  // MYCA message handler
  // (MYCA chat is now handled by real MYCAProvider + CREPMycaPanel)

  // Filter events by groundFilter (earthquakes, volcanoes, etc.) and spaceWeatherFilter (solar_flare, geomagnetic_storm)
  const typeFilteredEvents = useMemo(() => {
    return globalEvents.filter(event => {
      const t = (event.type || "").toLowerCase();
      const sub = ((event as any).subtype || "").toLowerCase();
      // Space weather events - filter by spaceWeatherFilter
      if (t === "solar_flare" || sub === "radio_blackout") {
        return spaceWeatherFilter.showSolarFlares;
      }
      if (t === "geomagnetic_storm" || sub === "geomagnetic_storm") {
        return spaceWeatherFilter.showGeomagneticStorms;
      }
      if (sub === "solar_radiation") {
        return spaceWeatherFilter.showRadiationBelts;
      }
      if (t === "aurora" || sub.includes("aurora")) {
        return spaceWeatherFilter.showAuroraOval;
      }
      // Ground / natural events - filter by groundFilter
      if (t === "earthquake") return groundFilter.showEarthquakes;
      if (t === "volcano") return groundFilter.showVolcanoes;
      if (t === "wildfire" || t === "fire") return groundFilter.showWildfires;
      if (t === "storm" || t === "hurricane") return groundFilter.showStorms;
      if (t === "lightning") return groundFilter.showLightning;
      if (t === "tornado") return groundFilter.showTornadoes;
      if (t === "flood") return groundFilter.showFloods;
      if (t === "fungal_bloom" || t === "fungi") return groundFilter.showFungi;
      if (t === "landslide" || t === "tsunami") return groundFilter.showStorms; // severe weather
      // MycoBrain device events
      if (t === "device" || t === "mycobrain" || (event.source || "").toLowerCase().includes("mycobrain")) {
        return groundFilter.showMycoBrain;
      }
      return true; // show unknown types by default
    });
  }, [globalEvents, groundFilter, spaceWeatherFilter]);

  // LOD (Level of Detail) filtering for events - same system as fungal data
  const visibleEvents = useMemo(() => {
    // Early return with ALL events if no bounds yet — never hide events before map init
    if (!mapBounds || typeFilteredEvents.length === 0) {
      return typeFilteredEvents;
    }

    // Space weather types have synthetic coordinates (0,0 for solar flares, 65,0 for geomag)
    // - never cull them by viewport; always include if typeFilteredEvents passed them
    const SPACE_WEATHER_TYPES = ["solar_flare", "geomagnetic_storm", "aurora"];
    const isSpaceWeather = (e: GlobalEvent) => {
      const t = (e.type || "").toLowerCase();
      const sub = ((e as any).subtype || "").toLowerCase();
      return SPACE_WEATHER_TYPES.includes(t) || sub === "solar_radiation" || sub === "radio_blackout" || sub.includes("aurora");
    };
    
    // Step 1: Filter to viewport bounds (skip viewport culling for space weather)
    const inViewport = typeFilteredEvents.filter(event => {
      if (isSpaceWeather(event)) return true;
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
      maxEvents = 200;  // World view - show all significant events
    } else if (mapZoom < 3) {
      maxEvents = 500;
    } else if (mapZoom < 4) {
      maxEvents = 1000;
    } else {
      maxEvents = Infinity; // Show all at zoom 4+
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

  // ═══════════════════════════════════════════════════════════════════════════
  // INFRASTRUCTURE DATA — fetched from Overpass API via /api/oei/overpass
  // ═══════════════════════════════════════════════════════════════════════════
  const infraEnabledTypes = useMemo(() => {
    const typeMap: Record<string, string> = {
      factories: "factory",
      powerPlants: "power_plant",
      oilGas: "oil_gas",
      metalOutput: "mine",
      waterPollution: "water_treatment",
      co2Sources: "refinery",
      militaryBases: "military_base",
      cellTowers: "cell_tower",
      dataCenters: "data_center",
      submarineCables: "submarine_cable",
      hospitals: "hospital",
      fireStations: "fire_station",
      universities: "university",
    };
    return Object.entries(typeMap)
      .filter(([layerId]) => layers.find(l => l.id === layerId)?.enabled)
      .map(([, overpassType]) => overpassType);
  }, [layers]);

  const { features: infraFeatures, cables: infraCables, loading: infraLoading } = useInfrastructureData({
    enabledTypes: infraEnabledTypes,
    bounds: mapBounds ?? undefined,
    enabled: infraEnabledTypes.length > 0,
  });

  // Cell towers for signal heatmap
  const cellTowerPoints = useMemo(() =>
    infraFeatures
      .filter(f => f.type === "cell_tower")
      .map(f => ({ lat: f.lat, lng: f.lng, type: f.tags?.["tower:type"], height: parseFloat(f.tags?.height || "30") })),
    [infraFeatures]
  );
  
  // Map kingdom/iconicTaxon from observations to display keys for all-life support
  const kingdomCounts = useMemo(() => {
    const keys = ["fungi", "plants", "birds", "insects", "animals", "marine"] as const;
    const counts: Record<string, number> = Object.fromEntries(keys.map(k => [k, 0]));
    for (const obs of fungalObservations) {
      const kingdom = (obs.kingdom || "").trim();
      const iconic = (obs.iconicTaxon || "").trim();
      const key = kingdomToDisplayKey(kingdom, iconic);
      if (key && key in counts) counts[key]++;
    }
    return counts;
  }, [fungalObservations]);

  const stats = {
    events: globalEvents.length,
    devices: onlineDevices,
    critical: criticalCount,
    kingdoms: kingdomCounts,
  };

  // Update mission progress based on real data
  useEffect(() => {
    if (!currentMission) return;
    const totalDataPoints = fungalObservations.length + globalEvents.length + aircraft.length + vessels.length + satellites.length;
    const progress = Math.min(100, Math.round((totalDataPoints / Math.max(totalDataPoints, 100)) * 100));
    setCurrentMission(prev => prev ? {
      ...prev,
      targets: fungalObservations.length + globalEvents.length,
      alerts: criticalCount,
      progress,
    } : null);
  }, [fungalObservations.length, globalEvents.length, aircraft.length, vessels.length, satellites.length, criticalCount]);

  // ===========================================================================
  // FILTER AIRCRAFT: INCLUSION - show only if matches at least one enabled category
  // Uses intelligent sampling to prevent map clutter while maintaining coverage
  // ===========================================================================
  const filteredAircraft = useMemo(() => {
    let filtered = aircraft.filter(ac => {
      const isOnGround = ac.onGround === true;
      // When showAirborne OFF: exclude planes that are airborne (!isOnGround)
      if (!aircraftFilter.showAirborne && !isOnGround) return false;
      // When showGround OFF: exclude planes that are on ground
      if (!aircraftFilter.showGround && isOnGround) return false;

      const altitude = ac.altitude ?? 0;
      if (altitude < aircraftFilter.minAltitude || altitude > aircraftFilter.maxAltitude) return false;

      const category = (ac as any).tags?.find((t: string) =>
        ["Wide-body", "Narrow-body", "Regional", "Cargo", "Helicopter", "Aircraft"].includes(t)
      ) || "Aircraft";
      const callsign = (ac.callsign || "").trim().toUpperCase();
      const flightNumber = ((ac as any).flightNumber ?? "").toString();

      const isCargo = category === "Cargo" || (ac.aircraftType ?? "").toUpperCase().includes("F") ||
        ["FDX", "UPS", "CGN", "GTI", "ABX", "5Y", "K4", "FX", "PO"].some(p => callsign.startsWith(p));
      const militaryPrefixes = ["RCH", "REACH", "DUKE", "EVAC", "HURLB", "SPAR", "AWACS", "GAF", "IAM", "NAF", "NAVY", "HAF", "BAF", "RAAF", "VADER", "HOSS"];
      const isMilitary = militaryPrefixes.some(p => callsign.startsWith(p));

      // Commercial: airline call sign (3-letter ICAO + digits), or Wide/Narrow/Regional category, or origin+dest
      const airlineCallSign = /^[A-Z]{2,3}\d{1,4}$/.test(callsign);
      const isScheduledCategory = ["Wide-body", "Narrow-body", "Regional"].includes(category);
      const hasSchedule = !!(ac.origin && ac.destination) || !!flightNumber;
      const isCommercial = !isCargo && !isMilitary && (airlineCallSign || isScheduledCategory || hasSchedule);

      const isPrivate = !isCargo && !isMilitary && !isCommercial;

      const matchesEnabledCategory =
        (aircraftFilter.showCargo && isCargo) ||
        (aircraftFilter.showMilitary && isMilitary) ||
        (aircraftFilter.showPrivate && isPrivate) ||
        (aircraftFilter.showCommercial && isCommercial);

      if (!matchesEnabledCategory) return false;
      return true;
    });
    
    // Density reduction: cap at 2000 so more planes visible at all zoom levels
    // Sample evenly to maintain global coverage (was 250; increased for "see all planes")
    const MAX_DISPLAY = 2000;
    if (filtered.length > MAX_DISPLAY) {
      const step = Math.ceil(filtered.length / MAX_DISPLAY);
      filtered = filtered.filter((_, idx) => idx % step === 0);
    }
    
    return filtered;
  }, [aircraft, aircraftFilter]);

  // ===========================================================================
  // FILTER VESSELS: INCLUSION - show only if vessel matches at least one enabled category
  // AIS ShipType: 30=fishing, 31-32=towing, 35=military, 36-39=pleasure, 52=tug, 60-69=passenger, 70-79=cargo, 80-89=tanker
  // shipType 0 = unknown (position-only AIS) → treat as other/pleasure
  // ===========================================================================
  const filteredVessels = useMemo(() => {
    return vessels.filter(v => {
      const shipType = typeof v.shipType === "number" ? v.shipType : (v as any).properties?.shipTypeNum ?? 0;
      const shipTypeStr = (
        (v as any).properties?.shipType ?? (v as any).tags?.[0] ?? (v as any).description ?? ""
      ).toString().toLowerCase();
      const navStatusNum = (v as any).properties?.navStatusNum ?? null;

      const isCargo = (shipType >= 70 && shipType <= 79) || shipTypeStr.includes("cargo");
      const isTanker = (shipType >= 80 && shipType <= 89) || shipTypeStr.includes("tanker");
      const isPassenger = (shipType >= 60 && shipType <= 69) || shipTypeStr.includes("passenger");
      const isFishing = shipType === 30 || shipTypeStr.includes("fishing") || navStatusNum === 7;
      const isTug = shipType === 52 || (shipType >= 31 && shipType <= 32) || shipTypeStr.includes("tug") || shipTypeStr.includes("towing");
      const isMilitary = shipType === 35 || shipTypeStr.includes("military");
      const isPleasure = (shipType >= 36 && shipType <= 39) || shipTypeStr.includes("pleasure");
      const isOther = !isCargo && !isTanker && !isPassenger && !isFishing && !isTug && !isMilitary && !isPleasure; // shipType 0 or unmapped

      const matchesEnabledCategory =
        (vesselFilter.showCargo && isCargo) ||
        (vesselFilter.showTanker && isTanker) ||
        (vesselFilter.showPassenger && isPassenger) ||
        (vesselFilter.showFishing && isFishing) ||
        (vesselFilter.showTug && isTug) ||
        (vesselFilter.showMilitary && isMilitary) ||
        (vesselFilter.showPleasure && (isPleasure || isOther));

      if (!matchesEnabledCategory) return false;

      const speed = v.sog ?? (v as any).properties?.sog ?? 0;
      if (speed < vesselFilter.minSpeed) return false;

      return true;
    });
  }, [vessels, vesselFilter]);

  // ===========================================================================
  // FILTER SATELLITES: show only if sat matches at least one enabled category
  // (Fixes discrepancies when combining Stations / Comms / Starlink toggles)
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
      const isOther = !isStation && !isWeather && !isComms && !isGPS && !isStarlink && !isDebris;

      const matchesEnabledCategory =
        (isStation && satelliteFilter.showStations) ||
        (isWeather && satelliteFilter.showWeather) ||
        (isComms && satelliteFilter.showComms) ||
        (isGPS && satelliteFilter.showGPS) ||
        (isStarlink && satelliteFilter.showStarlink) ||
        (isDebris && satelliteFilter.showDebris) ||
        (isOther && satelliteFilter.showActive);

      if (!matchesEnabledCategory) return false;

      const orbitType = sat.orbitType || sat.properties?.orbitType || "";
      const orbitMatch =
        satelliteFilter.orbitTypes.length === 0 ||
        satelliteFilter.orbitTypes.some((ot) => orbitType.toUpperCase().includes(ot));
      if (!orbitMatch) return false;

      return true;
    });
  }, [satellites, satelliteFilter]);

  // Sync last-known position + velocity (deg/s) for extrapolation when API data changes
  useEffect(() => {
    const degPerSecPerKnot = 1 / 216000; // 1 knot = 1 nm/hr = 1/60 deg/hr = 1/216000 deg/s
    const next: Record<string, { lng: number; lat: number; velLng: number; velLat: number; ts: number }> = {};
    const now = Date.now();
    for (const a of filteredAircraft) {
      const lng = (a.location as any)?.longitude ?? a.location?.coordinates?.[0] ?? 0;
      const lat = (a.location as any)?.latitude ?? a.location?.coordinates?.[1] ?? 0;
      const headingDeg = typeof a.heading === "number" ? a.heading : ((a as any).properties?.heading ?? 0);
      const h = (headingDeg * Math.PI) / 180;
      const knots = typeof a.velocity === "number" ? a.velocity : ((a as any).properties?.velocity ?? (a as any).properties?.groundSpeed ?? 0) ?? 0;
      if (Number.isFinite(lng) && Number.isFinite(lat) && knots >= 0) {
        next[a.id] = {
          lng,
          lat,
          velLng: Math.sin(h) * knots * degPerSecPerKnot,
          velLat: Math.cos(h) * knots * degPerSecPerKnot,
          ts: now,
        };
      }
    }
    for (const v of filteredVessels) {
      const loc = v.location as { longitude?: number; latitude?: number; coordinates?: [number, number] } | undefined;
      const lng = loc?.longitude ?? loc?.coordinates?.[0] ?? 0;
      const lat = loc?.latitude ?? loc?.coordinates?.[1] ?? 0;
      const sog = v.sog ?? (v as any).properties?.sog;
      const cog = v.cog ?? (v as any).properties?.cog ?? 0;
      if (Number.isFinite(lng) && Number.isFinite(lat) && typeof sog === "number" && sog >= 0) {
        const h = (cog * Math.PI) / 180;
        next[v.id] = {
          lng,
          lat,
          velLng: Math.sin(h) * sog * degPerSecPerKnot,
          velLat: Math.cos(h) * sog * degPerSecPerKnot,
          ts: now,
        };
      }
    }
    // Satellites are no longer extrapolated here — they use real-time SGP4 propagation
    // via the satellite-animation module (requestAnimationFrame at ~10 FPS).
    lastKnownRef.current = next;
  }, [filteredAircraft, filteredVessels]);

  // Tick: every 2 seconds extrapolate positions from last known + velocity.
  // This updates React state → triggers deckEntities recompute → data pump to MapLibre.
  // 2s interval keeps animation smooth enough while NOT blocking UI with constant re-renders.
  // At 2s intervals with 2000+ entities, the browser has 1.75s of idle time between updates
  // for processing click events, scroll, and other interactions.
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const next: Record<string, [number, number]> = {};
      for (const [id, last] of Object.entries(lastKnownRef.current)) {
        const dtSec = (now - last.ts) / 1000;
        if (dtSec > MAX_EXTRAPOLATION_MS / 1000) continue;
        const lng = last.lng + last.velLng * dtSec;
        const lat = Math.max(-90, Math.min(90, last.lat + last.velLat * dtSec));
        next[id] = [lng, lat];
      }
      setExtrapolatedCoords((prev) => (Object.keys(next).length === 0 ? prev : { ...prev, ...next }));
    }, 2000); // 0.5 FPS — smooth enough for position updates, leaves UI thread free
    return () => clearInterval(interval);
  }, []);

  const deckEntities = useMemo<UnifiedEntity[]>(() => {
    const lastKnown = lastKnownRef.current;
    const sourceEntities = [
      ...filteredAircraft.map((aircraftEntity) => {
        const apiLng = (aircraftEntity.location as any)?.longitude ?? aircraftEntity.location?.coordinates?.[0] ?? 0;
        const apiLat = (aircraftEntity.location as any)?.latitude ?? aircraftEntity.location?.coordinates?.[1] ?? 0;
        const extrap = extrapolatedCoords[aircraftEntity.id];
        const coords: [number, number] = extrap ?? [apiLng, apiLat];
        const anchor = lastKnown[aircraftEntity.id];
        const trailAnchor: [number, number] | undefined = anchor ? [anchor.lng, anchor.lat] : undefined;
        const headingDeg = aircraftEntity.heading ?? (aircraftEntity as any).properties?.heading ?? 0;
        const speedKnots = typeof aircraftEntity.velocity === "number" ? aircraftEntity.velocity : (aircraftEntity as any).properties?.velocity ?? (aircraftEntity as any).properties?.groundSpeed ?? 0;
        const hRad = (headingDeg * Math.PI) / 180;
        return {
        id: aircraftEntity.id,
        type: "aircraft" as const,
        geometry: { type: "Point" as const, coordinates: coords },
        state: {
          heading: headingDeg,
          altitude: aircraftEntity.altitude ?? undefined,
          velocity: typeof speedKnots === "number" && speedKnots > 0
            ? { x: Math.sin(hRad) * speedKnots, y: Math.cos(hRad) * speedKnots }
            : undefined,
          trailAnchor,
        },
        time: {
          observed_at: aircraftEntity.lastSeen,
          valid_from: aircraftEntity.lastSeen,
        },
        confidence: 1,
        source: "opensky",
        properties: (aircraftEntity as any).properties || {},
        s2_cell: "",
      };
      }),
      ...filteredVessels.map((vesselEntity) => {
        const loc = vesselEntity.location as { longitude?: number; latitude?: number; coordinates?: [number, number] } | undefined;
        const apiLng = loc?.longitude ?? loc?.coordinates?.[0] ?? 0;
        const apiLat = loc?.latitude ?? loc?.coordinates?.[1] ?? 0;
        const extrap = extrapolatedCoords[vesselEntity.id];
        const coords: [number, number] = extrap ?? [apiLng, apiLat];
        const anchor = lastKnown[vesselEntity.id];
        const trailAnchor: [number, number] | undefined = anchor ? [anchor.lng, anchor.lat] : undefined;
        return {
        id: vesselEntity.id,
        type: "vessel" as const,
        geometry: { type: "Point" as const, coordinates: coords },
        state: {
          heading: vesselEntity.cog ?? (vesselEntity as any).properties?.cog,
          velocity: (() => {
            const sog = vesselEntity.sog ?? (vesselEntity as any).properties?.sog;
            const cog = vesselEntity.cog ?? (vesselEntity as any).properties?.cog ?? 0;
            if (sog === undefined || sog === null) return undefined;
            const hRad = (cog * Math.PI) / 180;
            return { x: Math.sin(hRad) * sog, y: Math.cos(hRad) * sog };
          })(),
          trailAnchor,
        },
        time: {
          observed_at: (vesselEntity as any).timestamp ?? vesselEntity.lastSeen ?? (vesselEntity as any).properties?.timestamp,
          valid_from: (vesselEntity as any).timestamp ?? vesselEntity.lastSeen ?? (vesselEntity as any).properties?.timestamp,
        },
        confidence: 1,
        source: "ais",
        properties: (vesselEntity as any).properties || {},
        s2_cell: "",
      };
      }),
      // Satellite positions are now driven by the SGP4 satellite-animation module
      // at ~10 FPS via requestAnimationFrame. These deckEntities entries are kept
      // for the unified entity list (click-selection, sidebar, etc.) but their
      // coordinates are the API fallback position, NOT the live propagated position.
      ...filteredSatellites.map((satelliteEntity) => {
        const loc = (satelliteEntity as any).location as { longitude?: number; latitude?: number; coordinates?: [number, number] } | undefined;
        const est = satelliteEntity.estimatedPosition;
        const apiLng = loc?.longitude ?? loc?.coordinates?.[0] ?? est?.longitude ?? 0;
        const apiLat = loc?.latitude ?? loc?.coordinates?.[1] ?? est?.latitude ?? 0;
        const orbitalParams = (satelliteEntity as { orbitalParams?: { velocity?: number; period?: number; inclination?: number } }).orbitalParams;
        const velKmS = orbitalParams?.velocity ?? (satelliteEntity as any).properties?.velocity ?? 0;
        return {
        id: satelliteEntity.id,
        type: "satellite" as const,
        geometry: { type: "Point" as const, coordinates: [apiLng, apiLat] as [number, number] },
        state: {
          altitude: (satelliteEntity as any).altitude ?? satelliteEntity.estimatedPosition?.altitude,
          heading: (satelliteEntity as any).heading,
          velocity: typeof velKmS === "number" && velKmS > 0 ? { x: velKmS / 111, y: 0 } : undefined,
        },
        time: {
          observed_at: (satelliteEntity as any).lastUpdate ?? satelliteEntity.lastSeen,
          valid_from: (satelliteEntity as any).lastUpdate ?? satelliteEntity.lastSeen,
        },
        confidence: 1,
        source: "norad",
        properties: (satelliteEntity as any).properties || {},
        s2_cell: "",
      };
      }),
      // Fungal observations are rendered as DOM MapMarkers (FungalMarker) for reliable click handling.
      // deck.gl IconLayer onClick does not fire reliably with MapboxOverlay/interleaved; DOM markers work.
    ];

    const byId = new Map<string, UnifiedEntity>();
    for (const entity of sourceEntities) byId.set(entity.id, entity as UnifiedEntity);
    for (const streamed of streamedEntities) byId.set(streamed.id, streamed);
    const result = [...byId.values()];
    // Expose for onLoad initial pump (React state not accessible from map callback)
    if (typeof window !== "undefined") (window as any).__crep_deckEntities = result;
    return result;
  }, [filteredAircraft, filteredVessels, filteredSatellites, visibleFungalObservations, streamedEntities, extrapolatedCoords, layers]);

  // ═══════════════════════════════════════════════════════════════════════════
  // MAPLIBRE NATIVE ENTITY LAYERS — bypasses deck.gl entirely for reliability.
  // Aircraft, satellites, vessels rendered as MapLibre circle layers with live
  // position updates via source.setData(). Separate from infrastructure layers.
  // Animation: deckEntities updates every 250ms → source.setData() → smooth movement.
  // ═══════════════════════════════════════════════════════════════════════════
  // Data pump: push deckEntities into MapLibre native sources when positions change.
  // Simple setTimeout(0) — runs after current microtask queue, lets clicks process first.
  useEffect(() => {
    const map = mapNativeRef.current;
    if (!map) return;
    // Use setTimeout(0) to yield to UI thread before pumping data
    const timer = setTimeout(() => {
      const m = mapNativeRef.current;
      if (!m) return;
      try {
        const toFC = (ents: any[]) => ({
          type: "FeatureCollection" as const,
          features: ents.filter((e: any) => e.geometry?.coordinates?.length >= 2).map((e: any) => ({
            type: "Feature" as const,
            properties: { id: e.id, heading: e.state?.heading ?? 0, type: e.type,
              name: e.properties?.callsign || e.properties?.name || e.properties?.mmsi || e.id },
            geometry: e.geometry,
          })),
        });
        const aircraft = deckEntities.filter((e: any) => e.type === "aircraft");
        const vessels = deckEntities.filter((e: any) => e.type === "vessel");
        const acSrc = m.getSource?.("crep-live-aircraft") as any;
        if (acSrc?.setData) acSrc.setData(toFC(aircraft));
        // Satellites are NOT pushed here — they are driven by the SGP4 satellite-animation
        // module at ~10 FPS via requestAnimationFrame for smooth real-time propagation.
        const vSrc = m.getSource?.("crep-live-vessels") as any;
        if (vSrc?.setData) vSrc.setData(toFC(vessels));
      } catch {}
    }, 0);
    return () => clearTimeout(timer);
  }, [deckEntities]);

  // ═══════════════════════════════════════════════════════════════════════════
  // BUOY DATA PUMP — push buoy positions into MapLibre native source
  // Separate from deckEntities pump since buoys are static environmental data,
  // not moving entities. Updates when buoys state changes (~every 5 minutes).
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const map = mapNativeRef.current;
    if (!map || buoys.length === 0) return;

    // Expose for click handler lookup
    if (typeof window !== "undefined") (window as any).__crep_buoys = buoys;

    const buoyLayerEnabled = layers.find(l => l.id === "buoys")?.enabled ?? true;

    const timer = setTimeout(() => {
      const m = mapNativeRef.current;
      if (!m) return;
      try {
        const buoySrc = m.getSource?.("crep-live-buoys") as any;
        if (buoySrc?.setData) {
          const fc = {
            type: "FeatureCollection" as const,
            features: buoyLayerEnabled ? buoys.filter((b: any) => b.lat != null && b.lng != null && Math.abs(b.lat) <= 90 && Math.abs(b.lng) <= 180).map((b: any) => ({
              type: "Feature" as const,
              properties: {
                id: b.id,
                station_id: b.station_id,
                wave_height: b.wave_height,
                water_temp: b.water_temp,
                wind_speed: b.wind_speed,
                air_temp: b.air_temp,
                pressure: b.pressure,
              },
              geometry: { type: "Point" as const, coordinates: [b.lng, b.lat] },
            })) : [],
          };
          buoySrc.setData(fc);
        }
      } catch {}
    }, 0);
    return () => clearTimeout(timer);
  }, [buoys, layers]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SGP4 SATELLITE ANIMATION — Real-time propagation at ~10 FPS
  // Runs via requestAnimationFrame, independent of React state. Pushes positions
  // directly into the MapLibre "crep-live-satellites" source and generates orbit
  // path lines into "crep-live-satellite-orbits".
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const map = mapNativeRef.current;
    if (!map || filteredSatellites.length === 0) return;

    // Build satellite inputs with orbital elements in properties
    const satInputs = filteredSatellites.map((s) => ({
      id: s.id,
      properties: (s as any).properties || {},
    }));

    if (!isSatelliteAnimationRunning()) {
      // First start — launch the animation loop
      startSatelliteAnimation(map, satInputs);
    } else {
      // Already running — just update the satellite set (adds new ones)
      updateSatelliteAnimation(satInputs);
    }
  }, [filteredSatellites]);

  // Cleanup: stop satellite animation on unmount
  useEffect(() => {
    return () => {
      stopSatelliteAnimation();
    };
  }, []);

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
            onClick={() => setLeftPanelOpen(prev => !prev)}
            className="h-7 w-7 border border-gray-600/30 hover:border-cyan-400/50"
          >
            {leftPanelOpen ? <ChevronLeft className="w-4 h-4 text-cyan-400" /> : <ChevronRight className="w-4 h-4 text-cyan-400" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setRightPanelOpen(prev => !prev)}
            className="h-7 w-7 border border-gray-600/30 hover:border-cyan-400/50"
          >
            {rightPanelOpen ? <PanelRightClose className="w-4 h-4 text-cyan-400" /> : <PanelRightOpen className="w-4 h-4 text-cyan-400" />}
          </Button>
          {/* Globe/Map Projection Toggle (Apr 2026 — OpenGridWorks-style) */}
          <GlobeToggle mode={projectionMode} onChange={setProjectionMode} />
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
        {/* Floating Left Sidebar - Intel Feed - NATURE DATA PRIMARY */}
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
                  NATURE DATA
                </button>
                <button
                  onClick={() => setLeftPanelTab("infra")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-[10px] font-semibold transition-all",
                    leftPanelTab === "infra"
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/50"
                      : "bg-black/30 text-gray-500 border border-transparent hover:border-gray-600"
                  )}
                >
                  <Zap className="w-3 h-3" />
                  INFRA
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
                <div className="text-[8px] text-gray-500 uppercase">Observations</div>
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

            {/* NATURE TAB CONTENT - PRIMARY */}
            {leftPanelTab === "fungal" && (
              <>
                {/* What the map dots are — clear explanation for all life forms */}
                <div className="p-2 border-b border-green-500/20 bg-green-950/20 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Leaf className="w-3.5 h-3.5 text-green-400 shrink-0" />
                    <span className="text-[10px] font-semibold text-green-300">What are the colored dots?</span>
                  </div>
                  <p className="text-[9px] text-gray-400 leading-snug">
                    Each dot is a <strong className="text-gray-300">nature observation</strong> with GPS: species sightings (fungi, plants, birds, insects, animals, marine) from <strong className="text-purple-400">MINDEX</strong> and <strong className="text-green-400">iNaturalist</strong>/<strong className="text-blue-400">GBIF</strong>, enriched by <strong className="text-cyan-400">MYCA</strong> and the <strong className="text-amber-400">Nature Learning Model (NLM)</strong>. Click a dot or list item to see details and source links.
                  </p>
                  {/* Color Legend — Kingdom dot colors */}
                  <details className="group">
                    <summary className="text-[9px] text-cyan-400/80 cursor-pointer hover:text-cyan-300 select-none flex items-center gap-1">
                      <ChevronDown className="w-2.5 h-2.5 group-open:rotate-180 transition-transform" />
                      <span>Color Legend</span>
                    </summary>
                    <div className="mt-1.5 space-y-1.5">
                      {/* Nature Observation Colors */}
                      <div className="text-[8px] text-gray-500 font-semibold uppercase tracking-wider">Species</div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                        {[
                          { color: "bg-amber-700",  label: "Fungi" },
                          { color: "bg-emerald-700", label: "Plants" },
                          { color: "bg-sky-700",     label: "Birds" },
                          { color: "bg-orange-700",  label: "Mammals" },
                          { color: "bg-lime-700",    label: "Reptiles" },
                          { color: "bg-green-700",   label: "Amphibians" },
                          { color: "bg-cyan-700",    label: "Fish" },
                          { color: "bg-rose-700",    label: "Mollusks" },
                          { color: "bg-red-800",     label: "Arachnids" },
                          { color: "bg-yellow-700",  label: "Insects" },
                          { color: "bg-orange-700",  label: "Other Animals" },
                        ].map(({ color, label }) => (
                          <div key={label} className="flex items-center gap-1.5 py-0.5">
                            <div className={cn("w-2 h-2 rounded-full shrink-0", color)} />
                            <span className="text-[9px] text-gray-400">{label}</span>
                          </div>
                        ))}
                      </div>
                      {/* Entity Type Colors */}
                      <div className="text-[8px] text-gray-500 font-semibold uppercase tracking-wider mt-1">Tracking</div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                        {[
                          { color: "bg-amber-400",  label: "Aircraft" },
                          { color: "bg-purple-500", label: "Satellites" },
                          { color: "bg-cyan-500",   label: "Vessels" },
                          { color: "bg-red-500",    label: "Events" },
                        ].map(({ color, label }) => (
                          <div key={label} className="flex items-center gap-1.5 py-0.5">
                            <div className={cn("w-2 h-2 rounded-full shrink-0", color)} />
                            <span className="text-[9px] text-gray-400">{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </details>
                </div>
                {/* Nature Observation Filters */}
                <div className="p-2 border-b border-cyan-500/10 space-y-2">
                  <div className="flex items-center gap-2">
                    <Leaf className="w-3 h-3 text-green-500" />
                    <span className="text-[10px] text-green-400 font-semibold">Nature Observations</span>
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
                    Limited to 200 items in the scrollable list for DOM performance */}
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-1">
                    {fungalLoading ? (
                      <div className="text-center py-8 text-gray-500 text-[10px]">
                        <Leaf className="w-8 h-8 mx-auto mb-2 animate-pulse text-emerald-500" />
                        <span className="animate-pulse">Loading from MINDEX...</span>
                      </div>
                    ) : visibleFungalObservations.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 text-[10px]">
                        <Leaf className="w-8 h-8 mx-auto mb-2 text-emerald-500/50" />
                        Zoom in to see observations
                      </div>
                    ) : (
                      visibleFungalObservations.slice(0, 200).map((obs) => {
                        const speciesName = obs.taxon?.preferred_common_name || obs.species || obs.taxon?.name || "Unknown Species";
                        const isResearchGrade = obs.quality_grade === "research";
                        const isSelected = selectedFungal?.id === obs.id;
                        const { Icon, color } = getObservationListIcon(obs as any);
                        
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
                                <Icon className={cn("w-3 h-3", color)} />
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
                    {visibleFungalObservations.length > 200 && (
                      <div className="text-center py-2 text-[9px] text-gray-500">
                        Showing 200 of {visibleFungalObservations.length} visible â€¢ Zoom in for more
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </>
            )}

            {/* EVENTS TAB CONTENT - SECONDARY */}
            {leftPanelTab === "events" && (
              <>
                {/* Event List - Filtered by Ground/Space Weather toggles in Data Filters panel */}
            <ScrollArea className="flex-1">
                  <div className="px-2 py-1.5 space-y-1.5">
                    {filteredEvents.slice(0, 200).map((event) => {
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
                    {filteredEvents.length > 200 && (
                      <div className="text-center py-2 text-[9px] text-gray-500">
                        Showing 200 of {filteredEvents.length} visible â€¢ Zoom in for more
                      </div>
                    )}
              </div>
            </ScrollArea>
              </>
            )}

            {/* INFRASTRUCTURE TAB CONTENT — OpenGridWorks-style (Apr 2026) */}
            {leftPanelTab === "infra" && (
              <ScrollArea className="flex-1">
                <InfrastructureStatsPanel
                  plants={powerPlants}
                  transmissionLines={infraTransmissionLines}
                  substations={infraSubstations}
                  cableRoutes={infraCableRoutes}
                  zoom={mapZoom}
                  bubbleScale={bubbleScale}
                  onBubbleScaleChange={setBubbleScale}
                />
              </ScrollArea>
            )}

            {/* Sidebar Footer */}
            <div className="px-3 py-2 border-t border-cyan-500/20 bg-black/30">
              <div className="flex items-center justify-between text-[8px] font-mono text-gray-500">
                <span>{leftPanelTab === "fungal" ? "MINDEX SYNC" : leftPanelTab === "infra" ? "MINDEX INFRA" : "LAST UPDATE"}</span>
                <span className="text-cyan-400">{clientTime || "--:--:--"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Map Container - Full size, panels overlay it. data-crep-map used by click-away to avoid dismissing when clicking deck.gl icons. */}
        <div
          className="absolute inset-0 crep-map-container"
          data-crep-map
          onClickCapture={(e) => {
            if (!layers.find(l => l.id === "fungi")?.enabled) return;
            const el = (e.target as Element)?.closest?.("[data-marker=fungal], [data-observation-id]");
            if (!el) return;
            const obsId = el.getAttribute("data-observation-id");
            if (!obsId) return;
            const obs = visibleFungalObservations.find(o => String(o.id) === obsId);
            if (obs) {
              handleSelectFungal(selectedFungal?.id === obs.id ? null : obs);
              e.stopPropagation();
            }
          }}
        >
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
            /* Ensure species/fungal markers receive clicks above deck.gl overlay canvas */
            .crep-map-container .maplibregl-marker-container {
              z-index: 9999 !important;
              pointer-events: auto !important;
            }
            .crep-map-container .maplibregl-marker {
              pointer-events: auto !important;
            }
          `}</style>
          <MapComponent
            center={userLocation ? [userLocation.lng, userLocation.lat] : [-98.5, 39.8]}
            zoom={userLocation ? 5 : 4}
            projection={projectionMode === "globe" ? { type: "globe" } : { type: "mercator" }}
            styles={{
              dark: "https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json",
              light: "https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json"
            }}
            onLoad={(map: any) => {
              setMapRef(map);
              mapNativeRef.current = map; // Direct ref for entity data pump
              // Register PMTiles protocol for vector tile sources
              import("maplibre-gl").then((ml) => registerPMTilesProtocol(ml.default));
              console.log("[CREP] Map loaded, reference captured for auto-zoom");

              // ════════════════════════════════════════════════════════════
              // LIVE ENTITY LAYERS — aircraft, satellites, vessels
              // Created empty here, data pumped in by useEffect every 250ms.
              // MapLibre native = 100% reliable, no deck.gl issues.
              // ════════════════════════════════════════════════════════════
              const emptyFC = { type: "FeatureCollection" as const, features: [] as any[] };
              try {
                // ═══════════════════════════════════════════════════════════
                // ✈ AIRCRAFT — Bright amber/gold with pulsing glow + trail
                // Distinctive: large, bright, white-bordered, trail line
                // At high zoom: shows callsign label
                // ═══════════════════════════════════════════════════════════
                map.addSource("crep-live-aircraft", { type: "geojson", data: emptyFC });
                // Generate aircraft icon via canvas (guaranteed to work — no external file)
                const acCanvas = document.createElement("canvas");
                acCanvas.width = 32; acCanvas.height = 32;
                const acCtx = acCanvas.getContext("2d")!;
                acCtx.fillStyle = "white";
                acCtx.beginPath();
                // Plane silhouette pointing UP
                acCtx.moveTo(16, 2); acCtx.lineTo(20, 10); acCtx.lineTo(28, 14);
                acCtx.lineTo(28, 17); acCtx.lineTo(20, 15); acCtx.lineTo(19, 24);
                acCtx.lineTo(22, 27); acCtx.lineTo(22, 29); acCtx.lineTo(16, 27);
                acCtx.lineTo(10, 29); acCtx.lineTo(10, 27); acCtx.lineTo(13, 24);
                acCtx.lineTo(12, 15); acCtx.lineTo(4, 17); acCtx.lineTo(4, 14);
                acCtx.lineTo(12, 10); acCtx.closePath(); acCtx.fill();
                map.addImage("aircraft-icon", acCtx.getImageData(0, 0, 32, 32), { sdf: true });
                // Outer glow
                map.addLayer({ id: "crep-live-aircraft-glow", type: "circle", source: "crep-live-aircraft",
                  paint: {
                    "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 6, 6, 10, 10, 16],
                    "circle-color": "#fbbf24", "circle-opacity": 0.15, "circle-blur": 1.0 }});
                // Aircraft ICON (symbol layer — rotates by heading, amber plane shape)
                map.addLayer({ id: "crep-live-aircraft-dot", type: "symbol", source: "crep-live-aircraft",
                  layout: {
                    "icon-image": "aircraft-icon",
                    "icon-size": ["interpolate", ["linear"], ["zoom"], 2, 0.5, 6, 0.7, 10, 1.0, 14, 1.5],
                    "icon-rotate": ["get", "heading"],
                    "icon-rotation-alignment": "map",
                    "icon-allow-overlap": true, "icon-ignore-placement": true },
                  paint: { "icon-color": "#fbbf24", "icon-halo-color": "#000", "icon-halo-width": 1 }});
                // Click + hover
                map.on("click", "crep-live-aircraft-dot", (e: any) => {
                  const id = e.features?.[0]?.properties?.id;
                  if (id) {
                    lastEntityPickTimeRef.current = Date.now();
                    const ac = filteredAircraft.find((a) => a.id === id);
                    if (ac) setSelectedAircraft(ac);
                  }
                });
                map.on("mouseenter", "crep-live-aircraft-dot", () => { map.getCanvas().style.cursor = "pointer"; });
                map.on("mouseleave", "crep-live-aircraft-dot", () => { map.getCanvas().style.cursor = ""; });

                // ═══════════════════════════════════════════════════════════
                // 🛰 SATELLITES — Violet/purple with cross-hatch glow
                // Distinctive: smaller, purple, fast-moving, orbit trail
                // ═══════════════════════════════════════════════════════════
                map.addSource("crep-live-satellites", { type: "geojson", data: emptyFC });
                // Outer glow
                map.addLayer({ id: "crep-live-satellites-glow", type: "circle", source: "crep-live-satellites",
                  paint: {
                    "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 6, 6, 9, 10, 14],
                    "circle-color": "#c084fc", "circle-opacity": 0.3, "circle-blur": 0.9 }});
                // Inner dot
                map.addLayer({ id: "crep-live-satellites-dot", type: "circle", source: "crep-live-satellites",
                  paint: {
                    "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 2.5, 6, 4, 10, 7, 14, 11],
                    "circle-color": "#c084fc", "circle-opacity": 1,
                    "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 2, 0.5, 10, 1.5],
                    "circle-stroke-color": "#ffffff" }});
                // Labels added later when style fonts are known
                map.on("click", "crep-live-satellites-dot", (e: any) => {
                  const id = e.features?.[0]?.properties?.id;
                  if (id) {
                    lastEntityPickTimeRef.current = Date.now();
                    const sat = filteredSatellites.find((s) => s.id === id);
                    if (sat) setSelectedSatellite(sat);
                  }
                });
                map.on("mouseenter", "crep-live-satellites-dot", () => { map.getCanvas().style.cursor = "pointer"; });
                map.on("mouseleave", "crep-live-satellites-dot", () => { map.getCanvas().style.cursor = ""; });

                // ═══════════════════════════════════════════════════════════
                // 🛰 SATELLITE ORBIT PATHS — thin purple dashed lines
                // SGP4-propagated orbit ground tracks (next 90 min)
                // ═══════════════════════════════════════════════════════════
                map.addSource("crep-live-satellite-orbits", { type: "geojson", data: emptyFC });
                map.addLayer({ id: "crep-live-satellite-orbits-line", type: "line", source: "crep-live-satellite-orbits",
                  paint: { "line-color": "#c084fc", "line-width": 1, "line-opacity": 0.4, "line-dasharray": [4, 4] }});

                // ═══════════════════════════════════════════════════════════
                // 🚢 VESSELS — Bright cyan/teal with ocean glow
                // Distinctive: medium, cyan blue, near coastlines
                // ═══════════════════════════════════════════════════════════
                map.addSource("crep-live-vessels", { type: "geojson", data: emptyFC });
                // Generate vessel icon via canvas (arrowhead/ship shape)
                const vCanvas = document.createElement("canvas");
                vCanvas.width = 32; vCanvas.height = 32;
                const vCtx = vCanvas.getContext("2d")!;
                vCtx.fillStyle = "white";
                vCtx.beginPath();
                // Ship/arrowhead pointing UP
                vCtx.moveTo(16, 2); vCtx.lineTo(27, 28); vCtx.lineTo(16, 22);
                vCtx.lineTo(5, 28); vCtx.closePath(); vCtx.fill();
                map.addImage("vessel-icon", vCtx.getImageData(0, 0, 32, 32), { sdf: true });
                // Outer glow
                map.addLayer({ id: "crep-live-vessels-glow", type: "circle", source: "crep-live-vessels",
                  paint: {
                    "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 6, 6, 9, 10, 14],
                    "circle-color": "#22d3ee", "circle-opacity": 0.2, "circle-blur": 0.9 }});
                // Vessel ICON (symbol layer — rotates by COG, cyan arrowhead)
                map.addLayer({ id: "crep-live-vessels-dot", type: "symbol", source: "crep-live-vessels",
                  layout: {
                    "icon-image": "vessel-icon",
                    "icon-size": ["interpolate", ["linear"], ["zoom"], 2, 0.4, 6, 0.6, 10, 0.9, 14, 1.3],
                    "icon-rotate": ["get", "heading"],
                    "icon-rotation-alignment": "map",
                    "icon-allow-overlap": true, "icon-ignore-placement": true },
                  paint: { "icon-color": "#22d3ee", "icon-halo-color": "#000", "icon-halo-width": 1 }});
                map.on("click", "crep-live-vessels-dot", (e: any) => {
                  const id = e.features?.[0]?.properties?.id;
                  if (id) {
                    lastEntityPickTimeRef.current = Date.now();
                    const v = filteredVessels.find((v) => v.id === id);
                    if (v) setSelectedVessel(v);
                  }
                });
                map.on("mouseenter", "crep-live-vessels-dot", () => { map.getCanvas().style.cursor = "pointer"; });
                map.on("mouseleave", "crep-live-vessels-dot", () => { map.getCanvas().style.cursor = ""; });

                // ═══════════════════════════════════════════════════════════
                // OCEAN BUOYS — Yellow-green dots (NOAA NDBC stations)
                // ~1300 active ocean buoys with weather/wave data
                // ═══════════════════════════════════════════════════════════
                map.addSource("crep-live-buoys", { type: "geojson", data: emptyFC });
                // Outer glow
                map.addLayer({ id: "crep-live-buoys-glow", type: "circle", source: "crep-live-buoys",
                  paint: {
                    "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 5, 6, 8, 10, 12],
                    "circle-color": "#84cc16", "circle-opacity": 0.25, "circle-blur": 0.8 }});
                // Inner dot
                map.addLayer({ id: "crep-live-buoys-dot", type: "circle", source: "crep-live-buoys",
                  paint: {
                    "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 2.5, 6, 4, 10, 6, 14, 9],
                    "circle-color": "#84cc16", "circle-opacity": 1,
                    "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 2, 0.5, 10, 1.5],
                    "circle-stroke-color": "#ffffff" }});
                // Click handler
                map.on("click", "crep-live-buoys-dot", (e: any) => {
                  const props = e.features?.[0]?.properties;
                  if (props) {
                    lastEntityPickTimeRef.current = Date.now();
                    // Parse the serialised properties back
                    try {
                      const buoyId = props.station_id || props.id;
                      const matched = (window as any).__crep_buoys?.find((b: any) => b.station_id === buoyId || b.id === buoyId);
                      if (matched) setSelectedBuoy(matched);
                    } catch {}
                  }
                });
                map.on("mouseenter", "crep-live-buoys-dot", () => { map.getCanvas().style.cursor = "pointer"; });
                map.on("mouseleave", "crep-live-buoys-dot", () => { map.getCanvas().style.cursor = ""; });

                console.log("[CREP/Live] Native entity layers created — ✈ amber + labels, 🛰 purple + labels, 🚢 cyan + labels, buoy lime-green");
                // Initial data pump — fill entity sources 1s after creation so aircraft/sats show immediately.
                // The React data pump effect may miss the first render if deckEntities was set before mapNativeRef.
                setTimeout(() => {
                  try {
                    const entities = (window as any).__crep_deckEntities;
                    if (!entities?.length) return;
                    const toFC = (ents: any[]) => ({
                      type: "FeatureCollection",
                      features: ents.filter((e: any) => e.geometry?.coordinates?.length >= 2).map((e: any) => ({
                        type: "Feature",
                        properties: { id: e.id, heading: e.state?.heading ?? 0, type: e.type,
                          name: e.properties?.callsign || e.properties?.name || e.properties?.mmsi || e.id },
                        geometry: e.geometry,
                      })),
                    });
                    const ac = entities.filter((e: any) => e.type === "aircraft");
                    const v = entities.filter((e: any) => e.type === "vessel");
                    (map.getSource("crep-live-aircraft") as any)?.setData(toFC(ac));
                    // Satellites are handled by SGP4 satellite-animation module — not pumped here
                    (map.getSource("crep-live-vessels") as any)?.setData(toFC(v));
                    console.log(`[CREP/Live] Initial pump: ✈${ac.length} 🚢${v.length} (satellites via SGP4 animation)`);
                  } catch {}
                }, 1000);
              } catch (err: any) {
                console.warn("[CREP/Live] Failed to create entity layers:", err.message);
              }

              // ════════════════════════════════════════════════════════════
              // PERMANENT INFRASTRUCTURE — MapLibre native layers
              // Rendered directly by MapLibre (not deck.gl) = NO FLICKERING
              // Loads ONCE from MINDEX, added as GeoJSON sources + layers.
              // This is how OpenGridWorks renders — permanent infra in the
              // map pipeline, dynamic entities in deck.gl overlay.
              // ════════════════════════════════════════════════════════════
              let infraLoaded = false;
              const loadPermanentInfra = () => {
                if (infraLoaded) return;
                infraLoaded = true;
                console.log("[CREP/Infra] Loading permanent infrastructure into MapLibre...");

                // Safe source/layer add — handles HMR re-runs where source already exists
                const safeAddSource = (id: string, spec: any) => {
                  try {
                    if (map.getSource(id)) {
                      (map.getSource(id) as any).setData(spec.data);
                    } else {
                      map.addSource(id, spec);
                    }
                  } catch (e: any) {
                    console.warn(`[CREP/Infra] Source ${id}:`, e.message);
                  }
                };
                const safeAddLayer = (spec: any) => {
                  try {
                    if (map.getLayer(spec.id)) {
                      map.removeLayer(spec.id);
                    }
                    map.addLayer(spec);
                  } catch (e: any) {
                    console.warn(`[CREP/Infra] Layer ${spec.id}:`, e.message);
                  }
                };

                // Use reasonable bounds that PostGIS can handle efficiently
                // Full global for now — MINDEX returns up to 2000 per query
                const globalBounds = {
                  north: 85, south: -60, east: 180, west: -180,
                };

                // Helper: fuel type → color
                const fuelColor = (sub: string) => {
                  const f = (sub || "").toLowerCase();
                  if (f.includes("solar")) return "#f59e0b";
                  if (f.includes("wind")) return "#14b8a6";
                  if (f.includes("hydro")) return "#38bdf8";
                  if (f.includes("nuclear")) return "#4ade80";
                  if (f.includes("gas")) return "#a855f7";
                  if (f.includes("coal")) return "#9ca3af";
                  if (f.includes("oil")) return "#ef4444";
                  if (f.includes("biomass") || f.includes("waste")) return "#eab308";
                  if (f.includes("geothermal")) return "#22c55e";
                  if (f.includes("data_center")) return "#7c3aed";
                  if (f.includes("battery") || f.includes("storage")) return "#f43f5e";
                  return "#6b7280";
                };

                // ── Submarine cables (global) — multi-color like submarinecablemap.com ──
                // Split into 2 hemispheres to avoid PostGIS full-globe bbox issues
                const cableColors = ["#06b6d4","#3b82f6","#a855f7","#ec4899","#f59e0b","#22c55e","#ef4444","#8b5cf6","#14b8a6","#f97316"];

                // Antimeridian fix: split LineStrings that cross ±180° longitude
                // Without this, cables from Japan to US draw a line across the entire map
                const splitAntimeridian = (geom: any) => {
                  if (!geom?.coordinates?.length) return geom;
                  const coords = geom.coordinates;
                  if (geom.type === "MultiLineString") {
                    // Already multi — split each sub-line
                    const newCoords: number[][][] = [];
                    for (const line of coords) {
                      newCoords.push(...splitLineCoords(line));
                    }
                    return { type: "MultiLineString", coordinates: newCoords };
                  }
                  // Single LineString
                  const segments = splitLineCoords(coords);
                  if (segments.length === 1) return { type: "LineString", coordinates: segments[0] };
                  return { type: "MultiLineString", coordinates: segments };
                };

                const splitLineCoords = (coords: number[][]) => {
                  const segments: number[][][] = [];
                  let current: number[][] = [coords[0]];
                  for (let i = 1; i < coords.length; i++) {
                    const prevLng = coords[i - 1][0];
                    const currLng = coords[i][0];
                    // Longitude jump > 180° = antimeridian crossing
                    if (Math.abs(currLng - prevLng) > 180) {
                      segments.push(current);
                      current = [];
                    }
                    current.push(coords[i]);
                  }
                  if (current.length > 0) segments.push(current);
                  // Filter out single-point segments
                  return segments.filter(s => s.length >= 2);
                };

                Promise.all([
                  mindexFetch("submarine-cables", { north: 85, south: -60, east: 0, west: -180 }, 5000).catch(() => ({ entities: [] })),
                  mindexFetch("submarine-cables", { north: 85, south: -60, east: 180, west: 0 }, 5000).catch(() => ({ entities: [] })),
                ]).then(([west, east]) => {
                  // Merge and deduplicate
                  const allCables = [...(west?.entities || []), ...(east?.entities || [])];
                  const seen = new Set<string>();
                  const data = { entities: allCables.filter(e => { if (!e.id || seen.has(e.id)) return false; seen.add(e.id); return true; }) };
                  if (!data?.entities?.length) return;
                  const features = data.entities
                    .filter((e: any) => e.properties?.route?.coordinates?.length >= 2)
                    .flatMap((e: any, i: number) => {
                      const color = cableColors[i % cableColors.length];
                      const props = {
                        name: e.name, color, cable_type: e.properties?.cable_type,
                        length_km: e.properties?.length_km,
                        owners: e.properties?.owners || e.properties?.operator,
                        rfs_year: e.properties?.rfs_year || e.properties?.year,
                        status: e.properties?.status || "Active",
                        landing_points: e.properties?.landing_points,
                        capacity: e.properties?.capacity,
                        cable_id: e.id,
                        source: e.source || "mindex",
                        url: e.properties?.url,
                      };
                      // Split at antimeridian so cables don't draw across the globe
                      const geom = splitAntimeridian(e.properties.route);
                      return [{
                        type: "Feature" as const,
                        properties: props,
                        geometry: geom,
                      }];
                    });
                  if (!features.length) return;
                  safeAddSource("crep-cables", { type: "geojson", data: { type: "FeatureCollection", features } });
                  safeAddLayer({
                    id: "crep-cables-line", type: "line", source: "crep-cables",
                    paint: {
                      "line-color": ["get", "color"],
                      "line-width": ["interpolate", ["linear"], ["zoom"], 1, 1.5, 4, 2.5, 8, 4],
                      "line-opacity": 0.8,
                    },
                  });
                  // Click handler for cable detail widget
                  map.on("click", "crep-cables-line", (e: any) => {
                    const props = e.features?.[0]?.properties;
                    if (props?.name) {
                      lastEntityPickTimeRef.current = Date.now(); // Prevent general click from dismissing
                      highlightFromEvent(map, e);
                      const coords = e.lngLat || e.features?.[0]?.geometry?.coordinates?.[0];
                      const lat = coords?.lat ?? coords?.[1] ?? 0;
                      const lng = coords?.lng ?? coords?.[0] ?? 0;
                      setSelectedInfraAsset({
                        type: "cable",
                        id: props.cable_id || props.id,
                        name: props.name,
                        lat, lng,
                        properties: typeof props === "object" ? { ...props } : {},
                      });
                      setSelectedPlant(null);
                    }
                  });
                  map.on("mouseenter", "crep-cables-line", () => { map.getCanvas().style.cursor = "pointer"; });
                  map.on("mouseleave", "crep-cables-line", () => { map.getCanvas().style.cursor = ""; });
                  setInfraCableRoutes(features as any);
                  console.log(`[CREP/Infra] ${features.length} cables → MapLibre (multi-color)`);
                }).catch((err) => console.warn("[CREP/Infra] Error:", err?.message || err));

                // ── Power plants + data centers ──
                // Fetch by state/province/country-level sub-regions for complete data coverage
                // Each jurisdiction is its own fetch region — guarantees no gaps in US coverage
                // ALL_FETCH_REGIONS = 51 US states + 13 CA provinces + 6 MX + 18 EU + 11 AS + 5 AF + 4 OC + 8 SA = ~116 regions
                const allRegionBounds = ALL_FETCH_REGIONS.map(regionToBounds);

                // ── Viewport-first loading ──
                // Step 1: Get current viewport bounds from the map
                const vpBounds = map.getBounds();
                const vp = vpBounds ? {
                  north: vpBounds.getNorth(),
                  south: vpBounds.getSouth(),
                  east: vpBounds.getEast(),
                  west: vpBounds.getWest(),
                } : null;

                // Step 2: Sort ALL regions by proximity to viewport center for fastest visible-area paint
                const vpCenter = vp ? { lat: (vp.north + vp.south) / 2, lng: (vp.east + vp.west) / 2 } : { lat: 39.8, lng: -98.5 };
                const sortedRegions = [...allRegionBounds].sort((a, b) => {
                  const aDist = Math.abs((a.north + a.south) / 2 - vpCenter.lat) + Math.abs((a.east + a.west) / 2 - vpCenter.lng);
                  const bDist = Math.abs((b.north + b.south) / 2 - vpCenter.lat) + Math.abs((b.east + b.west) / 2 - vpCenter.lng);
                  return aDist - bDist;
                });

                console.log(`[CREP/Infra] Full parallel fetch: ${sortedRegions.length} regions, sorted by proximity to viewport center`);

                // Step 3: Blast ALL regions in parallel — 10Gb network can handle it.
                // Render incrementally: first 20 regions fire onFirstBatch callback, rest accumulate.
                const FIRST_BATCH_SIZE = 20; // Render as soon as closest 20 regions complete
                const batchFetch = async (source: string, limit: number, onFirstBatch?: (results: any[]) => void) => {
                  // Split: first 20 (closest) vs rest (all at once, no batching)
                  const firstRegions = sortedRegions.slice(0, FIRST_BATCH_SIZE);
                  const restRegions = sortedRegions.slice(FIRST_BATCH_SIZE);

                  // Fire first batch immediately
                  const firstPromise = Promise.all(
                    firstRegions.map(b => mindexFetch(source as any, b, limit).catch(() => ({ entities: [], total: 0 })))
                  );
                  // Fire ALL remaining in parallel simultaneously (no batching — fast network)
                  const restPromise = Promise.all(
                    restRegions.map(b => mindexFetch(source as any, b, limit).catch(() => ({ entities: [], total: 0 })))
                  );

                  // As soon as first batch resolves, render it immediately
                  const firstResults = await firstPromise;
                  console.log(`[CREP/Infra] ${source}: first ${firstRegions.length} regions done`);
                  if (onFirstBatch) {
                    try { onFirstBatch(firstResults); } catch (_) {}
                  }
                  // Yield once for UI responsiveness
                  await new Promise(resolve => setTimeout(resolve, 0));

                  // Wait for rest (already in flight — just awaiting)
                  const restResults = await restPromise;
                  return [...firstResults, ...restResults];
                };

                // Helper: convert raw facility entities → GeoJSON features
                const facilitiesToFeatures = (entities: any[]) => entities
                  .filter((e: any) => e.lat != null && e.lng != null)
                  .map((e: any) => ({
                    type: "Feature" as const,
                    properties: {
                      name: e.name, type: e.entity_type,
                      sub_type: e.properties?.sub_type || e.properties?.type || e.entity_type,
                      capacity_mw: e.properties?.capacity_mw || 0,
                      operator: e.properties?.operator,
                      color: fuelColor(e.properties?.sub_type || e.properties?.type || e.entity_type),
                      status: e.properties?.status || "Operating",
                      source: e.source || "mindex",
                      plant_id: e.id,
                      sector: e.properties?.sector,
                      ba: e.properties?.ba,
                      entity: e.properties?.entity,
                      online_year: e.properties?.online_year,
                      retirement_year: e.properties?.retirement_year,
                    },
                    geometry: { type: "Point" as const, coordinates: [e.lng, e.lat] },
                  }));

                // Helper: render facilities to map + state (idempotent via safeAddSource/safeAddLayer)
                let plantsClickBound = false;
                const renderFacilities = (entities: any[], label: string) => {
                  const features = facilitiesToFeatures(entities);
                  if (!features.length) return;
                  safeAddSource("crep-plants", { type: "geojson", data: { type: "FeatureCollection", features } });
                  // OpenGridWorks-style: radius scaled by sqrt(capacity_mw)
                  // 10 MW → radius 3px, 100 MW → 6px, 1000 MW → 10px, 5000 MW → 14px
                  safeAddLayer({
                    id: "crep-plants-circle", type: "circle", source: "crep-plants",
                    paint: {
                      "circle-radius": [
                        "interpolate", ["linear"], ["zoom"],
                        2, ["max", 2, ["*", ["sqrt", ["max", 1, ["to-number", ["get", "capacity_mw"], 10]]], 0.3]],
                        6, ["max", 3, ["*", ["sqrt", ["max", 1, ["to-number", ["get", "capacity_mw"], 10]]], 0.5]],
                        10, ["max", 4, ["*", ["sqrt", ["max", 1, ["to-number", ["get", "capacity_mw"], 10]]], 0.8]],
                        14, ["max", 5, ["*", ["sqrt", ["max", 1, ["to-number", ["get", "capacity_mw"], 10]]], 1.2]],
                      ],
                      "circle-color": ["get", "color"],
                      "circle-opacity": 0.85,
                      "circle-stroke-width": 1,
                      "circle-stroke-color": "rgba(0,0,0,0.3)",
                    },
                  });
                  setPowerPlants(entities.filter((e: any) => e.lat).map((e: any) => ({
                    id: e.id, name: e.name || "Unknown", lat: e.lat, lng: e.lng,
                    capacity_mw: e.properties?.capacity_mw || 0,
                    fuel_type: e.properties?.sub_type || e.properties?.type || e.entity_type || "other",
                    status: e.properties?.status || "Operating",
                    owner: e.properties?.operator, source: e.source || "mindex", plant_id: e.id,
                  })));
                  // Only bind click/hover once
                  if (!plantsClickBound) {
                    plantsClickBound = true;
                    map.on("click", "crep-plants-circle", (e: any) => {
                      const props = e.features?.[0]?.properties;
                      if (props?.name) {
                        lastEntityPickTimeRef.current = Date.now();
                        highlightFromEvent(map, e);
                        const coords = e.lngLat;
                        setSelectedInfraAsset({
                          type: "plant",
                          id: props.plant_id || props.id,
                          name: props.name,
                          lat: coords?.lat ?? 0,
                          lng: coords?.lng ?? 0,
                          properties: typeof props === "object" ? { ...props } : {},
                        });
                        setSelectedPlant(null);
                      }
                    });
                    map.on("mouseenter", "crep-plants-circle", () => { map.getCanvas().style.cursor = "pointer"; });
                    map.on("mouseleave", "crep-plants-circle", () => { map.getCanvas().style.cursor = ""; });
                  }
                  console.log(`[CREP/Infra] ${features.length} plants → MapLibre (${label})`);
                };

                // Yield helper — gives browser time to process clicks between heavy operations
                const yieldToUI = () => new Promise<void>(r => setTimeout(r, 0));

                batchFetch("facilities", 20000, (vpResults) => {
                  // Early render: show viewport plants immediately
                  const vpEntities = vpResults.flatMap(r => r?.entities || []);
                  const seen = new Set<string>();
                  const unique = vpEntities.filter(e => { if (!e.id || seen.has(e.id)) return false; seen.add(e.id); return true; });
                  if (unique.length) renderFacilities(unique, "viewport");
                }).then(async (results) => {
                  const allEntities = results.flatMap(r => r?.entities || []);
                  const seen = new Set<string>();
                  const unique = allEntities.filter(e => { if (!e.id || seen.has(e.id)) return false; seen.add(e.id); return true; });
                  if (unique.length) renderFacilities(unique, "global");
                  await yieldToUI(); // Let browser process pending clicks
                }).catch((err) => console.warn("[CREP/Infra] Error:", err?.message || err));

                // ── Substations ── (jurisdictional sub-region split, viewport-first)
                const subsToFeatures = (entities: any[]) => entities
                  .filter((e: any) => e.lat && e.lng)
                  .map((e: any) => ({
                    type: "Feature" as const,
                    properties: {
                      name: e.name, voltage_kv: e.properties?.voltage_kv || 0,
                      operator: e.properties?.operator,
                      sub_type: e.properties?.sub_type || e.properties?.type,
                      status: e.properties?.status || "Active",
                      source: e.source || "mindex",
                      id: e.id,
                    },
                    geometry: { type: "Point" as const, coordinates: [e.lng, e.lat] },
                  }));

                let subsClickBound = false;
                const renderSubstations = (entities: any[], label: string) => {
                  const features = subsToFeatures(entities);
                  if (!features.length) return;
                  safeAddSource("crep-substations", { type: "geojson", data: { type: "FeatureCollection", features } });
                  safeAddLayer({
                    id: "crep-subs-circle", type: "circle", source: "crep-substations",
                    paint: {
                      "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 2, 7, 4, 12, 7],
                      "circle-color": ["interpolate", ["linear"], ["get", "voltage_kv"],
                        0, "#9ca3af", 100, "#a855f7", 230, "#60a5fa", 345, "#22d3ee", 500, "#ffffff"],
                      "circle-opacity": 0.7,
                      "circle-stroke-width": 0.5,
                      "circle-stroke-color": "rgba(0,0,0,0.2)",
                    },
                    minzoom: 4,
                  });
                  if (!subsClickBound) {
                    subsClickBound = true;
                    map.on("click", "crep-subs-circle", (e: any) => {
                      const props = e.features?.[0]?.properties;
                      if (props?.name) {
                        lastEntityPickTimeRef.current = Date.now();
                        highlightFromEvent(map, e);
                        const coords = e.lngLat;
                        setSelectedInfraAsset({
                          type: "substation", id: props.id, name: props.name,
                          lat: coords?.lat ?? 0, lng: coords?.lng ?? 0,
                          properties: typeof props === "object" ? { ...props } : {},
                        });
                        setSelectedPlant(null);
                      }
                    });
                    map.on("mouseenter", "crep-subs-circle", () => { map.getCanvas().style.cursor = "pointer"; });
                    map.on("mouseleave", "crep-subs-circle", () => { map.getCanvas().style.cursor = ""; });
                  }
                  setInfraSubstations(entities.filter((e: any) => e.lat && e.lng));
                  console.log(`[CREP/Infra] ${features.length} substations → MapLibre (${label})`);
                };

                batchFetch("substations", 20000, (vpResults) => {
                  const vpSubs = vpResults.flatMap(r => r?.entities || []);
                  const seen = new Set<string>();
                  const unique = vpSubs.filter(e => { if (!e.id || seen.has(e.id)) return false; seen.add(e.id); return true; });
                  if (unique.length) renderSubstations(unique, "viewport");
                }).then(async (results) => {
                  const allSubs = results.flatMap(r => r?.entities || []);
                  const seen = new Set<string>();
                  const unique = allSubs.filter(e => { if (!e.id || seen.has(e.id)) return false; seen.add(e.id); return true; });
                  if (unique.length) renderSubstations(unique, "global");
                  await yieldToUI();
                }).catch((err) => console.warn("[CREP/Infra] Substations error:", err?.message || err));

                // ── Transmission lines ── (jurisdictional sub-region split, viewport-first)
                const txLinesToFeatures = (entities: any[]) => entities
                  .filter((e: any) => e.properties?.route?.coordinates?.length >= 2)
                  .map((e: any) => ({
                    type: "Feature" as const,
                    properties: {
                      name: e.name, voltage_kv: e.properties?.voltage_kv || 0,
                      operator: e.properties?.operator,
                      circuits: e.properties?.circuits,
                      frequency: e.properties?.frequency,
                      length_km: e.properties?.length_km,
                      status: e.properties?.status || "Active",
                      source: e.source || "mindex",
                      id: e.id,
                    },
                    geometry: e.properties.route,
                  }));

                let txClickBound = false;
                const renderTxLines = (entities: any[], label: string) => {
                  const features = txLinesToFeatures(entities);
                  if (!features.length) return;
                  safeAddSource("crep-txlines", { type: "geojson", data: { type: "FeatureCollection", features } });
                  safeAddLayer({
                    id: "crep-txlines-line", type: "line", source: "crep-txlines",
                    paint: {
                      "line-color": ["interpolate", ["linear"], ["get", "voltage_kv"],
                        0, "#9ca3af", 31, "#fb923c", 100, "#ec4899", 230, "#a855f7",
                        345, "#60a5fa", 500, "#22d3ee", 735, "#ffffff"],
                      "line-width": ["interpolate", ["linear"], ["get", "voltage_kv"],
                        0, 1, 100, 1.5, 345, 2, 500, 2.5, 735, 3],
                      "line-opacity": 0.75,
                    },
                    minzoom: 3,
                  });
                  if (!txClickBound) {
                    txClickBound = true;
                    map.on("click", "crep-txlines-line", (e: any) => {
                      const props = e.features?.[0]?.properties;
                      if (props?.name) {
                        lastEntityPickTimeRef.current = Date.now();
                        highlightFromEvent(map, e);
                        const coords = e.lngLat;
                        setSelectedInfraAsset({
                          type: "transmission_line", id: props.id, name: props.name,
                          lat: coords?.lat ?? 0, lng: coords?.lng ?? 0,
                          properties: typeof props === "object" ? { ...props } : {},
                        });
                        setSelectedPlant(null);
                      }
                    });
                    map.on("mouseenter", "crep-txlines-line", () => { map.getCanvas().style.cursor = "pointer"; });
                    map.on("mouseleave", "crep-txlines-line", () => { map.getCanvas().style.cursor = ""; });
                  }
                  setInfraTransmissionLines(features as any);
                  console.log(`[CREP/Infra] ${features.length} TX lines → MapLibre (${label})`);
                };

                batchFetch("transmission-lines", 20000, (vpResults) => {
                  const vpLines = vpResults.flatMap(r => r?.entities || []);
                  const seen = new Set<string>();
                  const unique = vpLines.filter(e => { if (!e.id || seen.has(e.id)) return false; seen.add(e.id); return true; });
                  if (unique.length) renderTxLines(unique, "viewport");
                }).then(async (results) => {
                  const allLines = results.flatMap(r => r?.entities || []);
                  const seen = new Set<string>();
                  const unique = allLines.filter(e => { if (!e.id || seen.has(e.id)) return false; seen.add(e.id); return true; });
                  if (unique.length) renderTxLines(unique, "global");
                  await yieldToUI();
                }).catch((err) => console.warn("[CREP/Infra] TX lines error:", err?.message || err));

                // ── Cell towers (antennas) — show at zoom 6+ (viewport-first) ──
                const towersToFeatures = (entities: any[]) => entities
                  .filter((e: any) => e.lat != null && e.lng != null)
                  .map((e: any) => ({
                    type: "Feature" as const,
                    properties: {
                      name: e.name,
                      radio: e.properties?.technology || e.entity_type,
                      operator: e.properties?.operator,
                      source: e.source || "mindex",
                    },
                    geometry: { type: "Point" as const, coordinates: [e.lng, e.lat] },
                  }));

                let towersClickBound = false;
                const renderCellTowers = (entities: any[], label: string) => {
                  const features = towersToFeatures(entities);
                  if (!features.length) return;
                  safeAddSource("crep-celltowers", { type: "geojson", data: { type: "FeatureCollection", features } });
                  safeAddLayer({
                    id: "crep-celltowers-circle", type: "circle", source: "crep-celltowers",
                    paint: {
                      "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 1.5, 10, 3, 14, 6],
                      "circle-color": "#22c55e",
                      "circle-opacity": 0.6,
                      "circle-stroke-width": 0.5,
                      "circle-stroke-color": "rgba(0,0,0,0.2)",
                    },
                    minzoom: 6,
                  });
                  if (!towersClickBound) {
                    towersClickBound = true;
                    map.on("click", "crep-celltowers-circle", (e: any) => {
                      const props = e.features?.[0]?.properties;
                      if (props?.name) {
                        lastEntityPickTimeRef.current = Date.now();
                        const coords = e.lngLat;
                        highlightPoint(map, coords?.lng ?? 0, coords?.lat ?? 0);
                        setSelectedInfraAsset({
                          type: "cell_tower", name: props.name,
                          lat: coords?.lat ?? 0, lng: coords?.lng ?? 0,
                          properties: typeof props === "object" ? { ...props } : {},
                        });
                      }
                    });
                    map.on("mouseenter", "crep-celltowers-circle", () => { map.getCanvas().style.cursor = "pointer"; });
                    map.on("mouseleave", "crep-celltowers-circle", () => { map.getCanvas().style.cursor = ""; });
                  }
                  console.log(`[CREP/Infra] ${features.length} cell towers → MapLibre (${label})`);
                };

                batchFetch("cell-towers", 20000, (vpResults) => {
                  const vpTowers = vpResults.flatMap((r: any) => r?.entities || []);
                  const seen = new Set<string>();
                  const unique = vpTowers.filter((e: any) => { if (!e.id || seen.has(e.id)) return false; seen.add(e.id); return true; });
                  if (unique.length) renderCellTowers(unique, "viewport");
                }).then(async (results) => {
                  const allTowers = results.flatMap((r: any) => r?.entities || []);
                  const seen = new Set<string>();
                  const unique = allTowers.filter((e: any) => { if (!e.id || seen.has(e.id)) return false; seen.add(e.id); return true; });
                  if (unique.length) renderCellTowers(unique, "global");
                  await yieldToUI();
                }).catch((err) => console.warn("[CREP/Infra] Cell towers error:", err?.message || err));

                // ── Jurisdiction boundary layers (state/county/FEMA/country) ──
                // Critical for defense/IC — every data point anchored to its jurisdiction
                try {
                  addJurisdictionLayers(map);
                } catch (e: any) {
                  console.warn("[CREP/Jurisdiction] Error adding boundary layers:", e.message);
                }

                // ── Highlight layers (OpenGridWorks-style selection glow) ──
                // Must be last so they render on top of all infra
                setTimeout(() => {
                  try {
                    initHighlightLayers(map);
                  } catch (e: any) {
                    console.warn("[CREP/Highlight] Error initializing:", e.message);
                  }
                }, 2000);
              };

              // Load permanent infra IMMEDIATELY — no delay.
              // Style is already loaded (we're in onLoad callback which fires after style.load).
              loadPermanentInfra();
              
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
              // NOTE: deck.gl draws on the canvas - clicking a fungal/entity icon still fires
              // map "click" with target=canvas. We use lastEntityPickTimeRef to avoid
              // dismissing immediately after an entity pick (deck.gl onClick fires first).
              map.on("click", (e: any) => {
                // 300ms delay: deck.gl onClick runs async; wait so it can set lastEntityPickTimeRef first
                setTimeout(() => {
                  // If we just picked a deck.gl entity (<400ms ago), do NOT dismiss
                  if (Date.now() - lastEntityPickTimeRef.current < 400) return;
                  const openPopups = document.querySelectorAll('.maplibregl-popup');
                  if (openPopups.length > 0) {
                    const target = e.originalEvent?.target as HTMLElement | null;
                    const isOnMarker = target?.closest('[data-marker]') !== null ||
                                       target?.closest('.maplibregl-marker') !== null;
                    const isOnPopup = target?.closest('.maplibregl-popup') !== null;
                    const isOnCanvas = target?.tagName === 'CANVAS' || target?.classList?.contains('maplibregl-canvas');
                    if (isOnCanvas && !isOnMarker && !isOnPopup) {
                      setSelectedEvent(null);
                      setSelectedFungal(null);
                      setSelectedOther(null);
                      setSelectedInfraAsset(null);
                    }
                  }
                }, 300);
              });
            }}
          >
            <MapControls
              position="bottom-left"
              showZoom={true}
              showCompass={true}
              showLocate={true}
              showFullscreen={false}
              onLocate={(coords) => setUserLocation({ lat: coords.latitude, lng: coords.longitude })}
              className={cn(
                "mb-4 transition-all duration-300",
                // Move controls to the right of left panel when it's open
                leftPanelOpen ? "ml-[310px]" : "ml-4"
              )}
            />

            {/* ═══ ON-MAP LAYERS POPUP — OpenGridWorks-style basemap + overlay selector ═══ */}
            <div className={cn(
              "absolute bottom-16 z-20 transition-all duration-300",
              leftPanelOpen ? "left-[310px]" : "left-4"
            )}>
              <MapLayersPopup
                currentBasemap={basemap || "dark"}
                onBasemapChange={(id, styleUrl) => {
                  setBasemap(id === "dark" ? null : id as any);
                  // Note: full basemap style switching requires map.setStyle()
                  // For now, toggle EO imagery overlays as "satellite" mode
                  if (id === "satellite") {
                    setEoImageryFilter(prev => ({ ...prev, showModis: true }));
                  }
                  console.log(`[CREP] Basemap → ${id}`);
                }}
                eoImageryFilter={eoImageryFilter}
                onEoFilterChange={(filter) => {
                  setEoImageryFilter(prev => ({ ...prev, ...filter }));
                }}
                map={mapRef}
                showInfra={showInfraLayers}
                onToggleInfra={(show) => {
                  setShowInfraLayers(show);
                  // Toggle all infra MapLibre layers visibility
                  if (mapRef) {
                    const infraLayerIds = [
                      "crep-cables-line", "crep-plants-circle", "crep-subs-circle",
                      "crep-txlines-line", "crep-celltowers-circle",
                    ];
                    for (const id of infraLayerIds) {
                      if (mapRef.getLayer(id)) {
                        mapRef.setLayoutProperty(id, "visibility", show ? "visible" : "none");
                      }
                    }
                  }
                }}
              />
            </div>

            {/* Live events toast – new events that appeared since load */}
            {newEventIds.size > 0 && (
              <div
                className={cn(
                  "absolute left-4 top-4 z-10 flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-950/90 px-3 py-2 text-sm text-amber-100 shadow-lg backdrop-blur-sm",
                  leftPanelOpen && "left-[326px]"
                )}
              >
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                <span>
                  {newEventIds.size} new event{newEventIds.size !== 1 ? "s" : ""} on map
                </span>
                <button
                  type="button"
                  onClick={() => setNewEventIds(new Set())}
                  className="ml-1 rounded p-0.5 text-amber-300 hover:bg-amber-800/50 hover:text-amber-100"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <VoiceMapControls
              {...mapCommandHandlers}
              websocketUrl={VOICE_ENDPOINTS.CREP_BRIDGE_WS}
              className={cn("absolute top-4 z-20", rightPanelOpen ? "right-[340px]" : "right-4")}
            />

            <EntityDeckLayer
              map={mapRef}
              entities={deckEntities}
              visible={true}
              extraLayers={infraDeckLayers}
              useGlobeMode={projectionMode === "globe"}
              onEntityClick={(entity) => {
                lastEntityPickTimeRef.current = Date.now();
                if (entity.type === "aircraft") {
                  setSelectedOther(null);
                  setSelectedAircraft(filteredAircraft.find((aircraftEntity) => aircraftEntity.id === entity.id) ?? null);
                } else if (entity.type === "vessel") {
                  setSelectedOther(null);
                  setSelectedVessel(filteredVessels.find((vesselEntity) => vesselEntity.id === entity.id) ?? null);
                } else if (entity.type === "satellite") {
                  setSelectedOther(null);
                  setSelectedSatellite(filteredSatellites.find((satelliteEntity) => satelliteEntity.id === entity.id) ?? null);
                } else if (entity.type === "fungal") {
                  setSelectedOther(null);
                  // Use entity.properties (full observation) - more robust than lookup
                  const fromProps = entity.properties as unknown as FungalObservation | undefined;
                  const obs =
                    fromProps && typeof fromProps.id !== "undefined" && typeof fromProps.latitude === "number" && typeof fromProps.longitude === "number"
                      ? fromProps
                      : visibleFungalObservations.find((o) => String(o.id) === String(entity.id?.replace?.("fungal-", "")));
                  if (obs) {
                    handleSelectFungal(obs);
                    // Species widget (FungalMarker popup) shows at icon - same UX as planes/boats/satellites.
                    // Do NOT open the Intel feed left panel; that is for list-item clicks, not map icon clicks.
                  }
                } else if (["weather", "earthquake", "elephant", "device", "fire", "crisis"].includes(entity.type)) {
                  setSelectedAircraft(null);
                  setSelectedVessel(null);
                  setSelectedSatellite(null);
                  handleSelectFungal(null);
                  setSelectedOther(entity);
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

            {/* Satellite orbit lines and icons come only from EntityDeckLayer (deck.gl);
                SatelliteOrbitLines removed to avoid duplicate/conflicting orbit lines and filter bugs */}

            {/* Power plant infrastructure layers are merged into EntityDeckLayer
                via extraLayers prop — no separate overlay needed (Apr 2026) */}

            {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                NVIDIA EARTH-2 AI WEATHER LAYERS
                Integrated directly into the MapComponent for real-time visualization
                â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
            
            {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                NVIDIA Earth-2 AI Weather Layers
                Rendered with mapRef when Earth-2 layers are enabled
                â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
            
            {/* NASA GIBS (below Earth-2 rasters in stack order: basemap → GIBS → HD tiles → heatmap → wind) */}
            <GibsBaseLayers
              map={mapRef}
              enabledLayers={{
                modis: eoImageryFilter.showModis,
                viirs: eoImageryFilter.showViirs,
                landsat: eoImageryFilter.showLandsat,
                airs: eoImageryFilter.showAirs,
              }}
              opacity={0.4}
            />

            {mapRef &&
              earth2Filter.useHdWeatherTiles &&
              (earth2Filter.showTemperature ||
                earth2Filter.showPrecipitation ||
                earth2Filter.showHumidity) && (
                <Earth2TileRasterLayers
                  map={mapRef}
                  forecastHours={earth2Filter.forecastHours}
                  opacity={earth2Filter.opacity}
                  enabled={{
                    t2m: earth2Filter.showTemperature,
                    tp: earth2Filter.showPrecipitation,
                    tcwv: earth2Filter.showHumidity,
                  }}
                  model={earth2Filter.selectedModel}
                />
              )}

            {/* Earth-2 Temperature/Precipitation Heatmap — hidden for layers using HD tile mode */}
            {mapRef &&
              (earth2Filter.showTemperature ||
                earth2Filter.showPrecipitation ||
                earth2Filter.showForecast) &&
              !(
                earth2Filter.useHdWeatherTiles &&
                (earth2Filter.showTemperature || earth2Filter.showPrecipitation)
              ) && (
                <WeatherHeatmapLayer
                  map={mapRef}
                  visible={true}
                  variable={earth2Filter.showTemperature ? "temperature" : "precipitation"}
                  forecastHours={earth2Filter.forecastHours}
                  opacity={earth2Filter.opacity}
                  resolutionDeg={earth2ApiResolutionDeg}
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
                resolutionDeg={earth2ApiResolutionDeg}
              />
            )}
            
            {/* Earth-2 Cloud Cover Layer */}
            {mapRef && earth2Filter.showClouds && (
              <CloudLayer
                map={mapRef}
                visible={true}
                forecastHours={earth2Filter.forecastHours}
                opacity={earth2Filter.opacity}
                resolutionDeg={earth2ApiResolutionDeg}
              />
            )}
            
            {/* Earth-2 Precipitation/Rain Layer — optional animation; omit when HD precip tiles on */}
            {mapRef && earth2Filter.showPrecipitation && !earth2Filter.useHdWeatherTiles && (
              <PrecipitationLayer
                map={mapRef}
                visible={true}
                forecastHours={earth2Filter.forecastHours}
                opacity={earth2Filter.opacity}
                resolutionDeg={earth2ApiResolutionDeg}
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
                resolutionDeg={earth2ApiResolutionDeg}
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
            
            {/* Earth-2 Humidity Layer — omit when HD humidity tiles on */}
            {mapRef && earth2Filter.showHumidity && !earth2Filter.useHdWeatherTiles && (
              <HumidityLayer
                map={mapRef}
                visible={true}
                forecastHours={earth2Filter.forecastHours}
                opacity={earth2Filter.opacity}
                resolutionDeg={earth2ApiResolutionDeg}
              />
            )}

            {/* Aurora Forecast Overlay */}
            <AuroraOverlay
              map={mapRef}
              enabled={layers.find(l => l.id === "auroraOverlay")?.enabled ?? false}
              opacity={0.5}
            />

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
                  isNew={newEventIds.has(event.id)}
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

            {/* Device Markers - deduplicated; hide devices with no valid position (0,0 = ocean) */}
            {layers.find(l => l.id === "mycobrain")?.enabled && (() => {
              const seen = new Set<string>();
              return devices.filter(device => {
                if (seen.has(device.id)) return false;
                seen.add(device.id);
                const lat = device.lat ?? (device as { latitude?: number }).latitude;
                const lng = device.lng ?? (device as { longitude?: number }).longitude;
                if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
                if (lat === 0 && lng === 0) return false;
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

            {/* Aircraft / Vessel / Satellite rendering via deck.gl EntityDeckLayer */}

            {/* Fungal Observation Markers - DOM MapMarkers for reliable clicks (deck.gl IconLayer onClick fails with MapboxOverlay).
                Each visible fungal observation gets a FungalMarker; clicking selects and shows the species widget popup. */}
            {layers.find(l => l.id === "fungi")?.enabled && visibleFungalObservations.map((obs) => (
              <FungalMarker
                key={`fungal-${obs.id}`}
                observation={obs}
                isSelected={selectedFungal?.id === obs.id}
                onClick={() => handleSelectFungal(selectedFungal?.id === obs.id ? null : obs)}
                onClose={() => handleSelectFungal(null)}
              />
            ))}

            {/* Other entity popup (weather, earthquake, elephant, device, fire, crisis) - P0 biodiversity/wildlife bubble selection */}
            {selectedOther && selectedOther.geometry.type === "Point" && selectedOther.geometry.coordinates.length >= 2 && (
              <MapMarker
                key={`other-popup-${selectedOther.id}`}
                longitude={selectedOther.geometry.coordinates[0]}
                latitude={selectedOther.geometry.coordinates[1]}
                offset={[0, -12]}
                onClick={() => setSelectedOther(null)}
              >
                <MarkerContent data-marker="other">
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-600/90 shadow-[0_0_3px_rgba(6,182,212,0.5)] hover:scale-125 transition-transform ring-2 ring-white z-50"
                    title={`${selectedOther.type}: ${selectedOther.id}`}
                  >
                    <span className="text-xs">
                      {selectedOther.type === "weather" && <Cloud className="w-3 h-3" />}
                      {selectedOther.type === "earthquake" && <AlertTriangle className="w-3 h-3" />}
                      {selectedOther.type === "elephant" && <PawPrint className="w-3 h-3" />}
                      {selectedOther.type === "device" && <Radio className="w-3 h-3" />}
                      {selectedOther.type === "fire" && <Flame className="w-3 h-3" />}
                      {selectedOther.type === "crisis" && <Siren className="w-3 h-3" />}
                      {!["weather", "earthquake", "elephant", "device", "fire", "crisis"].includes(selectedOther.type) && <CircleDot className="w-3 h-3" />}
                    </span>
                  </button>
                </MarkerContent>
                <MarkerPopup
                  className="min-w-[240px] max-w-[320px] bg-[#0a1628]/98 backdrop-blur-md shadow-2xl p-0 overflow-hidden border border-cyan-500/40"
                  closeButton
                  closeOnClick={false}
                  anchor="bottom"
                  offset={[0, -8]}
                  onClose={() => setSelectedOther(null)}
                >
                  <div className="px-3 py-2 border-b border-cyan-500/40 bg-cyan-900/40">
                    <h3 className="text-sm font-bold text-white capitalize">{selectedOther.type}</h3>
                    <p className="text-[10px] text-gray-400 font-mono">{selectedOther.id}</p>
                  </div>
                  <div className="p-2 space-y-1.5">
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="bg-black/40 rounded px-2 py-1.5 border border-gray-700/50">
                        <div className="text-[8px] text-gray-500 uppercase mb-0.5">Source</div>
                        <div className="text-[10px] text-cyan-400">{selectedOther.source}</div>
                      </div>
                      <div className="bg-black/40 rounded px-2 py-1.5 border border-gray-700/50">
                        <div className="text-[8px] text-gray-500 uppercase mb-0.5">Coordinates</div>
                        <div className="text-[10px] text-cyan-400 font-mono">
                          {selectedOther.geometry.coordinates[1].toFixed(4)}°, {selectedOther.geometry.coordinates[0].toFixed(4)}°
                        </div>
                      </div>
                    </div>
                    {Object.keys(selectedOther.properties || {}).length > 0 && (
                      <div className="bg-black/40 rounded px-2 py-1.5 border border-gray-700/50 space-y-1">
                        <div className="text-[8px] text-gray-500 uppercase mb-1">Properties</div>
                        {Object.entries(selectedOther.properties!).slice(0, 6).map(([k, v]) => (
                          <div key={k} className="flex justify-between gap-2 text-[10px]">
                            <span className="text-gray-500 truncate">{k}</span>
                            <span className="text-white truncate">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </MarkerPopup>
              </MapMarker>
            )}

            {/* Ground Station Location Marker */}
            {showGroundStation && gsState.activeLocation && (
              <MapMarker
                latitude={gsState.activeLocation.lat}
                longitude={gsState.activeLocation.lon ?? 0}
              >
                <MarkerContent>
                  <div className="w-6 h-6 rounded-full bg-cyan-500/30 border-2 border-cyan-400 flex items-center justify-center animate-pulse" title={`Ground Station: ${gsState.activeLocation.name || "Active"}`}>
                    <Radio className="w-3 h-3 text-cyan-300" />
                  </div>
                </MarkerContent>
              </MapMarker>
            )}

            {/* Ground Station Tracked Satellite Positions */}
            {showGroundStation && Object.values(gsState.positions).map((pos) => {
              if (!pos.lat || !pos.lon) return null;
              const sat = gsState.satellites.find(s => s.norad_id === pos.norad_id);
              const isTracking = gsState.trackingState?.norad_id === pos.norad_id;
              return (
                <MapMarker key={`gs-sat-${pos.norad_id}`} latitude={pos.lat} longitude={pos.lon}>
                  <MarkerContent>
                    <div
                      className={cn(
                        "w-4 h-4 rounded-full flex items-center justify-center text-[8px] border",
                        isTracking
                          ? "bg-green-500/40 border-green-400 text-green-300 animate-pulse"
                          : pos.is_visible
                          ? "bg-cyan-500/30 border-cyan-400/60 text-cyan-300"
                          : "bg-gray-500/20 border-gray-500/40 text-gray-400"
                      )}
                      title={`${sat?.name || `NORAD ${pos.norad_id}`} — Alt: ${pos.alt?.toFixed(0)}km, Az: ${pos.az?.toFixed(1)}°, El: ${pos.el?.toFixed(1)}°`}
                    >
                      <Satellite className="w-2.5 h-2.5" />
                    </div>
                  </MarkerContent>
                </MapMarker>
              );
            })}

            {/* Infrastructure Markers from Overpass API */}
            {infraFeatures.map((feat) => (
              <MapMarker key={feat.id} latitude={feat.lat} longitude={feat.lng}>
                <MarkerContent>
                  <button
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] border shadow-md"
                    style={{
                      backgroundColor: `${INFRA_TYPE_COLORS[feat.type] || "#6b7280"}20`,
                      borderColor: `${INFRA_TYPE_COLORS[feat.type] || "#6b7280"}60`,
                      color: INFRA_TYPE_COLORS[feat.type] || "#6b7280",
                    }}
                    title={`${feat.name || feat.type} (${feat.type.replace(/_/g, " ")})`}
                  >
                    {INFRA_TYPE_ICONS[feat.type] || "📍"}
                  </button>
                </MarkerContent>
              </MapMarker>
            ))}
          </MapComponent>

          {/* Signal Coverage Heatmap */}
          <SignalHeatmapLayer
            map={mapRef}
            enabled={layers.find(l => l.id === "signalHeatmap")?.enabled ?? false}
            towers={cellTowerPoints}
            opacity={0.4}
            signalType="cellular"
          />

          {/* ═══════════════════════════════════════════════════════════════
              POWER PLANT DETAIL POPUP (Apr 2026)
              ═══════════════════════════════════════════════════════════════ */}
          {selectedPlant && (
            <div
              className="absolute z-[100] pointer-events-auto"
              style={{
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
              }}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <PlantPopup
                plant={selectedPlant}
                onClose={() => setSelectedPlant(null)}
                onFlyTo={(lat, lng, zoom) => {
                  mapRef?.flyTo({ center: [lng, lat], zoom: zoom ?? 12, duration: 800 });
                }}
              />
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              INFRASTRUCTURE DETAIL WIDGET (Apr 2026)
              Shows detailed live data for cables, substations, TX lines,
              plants, cell towers, datacenters, military, airports
              ═══════════════════════════════════════════════════════════════ */}
          {selectedInfraAsset && (
            <div
              className="absolute z-[100] pointer-events-auto"
              style={{
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
              }}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <InfraDetailWidget
                asset={selectedInfraAsset}
                onClose={() => { setSelectedInfraAsset(null); clearHighlight(mapRef); }}
                onFlyTo={(lat, lng, zoom) => {
                  mapRef?.flyTo({ center: [lng, lat], zoom: zoom ?? 10, duration: 800 });
                }}
              />
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              FLY-TO COUNTRY BUTTONS (Apr 2026)
              ═══════════════════════════════════════════════════════════════ */}
          <div className={cn(
            "absolute top-14 z-20 transition-all duration-300",
            rightPanelOpen ? "right-[340px]" : "right-4"
          )}>
            <FlyToButtons
              onFlyTo={(center, zoom) => {
                mapRef?.flyTo({ center, zoom, duration: 1200 });
              }}
              compact
            />
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              UNIFIED SEARCH (Cmd+K) (Apr 2026)
              ═══════════════════════════════════════════════════════════════ */}
          <UnifiedSearch
            plants={powerPlants}
            viewportCenter={mapRef ? { lat: mapRef.getCenter().lat, lng: mapRef.getCenter().lng } : undefined}
            onSelect={(result) => {
              if (result.id === "__open") {
                setSearchOpen(true);
                return;
              }
              // Fly to result
              if (result.lat && result.lng) {
                mapRef?.flyTo({ center: [result.lng, result.lat], zoom: 10, duration: 800 });
              }
              // Open popup based on type
              if (result.type === "plant" && result.data) {
                setSelectedPlant(result.data);
                setSelectedInfraAsset(null);
              }
            }}
            onClose={() => setSearchOpen(false)}
            isOpen={searchOpen}
          />

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
            {/* FUNGAL DATA FIRST - PRIMARY - Species dropdown on hover */}
            {fungalObservations.length > 0 && (
              <DropdownMenu open={fungalDropdownOpen} onOpenChange={setFungalDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <div
                    className="px-2 py-1 rounded bg-green-500/20 backdrop-blur text-green-400 border border-green-500/30 cursor-pointer hover:bg-green-500/30 transition-colors pointer-events-auto"
                    title={fungalSpeciesFilter ? `${visibleFungalObservations.length} ${fungalSpeciesFilter} - click for species` : `${fungalObservations.length} fungal observations - hover for species filter`}
                    onMouseEnter={() => {
                      if (fungalDropdownCloseTimeout.current) {
                        clearTimeout(fungalDropdownCloseTimeout.current);
                        fungalDropdownCloseTimeout.current = null;
                      }
                      setFungalDropdownOpen(true);
                    }}
                    onMouseLeave={() => {
                      fungalDropdownCloseTimeout.current = setTimeout(() => setFungalDropdownOpen(false), 200);
                    }}
                  >
                    <TreePine className="w-3 h-3 inline-block mr-1" />
                    {fungalSpeciesFilter ? visibleFungalObservations.length : fungalObservations.length} FUNGI
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="center"
                  sideOffset={4}
                  className="min-w-[180px] p-2 bg-black/95 border border-green-500/30 rounded-lg"
                  onMouseEnter={() => {
                    if (fungalDropdownCloseTimeout.current) {
                      clearTimeout(fungalDropdownCloseTimeout.current);
                      fungalDropdownCloseTimeout.current = null;
                    }
                  }}
                  onMouseLeave={() => {
                    fungalDropdownCloseTimeout.current = setTimeout(() => setFungalDropdownOpen(false), 200);
                  }}
                >
                  <DropdownMenuLabel className="text-[9px] font-bold text-green-400 px-0 pb-1">Species filter</DropdownMenuLabel>
                  <div
                    className="cursor-pointer text-center p-1 rounded bg-black/30 hover:bg-green-500/20 mb-1"
                    onClick={() => { setFungalSpeciesFilter(null); setFungalDropdownOpen(false); }}
                  >
                    <span className="text-[9px] font-bold text-green-400">All Species</span>
                    <div className="text-[6px] text-gray-500">{fungalObservations.length} total</div>
                  </div>
                  <div className="grid grid-cols-3 gap-1 max-h-48 overflow-y-auto">
                    {fungalSpeciesStats.map(({ name, count }) => (
                      <div
                        key={name}
                        className={cn(
                          "text-center p-1 rounded cursor-pointer transition-colors",
                          fungalSpeciesFilter === name ? "bg-green-500/30 border border-green-500/50" : "bg-black/30 hover:bg-green-500/20"
                        )}
                        onClick={() => { setFungalSpeciesFilter(name); setFungalDropdownOpen(false); }}
                        title={`${name}: ${count}`}
                      >
                        <div className="text-[9px] font-bold text-green-400 truncate" title={name}>{name}</div>
                        <div className="text-[6px] text-gray-500">{count}</div>
                      </div>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <div className="px-2 py-1 rounded bg-black/60 backdrop-blur text-orange-400">
              {filteredEvents.length} EVENTS
            </div>
            <div className="px-2 py-1 rounded bg-black/60 backdrop-blur text-cyan-400">
              {onlineDevices} DEVICES
            </div>
            {/* Infrastructure count */}
            {infraFeatures.length > 0 && (
              <div className="px-2 py-1 rounded bg-black/60 backdrop-blur text-amber-400" title={`${infraFeatures.length} infrastructure features`}>
                <Factory className="w-3 h-3 inline-block mr-1" />
                {infraFeatures.length} INFRA
              </div>
            )}
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
            {layers.find(l => l.id === "buoys")?.enabled && buoys.length > 0 && (
              <div className="px-2 py-1 rounded bg-black/60 backdrop-blur text-lime-400" title={`${buoys.length} ocean buoys (NOAA NDBC)`}>
                <Waves className="w-3 h-3 inline-block mr-1" />
                {buoys.length} BUOYS
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
                  title="Earth Modeling (NVIDIA Earth-2 + GIBS)"
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
                  <MissionContextPanel mission={currentMission} stats={stats} liveTracking={{ aircraft: aircraft.length, satellites: satellites.length, vessels: vessels.length }} />
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
                        <div className="flex items-center gap-2">
                          <StreamingStatusBar
                            statuses={[
                              { type: "aircraft", connected: isStreaming, messageCount: aircraft.length },
                              { type: "vessels", connected: isStreaming, messageCount: vessels.length },
                              { type: "satellites", connected: isStreaming, messageCount: satellites.length },
                            ]}
                            isLive={isStreaming}
                            onToggle={() => setIsStreaming(!isStreaming)}
                          />
                          <WorldstateSourcesBadge />
                        </div>
                      </div>
                      
                      {/* Map Controls - Filter Panel */}
                      <OEIMapControls
                        aircraftFilter={aircraftFilter}
                        vesselFilter={vesselFilter}
                        satelliteFilter={satelliteFilter}
                        spaceWeatherFilter={spaceWeatherFilter}
                        groundFilter={groundFilter}
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
                        onGroundFilterChange={(f) => setGroundFilter({ ...groundFilter, ...f })}
                        eoImageryFilter={eoImageryFilter}
                        onEoImageryFilterChange={(f) => setEoImageryFilter(prev => ({ ...prev, ...f }))}
                        onToggleStreaming={() => setIsStreaming(!isStreaming)}
                        onRefresh={() => {
                          // Trigger a refresh by re-fetching data
                          window.location.reload();
                        }}
                      />
                      <CrepMapPreferencesPanel
                        mapRef={mapRef}
                        mapBounds={mapBounds}
                        mapZoom={mapZoom}
                        layers={layers.map(l => ({ id: l.id, enabled: l.enabled }))}
                        groundFilter={groundFilter}
                        eoImageryFilter={eoImageryFilter}
                        basemap={basemap}
                        onApply={handleApplyMapPreferences}
                        className="mt-2"
                      />
                      
                      {rightPanelTab === "data" && (
                        <>
                          {/* Space Weather Widget */}
                          <SpaceWeatherWidget compact />
                          
                          {/* Flight Tracker Widget */}
                          <FlightTrackerWidget compact limit={10} />
                          
                          {/* Vessel Tracker Widget */}
                          <VesselTrackerWidget compact limit={10} />
                          
                          {/* Satellite Tracker Widget */}
                          <SatelliteTrackerWidget compact limit={10} />
                          
                          {/* Ground Station Overlay (Mar 2026) */}
                          {showGroundStation && (
                            <div className="rounded-lg bg-black/40 border border-cyan-500/20 p-2 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Radio className="w-3.5 h-3.5 text-cyan-400" />
                                  <span className="text-[10px] font-bold text-white">GROUND STATION</span>
                                  <div className={cn("w-1.5 h-1.5 rounded-full", gsState.connected ? "bg-green-400" : "bg-red-500")} />
                                </div>
                                <span className="text-[8px] text-gray-500">{gsState.satellites.length} sats</span>
                              </div>
                              <select
                                value={gsState.selectedGroupId || ""}
                                onChange={(e) => selectGroup(e.target.value || null)}
                                className="w-full h-6 text-[10px] bg-black/40 border border-gray-700/50 rounded px-1.5 text-white"
                              >
                                <option value="">Select group...</option>
                                {gsState.groups.map((g) => (
                                  <option key={g.id} value={g.id}>{g.name} ({g.satellite_ids?.length ?? 0})</option>
                                ))}
                              </select>
                              {gsState.passes.length > 0 && (
                                <div className="space-y-0.5">
                                  {gsState.passes.slice(0, 3).map((p, i) => (
                                    <div key={i} className="flex justify-between text-[8px]">
                                      <span className="text-gray-300 truncate">{p.satellite_name}</span>
                                      <span className="text-cyan-400">{p.max_elevation.toFixed(0)}°</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <a href="/natureos/ground-station" target="_blank" rel="noopener noreferrer"
                                className="block text-center text-[8px] text-cyan-400 hover:text-cyan-300 py-1 border border-cyan-500/20 rounded">
                                Open Full Dashboard
                              </a>
                            </div>
                          )}

                          {/* Conservation Demo Widgets (Feb 05, 2026) - Individual toggles (Feb 17, 2026) */}
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
                        </>
                      )}
                      
                      {/* Data Sources Footer */}
                      <div className="pt-2 border-t border-gray-700/30">
                        <div className="flex flex-wrap gap-1 text-[7px]">
                          <Badge variant="outline" className="px-1 py-0 h-3 border-amber-500/30 text-amber-400">SWPC</Badge>
                          <Badge variant="outline" className="px-1 py-0 h-3 border-sky-500/30 text-sky-400">FR24</Badge>
                          <Badge variant="outline" className="px-1 py-0 h-3 border-blue-500/30 text-blue-400">AIS</Badge>
                          <Badge variant="outline" className="px-1 py-0 h-3 border-purple-500/30 text-purple-400">TLE</Badge>
                          {(showSmartFenceWidget || showPresenceWidget) && <Badge variant="outline" className="px-1 py-0 h-3 border-green-500/30 text-green-400">GHANA</Badge>}
                          {showGroundStation && <Badge variant="outline" className="px-1 py-0 h-3 border-cyan-500/30 text-cyan-400">GS</Badge>}
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
                    
                    {/* Ground Station Toggle (Mar 2026) */}
                    <div className="mt-4 rounded-lg bg-black/40 border border-cyan-500/20 overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 bg-black/30">
                        <div className="flex items-center gap-2">
                          <Radio className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="text-[11px] font-semibold text-white">Ground Station</span>
                        </div>
                        <Switch
                          checked={showGroundStation}
                          onCheckedChange={setShowGroundStation}
                          className="h-4 w-7 data-[state=checked]:bg-cyan-500"
                        />
                      </div>
                      {showGroundStation && (
                        <div className="p-2 space-y-1">
                          <div className="text-[9px] text-gray-500 px-2">
                            Satellite tracking, SDR control, observation scheduling.
                            Data syncs bi-directionally with Mindex and the Agent Worldview API.
                          </div>
                          <a href="/natureos/ground-station" target="_blank" rel="noopener noreferrer"
                            className="block text-center text-[9px] text-cyan-400 hover:text-cyan-300 py-1 mx-2 border border-cyan-500/20 rounded mt-1">
                            Open Full Dashboard
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Conservation Widget Toggles (Feb 17, 2026) */}
                    <div className="mt-4 rounded-lg bg-black/40 border border-gray-700/50 overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 bg-black/30">
                        <div className="flex items-center gap-2">
                          <Leaf className="w-3.5 h-3.5 text-green-400" />
                          <span className="text-[11px] font-semibold text-white">Conservation Widgets</span>
                        </div>
                        <Badge variant="outline" className="text-[8px] border-green-600 text-green-400">
                          {(showSmartFenceWidget ? 1 : 0) + (showPresenceWidget ? 1 : 0)}/2
                        </Badge>
                      </div>
                      <div className="p-2 space-y-1">
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

                <TabsContent value="services" className="h-full m-0 overflow-auto">
                  <ScrollArea className="h-full">
                    <ServicesPanelLive />
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="myca" className="h-full m-0 p-0 flex flex-col">
                  <CREPMycaPanel
                    mapRef={mapControlRef}
                    layers={layers}
                    toggleLayer={toggleLayer}
                    groundFilter={groundFilter}
                    onGroundFilterChange={(f) => setGroundFilter({ ...groundFilter, ...f })}
                    fungalObservations={fungalObservations}
                    globalEvents={globalEvents}
                    onSelectFungal={handleSelectFungal}
                    mission={currentMission}
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
        aircraft={selectedAircraft as any}
        vessel={selectedVessel as any}
        satellite={selectedSatellite as any}
      />

      {/* Buoy Detail Popup */}
      {selectedBuoy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setSelectedBuoy(null)}>
          <div className="bg-[#0d1b2a]/95 border border-lime-500/30 rounded-lg p-5 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Waves className="w-5 h-5 text-lime-400" />
                <h3 className="text-lime-400 font-bold text-lg">Buoy {selectedBuoy.station_id}</h3>
              </div>
              <button onClick={() => setSelectedBuoy(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-black/40 rounded p-2">
                <div className="text-gray-400 text-xs">Position</div>
                <div className="text-white">{selectedBuoy.lat?.toFixed(3)}, {selectedBuoy.lng?.toFixed(3)}</div>
              </div>
              {selectedBuoy.wave_height != null && (
                <div className="bg-black/40 rounded p-2">
                  <div className="text-gray-400 text-xs">Wave Height</div>
                  <div className="text-cyan-300 font-mono">{selectedBuoy.wave_height} m</div>
                </div>
              )}
              {selectedBuoy.water_temp != null && (
                <div className="bg-black/40 rounded p-2">
                  <div className="text-gray-400 text-xs">Water Temp</div>
                  <div className="text-blue-300 font-mono">{selectedBuoy.water_temp} C</div>
                </div>
              )}
              {selectedBuoy.air_temp != null && (
                <div className="bg-black/40 rounded p-2">
                  <div className="text-gray-400 text-xs">Air Temp</div>
                  <div className="text-orange-300 font-mono">{selectedBuoy.air_temp} C</div>
                </div>
              )}
              {selectedBuoy.wind_speed != null && (
                <div className="bg-black/40 rounded p-2">
                  <div className="text-gray-400 text-xs">Wind Speed</div>
                  <div className="text-emerald-300 font-mono">{selectedBuoy.wind_speed} m/s</div>
                </div>
              )}
              {selectedBuoy.wind_direction != null && (
                <div className="bg-black/40 rounded p-2">
                  <div className="text-gray-400 text-xs">Wind Dir</div>
                  <div className="text-emerald-300 font-mono">{selectedBuoy.wind_direction} deg</div>
                </div>
              )}
              {selectedBuoy.pressure != null && (
                <div className="bg-black/40 rounded p-2">
                  <div className="text-gray-400 text-xs">Pressure</div>
                  <div className="text-purple-300 font-mono">{selectedBuoy.pressure} hPa</div>
                </div>
              )}
              {selectedBuoy.dominant_wave_period != null && (
                <div className="bg-black/40 rounded p-2">
                  <div className="text-gray-400 text-xs">Wave Period</div>
                  <div className="text-cyan-300 font-mono">{selectedBuoy.dominant_wave_period} s</div>
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <span>Source: {selectedBuoy.source === "ndbc" ? "NOAA NDBC" : "MINDEX"}</span>
              {selectedBuoy.timestamp && <span>{new Date(selectedBuoy.timestamp).toLocaleString()}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Ground Station Overlay Panel (Mar 2026) */}
      {showGroundStation && (
        <>
          <GSOverlayPanel
            visible={showGroundStation}
            onToggle={() => setShowGroundStation(!showGroundStation)}
          />
          {/* Pass Timeline at bottom of map */}
          <div className="fixed bottom-8 left-0 right-0 z-40">
            <GSPassTimeline
              passes={gsState.passes}
              trackingNoradId={gsState.trackingState?.norad_id ?? undefined}
            />
          </div>
        </>
      )}

      {/* Mission Prompt Modal - shown on first CREP use */}
      {showMissionPrompt && (
        <MissionPromptModal onCreateMission={handleCreateMission} />
      )}
    </div>
  );
}
