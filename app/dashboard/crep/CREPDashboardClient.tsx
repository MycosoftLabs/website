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

import { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
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
  Camera,
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
// Apr 20, 2026 (Morgan: "the fuckling crep site keeps reloadiong wtf is is
// doing"). Chunk-load timeouts on this dynamic import were the trigger:
// dev-server compilation took longer than the webpack chunk-fetch deadline,
// which threw ChunkLoadError → Next dev overlay auto-reloaded the page →
// next load had to recompile → same timeout → infinite reload loop.
// Switching to a static import folds it into the main chunk, no dynamic
// chunk fetch, no timeout window, no reload trigger. The 329-line widget
// adds negligible weight to the main bundle vs. the reload misery it
// caused.
import { SpaceWeatherWidget } from "@/components/crep/space-weather-widget";
// Apr 21, 2026 (Morgan: "crep crashing ... Loading chunk _app-pages-browser_components_crep_flight-tracker-widget_tsx failed").
// Same ChunkLoadError reload-loop pattern as SpaceWeatherWidget above:
// dev-server chunk compilation exceeded webpack's fetch deadline → Next
// error boundary auto-reloaded → recompile → timeout → forever. Flipping
// all three CREP tracker widgets + the conservation demo + ground-station
// widgets to static imports eliminates the dynamic chunk fetch and the
// timeout window entirely. They all render unconditionally inside the
// right-panel tabs anyway, so there's no benefit to the lazy split.
import { FlightTrackerWidget } from "@/components/crep/flight-tracker-widget";
import { VesselTrackerWidget } from "@/components/crep/vessel-tracker-widget";
import { SatelliteTrackerWidget } from "@/components/crep/satellite-tracker-widget";

// Conservation Demo Widgets (Feb 05, 2026) — static to avoid chunk timeouts
import { SmartFenceWidget } from "@/components/crep/smart-fence-widget";
import { PresenceDetectionWidget } from "@/components/crep/presence-detection-widget";

// Ground Station Integration (Mar 2026) — static to avoid chunk timeouts
import { GSOverlayPanel } from "@/components/crep/ground-station/GSOverlayPanel";
import { GSPassTimeline } from "@/components/crep/ground-station/GSPassTimeline";
import { GSSatelliteInfoPanel } from "@/components/crep/ground-station/GSSatelliteInfoPanel";
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
import { mergeById, ENTITY_TTL_MS } from "@/lib/crep/entity-merge";
import { cullToViewport, makeDebouncedSetData } from "@/lib/crep/map-perf";
import { selectForZoom as lodSelectForZoom } from "@/lib/crep/vessel-lod";
import {
  startSatelliteAnimation,
  stopSatelliteAnimation,
  updateSatelliteAnimation,
  isSatelliteAnimationRunning,
} from "@/lib/crep/satellite-animation";
import { useGroundStation } from "@/lib/ground-station/context";

// Phase 2-6: New CREP layers and panels
// Static import — the dynamic() version was hitting ChunkLoadError during
// HMR (same crash pattern as signal-heatmap-layer). Static is safe because
// the module is client-only and guards against map being undefined.
import GibsBaseLayers from "@/components/crep/layers/gibs-base-layers";
// Static import — same ChunkLoadError pattern as signal-heatmap-layer and
// gibs-base-layers. Layer is client-only ("use client") with mapReady guards,
// so there's no benefit to code-splitting and every benefit to HMR stability.
import AuroraOverlay from "@/components/crep/layers/aurora-overlay";
// Statically imported (was dynamic). The chunk for this file was hitting
// a ChunkLoadError during HMR rebuilds — "loading chunk_app-pages-
// heatmap-browser_components_crep_layers_signal-heatmap-layer_tsx failed"
// — which crashed the whole CREP dashboard tree. It's <200 lines and
// server-only-safe (guards against map being undefined), so the code-
// split savings aren't worth the reliability cost.
import SignalHeatmapLayer from "@/components/crep/layers/signal-heatmap-layer";
import ProposalOverlays from "@/components/crep/layers/proposal-overlays";
import V3Overlays from "@/components/crep/layers/v3-overlays";
import EiaIm3Overlays from "@/components/crep/layers/eia-im3-overlays";
import EagleEyeOverlay from "@/components/crep/layers/eagle-eye-overlay";
import VideoWallWidget from "@/components/crep/eagle-eye/VideoWallWidget";
import TimelineScrubber from "@/components/crep/eagle-eye/TimelineScrubber";
import IntelFeedEagleEyeSection from "@/components/crep/eagle-eye/IntelFeedEagleEyeSection";
// Apr 23, 2026 — RegisterCrepDataServiceWorker removed, superseded by /crep-sw.js
// (cache-first SW inline-registered in CREPDashboardPage). The old component
// still exists at components/crep/register-crep-data-sw.tsx for any other
// callers but is no longer imported here.
import SunEarthImpactLayer from "@/components/crep/layers/sun-earth-impact-layer";
// Realistic cloud rendering — Three.js volumetric + satellite-texture pipeline
// driven by /api/eagle/weather/multi (Open-Meteo + NWS + Windy + OWM + Earth-2).
// Apr 20, 2026 — Morgan: "realistic clouds over the crep map and globe in both
// 2d and 3d realistically with altitude on 3d and density on both".
import RealisticCloudLayer from "@/components/crep/layers/realistic-cloud-layer";
// Mapbox 3D buildings + Satellite Streets basemap. Uses Morgan's new full-scope
// NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN. 3D extrusions at zoom ≥ 14 give MYCA device-
// placement logic proper building silhouettes for shadow/LOS calculations.
import Mapbox3DBuildings from "@/components/crep/layers/mapbox-3d-buildings";
// Photorealistic 3D Tiles — Google Map Tiles API (worldwide photogrammetry
// mesh, same one Google Earth uses) with Cesium Ion fallback. Morgan enabled
// Google Map Tiles API + is adding Cesium Ion key now. Goes live the moment
// NEXT_PUBLIC_GOOGLE_MAP_TILES_API_KEY or NEXT_PUBLIC_CESIUM_ION_TOKEN lands.
import Photorealistic3DTiles from "@/components/crep/layers/photorealistic-3d-tiles";
// Right-click → waypoint / places-saving system. Apr 20, 2026 (Morgan:
// "right click should be able to open up a widget for markers to add
// waypoints check what this is and places saving").
import WaypointSystem from "@/components/crep/waypoints/WaypointSystem";
import LookupHereWidget from "@/components/crep/waypoints/LookupHereWidget";
// Apr 22, 2026 — MYCA waypoint→verify→auto-add pipeline. User drops a
// waypoint → POST /api/myca/waypoint-verify → when confidence ≥ 0.85,
// MYCA publishes to SSE /api/myca/entity-feed which this component
// subscribes to and renders live markers + perimeter polygons.
import MycaVerifiedEntityFeed from "@/components/crep/myca/MycaVerifiedEntityFeed";
// Glass-morphism device widget (Apr 20, 2026). Replaces the old cramped
// inline MarkerPopup with a beautiful floating high-tech dialog with
// explicit GPS state surfacing + sparkline telemetry cards.
import DeviceWidget from "@/components/crep/devices/DeviceWidget";
// Tijuana Estuary / Project Oyster (MYCODAO + MYCOSOFT) — pollution +
// environmental data showcase for the SD-MX border zone. Apr 20, 2026.
// Renders Project Oyster perimeter + H₂S hotspot + river flow line +
// IBWC discharge station + beach closures + Navy training waters.
import TijuanaEstuaryLayer from "@/components/crep/layers/tijuana-estuary-layer";
import TijuanaStationWidget from "@/components/crep/tijuana/TijuanaStationWidget";
import OysterSiteWidget from "@/components/crep/oyster/OysterSiteWidget";
// Apr 22, 2026 — SD + TJ data coverage expansion: 7 OSM-derived
// layers (hospitals, police, sewage, cell towers, AM/FM, military,
// data centers) that fill the gap HIFLD + global cell-towers-global
// didn't cover. Baked by scripts/etl/crep/bake-sdtj-coverage.mjs.
import SdtjCoverageLayer from "@/components/crep/layers/sdtj-coverage-layer";
// Apr 23, 2026 — Project NYC + Project DC expansion (Morgan: "massive
// amount of missing data ... cameras cell towers all environmental
// sensors ... fly to and layers of details perimeters and special icon
// locations for dc and new york"). Parallel to Oyster / Goffs pattern.
import ProjectNycDcLayer from "@/components/crep/layers/project-nyc-dc-layer";
// Mojave National Preserve + Goffs, CA (MYCOSOFT project site) — Apr 21, 2026
// NPS boundary + wilderness POIs + ASOS/RAWS climate + iNat obs.
import MojavePreserveLayer from "@/components/crep/layers/mojave-preserve-layer";
import { LiveTransitLayer } from "@/components/crep/layers/live-transit-layer";
import MojaveSiteWidget from "@/components/crep/mojave/MojaveSiteWidget";
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

// Static-infra PMTiles-first loader (preferred path for bulk vector layers)
import { addInfraSourceWithFallback, layerSpecForMode, INFRA_LAYERS } from "@/lib/crep/static-infra-loader";

// Static infrastructure bundle — zero-latency point markers (Morgan rule, Apr 2026)
// Permanent facility LOCATIONS don't change per-request. Load once on mount.
import { MAJOR_PORTS, MAJOR_DATACENTERS } from "@/lib/crep/static-infra";

// OpenGridWorks-style Infrastructure Layers (Apr 2026)
import { usePowerPlantLayers, type PowerPlant } from "@/components/crep/layers/power-plant-bubbles";
import { ScatterplotLayer as InfraScatterplotLayer, PathLayer as InfraPathLayer } from "@deck.gl/layers";
import { PlantPopup } from "@/components/crep/popups/plant-popup";
import { InfraDetailWidget, type InfraAsset } from "@/components/crep/popups/infra-detail-widget";
import { UnifiedSearch, type SearchResult } from "@/components/crep/search/unified-search";
import { FlyToButtons } from "@/components/crep/controls/fly-to-buttons";
import { FlyToProjects } from "@/components/crep/controls/fly-to-projects";
import { MapLayersPopup } from "@/components/crep/controls/map-layers-popup";
import { InfrastructureStatsPanel } from "@/components/crep/panels/infrastructure-stats-panel";
import { mindexFetch } from "@/lib/crep/mindex-cache-client";
import { ALL_FETCH_REGIONS, regionToBounds, TOTAL_FETCH_REGIONS } from "@/lib/crep/geo-regions";
import {
  applyLODToEvents,
  applyLODToNature,
  applyLODToMovers,
  getLODForZoom,
  cullByBbox,
  expandedBbox,
} from "@/lib/crep/lod-policy";
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
  category: "events" | "devices" | "environment" | "infrastructure" | "human" | "military" | "pollution" | "imagery" | "telecom" | "facilities" | "projects";
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

// Layer categories with icons - ORDERED: Projects FIRST (Mycosoft focus),
// then Biodiversity/Devices, then context layers
const layerCategories = {
  // TOP PRIORITY - Mycosoft project zones (Oyster, Goffs, etc.)
  // Apr 21, 2026 (Morgan: "both need to be there in their own area on
  // the filters as Project filters"). Collects all project-specific
  // sub-toggles under one distinct banner above the generic categories.
  projects: { label: "MYCOSOFT Projects", icon: <Sparkles className="w-3.5 h-3.5" />, color: "text-teal-400" },
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
//
// Apr 20, 2026 (Morgan: "the most beautiful highly detailed and profound
// widget with a different and more visually modern floating high tech ui
// is needed for all device widgets this mycobrain gateway is not over our
// home with no gps on it at the moment but this widget is shit make it
// way better mycobrain-sidea-10b41d"). The popup body now mounts the new
// glass-morphism <DeviceWidget> from components/crep/devices/DeviceWidget.tsx
// — it explicitly surfaces GPS state (locked / drift / unavailable / manual)
// so it's obvious when a device's pin is approximate, has a richer header
// with status orb + signal-strength bars, sparkline-bearing telemetry
// cards, and styled quick-control buttons. Pulls history from a per-device
// in-memory ring buffer maintained by sensorHistoryRef.
function DeviceMarker({ device, isSelected, onClick, history, onControl }: {
  device: Device;
  isSelected: boolean;
  onClick: () => void;
  history?: import("@/components/crep/devices/DeviceWidget").SensorHistory;
  onControl?: (peripheral: string, params?: Record<string, any>) => Promise<void>;
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
        <DeviceWidget
          device={device as any}
          history={history}
          onClose={onClick}
          onControl={onControl || sendControl}
        />
      )}
      {/* Old MarkerPopup body removed — replaced by DeviceWidget above. */}
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

// Right Panel - Human & Machines Intel Component (live data from registries)
function HumanMachinesPanel({ liveAircraft = 0, liveVessels = 0, liveSatellites = 0 }: { liveAircraft?: number; liveVessels?: number; liveSatellites?: number }) {
  const [population, setPopulation] = useState(HUMAN_MACHINE_DATA.population.total);

  // Use LIVE counts from registries — fall back to estimates only when 0
  const activeData = {
    aircraft: liveAircraft || HUMAN_MACHINE_DATA.aircraft.inFlight,
    ships: liveVessels || HUMAN_MACHINE_DATA.ships.atSea,
    vehicles: HUMAN_MACHINE_DATA.vehicles.active,
    drones: HUMAN_MACHINE_DATA.drones.active,
  };

  // Live population counter
  useEffect(() => {
    const interval = setInterval(() => {
      setPopulation(prev => prev + (HUMAN_MACHINE_DATA.population.birthsPerSec - HUMAN_MACHINE_DATA.population.deathsPerSec));
    }, 1000);
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
      projects: [],
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
const CREPMycaPanel = memo(function CREPMycaPanel({
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
});
CREPMycaPanel.displayName = "CREPMycaPanel";

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

  // Apr 23, 2026 — Morgan: "crep locally is supper laggy now even slowing
  // my pc down". Service worker caches /data/crep/*.geojson + /crep/icons
  // + /_next/static with a cache-first strategy so return visits never
  // touch the network for ~80-200 MB of baked infra + iNat + sprite
  // atlases. First-visit cost unchanged; every subsequent load is
  // instant-interactive.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return
    // Register the SW but don't block the page on it.
    navigator.serviceWorker
      .register("/crep-sw.js", { scope: "/" })
      .then((reg) => {
        // eslint-disable-next-line no-console
        console.log(`[CREP/SW] registered scope=${reg.scope}`)
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.warn("[CREP/SW] registration failed:", e?.message)
      })
  }, [])

  // ════════════════════════════════════════════════════════════════════
  // Silence MapLibre AJAXError unhandled rejections so the Next.js dev
  // error overlay doesn't pop up over the dashboard (blocks all clicks →
  // "no widgets selectable"). MapLibre surfaces image-source load
  // failures as async rejections that don't bubble to any try/catch at
  // the component level. These are non-fatal — the affected raster layer
  // simply doesn't paint and the rest of the map works fine.
  // ════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const isMapLibreAjax = (msg: string) =>
      /AJAXError/.test(msg) && /(blob:|https?:\/\/)/.test(msg);
    // Apr 21, 2026 (Morgan: "crep is still reloading in browser"). React
    // 18/19 can throw "Cannot read properties of null (reading
    // 'removeChild')" + "Should not already be working" when MapLibre's
    // native DOM (canvas + control buttons) gets cleaned up via
    // map.remove() while React's reconciler is mid-commit. These errors
    // are non-fatal to CREP — MapLibre has already torn itself down —
    // but Next.js Fast Refresh treats them as unrecoverable and
    // full-page-reloads. Suppress to break the reload loop.
    const isReactReconcilerNoise = (msg: string) =>
      /Cannot read properties of null \(reading 'removeChild'\)/.test(msg) ||
      /Should not already be working/.test(msg) ||
      /The node to be removed is not a child of this node/.test(msg);
    const onUnhandled = (e: PromiseRejectionEvent) => {
      const reason = e.reason as any;
      const msg = reason?.message || String(reason);
      if (isMapLibreAjax(msg) || isReactReconcilerNoise(msg)) {
        e.preventDefault();  // keep Next dev overlay from surfacing
        console.warn("[CREP] silenced non-fatal error:", msg.slice(0, 140));
      }
    };
    const onError = (e: ErrorEvent) => {
      const msg = e?.error?.message || e?.message || "";
      if (isMapLibreAjax(msg) || isReactReconcilerNoise(msg)) {
        e.preventDefault();
        console.warn("[CREP] silenced non-fatal error (error):", msg.slice(0, 140));
      }
    };
    window.addEventListener("unhandledrejection", onUnhandled);
    window.addEventListener("error", onError);
    return () => {
      window.removeEventListener("unhandledrejection", onUnhandled);
      window.removeEventListener("error", onError);
    };
  }, []);
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
  const [militaryBases, setMilitaryBases] = useState<any[]>([]);
  const [satellites, setSatellites] = useState<SatelliteEntity[]>([]);

  // Apr 19, 2026 (Morgan: "boats finally visible but no widgets working for
  // them" — same bug likely for planes + sats). The click handlers in
  // MapComponent.onLoad capture these entity arrays in a CLOSURE at the
  // moment the map loads — when all three are still []. Widget lookup
  // (`filteredX.find(...)`) against the stale empty array never matches.
  // Expose each latest array on window so the handlers can do a LIVE lookup.
  useEffect(() => {
    if (typeof window === "undefined") return;
    (window as any).__crep_aircraft = aircraft;
    (window as any).__crep_vessels = vessels;
    (window as any).__crep_satellites = satellites;
  }, [aircraft, vessels, satellites]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SPACE PIGGYBACK (Apr 19, 2026)
  // Morgan (OpenGridView parity): "they have a button called space piggyback
  // that zooms in follows and changes close up angle of the satelite".
  //
  // The SatelliteDetail widget fires a "crep:satellite:piggyback" event with
  // the satellite's norad id + name. We flyTo the satellite's current SGP4
  // position, then every 400 ms look up the LATEST position from the
  // crep-live-satellites source and easeTo there with a slight pitch so it
  // feels like a chase-cam. Press Esc or click the map (outside the sat)
  // to disengage.
  // ═══════════════════════════════════════════════════════════════════════════
  const [piggybackSatelliteId, setPiggybackSatelliteId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPiggyback = (e: any) => {
      const d = e?.detail || {};
      const id = String(d.id ?? d.noradId ?? d.name ?? "");
      if (!id) return;
      setPiggybackSatelliteId(id);
      // Initial flyTo so the user sees immediate action even before the
      // tracking loop starts.
      try {
        const m = mapNativeRef.current as any;
        if (m?.flyTo && typeof d.lat === "number" && typeof d.lng === "number") {
          m.flyTo({ center: [d.lng, d.lat], zoom: 5, pitch: 45, duration: 1500 });
        }
      } catch { /* ignore */ }
    };
    const onKey = (ev: KeyboardEvent) => { if (ev.key === "Escape") setPiggybackSatelliteId(null); };
    // Apr 22, 2026 — Morgan: MYCA "should be instant and move the map".
    // crep:flyto is MYCA's fast-lane map-control event — dispatched by
    // the chat widget BEFORE the LLM response (intent parser matches
    // "show me / fly to / go to <place>"). Moves the camera immediately
    // even while the LLM is still thinking.
    const onFlyTo = (e: any) => {
      const d = e?.detail || {};
      const lat = Number(d.lat), lng = Number(d.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const zoom = Number.isFinite(Number(d.zoom)) ? Number(d.zoom) : 11;
      try {
        const m = mapNativeRef.current as any;
        if (m?.flyTo) m.flyTo({ center: [lng, lat], zoom, duration: 1200 });
      } catch { /* ignore */ }
    };
    window.addEventListener("crep:flyto", onFlyTo as any);
    window.addEventListener("crep:satellite:piggyback", onPiggyback as any);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("crep:flyto", onFlyTo as any);
      window.removeEventListener("crep:satellite:piggyback", onPiggyback as any);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // Follow loop: every 400 ms while piggyback is active, query the latest
  // SGP4 position of the target satellite from the map source and re-centre
  // the camera with a gentle easeTo (short duration = smooth but not
  // dizzying). Stops immediately when piggybackSatelliteId is null.
  useEffect(() => {
    if (!piggybackSatelliteId) return;
    const interval = setInterval(() => {
      const m = mapNativeRef.current as any;
      if (!m || typeof m.getSource !== "function") return;
      try {
        const src = m.getSource("crep-live-satellites") as any;
        const data = src?._data;
        const features: any[] = data?.features || [];
        const match = features.find((f: any) => {
          const p = f?.properties || {};
          const id = String(p.id ?? p.noradId ?? p.name ?? "");
          return id === piggybackSatelliteId ||
                 String(p.noradId ?? "") === piggybackSatelliteId ||
                 String(p.name ?? "") === piggybackSatelliteId;
        });
        if (!match) return;
        const coords = match.geometry?.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) return;
        const [lng, lat] = coords;
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
        m.easeTo({ center: [lng, lat], duration: 380, pitch: 45 });
      } catch { /* ignore */ }
    }, 400);
    return () => clearInterval(interval);
  }, [piggybackSatelliteId]);
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

  // ════════════════════════════════════════════════════════════════════
  // LIVE ENTITY PUMP (Fix B — Apr 18, 2026)
  // ════════════════════════════════════════════════════════════════════
  // Independent of the main fetchData() effect so MycoBrain / global-events
  // timeouts can never block aircraft/vessels/satellites from loading.
  // Runs on mount + every 30s thereafter. Each fetch is error-isolated.
  //
  // QA audit on Apr 18 found these routes never fired on mount, leaving
  // top-bar stuck at 0 Planes / 0 Boats / 0 Sats. Likely cause: the main
  // fetchData chain was awaiting slow upstream calls serially before
  // reaching Promise.allSettled. Extracting the pump into its own effect
  // removes that failure mode entirely.
  // ════════════════════════════════════════════════════════════════════
  useEffect(() => {
    let cancelled = false;

    const pumpLive = async () => {
      if (cancelled) return;
      console.log("[CREP/pump] live-entity tick at", new Date().toISOString());

      // Each fetch is independent — Promise.allSettled + per-call try/catch.
      // Apr 21, 2026 (Morgan OOM audit): per-endpoint circuit-breaker so a
      // dead upstream stops spamming console + burning CPU on retries.
      // After 3 consecutive failures, skip for 5 minutes, then retry.
      const breakerSkip = (key: string): boolean => {
        const state = (window as any)[key] as { fails: number; skipUntil: number } | undefined
        if (!state) return false
        if (state.fails >= 3 && Date.now() < state.skipUntil) return true
        return false
      }
      const breakerMark = (key: string, success: boolean, label: string) => {
        const state = (window as any)[key] as { fails: number; skipUntil: number } | undefined
          ?? { fails: 0, skipUntil: 0 }
        if (success) { state.fails = 0; state.skipUntil = 0 }
        else {
          state.fails++
          if (state.fails >= 3) {
            state.skipUntil = Date.now() + 5 * 60_000 // back off 5 min
            if (state.fails === 3) console.warn(`[CREP/pump] ${label} circuit-broken — backing off 5 min.`)
          }
        }
        ;(window as any)[key] = state
      }

      await Promise.allSettled([
        (async () => {
          if (breakerSkip("__crep_pump_aircraft_breaker")) return
          try {
            const res = await fetch("/api/oei/flightradar24", { signal: AbortSignal.timeout(25000) });
            if (!res.ok || cancelled) { breakerMark("__crep_pump_aircraft_breaker", false, "aircraft"); return }
            const data = await res.json();
            if (Array.isArray(data.aircraft) && data.aircraft.length > 0) {
              setAircraft((prev) => mergeById(prev, data.aircraft, {
                idKey: (a: any) => a.icao24 || a.icao || a.id,
                ttlMs: ENTITY_TTL_MS.aircraft,
                maxEntries: 3_000,
              }));
              console.log(`[CREP/pump] aircraft: ${data.aircraft.length} (merged into persistent union)`);
              try { syncToMINDEX("aircraft", data.aircraft); } catch {}
            }
            breakerMark("__crep_pump_aircraft_breaker", true, "aircraft")
          } catch (e) {
            breakerMark("__crep_pump_aircraft_breaker", false, "aircraft")
            const s = (window as any).__crep_pump_aircraft_breaker?.fails ?? 0
            if (s === 1 || s >= 3) console.warn(`[CREP/pump] aircraft (${s}/3):`, (e as Error)?.message);
          }
        })(),
        (async () => {
          if (breakerSkip("__crep_pump_vessels_breaker")) return
          // Apr 22, 2026 (Morgan: "dont stop until all vessel satelite and
          // planes are showing animated and live on globe"). Default
          // /api/oei/aisstream goes through the multi-source vessel
          // registry which currently returns 0 from all 9 sub-sources
          // (MarineTraffic / VesselFinder / etc. all dry). The persistent
          // AISstream WebSocket singleton IS collecting vessels though —
          // ?publish=true drops the registry fan-out and serves directly
          // from the AIS client's internal cache. Live probe: 15,815
          // vessels returned vs 0 via the multi-source path.
          try {
            const res = await fetch("/api/oei/aisstream?publish=true&refresh=true", { signal: AbortSignal.timeout(25000) });
            if (!res.ok || cancelled) { breakerMark("__crep_pump_vessels_breaker", false, "vessels"); return }
            const data = await res.json();
            if (Array.isArray(data.vessels) && data.vessels.length > 0) {
              // Apr 22, 2026 v3 — Morgan: "world zoom i need ≥30% of all
              // vessels". Cap bumped 6k → 20k so the pool is deep enough
              // for stratified LOD to show ~30% globally without starving.
              // GPU upload is still capped via lodSelectForZoom() at
              // render time, so main-thread React diff cost only scales
              // with selected set (not full 20k).
              // Apr 23, 2026 — Morgan: "fix it all so that never happens and
              // never crashes or refreshes the site in overload". Browser
              // audit caught the tab crashing at z=4 with 20 000 vessels +
              // 2 269 aircraft + 224 layers in play. Dropped the vessel
              // working set to 8 000 — still deep enough for lodSelectForZoom
              // to sample the 30 % global floor (z≤2) and hit 100 % at z≥6,
              // but keeps the React diff + feature array cost well under the
              // GPU upload budget on an average Chrome tab.
              setVessels((prev) => mergeById(prev, data.vessels, {
                idKey: (v: any) => v.mmsi || v.id,
                ttlMs: ENTITY_TTL_MS.vessel,
                maxEntries: 8_000,
              }));
              console.log(`[CREP/pump] vessels: ${data.vessels.length} (merged into persistent union)`);
              try { syncToMINDEX("vessels", data.vessels); } catch {}
            }
            breakerMark("__crep_pump_vessels_breaker", true, "vessels")
          } catch (e) {
            breakerMark("__crep_pump_vessels_breaker", false, "vessels")
            const s = (window as any).__crep_pump_vessels_breaker?.fails ?? 0
            if (s === 1 || s >= 3) console.warn(`[CREP/pump] vessels (${s}/3):`, (e as Error)?.message);
          }
        })(),
        (async () => {
          if (breakerSkip("__crep_pump_satellites_breaker")) return
          // Apr 22, 2026 (Morgan: "dont stop until all vessel satelite and
          // planes are showing animated and live on globe"). Registry mode
          // was returning 0 and category=active legacy also 0 on the
          // current CelesTrak snapshot. Cascade: try active-registry first
          // (6 sources deduped), then fall back to stations (always has
          // ISS + Tiangong + starlinks), then gnss as last resort. Each
          // category has its own TLE list so one being stale doesn't block
          // the others.
          const tryCategory = async (url: string, label: string): Promise<any[] | null> => {
            try {
              const r = await fetch(url, { signal: AbortSignal.timeout(20_000) })
              if (!r.ok || cancelled) return null
              const j = await r.json()
              if (Array.isArray(j?.satellites) && j.satellites.length > 0) {
                console.log(`[CREP/pump] satellites (${label}): ${j.satellites.length}`)
                return j.satellites
              }
              return null
            } catch { return null }
          }
          try {
            let sats: any[] | null = null
            sats = await tryCategory("/api/oei/satellites?category=active&mode=registry", "active-registry")
            if (!sats) sats = await tryCategory("/api/oei/satellites?category=stations&mode=legacy", "stations-legacy")
            if (!sats) sats = await tryCategory("/api/oei/satellites?category=gnss&mode=legacy", "gnss-legacy")
            if (!sats) sats = await tryCategory("/api/oei/satellites?category=starlink&mode=legacy&limit=500", "starlink-legacy")
            initialSatelliteLoadDoneRef.current = true
            if (sats && sats.length > 0) {
              setSatellites((prev) => mergeById(prev, sats as any[], {
                idKey: (s: any) => s.noradId || s.norad_id || s.id,
                ttlMs: ENTITY_TTL_MS.satellite,
                maxEntries: 2_500,
              }))
              try { syncToMINDEX("satellites", sats as unknown as Record<string, unknown>[]); } catch {}
              breakerMark("__crep_pump_satellites_breaker", true, "satellites")
            } else {
              breakerMark("__crep_pump_satellites_breaker", false, "satellites")
              const s = (window as any).__crep_pump_satellites_breaker?.fails ?? 0
              if (s === 1 || s >= 3) console.warn(`[CREP/pump] satellites all categories empty (${s}/3)`)
            }
          } catch (e) {
            breakerMark("__crep_pump_satellites_breaker", false, "satellites")
            const s = (window as any).__crep_pump_satellites_breaker?.fails ?? 0
            if (s === 1 || s >= 3) console.warn(`[CREP/pump] satellites (${s}/3):`, (e as Error)?.message)
          }
        })(),
      ]);
    };

    pumpLive();
    // Apr 20, 2026 perf-1 (Morgan: "make all map load faster every single
    // asset and system can have small if not micro efficiency improvments").
    // Visibility-aware throttle: skip the live-entity pump when the tab is
    // backgrounded — no point burning ~3 API calls + 3 setState's every 30s
    // when nobody's looking. Last poll persists; rAF backstop keeps painting
    // existing positions. When user returns + visibilitychange fires, we
    // do an immediate pump to catch up.
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return
      pumpLive()
    }, 30_000) // 30s refresh
    const onVisible = () => {
      if (typeof document !== "undefined" && !document.hidden) pumpLive()
    }
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisible)
    return () => {
      cancelled = true
      clearInterval(interval)
      if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVisible)
    }
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
  
  // Apr 20, 2026 (Morgan: "fix and turn off sun filters its causing crep
  // to reload over and over"). Every default-on space-weather filter
  // here triggers an /api/oei/space-weather poll on mount, and the
  // SpaceWeatherWidget + SunEarthImpactLayer subscribe to multiple of
  // these. With several upstream NOAA / DONKI / SWPC endpoints flapping
  // at once, the cascade was visibly stalling the dashboard. Default
  // ALL space-weather toggles OFF — operator can re-enable from the
  // Space Weather panel when they want them.
  const [spaceWeatherFilter, setSpaceWeatherFilter] = useState<SpaceWeatherFilter>({
    showSolarFlares: false,
    showCME: false,
    showGeomagneticStorms: false,
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
    // Infrastructure – ON by default (must match layer enabled state)
    showFactories: true,
    showPowerPlants: true,
    showMining: true,
    showOilGas: true,
    showWaterPollution: true,
    // Military & Defense – on by default for CREP/FUSARIUM
    showMilitaryBases: true,
    // Sensors – on by default
    showMycoBrain: true,
    showSporeBase: true,
    showSmartFence: true,
    showPartnerNetworks: true,
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
    militaryBases: { status: "real", source: "OSM+MINDEX" },
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
    { id: "fungi", name: "Nature Observations", category: "environment", icon: <TreePine className="w-3 h-3" />, enabled: true, opacity: 0.6, color: "#22c55e", description: "MINDEX biodiversity data - iNaturalist/GBIF observations (fungi, plants, birds, insects, animals, marine) with GPS" },
    // MycoBrain Devices - Real-time sensor network
    { id: "mycobrain", name: "MycoBrain Devices", category: "devices", icon: <Radar className="w-3 h-3" />, enabled: true, opacity: 1, color: "#22c55e", description: "All Mycosoft MycoBrain-powered devices (ESP32-S3 + BME688 + MQTT broker/MDP/MMP via Jetson-MycoBrain bridge)" },
    { id: "devMushroom1", name: "Mushroom 1", category: "devices", icon: <Cpu className="w-3 h-3" />, enabled: true, opacity: 1, color: "#a855f7", description: "Mushroom 1 fruiting-body monitor (MycoBrain-powered)" },
    { id: "devHyphae1", name: "Hyphae 1", category: "devices", icon: <Cpu className="w-3 h-3" />, enabled: true, opacity: 1, color: "#f97316", description: "Hyphae 1 mycelium-network VOC sensor" },
    { id: "sporebase", name: "SporeBase", category: "devices", icon: <Cpu className="w-3 h-3" />, enabled: true, opacity: 1, color: "#10b981", description: "SporeBase environmental spore detection sensors" },
    { id: "devMycoNode", name: "MycoNode", category: "devices", icon: <Wifi className="w-3 h-3" />, enabled: true, opacity: 1, color: "#06b6d4", description: "MycoNode edge compute node (Jetson + MycoBrain bridge to MQTT / MDP / MMP)" },
    { id: "devAlarm", name: "Alarm", category: "devices", icon: <Shield className="w-3 h-3" />, enabled: true, opacity: 1, color: "#ef4444", description: "Alarm sensor (MycoBrain-powered event trigger)" },
    { id: "devPsathyrella", name: "Psathyrella (Buoy)", category: "devices", icon: <Waves className="w-3 h-3" />, enabled: true, opacity: 1, color: "#38bdf8", description: "Psathyrella aquatic MycoBrain buoy — marine spore + water chemistry" },
    { id: "partners", name: "Partner Networks", category: "devices", icon: <Wifi className="w-3 h-3" />, enabled: true, opacity: 0.8, color: "#06b6d4", description: "Third-party research stations" },
    { id: "smartfence", name: "Smart Fence Network", category: "devices", icon: <Shield className="w-3 h-3" />, enabled: true, opacity: 1, color: "#06b6d4", description: "MycoBrain fence sensors for wildlife corridors" },
    // Environment - Context for fungal activity
    { id: "biodiversity", name: "Biodiversity Hotspots", category: "environment", icon: <Sparkles className="w-3 h-3" />, enabled: true, opacity: 0.7, color: "#a855f7", description: "High biodiversity concentration areas. Apr 22 2026 flipped ON per Morgan — all permanent infra + project layers on from start." },
    { id: "weather", name: "Weather Overlay", category: "environment", icon: <Thermometer className="w-3 h-3" />, enabled: true, opacity: 0.6, color: "#3b82f6", description: "Temperature, precipitation, wind - affects fungal growth" },
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
    { id: "fishing", name: "Fishing Fleets", category: "infrastructure", icon: <Fish className="w-3 h-3" />, enabled: true, opacity: 0.7, color: "#22d3ee", description: "Global Fishing Watch data" },
    { id: "containers", name: "Container Ships", category: "infrastructure", icon: <Container className="w-3 h-3" />, enabled: true, opacity: 0.6, color: "#06b6d4", description: "Shipping container trajectories" },
    { id: "vehicles", name: "Land Vehicles", category: "infrastructure", icon: <Car className="w-3 h-3" />, enabled: true, opacity: 0.4, color: "#f59e0b", description: "Aggregate vehicle traffic patterns" },
    { id: "drones", name: "Drones & UAVs", category: "infrastructure", icon: <Radio className="w-3 h-3" />, enabled: true, opacity: 0.8, color: "#a855f7", description: "Known drone activity and flights" },
    { id: "satellites", name: "Satellites (TLE Live)", category: "infrastructure", icon: <Satellite className="w-3 h-3" />, enabled: true, opacity: 0.9, color: "#c084fc", description: "CelesTrak live satellite positions" },
    // Human Activity
    { id: "population", name: "Population Density", category: "human", icon: <Users className="w-3 h-3" />, enabled: true, opacity: 0.5, color: "#3b82f6", description: "Global population density heatmap" },
    { id: "humanMovement", name: "Human Movement", category: "human", icon: <Navigation className="w-3 h-3" />, enabled: true, opacity: 0.6, color: "#6366f1", description: "Aggregated human mobility patterns" },
    { id: "events_human", name: "Human Events", category: "human", icon: <Bell className="w-3 h-3" />, enabled: true, opacity: 0.7, color: "#8b5cf6", description: "Gatherings, protests, migrations" },
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // MILITARY & DEFENSE (OFF BY DEFAULT - DEMO/TOGGLEABLE)
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    { id: "militaryBases", name: "Military Bases (Live)", category: "military", icon: <Shield className="w-3 h-3" />, enabled: true, opacity: 0.9, color: "#16a34a", description: "Real military installations via OSM — US + global" },
    { id: "militaryAir", name: "Military Aircraft", category: "military", icon: <Plane className="w-3 h-3" />, enabled: true, opacity: 0.9, color: "#f59e0b", description: "Military aviation tracking via ADS-B" },
    { id: "militaryNavy", name: "Naval Vessels", category: "military", icon: <Anchor className="w-3 h-3" />, enabled: true, opacity: 0.9, color: "#eab308", description: "Military ship movements via AIS" },
    { id: "tanks", name: "Ground Forces", category: "military", icon: <CrosshairIcon className="w-3 h-3" />, enabled: true, opacity: 0.8, color: "#d97706", description: "Tanks, carriers, ground vehicles" },
    { id: "militaryDrones", name: "Military UAVs", category: "military", icon: <Target className="w-3 h-3" />, enabled: true, opacity: 0.8, color: "#fbbf24", description: "Military drone operations" },
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // POLLUTION & INDUSTRY (OFF BY DEFAULT)
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    { id: "factories", name: "Factories & Plants", category: "pollution", icon: <Factory className="w-3 h-3" />, enabled: true, opacity: 0.7, color: "#f97316", description: "Industrial facilities globally" },
    { id: "co2Sources", name: "COâ‚‚ Emission Sources", category: "pollution", icon: <Cloud className="w-3 h-3" />, enabled: true, opacity: 0.6, color: "#ef4444", description: "Major COâ‚‚ emitters and hotspots" },
    { id: "methaneSources", name: "Methane Sources", category: "pollution", icon: <Gauge className="w-3 h-3" />, enabled: true, opacity: 0.6, color: "#dc2626", description: "Methane leaks and emission sources" },
    { id: "oilGas", name: "Oil & Gas Infrastructure", category: "pollution", icon: <Fuel className="w-3 h-3" />, enabled: true, opacity: 0.5, color: "#78350f", description: "Refineries, pipelines, platforms" },
    { id: "powerPlants", name: "Power Plants", category: "pollution", icon: <Power className="w-3 h-3" />, enabled: true, opacity: 0.9, color: "#fbbf24", description: "Thermal, nuclear, renewable plants — OpenGridWorks-style" },
    { id: "metalOutput", name: "Metal & Mining", category: "pollution", icon: <Wrench className="w-3 h-3" />, enabled: true, opacity: 0.5, color: "#a16207", description: "Mining operations and output" },
    { id: "waterPollution", name: "Water Contamination", category: "pollution", icon: <Droplet className="w-3 h-3" />, enabled: true, opacity: 0.6, color: "#0284c7", description: "Water pollution events and sources" },
    // TELECOM & INFRASTRUCTURE — OpenGridWorks-style (Apr 2026)
    { id: "submarineCables", name: "Submarine Cables", category: "telecom", icon: <Cable className="w-3 h-3" />, enabled: true, opacity: 0.8, color: "#06b6d4", description: "Undersea fiber optic cables" },
    { id: "dataCenters", name: "Data Centers", category: "telecom", icon: <Server className="w-3 h-3" />, enabled: true, opacity: 0.9, color: "#7c3aed", description: "Data centers worldwide from OSM" },
    { id: "cellTowers", name: "Cell Towers", category: "telecom", icon: <Radio className="w-3 h-3" />, enabled: true, opacity: 0.7, color: "#8b5cf6", description: "Cellular tower locations" },
    // ═══════════════════════════════════════════════════════════════════════
    // LIVE TRANSIT — Apr 23 2026, Morgan: "compete with google maps live
    // traffic public transportation". Polls /api/transit/all every 15 s,
    // aggregated feed from MTA/WMATA/BART/MBTA/511-Bay/CTA/TriMet/MARTA/
    // Amtrak/SEPTA/Metrolink/DART. Colored by vehicle_type.
    // ═══════════════════════════════════════════════════════════════════════
    { id: "liveTransit", name: "Live Transit (Trains/Buses)", category: "infrastructure", icon: <Navigation className="w-3 h-3" />, enabled: true, opacity: 0.9, color: "#3b82f6", description: "Live US transit: MTA, WMATA, BART, MBTA, Bay Area 511, CTA, TriMet, MARTA, Amtrak, SEPTA, Metrolink, DART" },
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // NVIDIA EARTH-2 AI WEATHER LAYERS
    // Advanced AI-powered weather forecasting from NVIDIA Earth-2 platform
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    { id: "earth2Forecast", name: "Earth-2 AI Forecast", category: "environment", icon: <Cloud className="w-3 h-3" />, enabled: true, opacity: 0.7, color: "#06b6d4", description: "NVIDIA Atlas: 15-day medium-range AI forecast" },
    { id: "earth2Nowcast", name: "Earth-2 Nowcast", category: "environment", icon: <Radar className="w-3 h-3" />, enabled: true, opacity: 0.7, color: "#22d3ee", description: "NVIDIA StormScope: 0-6hr storm prediction" },
    { id: "earth2Spore", name: "Spore Dispersal AI", category: "environment", icon: <Wind className="w-3 h-3" />, enabled: true, opacity: 0.6, color: "#10b981", description: "AI-powered fungal spore dispersal modeling" },
    { id: "earth2Wind", name: "Wind Vectors", category: "environment", icon: <Wind className="w-3 h-3" />, enabled: true, opacity: 0.5, color: "#3b82f6", description: "High-resolution wind field visualization" },
    { id: "earth2Temp", name: "Temperature Heatmap", category: "environment", icon: <Thermometer className="w-3 h-3" />, enabled: true, opacity: 0.6, color: "#ef4444", description: "AI-downscaled temperature overlay" },
    { id: "earth2Precip", name: "Precipitation", category: "environment", icon: <Droplets className="w-3 h-3" />, enabled: true, opacity: 0.6, color: "#0ea5e9", description: "CorrDiff high-resolution precipitation" },
    // ═══════════════════════════════════════════════════════════════════════════
    // EARTH OBSERVATION IMAGERY — controlled by on-map MapLayersPopup
    // GIBS rendering handled via eoImageryFilter state + GibsBaseLayers
    // ═══════════════════════════════════════════════════════════════════════════
    // ═══════════════════════════════════════════════════════════════════════════
    // AURORA & SPACE WEATHER VISUAL OVERLAYS
    // ═══════════════════════════════════════════════════════════════════════════
    { id: "auroraOverlay", name: "Aurora Forecast", category: "events", icon: <Sparkles className="w-3 h-3" />, enabled: true, opacity: 0.5, color: "#34d399", description: "NOAA SWPC aurora probability overlay on polar regions" },
    // ═══════════════════════════════════════════════════════════════════════════
    // ADDITIONAL TELECOM (non-duplicate)
    // ═══════════════════════════════════════════════════════════════════════════
    { id: "signalHeatmap", name: "Signal Coverage", category: "telecom", icon: <Wifi className="w-3 h-3" />, enabled: true, opacity: 0.4, color: "#a855f7", description: "Approximate cellular signal coverage heatmap" },
    // ═══════════════════════════════════════════════════════════════════════════
    // ADDITIONAL FACILITIES (real data via Overpass API)
    // ═══════════════════════════════════════════════════════════════════════════
    { id: "hospitals", name: "Hospitals", category: "facilities", icon: <Cross className="w-3 h-3" />, enabled: true, opacity: 0.7, color: "#ec4899", description: "Hospital locations from OpenStreetMap" },
    { id: "fireStations", name: "Fire Stations", category: "facilities", icon: <Flame className="w-3 h-3" />, enabled: true, opacity: 0.7, color: "#ef4444", description: "Fire station locations from OSM" },
    { id: "universities", name: "Universities", category: "facilities", icon: <BookOpen className="w-3 h-3" />, enabled: true, opacity: 0.6, color: "#6d28d9", description: "University and college locations" },

    // ═══════════════════════════════════════════════════════════════════════════
    // PROPOSAL OVERLAYS (Apr 2026) — Army contract deliverable coverage
    // ═══════════════════════════════════════════════════════════════════════════
    { id: "ports", name: "Global Seaports", category: "infrastructure", icon: <Anchor className="w-3 h-3" />, enabled: true, opacity: 0.9, color: "#14b8a6", description: "3,600+ seaports (WPI/NGA + UNCTAD + MarineCadastre + MINDEX)" },
    // CCTV / webcam feeds — MINDEX crep.cctv_cameras + Shinobi on MAS VM
    // (Cursor deployed Apr 20, 2026). Empty registry until seeded; filter
    // toggle + click widget still work.
    { id: "cctv", name: "CCTV / Webcams", category: "infrastructure", icon: <Camera className="w-3 h-3" />, enabled: true, opacity: 0.85, color: "#67e8f9", description: "Public webcams + Shinobi-ingested CCTV feeds (MINDEX crep.cctv_cameras + Shinobi on MAS VM 192.168.0.188:8080). Click for live stream URL." },

    // ═══ Eagle Eye — Video Intelligence Layer (Phase 1 — Apr 20, 2026) ═══
    // Dual-plane: registered cameras (permanent) + ephemeral social video
    // (YouTube Live + Bluesky/Mastodon/X feeds). Cursor applied the
    // eagle.* MINDEX schema on VM 189 and deployed MediaMTX on MAS 188.
    // See components/crep/layers/eagle-eye-overlay.tsx.
    { id: "eagleEyeCameras", name: "Eagle Eye — Cameras", category: "infrastructure", icon: <Camera className="w-3 h-3" />, enabled: true, opacity: 0.9, color: "#22d3ee", description: "Permanent video sources — Shinobi + 511 traffic + Windy + EarthCam + NPS/USGS + ALERTWildfire / HPWREN fire cams + Surfline surf cams. Cyan halo + color-coded core per provider. Click for live stream. When MINDEX eagle.video_sources is sparse, /api/eagle/sources falls back to direct connector fan-out so icons appear immediately." },
    { id: "eagleEyeEvents", name: "Eagle Eye — Live Events", category: "events", icon: <Camera className="w-3 h-3" />, enabled: true, opacity: 0.9, color: "#fbbf24", description: "Ephemeral social video: YouTube Live broadcasts + Bluesky / Mastodon / Twitch video posts + X geo-placed media. Pulsing yellow ring, 24 h TTL. Color by location confidence tier (native > platform-inferred > text-inferred)." },

    // ═══ EIA-860M (Feb 2026) + IM3 Data Center Atlas (v2026.02.09) ═══
    // Canonical US datasets that OpenGridView uses. See
    // components/crep/layers/eia-im3-overlays.tsx + docs/DATASETS.md
    // for provenance + refresh policy.
    { id: "im3DataCenters", name: "Data Centers (IM3 Atlas)", category: "telecom", icon: <Server className="w-3 h-3" />, enabled: true, opacity: 0.9, color: "#22d3ee", description: "PNNL IM3 Open Source Data Center Atlas v2026.02.09 — 1,479 existing US data centers with building/campus classification + sqft + operator" },
    { id: "im3DataCenterFootprints", name: "DC Footprints (IM3 buildings)", category: "telecom", icon: <Server className="w-3 h-3" />, enabled: true, opacity: 0.85, color: "#22d3ee", description: "IM3 gpkg building + campus POLYGON footprints (1,374 shapes, zoom ≥ 11). Click any footprint to open the InfraAsset widget with building sqft + operator + county." },
    { id: "eiaOperating", name: "EIA-860M Operating", category: "infrastructure", icon: <Power className="w-3 h-3" />, enabled: true, opacity: 0.85, color: "#22c55e", description: "US Energy Information Administration February 2026 — 27,716 operating utility-scale generators with technology + capacity" },
    { id: "eiaPlanned", name: "EIA-860M Planned (Projected)", category: "infrastructure", icon: <Power className="w-3 h-3" />, enabled: true, opacity: 0.9, color: "#3b82f6", description: "EIA-860M Feb 2026 — 1,946 PLANNED generators with operation year + technology (future grid)" },
    { id: "eiaRetired", name: "EIA-860M Retired", category: "infrastructure", icon: <Power className="w-3 h-3" />, enabled: true, opacity: 0.7, color: "#ef4444", description: "EIA-860M Feb 2026 — 7,201 retired generators with retirement year" },
    { id: "eiaCanceled", name: "EIA-860M Canceled", category: "infrastructure", icon: <Power className="w-3 h-3" />, enabled: true, opacity: 0.6, color: "#9ca3af", description: "EIA-860M Feb 2026 — 1,605 canceled or postponed generators" },
    { id: "radar", name: "Radar Sites", category: "infrastructure", icon: <Radar className="w-3 h-3" />, enabled: true, opacity: 0.8, color: "#38bdf8", description: "NEXRAD + Mycosoft SDR + FAA ASR coverage rings" },
    { id: "radioStations", name: "Radio Stations", category: "telecom", icon: <Radio className="w-3 h-3" />, enabled: true, opacity: 0.8, color: "#a855f7", description: "44,000+ AM/FM/TV + KiwiSDR + Mycosoft SDR nodes" },
    { id: "powerPlantsG", name: "Global Power Plants", category: "pollution", icon: <Power className="w-3 h-3" />, enabled: true, opacity: 0.85, color: "#fbbf24", description: "34,936 plants across 167 countries (WRI v1.3.0)" },
    { id: "factoriesG", name: "Global Factories", category: "pollution", icon: <Factory className="w-3 h-3" />, enabled: true, opacity: 0.7, color: "#f97316", description: "Climate TRACE + OSM + GEM — bbox-scoped" },
    { id: "orbitalDebris", name: "Orbital Debris (Catalogued)", category: "infrastructure", icon: <Satellite className="w-3 h-3" />, enabled: false, opacity: 0.7, color: "#d946ef", description: "~22k tracked debris objects via CelesTrak + SatCat + analyst. OFF by default — 22k animated SGP4 dots alongside active satellites + everything else pushes the GPU into frame-drop territory." },
    { id: "debrisCloud", name: "Debris 1-10cm (Statistical)", category: "infrastructure", icon: <Sparkles className="w-3 h-3" />, enabled: false, opacity: 0.45, color: "#ec4899", description: "1.2M sub-catalog debris modeled via NASA ODPO ORDEM distribution — density cloud. OFF by default: rendering 1.2M deck.gl points + everything else crashes the browser. Enable explicitly when the orbital debris view is the focus." },
    { id: "txLinesGlobal", name: "Global Transmission Lines", category: "pollution", icon: <Zap className="w-3 h-3" />, enabled: true, opacity: 0.6, color: "#facc15", description: "Global HV grid (HIFLD US + OpenInfraMap + OSM + MINDEX) — 22,760 lines. Apr 22 2026 flipped ON per Morgan — served via PMTiles so only viewport tiles hit heap." },
    { id: "txLinesFull", name: "Transmission Lines (ALL voltages)", category: "pollution", icon: <Zap className="w-3 h-3" />, enabled: true, opacity: 0.7, color: "#fbbf24", description: "Full HIFLD Electric Power Transmission + OSM — 52,244 lines incl. 69/115/138/230 kV feeders. Apr 22 2026 flipped ON per Morgan — PMTiles path only. If prod shows OOM, switch back to PMTiles-only fallback (static-infra-loader handles mode selection)." },
    // Apr 22, 2026 — Morgan: "example i see a substation with no line to
    // it that doesnt make sense ... THIS NEEDS TO BE FIXED ACROSS ALL
    // INFRA GLOBALLY". HIFLD only carries ≥115 kV; this layer fills the
    // ≤115 kV sub-transmission gap from OSM (baked weekly via GHA cron).
    // Dashed lines differentiate community OSM from authoritative HIFLD.
    { id: "txLinesSub", name: "Sub-Transmission (OSM)", category: "pollution", icon: <Zap className="w-3 h-3" />, enabled: true, opacity: 0.65, color: "#f97316", description: "OSM community-mapped sub-transmission lines (≤115 kV). Fills the 69/34.5 kV feeder gap HIFLD misses — Loveland, Jamacha, Otay, Chula Vista etc. Dashed rendering. Rebuilt weekly by the OSM harvester (bake-osm-sub-transmission.mjs)." },
    { id: "dataCentersG", name: "Global Data Centers", category: "telecom", icon: <Server className="w-3 h-3" />, enabled: true, opacity: 0.85, color: "#7c3aed", description: "OSM + PeeringDB + MINDEX data-center facilities (~5–7k globally). Apr 22 2026 flipped ON per Morgan — bbox-scoped so viewport-relevant only." },
    { id: "cellTowersG", name: "Global Cell Towers", category: "telecom", icon: <Wifi className="w-3 h-3" />, enabled: true, opacity: 0.6, color: "#8b5cf6", description: "OpenCelliD (47M) + FCC ASR + OSM — bbox-scoped via PMTiles. Apr 22 2026 flipped ON per Morgan — viewport-scoped tile render only keeps wide-area OOM at bay." },
    { id: "bathymetry", name: "Ocean Bathymetry", category: "environment", icon: <Waves className="w-3 h-3" />, enabled: true, opacity: 0.45, color: "#0e7490", description: "GEBCO 2024 ocean depth shading (200 m resolution)" },
    { id: "topography", name: "Land Topography", category: "environment", icon: <Mountain className="w-3 h-3" />, enabled: true, opacity: 0.55, color: "#78350f", description: "AWS Terrain Tiles hillshade (30 m DEM, GPU-shaded via MapLibre native hillshade)" },
    { id: "railwayTracks", name: "Railway Network", category: "infrastructure", icon: <Navigation className="w-3 h-3" />, enabled: true, opacity: 0.75, color: "#a1a1aa", description: "OpenRailwayMap — global tracks + stations + electrification" },
    { id: "railwayTrains", name: "Live Trains", category: "infrastructure", icon: <Navigation className="w-3 h-3" />, enabled: true, opacity: 0.9, color: "#f43f5e", description: "Amtrak Track-A-Train live positions (30 s refresh)" },
    { id: "droneNoFly", name: "Drone No-Fly Zones", category: "infrastructure", icon: <Shield className="w-3 h-3" />, enabled: false, opacity: 0.18, color: "#ef4444", description: "FAA UAS restricted + OpenAIP airspace — CTR red / TRA amber / parks green. Apr 22 2026 OFF by default per Morgan — the fill polygons block icon clicks underneath the zone." },
    // Apr 22, 2026 — SD + TJ coverage expansion layers (Morgan: "massive
    // amount of missing data from TIJUANA including infra cell towers
    // enviornmental sensors, military, police, hospitals, sewage line
    // data centers, am fm antennas same with san diego missing data").
    // Baked by scripts/etl/crep/bake-sdtj-coverage.mjs from OSM Overpass.
    { id: "sdtjHospitals",    name: "Hospitals (SD/TJ)",              category: "infrastructure", icon: <Shield className="w-3 h-3" />,     enabled: true,  opacity: 0.85, color: "#f43f5e", description: "OSM-mapped hospitals + clinics within the SD County + Tijuana bbox (136 points). Fills gaps HIFLD doesn't cover in Mexico and municipal-scale care facilities." },
    { id: "sdtjPolice",       name: "Police / Fire / Border (SD/TJ)", category: "infrastructure", icon: <Shield className="w-3 h-3" />,     enabled: true,  opacity: 0.85, color: "#3b82f6", description: "OSM police stations, fire stations, border-control posts in SD + TJ (128 points). US CBP, SD PD, SD Fire, Policía Municipal de Tijuana, Bomberos TJ." },
    { id: "sdtjSewage",       name: "Sewage Works (SD/TJ)",           category: "infrastructure", icon: <Shield className="w-3 h-3" />,     enabled: true,  opacity: 0.6,  color: "#a16207", description: "OSM sewage treatment plants + wastewater facilities (1 major — SBIWTP etc.). Relevant to cross-border contamination tracking for Project Oyster." },
    { id: "sdtjCellTowers",   name: "Cell Towers (OSM, SD/TJ detail)", category: "infrastructure", icon: <Navigation className="w-3 h-3" />, enabled: true,  opacity: 0.8,  color: "#ec4899", description: "OSM communications_tower + mast in SD + TJ (449 points). Supplements the global OpenCellID dataset for local detail, especially Mexican carriers Telcel / AT&T Mexico / Movistar." },
    { id: "sdtjAmFmAntennas", name: "AM/FM / TV antennas (SD/TJ)",    category: "infrastructure", icon: <Navigation className="w-3 h-3" />, enabled: true,  opacity: 0.85, color: "#a855f7", description: "OSM man_made=antenna + tower:type=broadcast (84 points). AM/FM radio + TV transmit antennas not in the global datacenter set." },
    { id: "sdtjMilitary",     name: "Military installations (OSM)",   category: "infrastructure", icon: <Shield className="w-3 h-3" />,     enabled: true,  opacity: 0.5,  color: "#10b981", description: "OSM military=* boundaries and landuse=military polygons (229 features). Covers US Navy + USMC + Army + the Mexican SEDENA side of the border. Supplements the existing Navy base overlay with smaller depots/guard stations." },
    { id: "sdtjDataCenters",  name: "Data Centers (SD/TJ detail)",    category: "infrastructure", icon: <Building2 className="w-3 h-3" />,  enabled: true,  opacity: 0.85, color: "#06b6d4", description: "OSM telecom=data_center + building=data_center (13 points). Complements the global data-centers file with carrier-hotel details." },

    // Apr 23, 2026 — Project NYC (Morgan: "massive amount of missing data
    // ... fly to and layers of details perimeters and special icon locations
    // for dc and new york"). 11 OSM-baked regional layers + project anchor.
    { id: "projectNyc",         name: "Project NYC — anchor + perimeter",  category: "projects",       icon: <Sparkles className="w-3 h-3" />,   enabled: true,  opacity: 1.0, color: "#22d3ee", description: "MYCOSOFT Project NYC anchor + 5-borough perimeter + landmark POIs (Times Sq, Central Park, WTC, etc). Fly to with __crep_flyTo('project-nyc')." },
    { id: "nycHospitals",       name: "NYC — Hospitals",                   category: "infrastructure", icon: <Shield className="w-3 h-3" />,     enabled: true,  opacity: 0.85, color: "#f43f5e", description: "OSM-mapped NYC 5-borough + NJ approach hospitals + clinics (~400)." },
    { id: "nycPolice",          name: "NYC — Police / Fire",               category: "infrastructure", icon: <Shield className="w-3 h-3" />,     enabled: true,  opacity: 0.85, color: "#3b82f6", description: "NYPD + FDNY precincts + firehouses (OSM)." },
    { id: "nycSewage",          name: "NYC — Sewage Works",                category: "infrastructure", icon: <Shield className="w-3 h-3" />,     enabled: true,  opacity: 0.6,  color: "#a16207", description: "NYC DEP wastewater treatment plants (Newtown Creek etc.)." },
    { id: "nycCellTowers",      name: "NYC — Cell Towers (detail)",        category: "infrastructure", icon: <Navigation className="w-3 h-3" />, enabled: true,  opacity: 0.8,  color: "#ec4899", description: "OSM communications_tower + mast across NYC." },
    { id: "nycAmFmAntennas",    name: "NYC — AM/FM / TV antennas",         category: "infrastructure", icon: <Navigation className="w-3 h-3" />, enabled: true,  opacity: 0.85, color: "#a855f7", description: "OSM man_made=antenna + broadcast tower." },
    { id: "nycMilitary",        name: "NYC — Military installations",      category: "infrastructure", icon: <Shield className="w-3 h-3" />,     enabled: true,  opacity: 0.5,  color: "#10b981", description: "OSM military=* NYC bbox (Army Reserves, USCG, Ft Hamilton etc.)." },
    { id: "nycDataCenters",     name: "NYC — Data Centers",                category: "infrastructure", icon: <Building2 className="w-3 h-3" />,  enabled: true,  opacity: 0.85, color: "#06b6d4", description: "OSM telecom=data_center NYC detail (60 Hudson, 111 8th, 325 Hudson etc.)." },
    { id: "nycTransitSubway",   name: "NYC — Subway Stations",             category: "infrastructure", icon: <Navigation className="w-3 h-3" />, enabled: true,  opacity: 0.9,  color: "#f59e0b", description: "MTA NYC subway stations (all lines)." },
    { id: "nycTransitRail",     name: "NYC — Rail Stations (LIRR/NJT/Amtrak)", category: "infrastructure", icon: <Navigation className="w-3 h-3" />, enabled: true,  opacity: 0.85, color: "#eab308", description: "LIRR, Metro-North, NJ Transit, Amtrak rail stations." },
    { id: "nycAirports",        name: "NYC — Airports",                    category: "infrastructure", icon: <Navigation className="w-3 h-3" />, enabled: true,  opacity: 0.9,  color: "#8b5cf6", description: "JFK, LGA, Newark, Teterboro, heliports." },
    { id: "nycGovtEmbassy",     name: "NYC — Government / Embassy / Consulate", category: "infrastructure", icon: <Shield className="w-3 h-3" />, enabled: true,  opacity: 0.8,  color: "#14b8a6", description: "UN, foreign consulates, courthouses, city government." },
    // Apr 23, 2026 — per Morgan ("that data should not be icon different then
    // all the other nature data") baked NYC + DC iNat observations now flow
    // into the shared `fungalObservations` state at mount and render through
    // FungalMarker just like the live SSE stream. The old "NYC/DC — Nature
    // observations (iNat)" standalone toggles were tied to a separate
    // MapLibre circle layer that no longer exists; removed so the layer
    // panel doesn't show a duplicate "Nature observations" entry that does
    // nothing when toggled. The master "fungi" layer still controls whether
    // ANY iNat (baked or live) renders.

    // Project DC
    { id: "projectDc",          name: "Project DC — anchor + perimeter",   category: "projects",       icon: <Sparkles className="w-3 h-3" />,   enabled: true,  opacity: 1.0, color: "#facc15", description: "MYCOSOFT Project DC anchor + NCR perimeter + landmark POIs (White House, Capitol, Pentagon, CIA HQ). Fly to with __crep_flyTo('project-dc')." },
    { id: "dcHospitals",        name: "DC — Hospitals",                    category: "infrastructure", icon: <Shield className="w-3 h-3" />,     enabled: true,  opacity: 0.85, color: "#f43f5e", description: "OSM hospitals DC + Arlington + Bethesda + Walter Reed (152 features)." },
    { id: "dcPolice",           name: "DC — Police / Fire / USSS",         category: "infrastructure", icon: <Shield className="w-3 h-3" />,     enabled: true,  opacity: 0.85, color: "#3b82f6", description: "MPD + USSS + Capitol Police + AFD + Arlington County fire (117 points)." },
    { id: "dcSewage",           name: "DC — Sewage Works",                 category: "infrastructure", icon: <Shield className="w-3 h-3" />,     enabled: true,  opacity: 0.6,  color: "#a16207", description: "DC Water + regional WW treatment (Blue Plains etc.)." },
    { id: "dcCellTowers",       name: "DC — Cell Towers (detail)",         category: "infrastructure", icon: <Navigation className="w-3 h-3" />, enabled: true,  opacity: 0.8,  color: "#ec4899", description: "530 OSM comms towers + masts across the NCR." },
    { id: "dcAmFmAntennas",     name: "DC — AM/FM / TV antennas",          category: "infrastructure", icon: <Navigation className="w-3 h-3" />, enabled: true,  opacity: 0.85, color: "#a855f7", description: "OSM broadcast antennas (25 points)." },
    { id: "dcMilitary",         name: "DC — Military installations",       category: "infrastructure", icon: <Shield className="w-3 h-3" />,     enabled: true,  opacity: 0.5,  color: "#10b981", description: "OSM military=* — Pentagon, Ft Myer, JB Andrews, Ft Meade, Ft Belvoir, Walter Reed, NSA (86 features)." },
    { id: "dcDataCenters",      name: "DC — Data Centers",                 category: "infrastructure", icon: <Building2 className="w-3 h-3" />,  enabled: true,  opacity: 0.85, color: "#06b6d4", description: "Ashburn cluster + NoVA + DC proper." },
    { id: "dcTransitSubway",    name: "DC — WMATA Metro Stations",         category: "infrastructure", icon: <Navigation className="w-3 h-3" />, enabled: true,  opacity: 0.9,  color: "#f59e0b", description: "WMATA Metrorail (all lines)." },
    { id: "dcTransitRail",      name: "DC — Rail Stations (MARC/VRE/Amtrak)", category: "infrastructure", icon: <Navigation className="w-3 h-3" />, enabled: true,  opacity: 0.85, color: "#eab308", description: "MARC, VRE, Amtrak Union Station + regional." },
    { id: "dcAirports",         name: "DC — Airports",                     category: "infrastructure", icon: <Navigation className="w-3 h-3" />, enabled: true,  opacity: 0.9,  color: "#8b5cf6", description: "Reagan National, Dulles, BWI, Joint Base Andrews." },
    { id: "dcGovtEmbassy",      name: "DC — Government / Embassy / IC",    category: "infrastructure", icon: <Shield className="w-3 h-3" />,     enabled: true,  opacity: 0.8,  color: "#14b8a6", description: "Embassies, WH/Capitol, departments, courthouses, IC buildings (CIA, NGA, NSA etc.)." },
    // dcInat removed — see nycInat comment above. Baked DC iNat observations
    // load into the same fungalObservations state as the live stream.
    { id: "satImagery", name: "Satellite Imagery (HD)", category: "environment", icon: <Satellite className="w-3 h-3" />, enabled: true, opacity: 1.0, color: "#1e40af", description: "ESRI World Imagery — Google-Earth-level detail to zoom 19, free, no key" },
    { id: "mapboxSatelliteStreets", name: "Mapbox Satellite Streets (HD hybrid)", category: "environment", icon: <Satellite className="w-3 h-3" />, enabled: false, opacity: 0.95, color: "#0ea5e9", description: "Mapbox satellite-streets-v12 hybrid — high-res aerial + road labels in one tileset, sharper than ESRI (requires NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN). OFF by default: alternate basemap — competes with ESRI Satellite Imagery if both on. Pick one. Routes through MINDEX tile cache when available." },
    { id: "mapbox3dBuildings", name: "3D Buildings (Mapbox extrusions)", category: "infrastructure", icon: <Building2 className="w-3 h-3" />, enabled: false, opacity: 0.85, color: "#64748b", description: "Mapbox Composite building extrusions at zoom ≥ 14 — real building heights + footprints globally. Feeds MYCA device-placement shadow/LOS logic. OFF by default — vector-tile extrusion is GPU-heavy at z14+. Toggle on for MYCA device placement / urban analysis." },
    { id: "photorealistic3D", name: "Photorealistic 3D (Google / Cesium)", category: "environment", icon: <Building2 className="w-3 h-3" />, enabled: false, opacity: 1.0, color: "#f59e0b", description: "Photorealistic 3D city meshes via Google Map Tiles API (worldwide photogrammetry, same as Google Earth) with Cesium Ion fallback. Requires NEXT_PUBLIC_GOOGLE_MAP_TILES_API_KEY or NEXT_PUBLIC_CESIUM_ION_TOKEN. Best viewed with MapLibre globe projection at zoom ≥ 14. OFF by default — the Cesium Ion loader pulls GBs of 3D mesh data; enable explicitly at high zoom over a city." },
    { id: "realisticClouds", name: "Realistic Clouds (Earth-2 + Satellite)", category: "environment", icon: <Cloud className="w-3 h-3" />, enabled: false, opacity: 0.7, color: "#e2e8f0", description: "NASA GIBS MODIS satellite cloud texture + RainViewer radar composite + sun-angle shadow projection from /api/eagle/weather/multi. 3D volumetric path mounts in <ThreeDGlobeView> (next iter). Altitude on 3D, density on both. OFF by default (Morgan: too much on load) — stacked raster layers + 5-min weather poll add up. Toggle on when you want cloud cover in the view." },
    { id: "sunEarthImpact", name: "Sun→Earth Impact", category: "events", icon: <Sparkles className="w-3 h-3" />, enabled: false, opacity: 0.8, color: "#fbbf24", description: "Live solar flares, CME arrival, aurora ovals, sunspot→earthspot projection. Correlation lines to tropical cyclones (hypothesis overlay). OFF by default (Morgan: too much on load) — polls DONKI + NOAA SWPC + aurora oval APIs on mount. Toggle on when space-weather view is the focus." },

    // ═══════════════════════════════════════════════════════════════
    // MYCOSOFT PROJECTS — dedicated category (Apr 21, 2026)
    // Morgan: "both need to be there in their own area on the filters
    // as Project filters" + "massive increase in data icons showing
    // cameras, am, fm, cell, power, live naturedata, rails, caves,
    // places related to goverment, tourism and any sensors or other
    // devices with live environmental data with heatmaps and overlays
    // of that data specifically for those projects".
    // ═══════════════════════════════════════════════════════════════

    // ── PROJECT OYSTER (MYCODAO + MYCOSOFT) — Tijuana Estuary / Imperial Beach / south SD ──
    { id: "tijuanaEstuary",          name: "Project Oyster — Master toggle (Tijuana Estuary)", category: "projects", icon: <Waves className="w-3 h-3" />, enabled: true, opacity: 1.0, color: "#14b8a6", description: "Project Oyster (MYCODAO + MYCOSOFT) — federated pollution + environmental data layer for the Tijuana River Valley, Imperial Beach + south San Diego. Master switch for all Oyster sub-layers. ON by default (Apr 21 2026 — Morgan: all project filters on from load)." },
    { id: "projectOysterPerimeter",  name: "Oyster — Perimeter polygon",                       category: "projects", icon: <Sparkles className="w-3 h-3" />, enabled: true,  opacity: 1.0, color: "#5eead4", description: "Operational zone polygon over the TJ Estuary + south Imperial Beach + slough. Teal dashed border, subtle fill." },
    { id: "projectOysterSites",      name: "Oyster — Restoration sites",                       category: "projects", icon: <Waves className="w-3 h-3" />, enabled: true,  opacity: 1.0, color: "#14b8a6", description: "MYCODAO oyster reef deployment + monitoring sites for biofiltration of TJ River outflow. Source: mycodao.com/projects/project-oyster." },
    { id: "h2sHotspot",              name: "Oyster — H₂S hotspot (SDAPCD)",                    category: "projects", icon: <Cloud className="w-3 h-3" />,  enabled: true,  opacity: 1.0, color: "#dc2626", description: "Hydrogen-sulfide air-quality heatmap from 5 SDAPCD monitor stations along the TJ border. PowerBI dashboard linked from the marker." },
    { id: "tjRiverFlow",             name: "Oyster — TJ River + IBWC discharge",               category: "projects", icon: <Waves className="w-3 h-3" />, enabled: true,  opacity: 1.0, color: "#f59e0b", description: "Tijuana River course from Tecate to Pacific outflow + IBWC station 11013300 discharge data (12 mo bundled + live latest)." },
    { id: "tjBeachClosures",         name: "Oyster — Beach closures (SD DEH)",                  category: "projects", icon: <AlertTriangle className="w-3 h-3" />, enabled: true,  opacity: 1.0, color: "#dc2626", description: "Imperial Beach (closed > 1000 days), Coronado intermittent, TJ Slough chronic." },
    { id: "tjNavyTraining",          name: "Oyster — Navy training waters",                    category: "projects", icon: <AlertTriangle className="w-3 h-3" />, enabled: true,  opacity: 1.0, color: "#fbbf24", description: "NSWC Coronado, Silver Strand SEAL training swims, NAB Coronado — exposure to TJ River sewage plume per Aug 2025 Navy Times reporting." },
    { id: "tjEstuaryMonitors",       name: "Oyster — NERR research monitors",                  category: "projects", icon: <Sparkles className="w-3 h-3" />, enabled: true,  opacity: 1.0, color: "#22d3ee", description: "Tijuana River National Estuarine Research Reserve facility + research monitors." },
    // NEW (Apr 21, 2026 v2 expansion for Oyster):
    { id: "oysterCameras",    name: "Oyster — Cameras",            category: "projects", icon: <Sparkles className="w-3 h-3" />, enabled: true, opacity: 1.0, color: "#67e8f9", description: "Surf cams + CBP POE + Caltrans I-5/SR-75 CCTV + NOAA buoy cams + EarthCam Imperial Beach + Coronado skyline cams." },
    { id: "oysterBroadcast",  name: "Oyster — AM/FM/TV broadcast",  category: "projects", icon: <Radio className="w-3 h-3" />,   enabled: true, opacity: 1.0, color: "#8b5cf6", description: "FCC-licensed AM/FM/TV stations covering SD/TJ cross-border corridor." },
    { id: "oysterCell",       name: "Oyster — Cell towers",         category: "projects", icon: <Wifi className="w-3 h-3" />,    enabled: true, opacity: 1.0, color: "#a855f7", description: "Curated cell sites across Imperial Beach, Coronado, Tijuana cross-border overlap." },
    { id: "oysterPower",      name: "Oyster — Power infrastructure",category: "projects", icon: <Zap className="w-3 h-3" />,     enabled: true, opacity: 1.0, color: "#fbbf24", description: "SDG&E substations, Otay Mesa Generating, South Bay Power Plant, San Onofre (decommissioned), PG&E tie-ins." },
    { id: "oysterNature",     name: "Oyster — Live iNat observations",category:"projects", icon: <TreePine className="w-3 h-3" />, enabled: true, opacity: 1.0, color: "#22c55e", description: "Recent iNaturalist observations (~200 per fetch) in TJ Estuary + Imperial Beach + Silver Strand bbox + La Jolla tide pools." },
    { id: "oysterPlume",      name: "Oyster — UCSD PFM plume tracker", category: "projects", icon: <Waves className="w-3 h-3" />,    enabled: true, opacity: 1.0, color: "#dc2626", description: "Pacific Forecast Model sewage plume tracker (SCCOOS / Scripps UCSD). Live fecal-indicator-bacteria (FIB) + ocean current modeling for IB / Silver Strand / Coronado." },
    { id: "oysterEmit",       name: "Oyster — NASA EMIT methane plumes", category: "projects", icon: <Satellite className="w-3 h-3" />, enabled: true, opacity: 1.0, color: "#f97316", description: "NASA EMIT instrument (ISS) methane + CO2 + mineral dust plume detections over SD-TJ corridor." },
    { id: "oysterCrossBorder",name: "Oyster — Scripps cross-border",    category: "projects", icon: <AlertTriangle className="w-3 h-3" />, enabled: true, opacity: 1.0, color: "#ef4444", description: "Scripps cross-border pollution monitoring network — water quality, aerosol, H2S, volatile organics at IB + border wall." },
    { id: "oysterRails",      name: "Oyster — Rails + Trolley",     category: "projects", icon: <Navigation className="w-3 h-3" />, enabled: true, opacity: 1.0, color: "#a1a1aa", description: "SD Metropolitan Transit Blue Line trolley (San Ysidro → Downtown), BNSF freight, Coaster, Sprinter." },
    { id: "oysterCaves",      name: "Oyster — Sea caves + coastal",  category: "projects", icon: <Mountain className="w-3 h-3" />, enabled: true, opacity: 1.0, color: "#78350f", description: "Sunset Cliffs sea caves, La Jolla sea caves, Point Loma grottos — coastal formations in the Oyster bbox." },
    { id: "oysterGovernment", name: "Oyster — Government facilities",category: "projects", icon: <Shield className="w-3 h-3" />, enabled: true, opacity: 1.0, color: "#7dd3fc", description: "CBP San Ysidro POE, Navy bases (NAS North Island, NAB Coronado, NSWC), NOAA SWFSC, EPA Region 9, USCG Sector SD." },
    { id: "oysterTourism",    name: "Oyster — Tourism + landmarks",  category: "projects", icon: <Sparkles className="w-3 h-3" />, enabled: true, opacity: 1.0, color: "#f9a8d4", description: "Hotel del Coronado, Imperial Beach Pier, Border Field State Park, Balboa Park, USS Midway, Cabrillo Nat'l Monument." },
    { id: "oysterSensors",    name: "Oyster — Environmental sensors",category: "projects", icon: <Gauge className="w-3 h-3" />,   enabled: true, opacity: 1.0, color: "#06b6d4", description: "EPA AQS air quality, NOAA tide gauges, USGS stream gauges, SDAPCD monitors, SCRIPPS Pier, UCSD Ellen Browning Scripps Pier, TJ NERR sondes." },
    { id: "oysterHeatmap",    name: "Oyster — Pollution heatmap",    category: "projects", icon: <Cloud className="w-3 h-3" />,   enabled: true, opacity: 0.55, color: "#ef4444", description: "Combined pollution intensity heatmap — H₂S + PM2.5 + sewage concentration + beach bacteria indices." },

    // ── PROJECT GOFFS (MYCOSOFT) — Mojave National Preserve + east Mojave ──
    // Apr 21, 2026 (Morgan: "why is there no data at goffs ca ... massive
    // increase in data icons"). Goffs is a Mycosoft biz-dev vertical
    // thesis site. Garret completed the 16/16 item thesis Apr 18.
    { id: "mojavePreserve",   name: "Goffs — Mojave Preserve boundary",     category: "projects", icon: <Sparkles className="w-3 h-3" />, enabled: true, opacity: 1.0, color: "#facc15", description: "NPS Mojave National Preserve (MOJA) unit boundary. Dashed amber outline + ~20% fill. Live NPS Land Resources Division service." },
    { id: "mojaveGoffs",      name: "Goffs — MYCOSOFT project site",        category: "projects", icon: <Sparkles className="w-3 h-3" />, enabled: true, opacity: 1.0, color: "#22d3ee", description: "MYCOSOFT biz-dev vertical thesis site (Garret, completed Apr 18 2026). Pulsing teal halo + cyan core marker." },
    { id: "mojaveWilderness", name: "Goffs — Wilderness POIs",               category: "projects", icon: <Sparkles className="w-3 h-3" />, enabled: true, opacity: 1.0, color: "#fbbf24", description: "Cima Dome / Kelso Dunes / Mitchell Caverns / Cinder Cones / Hole-in-the-Wall / New York Mts / Castle Peaks / Granite Mts UC Reserve." },
    { id: "mojaveClimate",    name: "Goffs — Climate stations",              category: "projects", icon: <Thermometer className="w-3 h-3" />, enabled: true, opacity: 1.0, color: "#06b6d4", description: "KEED (Needles) + KDAG (Barstow-Daggett) + KIFP (Bullhead) airport ASOS — live temp/humidity/wind from api.weather.gov. Plus Mitchell Caverns + Kelso Depot + Clark Mountain RAWS/COOP stations." },
    { id: "mojaveINat",       name: "Goffs — Live iNat observations",        category: "projects", icon: <TreePine className="w-3 h-3" />,   enabled: false, opacity: 1.0, color: "#22c55e", description: "Recent iNaturalist observations in a bbox around Goffs — desert tortoise, Joshua tree, creosote, desert bighorn, golden eagle, Mojave yucca, Mojave green rattlesnake. OFF by default (~200 obs per fetch)." },
    // NEW (Apr 21, 2026 v2 expansion for Goffs):
    { id: "mojaveCameras",    name: "Goffs — Cameras",                       category: "projects", icon: <Sparkles className="w-3 h-3" />, enabled: true, opacity: 1.0, color: "#67e8f9", description: "HPWREN wildfire cams (Clark Mtn, Cima) + ALERTWildfire + Caltrans I-40 CCTV + NPS Kelso Depot + Windy skyline cams." },
    { id: "mojaveBroadcast",  name: "Goffs — AM/FM broadcast",                category: "projects", icon: <Radio className="w-3 h-3" />,    enabled: false, opacity: 1.0, color: "#8b5cf6", description: "FCC-licensed AM/FM stations covering east Mojave + Colorado River Valley (Needles, Bullhead, Vegas fringe)." },
    { id: "mojaveCell",       name: "Goffs — Cell towers",                    category: "projects", icon: <Wifi className="w-3 h-3" />,     enabled: false, opacity: 1.0, color: "#a855f7", description: "Curated FCC ASR + OpenCelliD towers in east Mojave (Verizon, AT&T, T-Mobile, FirstNet)." },
    { id: "mojavePower",      name: "Goffs — Power infrastructure",           category: "projects", icon: <Zap className="w-3 h-3" />,      enabled: true, opacity: 1.0, color: "#fbbf24", description: "Ivanpah Solar (392 MW CSP), Mohave Generating (retired), LUGO/Eldorado/Kramer/Mead substations, LADWP Intermountain HVDC corridor." },
    { id: "mojaveRails",      name: "Goffs — Rails",                          category: "projects", icon: <Navigation className="w-3 h-3" />, enabled: true, opacity: 1.0, color: "#a1a1aa", description: "BNSF Cajon Sub + UP Caliente Sub + Goffs Depot (1902 Santa Fe) + Kelso Depot (1924 UP) + Amtrak Southwest Chief @ Needles." },
    { id: "mojaveCaves",      name: "Goffs — Caves + lava tubes",             category: "projects", icon: <Mountain className="w-3 h-3" />, enabled: true, opacity: 1.0, color: "#78350f", description: "Mitchell Caverns (El Pakiva + Tecopa), Crystal Cave, Amboy Crater lava tubes, Cinder Cone volcanic shafts, Kelbaker lava tube." },
    { id: "mojaveGovernment", name: "Goffs — Government facilities",          category: "projects", icon: <Shield className="w-3 h-3" />,   enabled: true, opacity: 1.0, color: "#7dd3fc", description: "NPS MOJA HQ, BLM Needles, CBP, Fort Irwin NTC, Edwards AFB, USGS stream gauges, FAA Needles TRACON, DoD Ivanpah Aux Field." },
    { id: "mojaveTourism",    name: "Goffs — Tourism + landmarks",            category: "projects", icon: <Sparkles className="w-3 h-3" />, enabled: true, opacity: 1.0, color: "#f9a8d4", description: "Goffs Schoolhouse (1914), Kelso Depot, Amboy Crater, Roy's Motel/Cafe, Bagdad Cafe, Tecopa Hot Springs, Primm/Laughlin, Route 66 Museum, Kelbaker/Mojave Road scenic drives." },
    { id: "mojaveSensors",    name: "Goffs — Environmental sensors",          category: "projects", icon: <Gauge className="w-3 h-3" />,    enabled: true, opacity: 1.0, color: "#06b6d4", description: "EPA AQS air monitors, USGS Colorado River gauges, RAWS fire-weather, tortoise telemetry, SNOTEL snow-water, seismic, light-pollution (Bortle Class 2 dark sky), NSRDB solar radiation." },
    { id: "mojaveHeatmap",    name: "Goffs — Environmental heatmaps",          category: "projects", icon: <Flame className="w-3 h-3" />,    enabled: true, opacity: 0.55, color: "#ef4444", description: "Fire-risk + biodiversity-density + aridity-index heatmaps across the east Mojave." },
  ]);
  
  // Event filter removed - groundFilter + spaceWeatherFilter drive event visibility
  
  // Earth-2 AI Weather state — ALL OFF by default. The clouds +
  // precipitation layers paint full-globe 0.25° rasters on every frame
  // (≈1M cells × 2 layers = dashboard-wide lag). Operator opts each layer
  // on from the Data Filters panel when they want it.
  const [earth2Filter, setEarth2Filter] = useState<Earth2Filter>({
    ...DEFAULT_EARTH2_FILTER,
    showTemperature: false,
    showWind: false,
    showPressure: false,
    showHumidity: false,
    showClouds: false,
    showPrecipitation: false,
    showSporeDispersal: false,
    showStormCells: false,
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
      // Check status every 60 seconds — skip when document.hidden (perf-3).
      const interval = setInterval(() => {
        if (typeof document !== "undefined" && document.hidden) return
        checkEarth2Status()
      }, 60000)
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
        // Apr 21, 2026 (Morgan OOM audit): circuit-break after 3 consecutive
        // failures. Was retrying every fetch cycle forever → spam.
        const mbKey = "__crep_mycobrain_fails";
        const failCount = (window as any)[mbKey] ?? 0;
        if (failCount >= 3) {
          // Skip silently — endpoint is dead, don't burn retries
        } else try {
          const devicesRes = await fetch("/api/mycobrain", { signal: AbortSignal.timeout(8000) });
          if (devicesRes.ok) {
            (window as any)[mbKey] = 0; // reset on success
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
          } else {
            (window as any)[mbKey] = failCount + 1;
          }
        } catch (e) {
          (window as any)[mbKey] = failCount + 1;
          if (failCount === 0 || failCount + 1 >= 3) {
            console.warn(`[CREP] MycoBrain fetch failed (${failCount + 1}/3):`, (e as Error)?.message);
            if (failCount + 1 >= 3) console.warn(`[CREP] MycoBrain circuit-broken — giving up.`);
          }
        }

        // ═══════════════════════════════════════════════════════════════
        // PARALLEL FETCH — Aircraft, Vessels, Satellites, Space Weather
        // All fetched simultaneously so one slow source doesn't block others.
        // Each has independent error handling — one failure never kills the rest.
        // NO AbortSignal.timeout here — it was aborting in-flight StrictMode
        // second-mount fetches and silently wiping state. If a fetch is slow
        // we'd rather have the data late than lose it entirely.
        // ═══════════════════════════════════════════════════════════════
        const fetchWithTimeout = (url: string) => fetch(url);

        const [aircraftResult, vesselResult, satelliteResult, spaceWxResult] = await Promise.allSettled([
          // Aircraft (all sources via registry)
          fetchWithTimeout("/api/oei/flightradar24").then(async (res) => {
            if (!res.ok) return null;
            const data = await res.json();
            if (data.aircraft && Array.isArray(data.aircraft) && data.aircraft.length > 0) {
              // Apr 22, 2026 — merge into persistent union instead of replacing
              // (prior behaviour dropped 100s of planes on every short fetch).
              setAircraft((prev) => mergeById(prev, data.aircraft, {
                idKey: (a: any) => a.icao24 || a.icao || a.id,
                ttlMs: ENTITY_TTL_MS.aircraft,
                maxEntries: 3_000,
              }));
              console.log(`[CREP] Aircraft: ${data.aircraft.length} loaded from ${data.source || "registry"} → merged`);
              syncToMINDEX("aircraft", data.aircraft);
            }
            return data;
          }),
          // Vessels (all sources via registry)
          fetchWithTimeout("/api/oei/aisstream").then(async (res) => {
            if (!res.ok) return null;
            const data = await res.json();
            if (data.vessels && Array.isArray(data.vessels) && data.vessels.length > 0) {
              setVessels((prev) => mergeById(prev, data.vessels, {
                idKey: (v: any) => v.mmsi || v.id,
                ttlMs: ENTITY_TTL_MS.vessel,
                maxEntries: 20_000, // Apr 22, 2026 v3 LOD pool depth
              }));
              console.log(`[CREP] Vessels: ${data.vessels.length} loaded from ${data.source || "aisstream"} → merged`);
              syncToMINDEX("vessels", data.vessels);
            }
            return data;
          }),
          // Satellites (all sources via registry)
          fetchWithTimeout("/api/oei/satellites?category=active&mode=registry").then(async (res) => {
            if (!res.ok) return null;
            initialSatelliteLoadDoneRef.current = true;
            const data = await res.json();
            if (data.satellites && Array.isArray(data.satellites) && data.satellites.length > 0) {
              setSatellites((prev) => mergeById(prev, data.satellites, {
                idKey: (s: any) => s.noradId || s.norad_id || s.id,
                ttlMs: ENTITY_TTL_MS.satellite,
                maxEntries: 2_500,
              }));
              console.log(`[CREP] Satellites: ${data.satellites.length} loaded from ${data.source || "registry"} → merged`);
              syncToMINDEX("satellites", data.satellites as unknown as Record<string, unknown>[]);
            }
            return data;
          }),
          // Space weather
          fetchWithTimeout("/api/oei/space-weather").then(async (res) => {
            if (!res.ok) return null;
            const data = await res.json();
            if (data.scales) {
              setNoaaScales({
                radio: data.scales.radio?.current ?? 0,
                solar: data.scales.solar?.current ?? 0,
                geomag: data.scales.geomagnetic?.current ?? 0,
              });
            }
            return data;
          }),
        ]);

        // Log any failures (non-blocking)
        if (aircraftResult.status === "rejected") console.warn("[CREP] Aircraft fetch failed:", aircraftResult.reason);
        if (vesselResult.status === "rejected") console.warn("[CREP] Vessel fetch failed:", vesselResult.reason);
        if (satelliteResult.status === "rejected") console.warn("[CREP] Satellite fetch failed:", satelliteResult.reason);

        // Space weather already handled in the parallel fetch above
        if (spaceWxResult.status === "rejected") console.warn("[CREP] Space weather failed:", spaceWxResult.reason);

        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        // FETCH FUNGAL OBSERVATIONS - PRIMARY DATA SOURCE (MINDEX - NO LIMIT)
        // MINDEX contains THOUSANDS of pre-imported iNaturalist/GBIF observations
        // with photos, coordinates, names, timestamps, and source links
        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        // FUNGAL: Viewport-based fetching happens in the bounds effect below.
        // Pre-load: seed the species catalog from MINDEX, fall back to search API.
        try {
          const proxyRes = await fetch("/api/mindex/proxy/species?limit=500");
          const proxyData = proxyRes.ok ? await proxyRes.json() : null;
          const proxyEntities = proxyData?.entities || proxyData?.results || proxyData?.data || [];
          if (proxyEntities.length === 0) {
            // Fallback: try species search API for initial catalog data
            const searchRes = await fetch("/api/crep/species/search?q=fungi&limit=100");
            if (searchRes.ok) {
              const searchData = await searchRes.json();
              console.log(`[CREP] Species pre-load fallback: ${searchData.results?.length || 0} species from ${searchData.source || "search"}`);
            }
          } else {
            console.log(`[CREP] Species pre-load: ${proxyEntities.length} species from MINDEX proxy`);
          }
        } catch {
          // Non-critical: species pre-load is supplementary to viewport fetching
        }
      } catch (error) {
        console.warn("Failed to fetch CREP data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
    // Refresh every 60s to reduce cold-path and polling load (was 15s).
    // Apr 20, 2026 perf: skip when document.hidden so backgrounded tabs
    // stop triggering the multi-API fan-out.
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return
      fetchData()
    }, 60000)
    return () => clearInterval(interval)
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
    // Refresh every 5 minutes (buoy data updates every 5-10 min at NDBC).
    // Apr 20, 2026 perf: visibility-throttle.
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return
      fetchBuoys()
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // MILITARY BASES FETCH — OSM + MINDEX military installations (every 5 minutes)
  // Fetches military bases, airfields, ranges, barracks, training areas globally
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const fetchMilitary = async () => {
      try {
        const res = await fetch("/api/oei/military");
        if (res.ok) {
          const data = await res.json();
          if (data.facilities && Array.isArray(data.facilities)) {
            console.log(`[CREP] Military: ${data.facilities.length} facilities loaded from ${data.source || "overpass"}`);
            setMilitaryBases(data.facilities);
          }
        }
      } catch (e) {
        console.warn("[CREP] Military: Failed to fetch military data:", e);
      }
    };

    fetchMilitary();
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return
      fetchMilitary()
    }, 5 * 60 * 1000)
    return () => clearInterval(interval);
  }, []);

  // Infrastructure data fetched via map onLoad + moveend handler above (not useEffect)
  // This avoids React strict mode double-render abort issues with AbortController

  // ═══════════════════════════════════════════════════════════════════════════
  // INSTANT NATURE-DATA PAINT — fires on mount, BEFORE the map is ready.
  // Hits MINDEX directly (no bounds, no iNat/GBIF) via `?quick=true` and gets
  // 2K observations in ~300-800ms. The viewport-based fetch below still runs
  // once the map is ready and refines the set. This eliminates the 3-minute
  // wait users saw before ANY species dots appeared.
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/crep/fungal?quick=true&limit=2000", {
          signal: ctrl.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        const raw = (data.observations && Array.isArray(data.observations)) ? data.observations : [];
        if (raw.length === 0) return;
        const store = fungalStoreRef.current;
        for (const o of raw) {
          const id = String((o as any).id ?? (o as any).externalId ?? "");
          if (!id) continue;
          const lat = Number((o as any).latitude ?? (o as any).lat ?? 0);
          const lng = Number((o as any).longitude ?? (o as any).lng ?? 0);
          if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) continue;
          store.set(id, {
            id,
            observed_on: (o as any).timestamp || (o as any).observed_on || "",
            latitude: lat,
            longitude: lng,
            species: (o as any).commonName || (o as any).species || (o as any).scientificName || "Unknown",
            taxon_id: Number((o as any).taxon_id ?? 0),
            taxon: {
              id: Number((o as any).taxon_id ?? 0),
              name: (o as any).scientificName || (o as any).species || "Unknown",
              preferred_common_name: (o as any).commonName || (o as any).species,
              rank: "species",
            },
            photos: ((o as any).imageUrl || (o as any).thumbnailUrl) ? [{ id: 1, url: String((o as any).imageUrl || (o as any).thumbnailUrl), license: "CC-BY-NC" }] : [],
            quality_grade: (o as any).verified ? "research" : "needs_id",
            user: (o as any).observer,
            source: (o as any).source,
            location: (o as any).location,
            kingdom: (o as any).kingdom || (o as any).iconicTaxon || "Fungi",
            iconicTaxon: (o as any).iconicTaxon || (o as any).kingdom || "Fungi",
          } as FungalObservation);
        }
        setFungalObservations(Array.from(store.values()));
        console.log(`[CREP] ⚡ Instant MINDEX paint: ${raw.length} observations in ${data.meta?.total ?? raw.length}ms`);
      } catch (e) {
        if ((e as Error).name !== "AbortError") console.warn("[CREP] Instant MINDEX paint failed:", e);
      }
    })();
    return () => ctrl.abort();
  }, []); // mount only

  // ═══════════════════════════════════════════════════════════════════════════
  // BAKED HISTORICAL iNAT — Apr 23, 2026
  //
  // Morgan: "naturedata from inat goes into mindex we just need more historical
  // data in those cities for obvious reasons you did that wrong" — previously
  // we rendered the baked 10k-per-region files as a separate MapLibre circle
  // layer (crep-nyc-inat / crep-dc-inat) with different styling, paint, and
  // click-widget wiring than the live SSE observations. That was backwards.
  // Historical + live iNat are the SAME data type from the SAME source — they
  // should use the SAME FungalMarker + species popup. Source and time are
  // irrelevant; relevance is what matters.
  //
  // Fix: load the baked city geojsons once at mount, reshape each feature to
  // a FungalObservation, merge into the shared fungalStoreRef via setData().
  // The existing visibleFungalObservations pipeline does viewport cull +
  // kingdom filter + species filter. FungalMarker renders them identically
  // to live-stream observations. Click → species popup. Done.
  //
  // More cities can be added to BAKED_REGIONS without any rendering changes.
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const BAKED_REGIONS = ["nyc", "dc"] as const;
    let cancelled = false;
    (async () => {
      for (const region of BAKED_REGIONS) {
        if (cancelled) return;
        try {
          const res = await fetch(`/data/crep/${region}-inat.geojson`, { cache: "force-cache" });
          if (!res.ok) { console.log(`[CREP/iNat-baked] ${region} missing`); continue; }
          const gj = await res.json();
          const features: any[] = Array.isArray(gj?.features) ? gj.features : [];
          if (!features.length) continue;
          const store = fungalStoreRef.current;
          let added = 0;
          for (const f of features) {
            const p = f?.properties || {};
            const coords = f?.geometry?.coordinates;
            const lat = Number(coords?.[1] ?? p.latitude ?? p.lat);
            const lng = Number(coords?.[0] ?? p.longitude ?? p.lng);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
            if (lat === 0 && lng === 0) continue;
            const rawId = p.id ?? p.inat_id;
            const id = String(rawId != null ? rawId : "");
            if (!id) continue;
            // Don't clobber a live-stream entry that already exists with
            // richer / fresher data — only fill gaps with baked history.
            if (store.has(id)) continue;
            // Snake_case (baked) OR camelCase (live) — accept both.
            const commonName = p.commonName || p.common_name || p.name || p.species;
            const sciName = p.scientificName || p.sci_name || p.scientific_name || p.name || "Unknown";
            const photoUrl = Array.isArray(p.photos)
              ? (typeof p.photos[0] === "string" ? p.photos[0] : p.photos[0]?.url)
              : (p.photo || p.photoUrl);
            const kingdom = p.kingdom || p.iconic_taxon || p.iconicTaxon || "Fungi";
            store.set(id, {
              id,
              observed_on: p.observed_on || p.timestamp || "",
              latitude: lat,
              longitude: lng,
              species: commonName || sciName,
              taxon_id: Number(p.taxon_id ?? p.taxonId) || 0,
              taxon: {
                id: Number(p.taxon_id ?? p.taxonId) || 0,
                name: sciName,
                preferred_common_name: commonName,
                rank: p.rank || "species",
              },
              photos: photoUrl ? [{ id: 1, url: String(photoUrl), license: "CC-BY-NC" }] : [],
              quality_grade: p.quality_grade || p.qualityGrade || p.grade || "research",
              user: p.observer || p.user,
              source: p.source || "iNaturalist",
              sourceUrl: p.sourceUrl || p.source_url || p.url,
              location: p.placeGuess || p.place_guess || p.location,
              kingdom,
              iconicTaxon: p.iconicTaxon || p.iconic_taxon || kingdom,
            } as FungalObservation);
            added++;
          }
          if (!cancelled) setFungalObservations(Array.from(store.values()));
          console.log(`[CREP/iNat-baked] ${region}: +${added} historical observations → merged into fungalObservations (total now ${store.size})`);
        } catch (e) {
          if (!cancelled) console.warn(`[CREP/iNat-baked] ${region} failed:`, (e as Error)?.message);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []); // mount only

  // ═══════════════════════════════════════════════════════════════════════════
  // LIVE NATURE STREAM (SSE) — dots pop onto the map as iNat publishes them
  // Backend (/api/crep/nature-stream) polls iNat every 60s for new observations
  // and pushes each as a "nature" event. Simultaneously writes to MINDEX so
  // the CREP-live stream and MINDEX persistence happen at the same moment.
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    // Apr 21, 2026 (Morgan: "do that" for faster nature loads). Initial
    // backfill from MINDEX preloaded cache covering both project bboxes
    // so the globe paints iNat dots immediately instead of waiting for
    // the first SSE tick (up to 60 s). The SSE still handles deltas
    // as new observations arrive; preload is just the first paint.
    const seedFromPreload = async () => {
      for (const project of ["oyster", "goffs"] as const) {
        try {
          const r = await fetch(`/api/crep/nature/preloaded?project=${project}&limit=200`, { signal: AbortSignal.timeout(4000) });
          if (!r.ok) continue;
          const j = await r.json();
          if (!j?.cache_warm || !Array.isArray(j?.observations)) continue;
          const store = fungalStoreRef.current;
          for (const o of j.observations) {
            if (!o?.id || !Number.isFinite(o.lat) || !Number.isFinite(o.lng)) continue;
            if (store.has(o.id)) continue;
            store.set(o.id, {
              id: o.id,
              observed_on: o.observed_on || new Date().toISOString(),
              latitude: o.lat,
              longitude: o.lng,
              species: o.name || o.sci_name || "Unknown",
              taxon_id: 0,
              taxon: { id: 0, name: o.sci_name || o.name || "Unknown", preferred_common_name: o.name, rank: "species" },
              photos: o.photo ? [{ id: 1, url: o.photo, license: "CC-BY-NC" }] : [],
              quality_grade: o.quality_grade || "research",
              user: o.observer,
              source: "mindex-preload",
              iconicTaxon: o.iconic_taxon || "Unknown",
              kingdom: o.iconic_taxon || "Unknown",
            } as unknown as FungalObservation);
          }
          console.log(`[CREP/NatureStream] preload seed ${project}: ${j.observations.length} observations (cache_warm=${j.cache_warm})`);
          setFungalObservations(Array.from(store.values()));
        } catch (e) {
          // Preload unreachable → fine, SSE will fill in. No log spam.
        }
      }
    };
    void seedFromPreload();

    const connect = () => {
      if (stopped) return;
      try {
        es = new EventSource("/api/crep/nature-stream");
        es.addEventListener("hello", (e: MessageEvent) => {
          try {
            const payload = JSON.parse(e.data);
            console.log("[CREP/NatureStream] connected:", payload);
          } catch {}
        });
        es.addEventListener("nature", (e: MessageEvent) => {
          try {
            const o = JSON.parse(e.data) as {
              id: string; source: string; species: string; scientificName: string;
              commonName?: string; lat: number; lng: number; timestamp: string;
              iconicTaxon?: string; kingdom?: string; photos?: string[];
              sourceUrl?: string; observer?: string; placeGuess?: string;
            };
            if (!o?.id || !Number.isFinite(o.lat) || !Number.isFinite(o.lng)) return;
            const store = fungalStoreRef.current;
            store.set(o.id, {
              id: o.id,
              observed_on: o.timestamp || new Date().toISOString(),
              latitude: o.lat,
              longitude: o.lng,
              species: o.commonName || o.species || o.scientificName || "Unknown",
              taxon_id: 0,
              taxon: {
                id: 0,
                name: o.scientificName || o.species || "Unknown",
                preferred_common_name: o.commonName || o.species,
                rank: "species",
              },
              photos: (o.photos?.[0]) ? [{ id: 1, url: o.photos[0], license: "CC-BY-NC" }] : [],
              quality_grade: "needs_id",
              user: o.observer,
              source: o.source,
              location: o.placeGuess,
              kingdom: o.kingdom || o.iconicTaxon || "Unknown",
              iconicTaxon: o.iconicTaxon || o.kingdom || "Unknown",
            } as unknown as FungalObservation);
            setFungalObservations(Array.from(store.values()));
          } catch (err) {
            // malformed event; ignore
          }
        });
        es.onerror = () => {
          // Server disconnected us or the maxDuration expired (5 min). Reconnect.
          if (es) { try { es.close(); } catch {} }
          es = null;
          if (!stopped) {
            reconnectTimer = setTimeout(connect, 5_000);
          }
        };
      } catch (e) {
        console.warn("[CREP/NatureStream] connect failed; will retry in 10s:", e);
        reconnectTimer = setTimeout(connect, 10_000);
      }
    };

    connect();

    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (es) { try { es.close(); } catch {} }
    };
  }, []); // mount only

  // Bounds-based fungal refetch – when map loads or user pans/zooms, fetch observations for viewport only (iNaturalist-style)
  // LOD: Pass zoom-derived limit to API for faster loads – fewer observations when zoomed out (Mar 11, 2026)
  useEffect(() => {
    if (!mapBounds) return;
    const { north, south, east, west } = mapBounds;
    if (![north, south, east, west].every(Number.isFinite) || north <= south) return;

    // Apr 19, 2026 (Morgan: "massive 3005+m observations of nature are
    // not shown on level of detail zoom as there should be so much data
    // records when i zoom into imperial beach chula vista camp pendleton
    // coronado point loma"). Previous `undefined` at zoom 5+ fell through
    // to server default of 2000 observations. Dense urban/coastal bboxes
    // (San Diego, Bay Area, NYC, Tokyo) need 10-20k to saturate. Now
    // explicitly request 20k at zoom 5+ so the server's pagination loop
    // (fetchINaturalistObservations page 1-10 × 10 iconic taxa = 20k
    // ceiling) kicks in and we actually see the observations that exist.
    const zoomLimit = mapZoom < 2 ? 2000
      : mapZoom < 3 ? 5000
      : mapZoom < 4 ? 10000
      : mapZoom < 5 ? 15000
      : mapZoom < 7 ? 20000
      : 30000; // city-level zoom ≥ 7 — ask for up to 30k, server caps at what iNat returns

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
        // Persist new observations to MINDEX (fire-and-forget)
        if (formatted.length > 0) {
          import('@/lib/crep/species-catalog').then(m => m.ingestBatchToMINDEX(formatted)).catch(() => {});
        }
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
    // Apr 20, 2026 perf-3: skip when document.hidden.
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return
      refreshLiveEvents()
    }, LIVE_EVENTS_REFRESH_MS)
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

  // MYCA layer-control bridge.
  // Gives MYCA (and any browser-side consumer) a single, stable API for
  // flipping any layer the Data Filter panel controls — no React context,
  // no import from outside the dashboard tree.
  //
  //   window.__crep_setLayer("cellTowersG", true)         → enable
  //   window.__crep_setLayer("fungi", false)              → disable
  //   window.__crep_setLayer("satellites")                → toggle
  //   window.__crep_layers()                              → snapshot of
  //       [{id, name, enabled, category, opacity}, ...]
  //
  // Also dispatches a `crep:layer` CustomEvent on every change so other
  // parts of the page can react without polling.
  useEffect(() => {
    if (typeof window === "undefined") return;
    (window as any).__crep_setLayer = (layerId: string, enabled?: boolean) => {
      let applied: { id: string; enabled: boolean } | null = null;
      setLayers(prev => prev.map(l => {
        if (l.id !== layerId) return l;
        const next = typeof enabled === "boolean" ? enabled : !l.enabled;
        applied = { id: l.id, enabled: next };
        return { ...l, enabled: next };
      }));
      if (applied) {
        window.dispatchEvent(new CustomEvent("crep:layer", { detail: applied }));
      }
      return applied;
    };
    (window as any).__crep_layers = () => layers.map(l => ({
      id: l.id, name: l.name, enabled: l.enabled,
      category: l.category, opacity: l.opacity,
    }));
    // Apr 19, 2026 (Morgan: "no live rail data widgets for movement of
    // trains"): overlay components (ProposalOverlays, etc.) call this
    // hook from click handlers to open the shared InfraAsset panel.
    // Keeps the widget pipeline centralized in the dashboard.
    (window as any).__crep_selectAsset = (payload: any) => {
      if (!payload || payload.lat == null || payload.lng == null) return;
      lastEntityPickTimeRef.current = Date.now();
      // Apr 23, 2026 — Morgan: "none of these green dots in dc are
      // selectable i dont know what they are and i see no nature data".
      // Baked iNat layers (crep-{region}-inat) were routing through
      // __crep_selectAsset (generic infra widget) which just shows
      // "asset" metadata — useless for a nature observation. When the
      // selectType marks it as iNat, short-circuit to the species
      // popup instead so the user gets photos, scientific name, source
      // link, kingdom colour, grade, etc.
      if (payload.type === "inat-observation") {
        const p = payload.properties || {};
        // Apr 23, 2026 — baked iNat features use snake_case keys
        // (`name` = common name, `sci_name`, `iconic_taxon`, `photo`, `url`)
        // from scripts/etl/crep/bake-nyc-dc-inat.mjs; SSE live features use
        // camelCase (`species`, `scientificName`, `iconicTaxon`, `photos`,
        // `sourceUrl`). Accept both so FungalMarker always gets a populated
        // species + photo + link regardless of source.
        const commonName = p.commonName || p.common_name || p.name || p.species || undefined;
        const sciName = p.scientificName || p.sci_name || p.scientific_name || p.name || "Unknown";
        const photoUrl = Array.isArray(p.photos)
          ? (typeof p.photos[0] === "string" ? p.photos[0] : p.photos[0]?.url)
          : (p.photo || p.photoUrl || undefined);
        const obs: FungalObservation = {
          id: payload.id ?? p.id,
          latitude: payload.lat,
          longitude: payload.lng,
          species: commonName || sciName,
          taxon: p.taxon || {
            id: Number(p.taxon_id ?? p.taxonId) || 0,
            name: sciName,
            preferred_common_name: commonName,
            rank: p.rank || "species",
          },
          observed_on: p.observed_on || p.observedOn || p.timestamp || "",
          quality_grade: p.quality_grade || p.qualityGrade || p.grade || "research",
          photos: photoUrl ? [{ id: 0, url: photoUrl }] : undefined,
          source: p.source || "iNaturalist",
          sourceUrl: p.sourceUrl || p.source_url || p.url || undefined,
          user: p.observer || p.user || undefined,
          location: p.placeGuess || p.place_guess || p.location || undefined,
          kingdom: p.kingdom || p.iconic_taxon || p.iconicTaxon || undefined,
          iconicTaxon: p.iconicTaxon || p.iconic_taxon || p.kingdom || undefined,
        };
        setSelectedFungal(obs);
        return;
      }
      // Apr 22, 2026 — Morgan: "we dont need that ring at all anywhere".
      // The OpenGridWorks-style cyan highlight ring was firing on every
      // asset click and being misread as a "selecting…" state, especially
      // when the detail widget took a moment to mount. Ring disabled
      // globally — selection is signalled by the widget opening.
      setSelectedInfraAsset({
        type: payload.type || "asset",
        id: payload.id,
        name: payload.name || "Asset",
        lat: payload.lat,
        lng: payload.lng,
        properties: payload.properties || {},
      });
    };
    // Apr 23, 2026 — separate hook the baked iNat circle layers call
    // directly (avoids going through __crep_selectAsset's shape check).
    (window as any).__crep_selectFungal = (obs: FungalObservation) => {
      if (!obs) return;
      lastEntityPickTimeRef.current = Date.now();
      setSelectedFungal(obs);
    };
    return () => {
      try { delete (window as any).__crep_setLayer; } catch { /* noop */ }
      try { delete (window as any).__crep_layers; } catch { /* noop */ }
      try { delete (window as any).__crep_selectAsset; } catch { /* noop */ }
      try { delete (window as any).__crep_selectFungal; } catch { /* noop */ }
    };
  }, [layers]);

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
      militaryBases: groundFilter.showMilitaryBases,
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
      military: "showMilitaryBases", militarybases: "showMilitaryBases",
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
    
    // Recency-first LOD for nature (Fix D — Apr 18, 2026)
    // At low zoom: only research-grade + recent observations (high-signal).
    // At high zoom: all historical data in viewport (full fidelity).
    // applyLODToNature handles timeWindow + qualityGrade filtering and
    // returns at most lod.nature.maxRendered items. After that we still
    // run the spatial grid so the surviving set is evenly distributed.
    const preLodCount = inViewport.length
    const lodFilteredNature = applyLODToNature(
      inViewport as any,
      mapZoom,
    ) as typeof inViewport;
    const lod = getLODForZoom(mapZoom);
    const maxMarkers: number = lod.nature.maxRendered;
    const lodLevel = lod.tier;
    // Swap downstream "inViewport" reference to the LOD-filtered set by
    // mutating in place (inViewport is const, so no reassignment).
    inViewport.length = 0;
    inViewport.push(...lodFilteredNature);
    if (Math.random() < 0.03) {
      console.log(`[CREP/LOD] Nature z=${mapZoom.toFixed(1)} tier=${lodLevel} viewport=${preLodCount} → ${inViewport.length} after recency+quality`);
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
    
    // Step 2: Apply recency-first LOD policy (Fix D — Apr 18, 2026).
    // Replaces hardcoded zoom-tier caps with lib/crep/lod-policy.ts, which
    // enforces Morgan's vision: zoom OUT = shorter time window + higher
    // severity threshold + smaller cap (newest high-signal events only),
    // zoom IN = longer time window + all severity + bigger cap (history).
    //
    // applyLODToEvents also:
    //   • filters out events whose timestamp is outside the tier's window
    //   • sorts by severity desc, then timestamp desc
    //   • slices to the tier's maxRendered budget
    return applyLODToEvents(inViewport, mapZoom);
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
    
    // Recency-first LOD (Fix D): zoom-tier defines aircraft budget.
    // Source-level bbox culling (Fix F): if the tier wants bboxFilter,
    // drop anything outside 2× the current viewport before slicing.
    const lod = getLODForZoom(mapZoom);
    if (lod.movers.bboxFilter && mapBounds) {
      filtered = cullByBbox(filtered as any, expandedBbox(mapBounds)) as typeof filtered;
    }
    return applyLODToMovers(filtered, "aircraft", mapZoom);
  }, [aircraft, aircraftFilter, mapZoom, mapBounds]);

  // ===========================================================================
  // FILTER VESSELS: INCLUSION - show only if vessel matches at least one enabled category
  // AIS ShipType: 30=fishing, 31-32=towing, 35=military, 36-39=pleasure, 52=tug, 60-69=passenger, 70-79=cargo, 80-89=tanker
  // shipType 0 = unknown (position-only AIS) → treat as other/pleasure
  // ===========================================================================
  const filteredVessels = useMemo(() => {
    let filtered = vessels.filter(v => {
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

    // Recency-first LOD (Fix D) + source-level bbox cull (Fix F)
    const lod = getLODForZoom(mapZoom);
    if (lod.movers.bboxFilter && mapBounds) {
      filtered = cullByBbox(filtered as any, expandedBbox(mapBounds)) as typeof filtered;
    }
    filtered = applyLODToMovers(filtered, "vessels", mapZoom);
    return filtered;
  }, [vessels, vesselFilter, mapZoom]);

  // ===========================================================================
  // FILTER SATELLITES: show only if sat matches at least one enabled category
  // (Fixes discrepancies when combining Stations / Comms / Starlink toggles)
  // ===========================================================================
  const filteredSatellites = useMemo(() => {
    let filtered = satellites.filter(sat => {
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

    // Recency-first LOD (Fix D): satellites are orbit-wide, so bbox culling
    // isn't meaningful — always use the tier's budget.
    return applyLODToMovers(filtered, "satellites", mapZoom);
  }, [satellites, satelliteFilter, mapZoom]);

  // Refs used by the rAF dead-reckoning loop to tag entities by kind.
  // (Declared here so both the sync-below useEffect AND the animation
  // loop below can update / read them without React dep churn.)
  const aircraftIdSetRef = useRef<Set<string>>(new Set());
  const vesselIdSetRef = useRef<Set<string>>(new Set());
  // Apr 22, 2026 — Morgan: "all airplanes that are registered as
  // helecopters need a helecopter icon not a plane". Set of aircraft ids
  // whose category / ICAO type / aircraft_type string marks them as a
  // rotorcraft. Consumed by the pump tick so each feature carries
  // is_helo:true and the symbol layer swaps to helicopter-icon.
  const helicopterIdSetRef = useRef<Set<string>>(new Set());

  // Sync last-known position + velocity (deg/s) for extrapolation when API data changes
  useEffect(() => {
    const degPerSecPerKnot = 1 / 216000; // 1 knot = 1 nm/hr = 1/60 deg/hr = 1/216000 deg/s
    const next: Record<string, { lng: number; lat: number; velLng: number; velLat: number; ts: number }> = {};
    const acIds = new Set<string>();
    const vIds = new Set<string>();
    const heloIds = new Set<string>();
    const now = Date.now();
    // Helicopter detection — OpenSky/ICAO category 8 ("Rotorcraft") is
    // authoritative when present. Fall back to aircraft_type text match
    // (covers Flightradar24 which exposes ICAO type codes like EC35/AS65/
    // H145/R44) + registration prefix heuristics (N-number for helos
    // often tagged explicitly by FAA DB).
    const HELO_TYPE_RE = /\b(heli|rotor|copter|h[0-9]{2,3}|r[2-6][0-9]|as[0-9]{2,3}|ec[0-9]{2,3}|ah[0-9]{1,2}|uh[0-9]{1,2}|ch[0-9]{1,2}|mi[0-9]{1,2})\b/i
    const isHelicopter = (a: any): boolean => {
      const cat = a?.category ?? a?.aircraftCategory ?? a?.icaoCategory ?? a?.properties?.category
      if (cat === 8 || cat === "8" || cat === "Rotorcraft") return true
      const type = String(a?.aircraft_type || a?.aircraftType || a?.icaoType || a?.model || a?.properties?.aircraftType || a?.properties?.aircraft_type || "")
      if (type && HELO_TYPE_RE.test(type)) return true
      if (typeof a?.isHelicopter === "boolean") return a.isHelicopter
      return false
    }
    for (const a of filteredAircraft) {
      acIds.add(a.id);
      if (isHelicopter(a)) heloIds.add(a.id);
      // Apr 19, 2026 (critical rendering bug — see deckEntities map below):
      // /api/oei/flightradar24 serves flat top-level lat/lng. Old extraction
      // looked only at entity.location.longitude / entity.location.coordinates,
      // fell through to 0 for every aircraft → all 2000+ planes pinned at
      // null island. lastKnownRef stayed empty → animation tick had no
      // features to paint → blank map.
      const aa = a as any;
      const lng = aa.lng ?? aa.longitude ?? aa.location?.longitude ?? aa.location?.coordinates?.[0] ?? aa.geometry?.coordinates?.[0] ?? 0;
      const lat = aa.lat ?? aa.latitude  ?? aa.location?.latitude  ?? aa.location?.coordinates?.[1] ?? aa.geometry?.coordinates?.[1] ?? 0;
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
      vIds.add(v.id);
      // Apr 19, 2026 — same flat-lat/lng fix as aircraft above.
      const vv = v as any;
      const loc = vv.location as { longitude?: number; latitude?: number; coordinates?: [number, number] } | undefined;
      const lng = vv.lng ?? vv.longitude ?? loc?.longitude ?? loc?.coordinates?.[0] ?? vv.geometry?.coordinates?.[0] ?? 0;
      const lat = vv.lat ?? vv.latitude  ?? loc?.latitude  ?? loc?.coordinates?.[1] ?? vv.geometry?.coordinates?.[1] ?? 0;
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
    //
    // ── NETCODE RECONCILIATION (Apr 20, 2026 — fixes plane "small loop glitch") ──
    // Morgan: "planes keep glitching in and out of locations on small loops".
    // Root cause: we used to do `lastKnownRef.current = next`, which replaced
    // every entity's anchor with the NEW api-reported position at ts=now. The
    // rAF dead-reckoning loop had already extrapolated each plane forward of
    // the old api position; replacing the anchor teleported every plane
    // BACKWARD to the api position, then rAF would extrapolate forward again
    // → visible tiny back-and-forth loop every poll cycle (~30 s).
    //
    // Fix: merge by id. For each plane already tracked, compare the incoming
    // api position with the current extrapolated position (derived from the
    // previous anchor + velocity + elapsed seconds):
    //   • If drift < 5 km (plane on track): KEEP the extrapolated position
    //     as the new anchor, update only velocity + ts. No visible jump.
    //   • If drift ≥ 5 km (major course change, fresh spawn, or data hole):
    //     snap to api position. Larger-than-5 km glitches were real flips
    //     anyway; smoothing them would introduce visible lag.
    const prev = lastKnownRef.current
    const nowMs = now
    const mergedNext: typeof next = {}
    for (const [id, fresh] of Object.entries(next)) {
      const old = prev[id]
      if (!old) {
        mergedNext[id] = fresh
        continue
      }
      const dtSec = (nowMs - old.ts) / 1000
      const extrapLng = old.lng + old.velLng * dtSec
      const extrapLat = old.lat + old.velLat * dtSec
      // Rough meters: 1° lat ≈ 111 km; 1° lng ≈ 111 km × cos(lat).
      const dLat = (extrapLat - fresh.lat) * 111_000
      const dLng = (extrapLng - fresh.lng) * 111_000 * Math.cos(fresh.lat * Math.PI / 180)
      const driftM = Math.hypot(dLat, dLng)
      if (driftM < 5000) {
        // Keep extrapolated position, update velocity + ts. No teleport.
        mergedNext[id] = { lng: extrapLng, lat: extrapLat, velLng: fresh.velLng, velLat: fresh.velLat, ts: nowMs }
      } else {
        // Big drift → snap (real divergence, not glitch).
        mergedNext[id] = fresh
      }
    }
    lastKnownRef.current = mergedNext
    aircraftIdSetRef.current = acIds
    vesselIdSetRef.current = vIds
    helicopterIdSetRef.current = heloIds
    // Apr 22, 2026 — Morgan: "all planes boats satelites need accurate
    // moving live gps data long lat in their widget moving live like a
    // clock". Expose the Kalman-filtered position+velocity map so the
    // entity detail panel can run its own local-tick extrapolation
    // (useLiveEntityPosition hook). Same object the pump reads; only
    // this reference is exported for read-only consumption.
    try {
      (window as any).__crep_lastKnown = mergedNext
      ;(window as any).__crep_aircraftIds = acIds
      ;(window as any).__crep_vesselIds = vIds
      ;(window as any).__crep_helicopterIds = heloIds
    } catch { /* SSR or headless */ }
  }, [filteredAircraft, filteredVessels]);

  // ██████████████████████████████████████████████████████████████████████████
  // AIRCRAFT + VESSEL DEAD-RECKONING — dual-pump (rAF + setInterval fallback)
  //
  // Apr 20, 2026 (Morgan: "i dont see any planes or satelites or movment of
  // baots or rail cars npw"). Verified via headless-browser probe that when
  // the tab is `document.hidden === true` (backgrounded, minimised, obscured
  // by another window, preview iframe, etc.) ALL requestAnimationFrame
  // callbacks are paused by the browser. Before this change that froze every
  // live-mover (aircraft, vessels, SGP4 sats, cloud shadow). Map looked
  // empty as soon as you alt-tabbed or opened devtools undocked.
  //
  // Fix: dual pump. rAF when visible (smooth 5 FPS animation), setInterval
  // as a constant backstop. Background tabs throttle setInterval to 1s min
  // but the data still flows — map never freezes just because you looked
  // away.
  //
  // Reads mapNativeRef.current FRESH each tick (the map isn't ready at mount
  // so we can't capture it once). Reads lastKnownRef (position + velocity)
  // and extrapolates at ~5 FPS into crep-live-aircraft / crep-live-vessels
  // sources via setData(). Zero React re-renders.
  //
  // Preserves the `heading` property from lastKnownRef entries (previously
  // I set heading=0, which rotated all planes north — they were still there
  // but all pointing the same direction, so they looked "fake" in motion).
  // Satellites have their own SGP4 animation module (see below).
  // ██████████████████████████████████████████████████████████████████████████
  // Apr 22, 2026 — Morgan: "make the entire crep system efficient".
  // Mirror the React state into a ref so the rAF pump (mount-only effect)
  // reads FRESH bounds each tick without a closure rebuild. Used by
  // cullToViewport to drop features outside the current viewport before
  // the GPU upload.
  const mapBoundsRef = useRef<typeof mapBounds>(mapBounds);
  useEffect(() => { mapBoundsRef.current = mapBounds }, [mapBounds]);
  // Apr 22, 2026 — Morgan: "at zoom out seeing world i need to see at
  // least 30% of all vessles ... then with each zoom in tick i need
  // more in viewport and none outside of viewport".
  // Zoom ref keeps the pump tick in sync with current map zoom so
  // selectForZoom() can pick the right LOD tier without closure rebuild.
  const mapZoomRef = useRef<number>(mapZoom);
  useEffect(() => { mapZoomRef.current = mapZoom }, [mapZoom]);

  useEffect(() => {
    let rafId: number | null = null;
    let intervalId: any = null;
    let lastTickAt = 0;
    const TICK_MS = 200; // 5 FPS when visible — smooth enough, cheap enough

    // Apr 22, 2026 perf: one-rAF setData coalescer per source. Aircraft +
    // vessel sigs still deduplicate NO-OP ticks at the data level; the
    // debouncer folds rapid consecutive setData calls into a single GPU
    // upload per source per frame (so a burst from pump + extrapolation
    // arriving in the same frame costs one upload, not two).
    const debouncedAcSetData = makeDebouncedSetData(() =>
      mapNativeRef.current?.getSource("crep-live-aircraft") as any,
    );
    const debouncedVSetData = makeDebouncedSetData(() =>
      mapNativeRef.current?.getSource("crep-live-vessels") as any,
    );

    // Apr 23, 2026 — the old `sigOf(feats)` dedupe compared every
    // id+coord+heading between ticks. With dead-reckoning the coords drift
    // each tick, so the signature always changed and the check was a
    // round-trip string build for no dedupe gain. Worse: if the sig happened
    // to match by coincidence (e.g. zero-velocity entities), setData silently
    // skipped and the source could stay empty after a state reset. The
    // debouncer already coalesces back-to-back setData calls to one GPU
    // upload per frame, so we just call it unconditionally now. Each tick:
    // build features → LOD-select → debouncedSetData. Predictable and safe.

    const pumpOnce = () => {
      const map = mapNativeRef.current;
      if (!map || typeof map.getSource !== "function") return;
      const lk = lastKnownRef.current;
      const nowMs = Date.now();
      try {
        const acFeats: any[] = [];
        const vFeats: any[] = [];
        for (const id of Object.keys(lk)) {
          const a = lk[id];
          if (!a) continue;
          const dtSec = (nowMs - a.ts) / 1000;
          const lng = a.lng + a.velLng * dtSec;
          const lat = a.lat + a.velLat * dtSec;
          const kind = aircraftIdSetRef.current.has(id)
            ? "aircraft"
            : vesselIdSetRef.current.has(id)
            ? "vessel"
            : null;
          if (!kind) continue;
          const speed = Math.hypot(a.velLng, a.velLat);
          const heading = speed > 1e-9 ? (Math.atan2(a.velLng, a.velLat) * 180 / Math.PI + 360) % 360 : 0;
          // Apr 22, 2026 — is_helo flips the symbol layer to
          // helicopter-icon for rotorcraft (ICAO category 8 / aircraft
          // type regex). helicopterIdSetRef is rebuilt every pump poll
          // so a reclassified aircraft flips icon within one tick.
          const isHelo = kind === "aircraft" && helicopterIdSetRef.current.has(id);
          const feat = {
            type: "Feature" as const,
            properties: { id, heading, is_helo: isHelo },
            geometry: { type: "Point" as const, coordinates: [lng, lat] },
          };
          if (kind === "aircraft") acFeats.push(feat);
          else vFeats.push(feat);
        }
        // Apr 22, 2026 v3 — zoom-dependent LOD via lodSelectForZoom.
        // Morgan: "at zoom out seeing world i need to see at least 30%
        // of all vessles ... with each zoom in tick i need more in
        // viewport and none outside of viewport".
        //
        // Behavior by tier:
        //   z ≤ 2 (world)    — stratified 35% global sample, no bbox cull
        //   z 3–6 (regional) — viewport cull then progressive sample
        //                      (40% at z3 → 100% at z6)
        //   z ≥ 7 (local)    — strict viewport cull, everything inside
        //
        // Then the rAF debouncer folds rapid consecutive setData calls
        // into a single GPU upload per source per frame.
        const bbox = mapBoundsRef.current
        const zoom = mapZoomRef.current
        // Unconditional write on every tick — the debouncer folds rapid
        // calls to a single GPU upload per source per frame anyway, so
        // there's no cost to removing the sigOf dedupe. Fixes the "source
        // stays empty" regression Morgan hit when dead-reckoning sigs
        // collided with the initial empty-string sig on a stuck tick.
        const pickedAc = acFeats.length > 0 ? lodSelectForZoom(acFeats, bbox, zoom, 2) : []
        const pickedV  = vFeats.length  > 0 ? lodSelectForZoom(vFeats,  bbox, zoom, 2) : []
        debouncedAcSetData({ type: "FeatureCollection", features: pickedAc })
        debouncedVSetData({ type: "FeatureCollection", features: pickedV  })
      } catch {
        // source missing or map torn down; keep looping
      }
    };

    // rAF tick: runs at ~60 Hz when tab is visible; browser pauses when hidden.
    const rafTick = (ts: number) => {
      if (ts - lastTickAt >= TICK_MS) {
        lastTickAt = ts;
        pumpOnce();
      }
      rafId = requestAnimationFrame(rafTick);
    };
    rafId = requestAnimationFrame(rafTick);

    // setInterval backstop: fires at 250 ms (throttled to ~1 s on hidden
    // tabs, but that's fine — map doesn't need 5 FPS when no-one is looking;
    // we just need it to keep moving so when Morgan looks back, positions
    // are current).
    intervalId = setInterval(() => {
      // Guard against double-ticks when rAF is also firing: if rAF ran in
      // the last 150 ms, skip this interval tick.
      if (Date.now() - lastTickAt < 150) return;
      lastTickAt = performance.now();
      pumpOnce();
    }, 250);

    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      if (intervalId != null) clearInterval(intervalId);
    };
  }, []); // mount once — ref is read fresh each tick

  // ═══════════════════════════════════════════════════════════════════════════
  // DIRECT SOURCE-SYNC — Apr 23, 2026
  //
  // Morgan (browser audit): "i see no gain or loss of assets at every zoom or
  // movment". Root cause: the rAF pump was the ONLY path from React state to
  // the MapLibre source. If the rAF never fired (tab race, style reload,
  // source replaced mid-HMR), the source stayed empty even though aircraft /
  // vessel / satellite state held thousands of entries.
  //
  // This effect adds a second, deterministic path: whenever filteredAircraft
  // / filteredVessels / filteredSatellites change (which happens on every
  // pump merge), we write directly to the source. The rAF pump still handles
  // dead-reckoning animation between pumps, but a fresh state always lands
  // in the source within one React commit.
  //
  // Idempotent — calling setData with the same feature array is cheap and
  // won't flicker (MapLibre diffs the tile bins internally).
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const map = mapNativeRef.current
    if (!map || typeof map.getSource !== "function") return
    const build = <T extends { id?: string }>(items: T[], pick: (t: any) => { lng: number; lat: number; heading?: number; is_helo?: boolean }) => {
      const feats: any[] = []
      for (const item of items) {
        const p = pick(item as any)
        if (!Number.isFinite(p.lng) || !Number.isFinite(p.lat)) continue
        feats.push({
          type: "Feature",
          properties: {
            id: (item as any).id,
            heading: Number.isFinite(p.heading) ? p.heading : 0,
            is_helo: p.is_helo === true,
          },
          geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        })
      }
      return feats
    }
    try {
      const acFeats = build(filteredAircraft, (a: any) => ({
        lng: a.lng ?? a.longitude ?? a.location?.longitude ?? a.geometry?.coordinates?.[0],
        lat: a.lat ?? a.latitude  ?? a.location?.latitude  ?? a.geometry?.coordinates?.[1],
        heading: typeof a.heading === "number" ? a.heading : (a.properties?.heading ?? 0),
        is_helo: helicopterIdSetRef.current?.has?.(a.id) ?? false,
      }))
      const vFeats = build(filteredVessels, (v: any) => ({
        lng: v.lng ?? v.longitude ?? v.location?.longitude ?? v.geometry?.coordinates?.[0],
        lat: v.lat ?? v.latitude  ?? v.location?.latitude  ?? v.geometry?.coordinates?.[1],
        heading: typeof v.cog === "number" ? v.cog : (v.heading ?? 0),
      }))
      const bbox = mapBoundsRef.current
      const zoom = mapZoomRef.current
      const acPicked = lodSelectForZoom(acFeats, bbox, zoom, 2)
      const vPicked  = lodSelectForZoom(vFeats,  bbox, zoom, 2)
      ;(map.getSource("crep-live-aircraft") as any)?.setData?.({ type: "FeatureCollection", features: acPicked })
      ;(map.getSource("crep-live-vessels")  as any)?.setData?.({ type: "FeatureCollection", features: vPicked  })
    } catch {
      // source missing / map torn down — rAF backstop retries next frame
    }
  }, [filteredAircraft, filteredVessels, mapZoom, mapBounds])

  // ═══════════════════════════════════════════════════════════════════════════
  // LIVE-MOVER DIAGNOSTIC (Apr 20, 2026 — Morgan: "i dont see any planes or
  // satelites or movment of baots or rail cars npw").
  //
  // Logs a single summary line every 10 s with counts at each stage of the
  // live-mover pipeline so operators can see where the data stops flowing:
  //
  //   raw      — how many rows the upstream APIs returned (aircraft state)
  //   filtered — how many survived the category/altitude/LOD filter
  //   tracked  — how many are in the rAF dead-reckoning anchor map
  //   rendered — how many features are currently on the MapLibre sources
  //
  // If raw>0 but rendered=0 → filter or layer issue.
  // If raw>0 and rendered>0 → map is showing them, check zoom/visibility.
  // Also exposes __crep_live_stats() as a global for quick console probes.
  // ═══════════════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════════════
  // FLIGHT HISTORY TRAIL — map layer for the currently-selected aircraft.
  // Apr 20, 2026 (Morgan: "all plane data on crep needs this stuff live on
  // widget and map of history" + https://www.airnavradar.com/data/flights/).
  //
  // AircraftDetail dispatches crep:flight-history:trail with the trail
  // returned from /api/oei/flight-history/[id]. We paint it as:
  //   • line   — gradient amber→cyan from older to newer points
  //   • points — small circles at each observation for click hover
  // On deselect (:clear event), source is emptied.
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const m = mapNativeRef.current
    if (!m) return
    const ensureLayer = () => {
      if (!m.getSource || typeof m.getSource !== "function") return
      if (!m.getSource("crep-flight-history")) {
        m.addSource("crep-flight-history", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        })
        m.addLayer({
          id: "crep-flight-history-line",
          type: "line",
          source: "crep-flight-history",
          filter: ["==", ["geometry-type"], "LineString"],
          paint: {
            "line-color": "#fbbf24",
            "line-width": ["interpolate", ["linear"], ["zoom"], 2, 1.5, 8, 3, 14, 4],
            "line-opacity": 0.85,
            "line-blur": 0.3,
          },
          layout: { "line-cap": "round", "line-join": "round" },
        })
        m.addLayer({
          id: "crep-flight-history-points",
          type: "circle",
          source: "crep-flight-history",
          filter: ["==", ["geometry-type"], "Point"],
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 1.2, 8, 2.2, 14, 3],
            "circle-color": "#fbbf24",
            "circle-stroke-color": "#0b1220",
            "circle-stroke-width": 0.8,
            "circle-opacity": 0.9,
          },
        })
      }
    }
    const onTrail = (ev: any) => {
      ensureLayer()
      const d = ev?.detail
      const trail: any[] = d?.trail || []
      if (!trail.length) return
      const coords = trail.map((p: any) => [Number(p.lng), Number(p.lat)]).filter((c: any) => Number.isFinite(c[0]) && Number.isFinite(c[1]))
      if (coords.length < 2) return
      const features: any[] = [
        { type: "Feature", properties: { id: d.id, kind: "line" }, geometry: { type: "LineString", coordinates: coords } },
        ...trail.map((p: any, i: number) => ({
          type: "Feature",
          properties: { id: `${d.id}-${i}`, ts: p.timestamp, alt: p.alt_ft, spd: p.speed_kts },
          geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        })),
      ]
      const src = m.getSource("crep-flight-history") as any
      if (src?.setData) src.setData({ type: "FeatureCollection", features })
    }
    const onClear = () => {
      ensureLayer()
      const src = m.getSource("crep-flight-history") as any
      if (src?.setData) src.setData({ type: "FeatureCollection", features: [] })
    }
    window.addEventListener("crep:flight-history:trail", onTrail as any)
    window.addEventListener("crep:flight-history:clear", onClear as any)
    return () => {
      window.removeEventListener("crep:flight-history:trail", onTrail as any)
      window.removeEventListener("crep:flight-history:clear", onClear as any)
    }
  }, [])

  useEffect(() => {
    const diag = () => {
      const m = mapNativeRef.current
      // Apr 20, 2026 diag fix: MapLibre's GeoJSONSource doesn't keep
      // features on `_data` after setData — it ships them to a worker and
      // clears the main-thread copy. Use queryRenderedFeatures instead to
      // get the actual rendered count; fall back to _options.data if the
      // renderer hasn't processed the latest setData yet.
      const countFeatures = (sourceId: string, layerIds: string[]): number => {
        try {
          const rendered = m.queryRenderedFeatures({ layers: layerIds }).length
          if (rendered > 0) return rendered
        } catch { /* layer may not exist */ }
        const src = m?.getSource?.(sourceId) as any
        return src?._options?.data?.features?.length ?? src?._data?.features?.length ?? 0
      }
      const renderedAc = countFeatures("crep-live-aircraft", ["crep-live-aircraft-dot"])
      const renderedV = countFeatures("crep-live-vessels", ["crep-live-vessels-dot"])
      const renderedSat = countFeatures("crep-live-satellites", ["crep-live-satellites-dot"])
      const acVis = (m?.getLayer?.("crep-live-aircraft-dot") && m.getLayoutProperty?.("crep-live-aircraft-dot", "visibility")) ?? "?"
      const vVis = (m?.getLayer?.("crep-live-vessels-dot") && m.getLayoutProperty?.("crep-live-vessels-dot", "visibility")) ?? "?"
      const satVis = (m?.getLayer?.("crep-live-satellites-dot") && m.getLayoutProperty?.("crep-live-satellites-dot", "visibility")) ?? "?"
      const summary = {
        map_ready: !!m,
        zoom: m?.getZoom?.().toFixed?.(1),
        aircraft: { raw: aircraft.length, filtered: filteredAircraft.length, tracked: aircraftIdSetRef.current.size, rendered: renderedAc, vis: acVis },
        vessels:  { raw: vessels.length,  filtered: filteredVessels.length,  tracked: vesselIdSetRef.current.size,   rendered: renderedV, vis: vVis },
        satellites: { raw: satellites.length, rendered: renderedSat, vis: satVis },
      }
      try { (window as any).__crep_live_stats = () => summary } catch { /* ignore */ }
      console.log("[CREP/diag live]", JSON.stringify(summary))
    }
    // Apr 20, 2026 perf: skip diag logging when document.hidden — keeps
    // the 6 console.log/min off backgrounded tabs. The __crep_live_stats
    // global getter still works for on-demand probes via console.
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return
      diag()
    }, 10_000)
    const first = setTimeout(() => {
      if (typeof document !== "undefined" && document.hidden) return
      diag()
    }, 3_000)
    return () => { clearInterval(id); clearTimeout(first) }
  }, [aircraft.length, vessels.length, satellites.length, filteredAircraft.length, filteredVessels.length])

  const deckEntities = useMemo<UnifiedEntity[]>(() => {
    const lastKnown = lastKnownRef.current;
    const sourceEntities = [
      ...filteredAircraft.map((aircraftEntity) => {
        // Apr 19, 2026 (critical rendering bug): /api/oei/flightradar24 returns
        // entities with flat top-level `lat` / `lng` — not nested under
        // `location`. Previous extraction fell through to `?? 0` for every
        // aircraft, pinning 2000+ planes at null island and rendering NOTHING
        // on the map. Add top-level lat/lng + `lat/lng` alternates + the
        // GeoJSON-style coordinates fallback.
        const a = aircraftEntity as any;
        const apiLng = a.lng ?? a.longitude ?? a.location?.longitude ?? a.location?.coordinates?.[0] ?? a.geometry?.coordinates?.[0] ?? 0;
        const apiLat = a.lat ?? a.latitude  ?? a.location?.latitude  ?? a.location?.coordinates?.[1] ?? a.geometry?.coordinates?.[1] ?? 0;
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
        // Apr 19, 2026 (critical rendering bug): /api/oei/aisstream returns
        // flat lat/lng at top level, not nested under `location`. Same fix
        // pattern as aircraft above — see comment there.
        const v = vesselEntity as any;
        const loc = v.location as { longitude?: number; latitude?: number; coordinates?: [number, number] } | undefined;
        const apiLng = v.lng ?? v.longitude ?? loc?.longitude ?? loc?.coordinates?.[0] ?? v.geometry?.coordinates?.[0] ?? 0;
        const apiLat = v.lat ?? v.latitude  ?? loc?.latitude  ?? loc?.coordinates?.[1] ?? v.geometry?.coordinates?.[1] ?? 0;
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
        // Apr 19, 2026 (critical rendering bug): satellite registry endpoint
        // returns flat lat/lng at top level (see aircraft/vessel fix above).
        // Add the flat fallbacks here too. The satellite-animation module
        // overwrites this per-frame with SGP4 propagated positions anyway,
        // but the initial render + the deckEntities useMemo use these coords.
        const sat = satelliteEntity as any;
        const loc = sat.location as { longitude?: number; latitude?: number; coordinates?: [number, number] } | undefined;
        const est = satelliteEntity.estimatedPosition;
        const apiLng = sat.lng ?? sat.longitude ?? loc?.longitude ?? loc?.coordinates?.[0] ?? est?.longitude ?? sat.geometry?.coordinates?.[0] ?? 0;
        const apiLat = sat.lat ?? sat.latitude  ?? loc?.latitude  ?? loc?.coordinates?.[1] ?? est?.latitude  ?? sat.geometry?.coordinates?.[1] ?? 0;
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
  }, [filteredAircraft, filteredVessels, filteredSatellites, visibleFungalObservations, streamedEntities, layers]);

  // ═══════════════════════════════════════════════════════════════════════════
  // LOD DATA PUMP — Game-engine-style viewport-aware rendering.
  //
  // Renders 50K+ entities at 60fps by:
  //   1. Viewport culling: only features visible on screen go to GPU
  //   2. Zoom-adaptive density: globe view=sampled, city view=all
  //   3. Zero React re-renders: direct MapLibre source.setData() via rAF
  //   4. Controls NEVER lock: setTimeout(0) yields to UI thread first
  //
  // LOD tiers (zoom level → max features per source):
  //   zoom 0-3 (globe):    2000 aircraft, 1000 satellites, 1000 vessels
  //   zoom 4-6 (continent): 5000 aircraft, 3000 satellites, 3000 vessels
  //   zoom 7-9 (country):   15000 aircraft, 10000 satellites, 10000 vessels
  //   zoom 10+ (city):      unlimited (all in viewport)
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const map = mapNativeRef.current;
    if (!map) return;
    const timer = setTimeout(() => {
      const m = mapNativeRef.current;
      if (!m) return;
      try {
        const zoom = m.getZoom?.() ?? 3;
        const bounds = m.getBounds?.();

        // Viewport bbox culling — only send features on screen to GPU
        const inViewport = (coords: [number, number]) => {
          if (!bounds) return true;
          const [lng, lat] = coords;
          return lat >= bounds.getSouth() - 1 && lat <= bounds.getNorth() + 1
              && lng >= bounds.getWest() - 1 && lng <= bounds.getEast() + 1;
        };

        // LOD density limits per zoom tier
        const lodLimit = (z: number): number => {
          if (z >= 10) return Infinity;
          if (z >= 7) return 15000;
          if (z >= 4) return 5000;
          return 2000;
        };
        const maxPerSource = lodLimit(zoom);

        // Convert entities to GeoJSON, cull to viewport, apply LOD sampling
        const toFC = (ents: any[], limit: number) => {
          let visible = ents.filter((e: any) =>
            e.geometry?.coordinates?.length >= 2 && inViewport(e.geometry.coordinates)
          );
          // Spatial sampling when over LOD limit (evenly spaced, preserves global distribution)
          if (visible.length > limit) {
            const step = Math.ceil(visible.length / limit);
            visible = visible.filter((_, idx) => idx % step === 0);
          }
          return {
            type: "FeatureCollection" as const,
            features: visible.map((e: any) => ({
              type: "Feature" as const,
              properties: { id: e.id, heading: e.state?.heading ?? 0, type: e.type,
                name: e.properties?.callsign || e.properties?.name || e.properties?.mmsi || e.id },
              geometry: e.geometry,
            })),
          };
        };

        // Apr 19, 2026 (Morgan: "like a broken record plane and boat keeps
        // going back to where it was" / "boats literally just keep blinking
        // on and off"). THIS pump used to write aircraft + vessels to
        // crep-live-aircraft / crep-live-vessels. But the rAF dead-reckoning
        // loop (above) ALSO writes those sources — at 5 FPS, extrapolating
        // positions forward using velocity. The two pumps fought: rAF would
        // advance the plane, then this pump would snap it back to the
        // filtered (un-extrapolated) position, then rAF would advance again
        // → visible flicker + apparent "jumping back in time".
        //
        // Fix: rAF is the SINGLE source of truth for aircraft + vessel
        // sources. This pump now no-ops those writes. Satellites stay in
        // their SGP4 loop. Initial seed of positions into the map happens
        // via the lastKnownRef useEffect (which is what the rAF reads).
        // Non-moving categories (buoys, fungi, events, military) still
        // pump through their own effects further down.
        const _unused_aircraft = deckEntities.filter((e: any) => e.type === "aircraft");
        const _unused_vessels = deckEntities.filter((e: any) => e.type === "vessel");
        void _unused_aircraft; void _unused_vessels;
        // NOTE: DO NOT setData on crep-live-aircraft / crep-live-vessels
        // here. The rAF animator at line ~4056 handles them.
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
  // MILITARY BASES DATA PUMP — Push military facility data into MapLibre source
  // Also toggles layer visibility based on layer enabled state
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const map = mapNativeRef.current;
    if (!map || militaryBases.length === 0) return;

    // Expose for click handler lookup
    if (typeof window !== "undefined") (window as any).__crep_military = militaryBases;

    const milLayerEnabled = layers.find(l => l.id === "militaryBases")?.enabled ?? false;

    // Toggle visibility of military layers
    const vis = milLayerEnabled ? "visible" : "none";
    try {
      if (map.getLayer("crep-live-military-glow")) map.setLayoutProperty("crep-live-military-glow", "visibility", vis);
      if (map.getLayer("crep-live-military-dot")) map.setLayoutProperty("crep-live-military-dot", "visibility", vis);
      if (map.getLayer("crep-military-perimeters-fill")) map.setLayoutProperty("crep-military-perimeters-fill", "visibility", vis);
      if (map.getLayer("crep-military-perimeters-line")) map.setLayoutProperty("crep-military-perimeters-line", "visibility", vis);
    } catch {}

    const timer = setTimeout(() => {
      const m = mapNativeRef.current;
      if (!m) return;
      try {
        const milSrc = m.getSource?.("crep-live-military") as any;
        if (milSrc?.setData) {
          const fc = {
            type: "FeatureCollection" as const,
            features: milLayerEnabled ? militaryBases.filter((f: any) => f.lat != null && f.lng != null && Math.abs(f.lat) <= 90 && Math.abs(f.lng) <= 180).map((f: any) => ({
              type: "Feature" as const,
              properties: {
                id: f.id,
                name: f.name,
                facility_type: f.type,
                operator: f.operator,
                country: f.country,
              },
              geometry: { type: "Point" as const, coordinates: [f.lng, f.lat] },
            })) : [],
          };
          milSrc.setData(fc);
        }
      } catch {}
    }, 0);
    return () => clearTimeout(timer);
  }, [militaryBases, layers]);

  // ═══════════════════════════════════════════════════════════════════════════
  // MYCOSOFT DEVICES PUMP — fetch every 30s, filter by per-type toggle,
  // push into crep-mycosoft-devices source. Empty until devices come online.
  // Layer click routes to type-specific widget (mushroom1/hyphae1/etc).
  // Apr 19, 2026 (Morgan): filters must exist even with no devices deployed.
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const map = mapNativeRef.current;
    if (!map) return;
    const mycoEnabled = !!(layers.find((l) => l.id === "mycobrain")?.enabled ?? true);
    const enabledTypes = new Set<string>();
    if (layers.find((l) => l.id === "devMushroom1")?.enabled ?? true) enabledTypes.add("mushroom1");
    if (layers.find((l) => l.id === "devHyphae1")?.enabled ?? true) enabledTypes.add("hyphae1");
    if (layers.find((l) => l.id === "sporebase")?.enabled ?? true) enabledTypes.add("sporebase");
    if (layers.find((l) => l.id === "devMycoNode")?.enabled ?? true) enabledTypes.add("myconode");
    if (layers.find((l) => l.id === "devAlarm")?.enabled ?? true) enabledTypes.add("alarm");
    if (layers.find((l) => l.id === "devPsathyrella")?.enabled ?? true) enabledTypes.add("psathyrella");

    const vis = mycoEnabled && enabledTypes.size > 0 ? "visible" : "none";
    try {
      if (map.getLayer("crep-mycosoft-devices-glow")) map.setLayoutProperty("crep-mycosoft-devices-glow", "visibility", vis);
      if (map.getLayer("crep-mycosoft-devices-core")) map.setLayoutProperty("crep-mycosoft-devices-core", "visibility", vis);
      // Per-type filter via match expression — drop features whose
      // device_type isn't in the enabled set.
      const filterExpr: any = ["in", ["get", "device_type"], ["literal", Array.from(enabledTypes)]];
      if (map.getLayer("crep-mycosoft-devices-glow")) map.setFilter("crep-mycosoft-devices-glow", filterExpr);
      if (map.getLayer("crep-mycosoft-devices-core")) map.setFilter("crep-mycosoft-devices-core", filterExpr);
    } catch { /* ignore */ }

    if (!mycoEnabled || enabledTypes.size === 0) return;

    const fetchAndPaint = async () => {
      try {
        const res = await fetch("/api/crep/mycosoft-devices?limit=10000", { signal: AbortSignal.timeout(12_000) });
        if (!res.ok) return;
        const j = await res.json();
        const devices: any[] = j.devices || j.data || [];
        if (typeof window !== "undefined") (window as any).__crep_mycosoft_devices = devices;
        const features = devices
          .filter((d) => Number.isFinite(d.lat) && Number.isFinite(d.lng))
          .map((d) => ({
            type: "Feature" as const,
            properties: {
              id: d.id,
              device_type: (d.device_type || d.type || "mycobrain").toLowerCase(),
              name: d.name,
              status: d.status,
              mycobrain_id: d.mycobrain_id,
              last_seen: d.last_seen,
              firmware: d.firmware,
            },
            geometry: { type: "Point" as const, coordinates: [d.lng, d.lat] },
          }));
        const src = map.getSource?.("crep-mycosoft-devices") as any;
        if (src?.setData) src.setData({ type: "FeatureCollection", features });
      } catch { /* ignore — endpoint may not exist yet */ }
    };
    fetchAndPaint();
    // Apr 20, 2026 perf-3: skip when document.hidden.
    const poll = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return
      fetchAndPaint()
    }, 30_000)
    return () => clearInterval(poll);
  }, [layers]);

  // ═══════════════════════════════════════════════════════════════════════════
  // PER-LAYER VISIBILITY SYNC (Apr 19, 2026)
  // Morgan QA: "not one filter on Telecom & Infrastructure works which does
  // not make sense i see those things on map but none of the filters work"
  //
  // Root cause: individual layer toggles in the UI (submarineCables,
  // dataCenters, cellTowers, radioStations, powerPlantsG, etc.) had no
  // corresponding setLayoutProperty("visibility", ...) wiring. The only
  // visibility control was a master "showInfraLayers" flip. Per-layer
  // toggles flipped `layers[i].enabled` in state but the map never
  // listened.
  //
  // This useEffect iterates the layer registry → known MapLibre layer IDs
  // mapping on every `layers` change and flips visibility. Layers that
  // haven't been attached yet are silently skipped — next effect run picks
  // them up once they're present.
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const m = mapNativeRef.current;
    if (!m) return;
    const layerIdToMap: Record<string, string[]> = {
      // Telecom & Infrastructure
      submarineCables:  ["crep-cables-line"],
      dataCenters:      ["crep-dcs-global-halo", "crep-dcs-global-glow", "crep-dcs-global-dot"],
      cellTowers:       ["crep-celltowers-circle", "crep-celltowers-global-circle"],
      cellTowersG:      ["crep-celltowers-bbox-dot"],
      radioStations:    ["crep-radio-dot"],
      powerPlantsG:     ["crep-pp-global-dot"],
      signalHeatmap:    ["crep-signalheatmap-heat"],
      // Power grid
      powerPlants:      ["crep-plants-circle"],
      substations:      ["crep-subs-circle"],
      transmissionLines: ["crep-txlines-line", "crep-txlines-full-line"],
      // Transport / Vehicles
      ports:            ["crep-ports-global-dot"],
      railwayTracks:    ["crep-railway-raster"],
      // Pollution & Industry
      factories:        ["crep-factories-dot"],
      // Scientific
      radar:            ["crep-radar-dot"],
      orbitalDebris:    ["crep-orbital-debris-dot"],
      debrisCloud:      ["crep-debris-cloud-heat"],
    };
    for (const [layerId, mapIds] of Object.entries(layerIdToMap)) {
      const found = layers.find((l) => l.id === layerId);
      // Apr 20, 2026 (Morgan: "on live no substations are selctable also").
      // Previously we did `enabled ?? false` — if the registry ID didn't
      // exist in the layers array (e.g. "substations" / "transmissionLines"
      // which were always-on and never added as toggles), enabled became
      // false → we hid the layer → clicks couldn't register. Now: if the
      // registry entry is missing, LEAVE visibility alone (default-visible
      // layers stay that way). Only sync visibility for registered toggles.
      if (!found) continue;
      const vis = found.enabled ? "visible" : "none";
      for (const id of mapIds) {
        try {
          if (m.getLayer(id)) m.setLayoutProperty(id, "visibility", vis);
        } catch { /* layer not attached yet */ }
      }
    }
  }, [layers]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SGP4 SATELLITE ANIMATION — Real-time propagation at ~10 FPS
  // Runs via requestAnimationFrame, independent of React state. Pushes positions
  // directly into the MapLibre "crep-live-satellites" source and generates orbit
  // path lines into "crep-live-satellite-orbits".
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const map = mapNativeRef.current;
    if (!map || filteredSatellites.length === 0) return;

    // Build satellite inputs with orbital elements in properties.
    // NOTE: satellite-registry returns line1/line2/meanMotion/etc at the
    // TOP level of each record. SGP4Propagator only reads `.properties.*`,
    // so we merge top-level orbital fields INTO properties here. Without
    // this merge, no satellites get TLE data → no SGP4 propagation → the
    // satellite layer never visibly moves.
    const satInputs = filteredSatellites.map((s: any) => ({
      id: s.id,
      properties: {
        ...(s.properties || {}),
        // TLE strings (preferred)
        line1: s.line1 ?? s.properties?.line1,
        line2: s.line2 ?? s.properties?.line2,
        // Epoch + individual Keplerian elements (fallback)
        noradId: s.noradId ?? s.properties?.noradId,
        name: s.name ?? s.properties?.name,
        epoch: s.tleEpoch ?? s.properties?.epoch,
        meanMotion: s.meanMotion ?? s.properties?.meanMotion,
        eccentricity: s.eccentricity ?? s.properties?.eccentricity,
        inclination: s.inclination ?? s.properties?.inclination,
        raAscNode: s.raAscNode ?? s.properties?.raAscNode,
        argPericenter: s.argPericenter ?? s.properties?.argPericenter,
        meanAnomaly: s.meanAnomaly ?? s.properties?.meanAnomaly,
        bstar: s.bstar ?? s.properties?.bstar,
      },
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

    // THROTTLED STREAM — the previous implementation called setStreamedEntities
    // on EVERY incoming WebSocket message (up to hundreds/second). With 50K
    // entities in state, each setState triggered a full React re-render + the
    // deckEntities useMemo + the LOD data pump — fully stalling the main
    // thread within ~5 minutes of streaming. That's the "UI unclickable after
    // 5 min" symptom.
    //
    // Now we buffer messages in a ref and flush to React state ONCE per
    // animation frame (max 60Hz, typically batched into ~10-20Hz when the
    // browser is busy). This keeps the UI responsive while still showing
    // fresh entity positions.
    const buffer = new Map<string, UnifiedEntity>();
    let frame: number | null = null;
    const flush = () => {
      if (buffer.size === 0) { frame = null; return; }
      const updates = Array.from(buffer.values());
      buffer.clear();
      setStreamedEntities((previous) => {
        const next = new Map(previous.map((entity) => [entity.id, entity]));
        for (const e of updates) next.set(e.id, e);
        // Cap at 50K entries (drop oldest by insertion order)
        if (next.size > 50000) {
          const excess = next.size - 50000;
          const keys = Array.from(next.keys()).slice(0, excess);
          for (const k of keys) next.delete(k);
        }
        return Array.from(next.values());
      });
      frame = null;
    };

    entityStreamClientRef.current.connect((incomingEntity) => {
      buffer.set(incomingEntity.id, incomingEntity);
      if (frame === null) frame = requestAnimationFrame(flush);
    });

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      buffer.clear();
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
      {/* Apr 23, 2026 — <RegisterCrepDataServiceWorker /> removed. Its
          /sw-crep-data.js fought with /crep-sw.js (both scope "/") and
          caused auto-refreshes mid-session. The old SW is now a
          self-unregistering stub (public/sw-crep-data.js) that drops
          its cache and removes itself the next time a user hits the
          page — after which only /crep-sw.js runs, which is the
          unified cache for /data/crep + /crep/icons + /_next/static. */}
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
          {/* Entity counts: planes / boats / sats / nature (visible so user can see when they are 0) */}
          <div
            className="flex items-center gap-2 px-2 py-1 rounded bg-black/40 border border-gray-600/40"
            title="Aircraft from FlightRadar24+OpenSky+ADSB.lol, vessels from AISStream+BarentsWatch+DMA+SDR, satellites from SatNOGS+CelesTrak+TLE mirror, nature from MINDEX+iNaturalist+GBIF"
          >
            <span className={cn("text-[9px] font-mono", aircraft.length === 0 ? "text-amber-400" : "text-sky-400")}>
              Planes: {aircraft.length}
            </span>
            <span className="text-gray-600">|</span>
            <span className={cn("text-[9px] font-mono", vessels.length === 0 ? "text-amber-400" : "text-teal-400")}>
              Boats: {vessels.length}
            </span>
            <span className="text-gray-600">|</span>
            <span className={cn("text-[9px] font-mono", satellites.length === 0 ? "text-amber-400" : "text-purple-400")}>
              Sats: {satellites.length}
            </span>
            <span className="text-gray-600">|</span>
            <span className={cn("text-[9px] font-mono", fungalObservations.length === 0 ? "text-amber-400" : "text-green-400")}>
              Nature: {fungalObservations.length}
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
                    ? `${visibleFungalObservations.length}/${fungalObservations.length} NATURE`
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
              {/* Apr 20, 2026 (Morgan: "modifications of intel feed ...
                  to include all new data changes features"). Eagle Eye
                  live counts block — listens for crep:eagle:*-counts
                  CustomEvents dispatched by EagleEyeOverlay and shows
                  per-provider tallies (Shinobi / 511 / Windy / EarthCam /
                  NPS / USGS + YouTube Live / Bluesky / Mastodon / etc.).
                  Click a provider row to focus the overlay on it. */}
              <div className="px-3 pb-2">
                <IntelFeedEagleEyeSection />
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
              // Expose for debug / external animation loops that run at
              // module scope and need to find the map without a React ref.
              if (typeof window !== "undefined") (window as any).__crep_map = map;
              // Register PMTiles protocol for vector tile sources
              import("maplibre-gl").then((ml) => registerPMTilesProtocol(ml.default));
              console.log("[CREP] Map loaded, reference captured for auto-zoom");

              // Apr 20, 2026 (Morgan: "crep keeps reloading"). Diagnosed via
              // headless browser: it's NOT actually reloading (1 navigation
              // in 50 s), but MapLibre throws "Error: feature index out of
              // bounds" 10× per cursor mousemove. Each one bubbles into
              // Next.js dev's console-error interceptor → red Fast Refresh
              // overlay → looks like a reload. Root cause is MapLibre
              // querying a layer's feature index while we're updating that
              // source's data via the rAF loop (aircraft / vessels every
              // 200 ms).
              //
              // Suppress the noise: install a map-level error handler that
              // swallows this specific error class (it's harmless — the
              // hover query just returns nothing for that frame; next
              // frame works). All other map errors still propagate.
              try {
                map.on("error", (e: any) => {
                  const msg = e?.error?.message || String(e?.error || "")
                  if (/feature index out of bounds/i.test(msg)) return
                  console.warn("[MapLibre]", msg)
                })
                // Override the page-global window.onerror for this exact
                // class so Next.js dev overlay doesn't react either.
                if (typeof window !== "undefined") {
                  const origOnError = window.onerror
                  window.onerror = function (message, ...rest) {
                    if (typeof message === "string" && /feature index out of bounds/i.test(message)) {
                      return true // suppress
                    }
                    if (typeof origOnError === "function") return origOnError.call(this, message, ...rest)
                    return false
                  }
                }
              } catch { /* ignore */ }

              // ════════════════════════════════════════════════════════════
              // LIVE ENTITY LAYERS — aircraft, satellites, vessels
              // Created empty here, data pumped in by useEffect every 250ms.
              // MapLibre native = 100% reliable, no deck.gl issues.
              // ════════════════════════════════════════════════════════════
              const emptyFC = { type: "FeatureCollection" as const, features: [] as any[] };

              // ─────────────────────────────────────────────────────────────
              // Helper: rasterize an SVG URL into an HTMLImageElement, then
              // register with map.addImage(). Using non-SDF mode preserves
              // the full-color detailed artwork (gradients, shadows, etc.)
              // SDF would strip it down to a one-color mask → dots again.
              // ─────────────────────────────────────────────────────────────
              const SPRITE_SIZE = 128; // high-res so planes stay crisp zoomed in
              const loadDetailedIcon = (url: string, name: string, size = SPRITE_SIZE): Promise<void> =>
                new Promise((resolve) => {
                  const img = new Image(size, size);
                  img.crossOrigin = "anonymous";
                  img.onload = () => {
                    try {
                      const c = document.createElement("canvas");
                      c.width = size; c.height = size;
                      const ctx = c.getContext("2d")!;
                      ctx.clearRect(0, 0, size, size);
                      ctx.drawImage(img, 0, 0, size, size);
                      const data = ctx.getImageData(0, 0, size, size);
                      if (!map.hasImage(name)) map.addImage(name, data, { pixelRatio: 2 });
                    } catch (e) { console.warn(`[CREP/icons] rasterize failed for ${name}:`, e); }
                    resolve();
                  };
                  img.onerror = () => {
                    console.warn(`[CREP/icons] failed to load ${url} — using fallback silhouette`);
                    resolve();
                  };
                  img.src = url;
                });

              try {
                // ═══════════════════════════════════════════════════════════
                // ✈ AIRCRAFT — Detailed plane sprite (fuselage + wings +
                // engines + cabin windows + nav lights) loaded from SVG.
                // Colored artwork preserved (not flat amber dot).
                // ═══════════════════════════════════════════════════════════
                map.addSource("crep-live-aircraft", { type: "geojson", data: emptyFC });
                void loadDetailedIcon("/crep/icons/aircraft.svg", "aircraft-icon");
                // Apr 22, 2026 — Morgan: "all airplanes that are registered
                // as helecopters need a helecopter icon not a plane".
                // Load a second sprite for rotorcraft so the icon-image
                // expression below can switch per-feature.
                void loadDetailedIcon("/crep/icons/helicopter.svg", "helicopter-icon");
                // Placeholder so the ordering below stays predictable
                map.addLayer({ id: "crep-live-aircraft-glow", type: "circle", source: "crep-live-aircraft",
                  paint: { "circle-radius": 0, "circle-opacity": 0 }});
                // Aircraft ICON (symbol layer — rotates by heading, detailed plane sprite)
                map.addLayer({ id: "crep-live-aircraft-dot", type: "symbol", source: "crep-live-aircraft",
                  layout: {
                    // Helicopters: ICAO category 8 (Rotorcraft), OpenSky
                    // `category: 8`, or aircraft type strings that match
                    // the regex "heli|rotor|copter". Pump-tick puts
                    // `is_helo:true` on those features so the expression
                    // can switch cleanly at render time (no per-frame JS).
                    "icon-image": [
                      "case",
                      ["==", ["coalesce", ["get", "is_helo"], false], true],
                      "helicopter-icon",
                      "aircraft-icon",
                    ],
                    // Detailed sprite → render at ~22–50px screen size
                    "icon-size": ["interpolate", ["linear"], ["zoom"], 2, 0.18, 6, 0.24, 10, 0.34, 14, 0.48],
                    "icon-rotate": ["get", "heading"],
                    "icon-rotation-alignment": "map",
                    "icon-allow-overlap": true, "icon-ignore-placement": true }});
                // Click + hover
                map.on("click", "crep-live-aircraft-dot", (e: any) => {
                  const id = e.features?.[0]?.properties?.id;
                  if (!id) return;
                  lastEntityPickTimeRef.current = Date.now();
                  // Apr 19, 2026 (Morgan: "no widgets working for them"):
                  // This handler is a CLOSURE captured in onLoad when
                  // filteredAircraft was []. A live lookup via window
                  // ref (populated by the data-pump useEffect) gets the
                  // current aircraft list regardless of when the click
                  // happens.
                  const list = (window as any).__crep_aircraft as any[] | undefined;
                  const ac = list?.find((a) => a.id === id);
                  if (ac) setSelectedAircraft(ac);
                });
                map.on("mouseenter", "crep-live-aircraft-dot", () => { map.getCanvas().style.cursor = "pointer"; });
                map.on("mouseleave", "crep-live-aircraft-dot", () => { map.getCanvas().style.cursor = ""; });

                // ═══════════════════════════════════════════════════════════
                // 🛰 SATELLITES — Detailed satellite sprite (solar panels +
                // bus body + dish + antennas) loaded from SVG. Not a dot.
                // ═══════════════════════════════════════════════════════════
                map.addSource("crep-live-satellites", { type: "geojson", data: emptyFC });
                void loadDetailedIcon("/crep/icons/satellite.svg", "satellite-icon");
                // Apr 20, 2026 (Morgan: "look at how all satelites are shown
                // with altitude on their globe"). Satellites now color-tiered
                // by orbital class:
                //   LEO (<2000 km)  — cyan    — Starlink, ISS, Landsat…
                //   MEO (2k-20k km) — purple  — GPS, GLONASS, Galileo…
                //   GEO (>20k km)   — amber   — geostationary comms
                // Halo size also scales with altitude tier so higher orbits
                // read as "further away" glyph-size cues. Reads from
                // feature.properties.altitude (km) pushed by the SGP4 loop.
                map.addLayer({ id: "crep-live-satellites-glow", type: "circle", source: "crep-live-satellites",
                  paint: {
                    "circle-radius": [
                      "interpolate", ["linear"], ["zoom"],
                      2, ["case",
                        [">=", ["coalesce", ["to-number", ["get", "altitude_km"]], ["to-number", ["get", "altitude"]], 0], 20000], 9,
                        [">=", ["coalesce", ["to-number", ["get", "altitude_km"]], ["to-number", ["get", "altitude"]], 0], 2000], 7,
                        5,
                      ],
                      6, ["case",
                        [">=", ["coalesce", ["to-number", ["get", "altitude_km"]], ["to-number", ["get", "altitude"]], 0], 20000], 12,
                        [">=", ["coalesce", ["to-number", ["get", "altitude_km"]], ["to-number", ["get", "altitude"]], 0], 2000], 9,
                        7,
                      ],
                      10, ["case",
                        [">=", ["coalesce", ["to-number", ["get", "altitude_km"]], ["to-number", ["get", "altitude"]], 0], 20000], 16,
                        [">=", ["coalesce", ["to-number", ["get", "altitude_km"]], ["to-number", ["get", "altitude"]], 0], 2000], 12,
                        10,
                      ],
                    ],
                    "circle-color": [
                      "case",
                      [">=", ["coalesce", ["to-number", ["get", "altitude_km"]], ["to-number", ["get", "altitude"]], 0], 20000], "#fbbf24",  // GEO amber
                      [">=", ["coalesce", ["to-number", ["get", "altitude_km"]], ["to-number", ["get", "altitude"]], 0], 2000], "#a855f7",   // MEO purple
                      "#22d3ee",                                                                       // LEO cyan
                    ],
                    "circle-opacity": 0.22,
                    "circle-blur": 0.9,
                  }});
                // Detailed sprite
                map.addLayer({ id: "crep-live-satellites-dot", type: "symbol", source: "crep-live-satellites",
                  layout: {
                    "icon-image": "satellite-icon",
                    "icon-size": ["interpolate", ["linear"], ["zoom"], 2, 0.16, 6, 0.22, 10, 0.32, 14, 0.46],
                    // Slow spin from SGP4 heading if present — otherwise stay put
                    "icon-rotate": ["coalesce", ["get", "heading"], 0],
                    "icon-rotation-alignment": "viewport",
                    "icon-allow-overlap": true, "icon-ignore-placement": true }});
                // Labels added later when style fonts are known
                map.on("click", "crep-live-satellites-dot", (e: any) => {
                  const id = e.features?.[0]?.properties?.id;
                  if (!id) return;
                  lastEntityPickTimeRef.current = Date.now();
                  // Live-list lookup (see aircraft handler comment).
                  const list = (window as any).__crep_satellites as any[] | undefined;
                  const sat = list?.find((s) => s.id === id);
                  if (sat) setSelectedSatellite(sat);
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
                // 🚢 VESSELS — Detailed cargo-ship sprite (hull + deck +
                // bridge superstructure + stack + lifeboats) from SVG.
                // ═══════════════════════════════════════════════════════════
                map.addSource("crep-live-vessels", { type: "geojson", data: emptyFC });
                void loadDetailedIcon("/crep/icons/vessel.svg", "vessel-icon");
                map.addLayer({ id: "crep-live-vessels-glow", type: "circle", source: "crep-live-vessels",
                  paint: { "circle-radius": 0, "circle-opacity": 0 }});
                map.addLayer({ id: "crep-live-vessels-dot", type: "symbol", source: "crep-live-vessels",
                  layout: {
                    "icon-image": "vessel-icon",
                    "icon-size": ["interpolate", ["linear"], ["zoom"], 2, 0.14, 6, 0.22, 10, 0.34, 14, 0.5],
                    "icon-rotate": ["get", "heading"],
                    "icon-rotation-alignment": "map",
                    "icon-allow-overlap": true, "icon-ignore-placement": true }});
                map.on("click", "crep-live-vessels-dot", (e: any) => {
                  const id = e.features?.[0]?.properties?.id;
                  if (!id) return;
                  lastEntityPickTimeRef.current = Date.now();
                  // Live-list lookup (see aircraft handler comment).
                  const list = (window as any).__crep_vessels as any[] | undefined;
                  const v = list?.find((vv) => vv.id === id);
                  if (v) setSelectedVessel(v);
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

                // ═══════════════════════════════════════════════════════════
                // MILITARY BASES — Red-orange dots (OSM + MINDEX)
                // Military installations, bases, airfields, ranges globally
                // Default: hidden (sensitive data, user opts in)
                // ═══════════════════════════════════════════════════════════
                map.addSource("crep-live-military", { type: "geojson", data: emptyFC });
                // Generate military shield icon via canvas
                const milCanvas = document.createElement("canvas");
                milCanvas.width = 32; milCanvas.height = 32;
                const milCtx = milCanvas.getContext("2d")!;
                milCtx.fillStyle = "white";
                milCtx.beginPath();
                // Shield shape
                milCtx.moveTo(16, 2); milCtx.lineTo(28, 8); milCtx.lineTo(26, 20);
                milCtx.lineTo(16, 30); milCtx.lineTo(6, 20); milCtx.lineTo(4, 8);
                milCtx.closePath(); milCtx.fill();
                // Star cutout in center
                milCtx.fillStyle = "rgba(0,0,0,0.3)";
                milCtx.beginPath();
                milCtx.moveTo(16, 10); milCtx.lineTo(18, 16); milCtx.lineTo(24, 16);
                milCtx.lineTo(19, 20); milCtx.lineTo(21, 26); milCtx.lineTo(16, 22);
                milCtx.lineTo(11, 26); milCtx.lineTo(13, 20); milCtx.lineTo(8, 16);
                milCtx.lineTo(14, 16); milCtx.closePath(); milCtx.fill();
                map.addImage("military-shield", milCtx.getImageData(0, 0, 32, 32), { sdf: true });
                // Perimeter zone — large red-tinted translucent circle (restricted area feel)
                map.addLayer({ id: "crep-live-military-glow", type: "circle", source: "crep-live-military",
                  paint: {
                    "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 10, 6, 16, 10, 30, 14, 50],
                    "circle-color": "#dc2626", "circle-opacity": 0.08,
                    "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 2, 1, 10, 2, 14, 3],
                    "circle-stroke-color": "#dc2626", "circle-stroke-opacity": 0.4 },
                  layout: { visibility: "visible" }});
                // Shield icon (symbol layer — red, distinct from all other features)
                map.addLayer({ id: "crep-live-military-dot", type: "symbol", source: "crep-live-military",
                  layout: {
                    "icon-image": "military-shield",
                    "icon-size": ["interpolate", ["linear"], ["zoom"], 2, 0.4, 6, 0.6, 10, 0.9, 14, 1.4],
                    "icon-allow-overlap": true, "icon-ignore-placement": true,
                    visibility: "visible" },
                  paint: { "icon-color": "#dc2626", "icon-halo-color": "#000", "icon-halo-width": 1.5 }});
                // Military base PERIMETER polygons — exact boundary outlines from OSM
                map.addSource("crep-military-perimeters", { type: "geojson", data: emptyFC });
                // Translucent red fill showing restricted zone — VISIBLE at all zooms
                map.addLayer({ id: "crep-military-perimeters-fill", type: "fill", source: "crep-military-perimeters",
                  paint: { "fill-color": "#dc2626", "fill-opacity": 0.15 },
                  layout: { visibility: "visible" }});
                // BRIGHT red perimeter boundary line — thick enough to see at all zooms
                map.addLayer({ id: "crep-military-perimeters-line", type: "line", source: "crep-military-perimeters",
                  paint: {
                    "line-color": "#dc2626",
                    "line-width": ["interpolate", ["linear"], ["zoom"], 2, 1.5, 6, 2, 10, 3, 14, 4],
                    "line-opacity": 0.9 },
                  layout: { visibility: "visible" }});
                // Click handler
                map.on("click", "crep-live-military-dot", (e: any) => {
                  const props = e.features?.[0]?.properties;
                  if (props) {
                    lastEntityPickTimeRef.current = Date.now();
                    try {
                      const milId = props.id;
                      const matched = (window as any).__crep_military?.find((m: any) => m.id === milId);
                      if (matched) {
                        setSelectedInfraAsset({
                          type: "military",
                          id: matched.id,
                          name: matched.name || "Military Facility",
                          lat: matched.lat,
                          lng: matched.lng,
                          properties: {
                            ...matched.tags,
                            facility_type: matched.type,
                            operator: matched.operator,
                            country: matched.country,
                            military: matched.type,
                          },
                        });
                      }
                    } catch {}
                  }
                });
                map.on("mouseenter", "crep-live-military-dot", () => { map.getCanvas().style.cursor = "pointer"; });
                map.on("mouseleave", "crep-live-military-dot", () => { map.getCanvas().style.cursor = ""; });

                console.log("[CREP/Live] Native entity layers created — ✈ amber + labels, 🛰 purple + labels, 🚢 cyan + labels, buoy lime-green");

                // ═══════════════════════════════════════════════════════════
                // MYCOSOFT DEVICES (Apr 19, 2026) — unified source, per-type
                // styling + click routing. All devices have a MycoBrain
                // inside; the feature's `device_type` property determines
                // which dedicated widget opens on click.
                //
                // Device types (match lib/mycobrain/types.ts + components/
                // crep/devices/*-widget.tsx):
                //   mushroom1   — Mushroom 1 fruiting-body monitor
                //   hyphae1     — Hyphae 1 mycelium VOC sensor
                //   sporebase   — SporeBase spore counter
                //   myconode    — MycoNode edge compute (Jetson + MQTT)
                //   alarm       — Event-trigger sensor
                //   psathyrella — Aquatic MycoBrain buoy
                //
                // Source populated by /api/crep/mycosoft-devices (proxies
                // MQTT broker / MDP / MMP via the Jetson-MycoBrain bridge).
                // Empty until devices come online — filter toggles exist
                // regardless so the UI is ready.
                // ═══════════════════════════════════════════════════════════
                map.addSource("crep-mycosoft-devices", { type: "geojson", data: emptyFC, generateId: true });
                // Soft halo ring (device identity glow)
                map.addLayer({
                  id: "crep-mycosoft-devices-glow",
                  type: "circle",
                  source: "crep-mycosoft-devices",
                  paint: {
                    "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 4, 6, 6, 10, 9, 14, 14],
                    "circle-color": [
                      "match", ["get", "device_type"],
                      "mushroom1",   "#a855f7",
                      "hyphae1",     "#f97316",
                      "sporebase",   "#10b981",
                      "myconode",    "#06b6d4",
                      "alarm",       "#ef4444",
                      "psathyrella", "#38bdf8",
                      "#22c55e",
                    ],
                    "circle-opacity": 0.22,
                    "circle-blur": 0.9,
                  },
                });
                // Inner core dot with white ring (MycoBrain signature)
                map.addLayer({
                  id: "crep-mycosoft-devices-core",
                  type: "circle",
                  source: "crep-mycosoft-devices",
                  paint: {
                    "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 1.6, 6, 2.5, 10, 4, 14, 6.5],
                    "circle-color": [
                      "match", ["get", "device_type"],
                      "mushroom1",   "#a855f7",
                      "hyphae1",     "#f97316",
                      "sporebase",   "#10b981",
                      "myconode",    "#06b6d4",
                      "alarm",       "#ef4444",
                      "psathyrella", "#38bdf8",
                      "#22c55e",
                    ],
                    "circle-opacity": 0.95,
                    "circle-stroke-width": 1.2,
                    "circle-stroke-color": "#ffffff",
                    "circle-stroke-opacity": 0.85,
                  },
                });

                // Click → parse device_type → hand payload to the global
                // device-widget dispatcher. Each widget (mushroom1, hyphae1,
                // sporebase, myconode, alarm) already exists under
                // components/crep/devices/ and subscribes to the MycoBrain
                // MQTT topic on mount. The dispatcher reads the ID prefix
                // (each device id is `<type>-<serial>`) so the router can
                // mount the right widget even if device_type is missing.
                map.on("click", "crep-mycosoft-devices-core", (e: any) => {
                  const f = e.features?.[0];
                  if (!f) return;
                  const p = f.properties || {};
                  const coords = e.lngLat;
                  const id: string = p.id || "";
                  const typeFromId = id.match(/^(mushroom1|hyphae1|sporebase|myconode|alarm|psathyrella)/i)?.[1]?.toLowerCase();
                  const deviceType = p.device_type || typeFromId || "mycobrain";
                  lastEntityPickTimeRef.current = Date.now();
                  try {
                    const hook = (window as any).__crep_openDeviceWidget as ((payload: any) => void) | undefined;
                    const payload = {
                      id, deviceType,
                      name: p.name || `${deviceType} ${id.slice(-6)}`,
                      lat: coords?.lat ?? 0,
                      lng: coords?.lng ?? 0,
                      status: p.status,
                      mycobrainId: p.mycobrain_id || p.mycobrainId,
                      telemetry: p,
                    };
                    if (typeof hook === "function") hook(payload);
                    // Fallback: surface via the generic InfraAsset panel
                    else {
                      const genericHook = (window as any).__crep_selectAsset;
                      if (typeof genericHook === "function") genericHook({
                        type: "mycobrain_device",
                        id, name: payload.name,
                        lat: payload.lat, lng: payload.lng,
                        properties: { device_type: deviceType, mycobrain_id: payload.mycobrainId, ...p },
                      });
                    }
                    window.dispatchEvent(new CustomEvent("crep:device:click", { detail: payload }));
                  } catch { /* ignore */ }
                });
                map.on("mouseenter", "crep-mycosoft-devices-core", () => { map.getCanvas().style.cursor = "pointer"; });
                map.on("mouseleave", "crep-mycosoft-devices-core", () => { map.getCanvas().style.cursor = ""; });
                // Initial data pump — fill entity sources 1s after creation so aircraft/sats show immediately.
                // The React data pump effect may miss the first render if deckEntities was set before mapNativeRef.
                setTimeout(() => {
                  try {
                    const entities = (window as any).__crep_deckEntities;
                    if (!entities?.length) return;
                    const toFC = (ents: any[]) => ({
                      type: "FeatureCollection" as const,
                      features: ents.filter((e: any) => e.geometry?.coordinates?.length >= 2).map((e: any) => ({
                        type: "Feature" as const,
                        properties: { id: e.id, heading: e.state?.heading ?? 0, type: e.type,
                          name: e.properties?.callsign || e.properties?.name || e.properties?.mmsi || e.id },
                        geometry: e.geometry,
                      })),
                    });
                    const b = map.getBounds();
                    const bbox = { north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() };
                    const zoom = map.getZoom?.() ?? 2;
                    const ac = entities.filter((e: any) => e.type === "aircraft");
                    const v = entities.filter((e: any) => e.type === "vessel");
                    const acFc = toFC(ac);
                    const vFc = toFC(v);
                    // Apr 22, 2026 v3 — LOD-aware initial pump so the
                    // first paint also respects world-zoom 30% floor +
                    // strict viewport cull on zoom-in.
                    const acFeatures = lodSelectForZoom(acFc.features, bbox, zoom, 2);
                    const vFeatures = lodSelectForZoom(vFc.features, bbox, zoom, 2);
                    (map.getSource("crep-live-aircraft") as any)?.setData({ type: "FeatureCollection", features: acFeatures });
                    // Satellites are handled by SGP4 satellite-animation module — not pumped here
                    (map.getSource("crep-live-vessels") as any)?.setData({ type: "FeatureCollection", features: vFeatures });
                    console.log(`[CREP/Live] Initial pump: ✈${ac.length}→${acFeatures.length} 🚢${v.length}→${vFeatures.length} @z${zoom.toFixed(1)} (LOD-selected)`);
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
                // Helpers must be resilient: the map may be torn down (React
                // re-mount, HMR, navigation) between the async fetch kicking
                // off and the callback trying to addSource. Guard against
                // that by checking for the map + style being available.
                const mapReady = () => !!(map && (map as any).style && typeof map.getSource === "function");
                const safeAddSource = (id: string, spec: any) => {
                  if (!mapReady()) return;
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
                  if (!mapReady()) return;
                  try {
                    if (map.getLayer(spec.id)) {
                      map.removeLayer(spec.id);
                    }
                    map.addLayer(spec);
                  } catch (e: any) {
                    console.warn(`[CREP/Infra] Layer ${spec.id}:`, e.message);
                  }
                };

                // ════════════════════════════════════════════════════════
                // ZERO-LATENCY STATIC LAYER — permanent infra locations
                // (ports, data centers) bundled with the client. No network
                // round-trip, no MINDEX query, no Overpass fetch. Paints
                // INSTANTLY on map load.
                // ════════════════════════════════════════════════════════
                try {
                  const portFeatures = MAJOR_PORTS.map((p) => ({
                    type: "Feature" as const,
                    properties: {
                      id: p.id, name: p.name, country: p.country,
                      teuM: p.teuM ?? null, kind: p.kind, layer: "port",
                    },
                    geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
                  }));
                  safeAddSource("crep-static-ports", { type: "geojson", data: { type: "FeatureCollection", features: portFeatures } });
                  safeAddLayer({
                    id: "crep-static-ports-circle", type: "circle", source: "crep-static-ports",
                    paint: {
                      "circle-radius": [
                        "interpolate", ["linear"], ["zoom"],
                        2, ["max", 2, ["*", ["sqrt", ["max", 0.5, ["to-number", ["get", "teuM"], 1]]], 0.8]],
                        6, ["max", 3, ["*", ["sqrt", ["max", 0.5, ["to-number", ["get", "teuM"], 1]]], 1.4]],
                        10, ["max", 4, ["*", ["sqrt", ["max", 0.5, ["to-number", ["get", "teuM"], 1]]], 2.2]],
                      ],
                      "circle-color": "#0891b2",  // cyan-600 — anchors & shipping
                      "circle-opacity": 0.75,
                      "circle-stroke-width": 1,
                      "circle-stroke-color": "#0e7490",
                    },
                  });
                  console.log(`[CREP/Static] ${portFeatures.length} major ports rendered (zero-latency)`);
                } catch (e) {
                  console.warn("[CREP/Static] port layer failed:", e);
                }

                try {
                  const dcFeatures = MAJOR_DATACENTERS.map((d) => ({
                    type: "Feature" as const,
                    properties: {
                      id: d.id, name: d.name, operator: d.operator,
                      region: d.region, country: d.country, layer: "data_center",
                    },
                    geometry: { type: "Point" as const, coordinates: [d.lng, d.lat] },
                  }));
                  safeAddSource("crep-static-dcs", { type: "geojson", data: { type: "FeatureCollection", features: dcFeatures } });
                  safeAddLayer({
                    id: "crep-static-dcs-circle", type: "circle", source: "crep-static-dcs",
                    paint: {
                      "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 2.5, 6, 4, 10, 6],
                      "circle-color": "#7c3aed",  // violet-600 — data centers
                      "circle-opacity": 0.8,
                      "circle-stroke-width": 1,
                      "circle-stroke-color": "#5b21b6",
                    },
                  });
                  console.log(`[CREP/Static] ${dcFeatures.length} hyperscale DCs rendered (zero-latency)`);
                } catch (e) {
                  console.warn("[CREP/Static] DC layer failed:", e);
                }

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

                // ════════════════════════════════════════════════════════
                // PRIMARY CABLE SOURCE: static /data/crep/submarine-cables.geojson
                // ════════════════════════════════════════════════════════
                // 710 cables sourced from TeleGeography (CC-BY 4.0) — REAL
                // seafloor routes with antimeridian splits already applied.
                // Loads ~725KB once (browser-cached on subsequent visits),
                // ZERO MINDEX / Overpass round-trip, accurate to the meter.
                //
                // MINDEX is ONLY used as a metadata-enrichment fallback if
                // the static file fails to load (network issue).
                // ════════════════════════════════════════════════════════
                const loadStaticCables = async (): Promise<any | null> => {
                  try {
                    const res = await fetch("/data/crep/submarine-cables.geojson", {
                      cache: "default", // browser HTTP cache respects the file's far-future headers
                    });
                    if (!res.ok) return null;
                    const geojson = await res.json();
                    const features = (geojson.features || [])
                      .filter((f: any) => f?.geometry?.coordinates?.length)
                      .map((f: any, i: number) => ({
                        type: "Feature" as const,
                        properties: {
                          ...f.properties,
                          name: f.properties?.name ?? "Unnamed cable",
                          color: f.properties?.color || cableColors[i % cableColors.length],
                          cable_id: f.properties?.id || f.properties?.feature_id,
                          source: "telegeography",
                          status: f.properties?.status || "Active",
                        },
                        // TeleGeography already emits correct MultiLineString
                        // with antimeridian handled, but pass through our splitter
                        // anyway to be safe.
                        geometry: splitAntimeridian(f.geometry),
                      }));
                    return features.length ? { features } : null;
                  } catch {
                    return null;
                  }
                };

                loadStaticCables().then(async (staticData) => {
                  let features: any[] | null = staticData?.features || null;

                  // Fall back to MINDEX if static file unavailable
                  if (!features) {
                    const [west, east] = await Promise.all([
                      mindexFetch("submarine-cables", { north: 85, south: -60, east: 0, west: -180 }, 5000).catch(() => ({ entities: [] })),
                      mindexFetch("submarine-cables", { north: 85, south: -60, east: 180, west: 0 }, 5000).catch(() => ({ entities: [] })),
                    ]);
                    const allCables = [...(west?.entities || []), ...(east?.entities || [])];
                    const seen = new Set<string>();
                    const uniq = allCables.filter(e => { if (!e.id || seen.has(e.id)) return false; seen.add(e.id); return true; });
                    features = uniq
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
                        const geom = splitAntimeridian(e.properties.route);
                        return [{
                          type: "Feature" as const,
                          properties: props,
                          geometry: geom,
                        }];
                      });
                  }
                  if (!features || !features.length) return;
                  safeAddSource("crep-cables", { type: "geojson", data: { type: "FeatureCollection", features } });
                  // Apr 20, 2026 (Morgan OpenPowerGrid parity: "all infra
                  // especially electrical needs a glow to the icons lines
                  // and needs to stand out better over sat layer"). Add a
                  // blurred glow halo BEHIND the crisp line so cables
                  // read neon-bright over dark basemap AND sat imagery.
                  safeAddLayer({
                    id: "crep-cables-line-glow", type: "line", source: "crep-cables",
                    paint: {
                      "line-color": ["get", "color"],
                      "line-width": ["interpolate", ["linear"], ["zoom"], 1, 4, 4, 7, 8, 12],
                      "line-opacity": 0.45,
                      "line-blur": 3,
                    },
                  });
                  safeAddLayer({
                    id: "crep-cables-line", type: "line", source: "crep-cables",
                    paint: {
                      "line-color": ["get", "color"],
                      "line-width": ["interpolate", ["linear"], ["zoom"], 1, 1.5, 4, 2.5, 8, 4],
                      "line-opacity": 0.95,
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
                  // Apr 19, 2026 (Morgan: "sea cables only highlight part
                  // seen in viewport not entire cable"). Register the full
                  // feature list so highlightFromEvent uses it instead of
                  // MapLibre's viewport-clipped querySourceFeatures.
                  try {
                    const { registerLineFeatures } = await import("@/lib/crep/infra-highlight");
                    registerLineFeatures("crep-cables", features);
                  } catch { /* ignore dynamic import failure */ }
                  setInfraCableRoutes(features as any);
                  console.log(`[CREP/Infra] ${features.length} cables → MapLibre (multi-color, registered for full-line highlight)`);
                }).catch((err) => console.warn("[CREP/Infra] Error:", err?.message || err));

                // ══════════════════════════════════════════════════════════
                // VIEWPORT-SCOPED INFRA FETCH (Fix A — Apr 18, 2026)
                // ══════════════════════════════════════════════════════════
                // Previous approach fanned out 116 parallel MINDEX queries per
                // source (1 per state/province/country bbox) on mount. That
                // meant 4 sources × 116 bboxes = 464 concurrent 30-second
                // requests, 97+116 of which timed out per audit. The
                // substations source ended up with ZERO features after 2,530
                // cumulative seconds of wasted requests + 51 MB of transfer.
                //
                // New approach: fetch ONLY the viewport bbox, only when
                // zoomed in enough to benefit from MINDEX live infra (zoom
                // ≥ 5). At lower zoom, the bundled static GeoJSONs in
                // public/data/crep/ provide US-wide coverage. LRU-cached by
                // bbox for 60s. Debounced on moveend.
                //
                // Result: ~4 requests per mount (one per source) instead
                // of 464. ~200 ms each instead of 26+ seconds.
                // ══════════════════════════════════════════════════════════

                const INFRA_MINZOOM = 5 // below this, bundled static data only
                const BBOX_TTL_MS = 60_000
                const bboxCache = new Map<string, { ts: number; data: any[] }>()
                const bboxKey = (src: string, b: any) =>
                  `${src}:${b.west.toFixed(2)},${b.south.toFixed(2)},${b.east.toFixed(2)},${b.north.toFixed(2)}`

                const getViewportBbox = () => {
                  try {
                    const b = map.getBounds()
                    if (!b) return null
                    return {
                      north: b.getNorth(),
                      south: b.getSouth(),
                      east: b.getEast(),
                      west: b.getWest(),
                    }
                  } catch { return null }
                }

                const batchFetch = async (source: string, limit: number, onFirstBatch?: (results: any[]) => void) => {
                  const zoom = map.getZoom()
                  if (zoom < INFRA_MINZOOM) {
                    // Below zoom 5 → bundled static GeoJSON is sufficient
                    if (onFirstBatch) try { onFirstBatch([]) } catch {}
                    return []
                  }
                  const bbox = getViewportBbox()
                  if (!bbox) {
                    if (onFirstBatch) try { onFirstBatch([]) } catch {}
                    return []
                  }
                  const key = bboxKey(source, bbox)
                  const cached = bboxCache.get(key)
                  if (cached && Date.now() - cached.ts < BBOX_TTL_MS) {
                    if (onFirstBatch) try { onFirstBatch(cached.data) } catch {}
                    return cached.data
                  }
                  try {
                    const result = await mindexFetch(source as any, bbox, limit)
                    const results = [result]
                    bboxCache.set(key, { ts: Date.now(), data: results })
                    console.log(`[CREP/Infra] ${source}: 1 viewport request → ${result?.entities?.length || 0} features`)
                    if (onFirstBatch) try { onFirstBatch(results) } catch {}
                    return results
                  } catch (e) {
                    console.warn(`[CREP/Infra] ${source} viewport fetch failed:`, (e as Error)?.message)
                    if (onFirstBatch) try { onFirstBatch([]) } catch {}
                    return []
                  }
                }

                // Refetch infra on significant viewport change. Debounced 350ms.
                let moveendTimer: any = null
                let lastFetchBboxKey = ""
                const scheduleInfraRefetch = () => {
                  if (moveendTimer) clearTimeout(moveendTimer)
                  moveendTimer = setTimeout(() => {
                    const zoom = map.getZoom()
                    if (zoom < INFRA_MINZOOM) return
                    const bbox = getViewportBbox()
                    if (!bbox) return
                    // Only refetch if bbox moved materially (cache key changed)
                    const newKey = bboxKey("any", bbox)
                    if (newKey === lastFetchBboxKey) return
                    lastFetchBboxKey = newKey
                    // Re-run all four loaders
                    for (const [src, onBatch] of [
                      ["facilities", (rs: any[]) => {
                        const all = rs.flatMap(r => r?.entities || [])
                        const seen = new Set<string>()
                        const unique = all.filter(e => { if (!e.id || seen.has(e.id)) return false; seen.add(e.id); return true })
                        if (unique.length) renderFacilities(unique, "viewport-refetch")
                      }],
                      ["substations", (rs: any[]) => {
                        const all = rs.flatMap(r => r?.entities || [])
                        const seen = new Set<string>()
                        const unique = all.filter(e => { if (!e.id || seen.has(e.id)) return false; seen.add(e.id); return true })
                        if (unique.length) renderSubstations(unique, "viewport-refetch")
                      }],
                    ] as const) {
                      batchFetch(src, 5000).catch(() => {})
                        .then((rs) => { try { (onBatch as any)(rs) } catch {} })
                    }
                  }, 350)
                }
                map.on("moveend", scheduleInfraRefetch)

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
                  // Apr 20, 2026 (Morgan OpenPowerGrid parity): neon halo
                  // behind each plant so they stand out over sat imagery.
                  safeAddLayer({
                    id: "crep-plants-glow", type: "circle", source: "crep-plants",
                    paint: {
                      "circle-radius": [
                        "interpolate", ["linear"], ["zoom"],
                        2, ["*", ["+", 4, ["*", ["sqrt", ["min", 5000, ["max", 1, ["to-number", ["get", "capacity_mw"], 10]]]], 0.6]], 1],
                        8, ["*", ["+", 6, ["*", ["sqrt", ["min", 5000, ["max", 1, ["to-number", ["get", "capacity_mw"], 10]]]], 1.5]], 1],
                        14, ["*", ["+", 8, ["*", ["sqrt", ["min", 5000, ["max", 1, ["to-number", ["get", "capacity_mw"], 10]]]], 2.4]], 1],
                      ],
                      "circle-color": ["get", "color"],
                      "circle-opacity": 0.28,
                      "circle-blur": 1.1,
                    },
                    minzoom: 4,
                  });
                  // OpenGridWorks-style: radius scaled by sqrt(capacity_mw), CAPPED at 20px max
                  // Clamp capacity to 5000 MW max for sizing — prevents outliers (1.9M MW) from being huge
                  safeAddLayer({
                    id: "crep-plants-circle", type: "circle", source: "crep-plants",
                    paint: {
                      "circle-radius": [
                        "interpolate", ["linear"], ["zoom"],
                        2, ["min", 8,  ["max", 2, ["*", ["sqrt", ["min", 5000, ["max", 1, ["to-number", ["get", "capacity_mw"], 10]]]], 0.3]]],
                        6, ["min", 12, ["max", 3, ["*", ["sqrt", ["min", 5000, ["max", 1, ["to-number", ["get", "capacity_mw"], 10]]]], 0.5]]],
                        10, ["min", 16, ["max", 4, ["*", ["sqrt", ["min", 5000, ["max", 1, ["to-number", ["get", "capacity_mw"], 10]]]], 0.8]]],
                        14, ["min", 20, ["max", 5, ["*", ["sqrt", ["min", 5000, ["max", 1, ["to-number", ["get", "capacity_mw"], 10]]]], 1.2]]],
                      ],
                      "circle-color": ["get", "color"],
                      "circle-opacity": 0.85,
                      "circle-stroke-width": 1,
                      "circle-stroke-color": "rgba(0,0,0,0.3)",
                    },
                    // With OEI + MINDEX + WRI bundle fused the live plants
                    // source can exceed 40k at zoom 4, tanking FPS. Gate at
                    // zoom 4 so world+continent view stays fast; operator
                    // still sees the full grid at state+ zoom.
                    minzoom: 4,
                  });
                  // Apr 19, 2026 (OpenGridView parity): plant name + MW
                  // label above the circle, e.g. "Peregrine Energy Storage
                  // LLC · 200 MW". Shown at zoom ≥ 10 to avoid world-view
                  // text floods.
                  safeAddLayer({
                    id: "crep-plants-label",
                    type: "symbol",
                    source: "crep-plants",
                    minzoom: 10,
                    layout: {
                      "text-field": [
                        "case",
                        [">", ["to-number", ["get", "capacity_mw"], 0], 0],
                        ["concat", ["get", "name"], " · ", ["to-string", ["get", "capacity_mw"]], " MW"],
                        ["get", "name"],
                      ],
                      "text-size": ["interpolate", ["linear"], ["zoom"], 10, 10, 14, 12, 18, 14],
                      "text-offset": [0, 1.1],
                      "text-anchor": "top",
                      "text-allow-overlap": false,
                      "text-optional": true,
                      "text-max-width": 9,
                    } as any,
                    paint: {
                      "text-color": "#fbbf24",
                      "text-halo-color": "rgba(0,0,0,0.9)",
                      "text-halo-width": 1.6,
                      "text-halo-blur": 0.6,
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
                  // Apr 20, 2026 (Morgan OpenPowerGrid parity): neon halo
                  // behind each substation so voltage class reads clearly
                  // over sat imagery + basemap.
                  safeAddLayer({
                    id: "crep-subs-glow", type: "circle", source: "crep-substations",
                    paint: {
                      "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 5, 9, 8, 12, 13],
                      "circle-color": ["interpolate", ["linear"], ["get", "voltage_kv"],
                        0, "#9ca3af", 100, "#a855f7", 230, "#60a5fa", 345, "#22d3ee", 500, "#ffffff"],
                      "circle-opacity": 0.22,
                      "circle-blur": 1.0,
                    },
                    minzoom: 6,
                  });
                  safeAddLayer({
                    id: "crep-subs-circle", type: "circle", source: "crep-substations",
                    paint: {
                      "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 2, 9, 3.5, 12, 6],
                      "circle-color": ["interpolate", ["linear"], ["get", "voltage_kv"],
                        0, "#9ca3af", 100, "#a855f7", 230, "#60a5fa", 345, "#22d3ee", 500, "#ffffff"],
                      "circle-opacity": 0.95,
                      "circle-stroke-width": 0.8,
                      "circle-stroke-color": "#0b1220",
                    },
                    // 93k HIFLD substations at zoom 4 = 2 FPS. Gate at zoom 6
                    // so world-view stays responsive; operator sees infra when
                    // they drill in.
                    minzoom: 6,
                  });
                  // Apr 19, 2026 (Morgan OpenGridView parity: "every single
                  // asset name line widget live data from all widgets in
                  // opengridview … using san diego as discrepency example").
                  // Substation text labels — "Old Town · 230 kV" style,
                  // shown at zoom ≥ 10 so the world-view isn't a text
                  // tornado. text-allow-overlap=false keeps them readable.
                  safeAddLayer({
                    id: "crep-subs-label",
                    type: "symbol",
                    source: "crep-substations",
                    minzoom: 10,
                    layout: {
                      "text-field": [
                        "case",
                        [">", ["to-number", ["get", "voltage_kv"], 0], 0],
                        ["concat", ["get", "name"], " · ", ["to-string", ["get", "voltage_kv"]], " kV"],
                        ["get", "name"],
                      ],
                      "text-size": ["interpolate", ["linear"], ["zoom"], 10, 9, 14, 11, 18, 13],
                      "text-offset": [0, 0.9],
                      "text-anchor": "top",
                      "text-allow-overlap": false,
                      "text-ignore-placement": false,
                      "text-optional": true,
                      "text-max-width": 8,
                      "text-letter-spacing": 0.02,
                    } as any,
                    paint: {
                      "text-color": "#ffffff",
                      "text-halo-color": "rgba(0,0,0,0.85)",
                      "text-halo-width": 1.4,
                      "text-halo-blur": 0.6,
                    },
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

                // Defer heavy parsing until the browser is idle so the map's
                // first paint doesn't stall on 14 MB + 12 MB GeoJSON. If
                // requestIdleCallback is unavailable (Safari) fall back to
                // setTimeout.
                const idleLoad = (fn: () => void) => {
                  if (typeof requestIdleCallback === "function") {
                    requestIdleCallback(() => fn(), { timeout: 3000 });
                  } else {
                    setTimeout(fn, 500);
                  }
                };

                // ════════════════════════════════════════════════════════
                // STATIC SUBSTATIONS — 76,065 US power substations.
                // Deferred via idleLoad so the 12MB GeoJSON doesn't block
                // first paint. The renderSubstations layer has its own
                // minzoom guard so it won't clutter the world view.
                //
                // Apr 21, 2026 (Morgan: "crep keeps reloading ... too much
                // data?"): the layer's minzoom gate hides the dots at
                // z<4, but we were STILL pulling the 12 MB payload + 76 k
                // entities into heap on every map mount regardless of the
                // user's zoom. On a laptop dev box this + the 14 MB TX
                // lines load = 26 MB raw JSON parsed + 3 MapLibre sources
                // held whether or not the user ever zooms in. Now we gate
                // the idleLoad on zoom ≥ 3 AND re-attempt on moveend when
                // the user zooms in.
                const loadSubstationsOnceAtZoom = () => {
                  if ((window as any).__crep_substations_loaded) return
                  if (!mapReady()) return
                  if (map.getZoom() < 3) return
                  // Apr 21, 2026 (Morgan OOM audit): also gate on the
                  // substations layer being enabled. Was loading 76 k
                  // features + 12 MB GeoJSON even when invisible.
                  const subsOn = (window as any).__crep_layers?.()?.find((l: any) => l.id === "substations")?.enabled ?? true
                  if (!subsOn) return
                  ;(window as any).__crep_substations_loaded = true
                  idleLoad(loadSubstationsFetch)
                }
                const loadSubstationsFetch = async () => {
                  try {
                    const res = await fetch("/data/crep/substations-us.geojson", { cache: "default" });
                    if (!res.ok) return;
                    const gj = await res.json();
                    const entities = (gj.features || []).map((f: any, i: number) => ({
                      id: `osm-sub-${i}`,
                      name: f.properties?.n ?? "Substation",
                      lat: f.geometry.coordinates[1],
                      lng: f.geometry.coordinates[0],
                      properties: {
                        voltage_kv: Math.round((f.properties?.v ?? 0) / 1000),
                        operator: f.properties?.op,
                        substation_type: f.properties?.sub,
                      },
                      source: "osm-static",
                    }));
                    if (entities.length && mapReady()) {
                      renderSubstations(entities, "static-osm");
                      console.log(`[CREP/Static] ${entities.length} substations rendered (idle-loaded)`);
                    }
                  } catch (e) {
                    console.warn("[CREP/Static] substations load failed:", (e as Error)?.message);
                  }
                };
                // Fire immediately if already zoomed in, else wait for the
                // first zoomend that crosses the threshold. One-shot via
                // the window flag inside loadSubstationsOnceAtZoom().
                loadSubstationsOnceAtZoom();
                map.on("zoomend", loadSubstationsOnceAtZoom);

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
                  // Apr 20, 2026 (Morgan OpenPowerGrid parity): wide blurred
                  // halo behind each TX line so the voltage class reads
                  // neon-bright over dark basemap and sat imagery.
                  safeAddLayer({
                    id: "crep-txlines-glow", type: "line", source: "crep-txlines",
                    paint: {
                      "line-color": ["interpolate", ["linear"], ["get", "voltage_kv"],
                        0, "#9ca3af", 31, "#fb923c", 100, "#ec4899", 230, "#a855f7",
                        345, "#60a5fa", 500, "#22d3ee", 735, "#ffffff"],
                      "line-width": ["interpolate", ["linear"], ["get", "voltage_kv"],
                        0, 3, 100, 5, 345, 7, 500, 9, 735, 11],
                      "line-opacity": 0.35,
                      "line-blur": 3.5,
                    },
                    minzoom: 5,
                  });
                  safeAddLayer({
                    id: "crep-txlines-line", type: "line", source: "crep-txlines",
                    paint: {
                      "line-color": ["interpolate", ["linear"], ["get", "voltage_kv"],
                        0, "#9ca3af", 31, "#fb923c", 100, "#ec4899", 230, "#a855f7",
                        345, "#60a5fa", 500, "#22d3ee", 735, "#ffffff"],
                      "line-width": ["interpolate", ["linear"], ["get", "voltage_kv"],
                        0, 1, 100, 1.5, 345, 2, 500, 2.5, 735, 3],
                      "line-opacity": 0.95,
                    },
                    // 20k transmission lines at zoom 3 = render storm. Gate
                    // at zoom 5 so the contiguous-US grid only paints when
                    // the operator is at continental/state level.
                    minzoom: 5,
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

                // ════════════════════════════════════════════════════════
                // OSM SUB-TRANSMISSION — Apr 22, 2026.
                // Morgan flagged Loveland / Jamacha / Otay / Chula Vista
                // substations showing with no connecting lines because
                // HIFLD only carries ≥115 kV. OSM has the sub-transmission
                // feeders (69 kV) and this layer surfaces them as DASHED
                // lines (so users see provenance differs from HIFLD solid).
                // File is baked by scripts/etl/crep/bake-osm-sub-
                // transmission.mjs and refreshed weekly by GHA cron.
                // ════════════════════════════════════════════════════════
                idleLoad(async () => {
                  const subTxOn = (window as any).__crep_layers?.()?.find((l: any) => l.id === "txLinesSub")?.enabled ?? true
                  if (!subTxOn) { console.log("[CREP/Static] sub-transmission disabled"); return }
                  try {
                    const res = await fetch("/data/crep/transmission-lines-sub-transmission.geojson", { cache: "default" })
                    if (!res.ok) {
                      console.log("[CREP/Static] sub-transmission geojson not baked yet — falling back to HIFLD-only")
                      return
                    }
                    const gj = await res.json()
                    const features = (gj.features || []).map((f: any, i: number) => ({
                      type: "Feature" as const,
                      properties: {
                        id: f.properties?.id || `osm-subtx-${i}`,
                        name: f.properties?.n ?? "Sub-transmission line",
                        operator: f.properties?.op,
                        voltage_kv: Math.round((f.properties?.v ?? 0) / 1000),
                        voltage_class: f.properties?.v_class || "unknown",
                        status: "Active",
                        source: "osm-subtransmission",
                      },
                      geometry: f.geometry,
                    }))
                    if (features.length && mapReady()) {
                      safeAddSource("crep-txlines-sub", { type: "geojson", data: { type: "FeatureCollection", features } })
                      safeAddLayer({
                        id: "crep-txlines-sub-line", type: "line", source: "crep-txlines-sub",
                        paint: {
                          "line-color": ["interpolate", ["linear"], ["get", "voltage_kv"],
                            0,  "#6b7280",  // unknown / distribution — cool gray
                            31, "#f97316",  // 31-69 kV MV — orange
                            69, "#eab308",  // 69-115 kV MV — amber
                            115, "#f43f5e"],// 115+ (if OSM tagged but HIFLD missed) — rose
                          "line-width": ["interpolate", ["linear"], ["zoom"],
                            4, 0.6, 8, 1.2, 12, 2.0],
                          "line-opacity": 0.65,
                          // DASHED pattern differentiates OSM sub-transmission
                          // from the solid HIFLD backbone.
                          "line-dasharray": [2, 1.5],
                        },
                        // minzoom 5 — sub-transmission is irrelevant at
                        // world view and would obscure the HIFLD backbone.
                        minzoom: 5,
                      })
                      // Click popup — shows voltage + operator
                      map.on("click", "crep-txlines-sub-line", (e: any) => {
                        const f = e.features?.[0]
                        if (!f) return
                        const p = f.properties || {}
                        const hook = (window as any).__crep_selectAsset
                        if (typeof hook === "function") {
                          hook({
                            type: "transmission_line_sub",
                            id: p.id,
                            name: p.name,
                            lat: e.lngLat?.lat,
                            lng: e.lngLat?.lng,
                            properties: {
                              voltage_kv: p.voltage_kv,
                              voltage_class: p.voltage_class,
                              operator: p.operator,
                              source: "OSM sub-transmission (community-mapped)",
                            },
                          })
                        }
                      })
                      map.on("mouseenter", "crep-txlines-sub-line", () => { map.getCanvas().style.cursor = "pointer" })
                      map.on("mouseleave", "crep-txlines-sub-line", () => { map.getCanvas().style.cursor = "" })
                      console.log(`[CREP/Static] ${features.length} OSM sub-transmission lines rendered (dashed, zoom>=5)`)
                    }
                  } catch (e) {
                    console.warn("[CREP/Static] sub-transmission load failed:", (e as Error)?.message)
                  }
                })

                // ════════════════════════════════════════════════════════
                // STATIC TRANSMISSION LINES — 22,760 US lines >=345kV.
                // Deferred via idleLoad (declared above).
                // Apr 21, 2026 (Morgan OOM audit): gate on txLinesGlobal
                // enabled flag so invisible-by-default doesn't cost 14 MB
                // of heap.
                // ════════════════════════════════════════════════════════
                idleLoad(async () => {
                  const txOn = (window as any).__crep_layers?.()?.find((l: any) => l.id === "txLinesGlobal" || l.id === "txLinesFull")?.enabled ?? false
                  if (!txOn) {
                    console.log("[CREP/Static] txLines disabled — skipping 22k-line static load (14 MB)")
                    return
                  }
                  try {
                    const res = await fetch("/data/crep/transmission-lines-us-major.geojson", { cache: "default" });
                    if (!res.ok) return;
                    const gj = await res.json();
                    const features = (gj.features || []).map((f: any, i: number) => ({
                      type: "Feature" as const,
                      properties: {
                        id: `osm-tx-${i}`,
                        name: f.properties?.n ?? "Transmission line",
                        operator: f.properties?.op,
                        voltage_kv: Math.round((f.properties?.v ?? 0) / 1000),
                        status: "Active",
                        source: "osm-static",
                      },
                      geometry: f.geometry,
                    }));
                    if (features.length && mapReady()) {
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
                        // minzoom 4 so they only draw when the user is close
                        // enough to benefit. At world view 22k lines would
                        // clutter the globe and slow rendering.
                        minzoom: 4,
                      });
                      console.log(`[CREP/Static] ${features.length} transmission lines rendered (idle-loaded, zoom>=4)`);
                    }
                  } catch (e) {
                    console.warn("[CREP/Static] transmission-lines load failed:", (e as Error)?.message);
                  }
                });

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

                // Apr 19, 2026 (Morgan: "missing lots of powerlines and
                // transmission lines"): ALSO wire the PMTiles vector-tile
                // path so transmission lines paint at world view via
                // tippecanoe's automatic simplification / clustering. The
                // existing geojson path stays minzoom:4 (22k lines would
                // render-storm at world view), but PMTiles carries the
                // pre-cluster from tippecanoe so z2–z3 is fast.
                void (async () => {
                  // Apr 21, 2026 OOM audit: gate on txLinesGlobal enabled.
                  const txgOn = (window as any).__crep_layers?.()?.find((l: any) => l.id === "txLinesGlobal")?.enabled ?? false
                  if (!txgOn) { console.log("[CREP/Infra] txLinesGlobal disabled — skipping"); return }
                  try {
                    const result = await addInfraSourceWithFallback(map, INFRA_LAYERS.transmissionLines);
                    if (result.mode !== "pmtiles" && result.mode !== "geojson") return;
                    const spec = layerSpecForMode(result.mode, INFRA_LAYERS.transmissionLines);
                    // Use a different layer id so this coexists with the
                    // existing crep-txlines-line (minzoom:4 geojson path).
                    // At zoom ≥4 both paint; the geojson path has
                    // voltage-granular routing, the PMTiles path has
                    // simplified geometry good for low-zoom overview.
                    safeAddLayer({
                      id: "crep-txlines-global-line",
                      type: "line",
                      source: result.sourceId,
                      ...(spec.sourceLayer ? { "source-layer": spec.sourceLayer } : {}),
                      paint: {
                        "line-color": ["interpolate", ["linear"],
                          ["coalesce", ["to-number", ["get", "v"]], ["to-number", ["get", "VOLTAGE"]], 0],
                          0, "#9ca3af", 31000, "#fb923c", 100000, "#ec4899", 230000, "#a855f7",
                          345000, "#60a5fa", 500000, "#22d3ee", 735000, "#ffffff"],
                        "line-width": ["interpolate", ["linear"], ["zoom"],
                          2, 0.4, 4, 0.7, 6, 1.2, 8, 1.8, 12, 2.6, 16, 3.5],
                        "line-opacity": [
                          "interpolate", ["linear"], ["zoom"],
                          2, 0.45, 4, 0.6, 8, 0.75, 12, 0.8,
                        ],
                      },
                      // No minzoom — pmtiles carries pre-clustered geometry
                      // all the way down to z2, so world view renders the
                      // high-voltage backbone cleanly.
                    });
                    console.log(`[CREP/Infra] ${INFRA_LAYERS.transmissionLines.label}: ${result.mode} active → crep-txlines-global-line (no minzoom gate)`);
                  } catch (e) {
                    console.warn("[CREP/Infra] transmission-lines PMTiles path failed:", (e as Error)?.message);
                  }
                })();

                // ─── FULL transmission lines (ALL voltages) — Apr 19, 2026 ───────
                // Morgan: San Diego missing Jamacha / Miguel / Suncrest feeders.
                // This layer uses the full HIFLD + OSM + MINDEX dataset generated
                // by scripts/etl/crep/fetch-transmission-full.mjs. Paints ONLY if
                // the PMTiles / geojson file has been generated and shipped —
                // addInfraSourceWithFallback gracefully skips when neither exists.
                void (async () => {
                  // Apr 21, 2026 OOM audit: gate on txLinesFull enabled.
                  // This is the BIGGEST single offender — 52k lines / 78 MB.
                  const txfOn = (window as any).__crep_layers?.()?.find((l: any) => l.id === "txLinesFull")?.enabled ?? false
                  if (!txfOn) { console.log("[CREP/Infra] txLinesFull disabled — skipping 52k-line / 78MB load"); return }
                  try {
                    const result = await addInfraSourceWithFallback(map, INFRA_LAYERS.transmissionFull);
                    if (result.mode !== "pmtiles" && result.mode !== "geojson") return;
                    const spec = layerSpecForMode(result.mode, INFRA_LAYERS.transmissionFull);
                    safeAddLayer({
                      id: "crep-txlines-full-line",
                      type: "line",
                      source: result.sourceId,
                      ...(spec.sourceLayer ? { "source-layer": spec.sourceLayer } : {}),
                      paint: {
                        // Voltage-graduated color, width scales with zoom.
                        // Matches OpenGridWorks palette: gray<100k, orange
                        // 100-230k, pink 230-345k, blue 345-500k, cyan ≥500k.
                        "line-color": [
                          "interpolate", ["linear"],
                          ["coalesce", ["to-number", ["get", "v"]], ["to-number", ["get", "VOLTAGE"]], 0],
                          0, "#9ca3af",
                          69000, "#fb923c",
                          138000, "#ec4899",
                          230000, "#a855f7",
                          345000, "#60a5fa",
                          500000, "#22d3ee",
                          765000, "#ffffff",
                        ],
                        "line-width": [
                          "interpolate", ["linear"], ["zoom"],
                          2, 0.3, 5, 0.6, 8, 1.1, 10, 1.8, 13, 2.6, 16, 3.5,
                        ],
                        "line-opacity": [
                          "interpolate", ["linear"], ["zoom"],
                          2, 0.35, 5, 0.55, 8, 0.7, 12, 0.8,
                        ],
                      },
                    });
                    // Apr 19, 2026 (Morgan: "non of the infra power lines
                    // not clickable no widgets shown no selection"). Add
                    // click → InfraAsset widget + hover cursor. Click
                    // dispatches through the shared selection hook so the
                    // same widget handles major + full TX lines identically.
                    const txFullClickFired = { bound: false };
                    if (!txFullClickFired.bound) {
                      txFullClickFired.bound = true;
                      map.on("click", "crep-txlines-full-line", (e: any) => {
                        const f = e.features?.[0];
                        if (!f) return;
                        const p = f.properties || {};
                        const c = e.lngLat;
                        lastEntityPickTimeRef.current = Date.now();
                        highlightFromEvent(map, e);
                        setSelectedInfraAsset({
                          type: "transmission_line",
                          id: p.id || p.OBJECTID || `txline-${c?.lat}-${c?.lng}`,
                          name: p.name || p.NAME || `Transmission Line ${p.v || p.VOLTAGE || ""}`.trim(),
                          lat: c?.lat ?? 0,
                          lng: c?.lng ?? 0,
                          properties: {
                            voltage_kv: (Number(p.v || p.VOLTAGE) || 0) / 1000,
                            owner: p.OWNER || p.owner || null,
                            status: p.STATUS || p.status || null,
                            source: p.src || "hifld+osm+mindex",
                            ...p,
                          },
                        });
                        setSelectedPlant(null);
                      });
                      map.on("mouseenter", "crep-txlines-full-line", () => { map.getCanvas().style.cursor = "pointer"; });
                      map.on("mouseleave", "crep-txlines-full-line", () => { map.getCanvas().style.cursor = ""; });
                    }
                    // Apr 19, 2026 (OpenGridView parity): voltage labels
                    // ALONG the transmission lines ("230 kV", "500 kV"
                    // flowing with the route). symbol-placement: "line"
                    // repeats the text across the line geometry.
                    safeAddLayer({
                      id: "crep-txlines-full-label",
                      type: "symbol",
                      source: result.sourceId,
                      ...(spec.sourceLayer ? { "source-layer": spec.sourceLayer } : {}),
                      minzoom: 9,
                      layout: {
                        "symbol-placement": "line",
                        "symbol-spacing": 250,
                        "text-field": [
                          "concat",
                          ["to-string", [
                            "round",
                            ["/", ["coalesce", ["to-number", ["get", "v"]], ["to-number", ["get", "VOLTAGE"]], 0], 1000],
                          ]],
                          " kV",
                        ],
                        "text-size": ["interpolate", ["linear"], ["zoom"], 9, 9, 13, 11, 16, 13],
                        "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
                        "text-max-angle": 30,
                        "text-keep-upright": true,
                      } as any,
                      paint: {
                        "text-color": "#60a5fa",
                        "text-halo-color": "rgba(0,0,0,0.85)",
                        "text-halo-width": 1.5,
                        "text-halo-blur": 0.4,
                      },
                      filter: [">", ["coalesce", ["to-number", ["get", "v"]], ["to-number", ["get", "VOLTAGE"]], 0], 34000],
                    });
                    console.log(`[CREP/Infra] ${INFRA_LAYERS.transmissionFull.label}: ${result.mode} active → crep-txlines-full-line (click + hover wired, kV labels at zoom 9+)`);
                  } catch (e) {
                    console.warn("[CREP/Infra] transmission-full PMTiles path failed (file not generated yet?):", (e as Error)?.message);
                  }
                })();

                // ─── Global data centers (Apr 19, 2026) ──────────────────────────
                // OSM + PeeringDB + MINDEX. OpenGridWorks-style glowing squares.
                // Generated by scripts/etl/crep/fetch-datacenters-global.mjs.
                // Falls through silently if the file hasn't been generated yet.
                void (async () => {
                  // Apr 21, 2026 OOM audit: gate on dataCentersG enabled.
                  const dcOn = (window as any).__crep_layers?.()?.find((l: any) => l.id === "dataCentersG")?.enabled ?? false
                  if (!dcOn) { console.log("[CREP/Infra] dataCentersG disabled — skipping 4k-feature load"); return }
                  try {
                    const result = await addInfraSourceWithFallback(map, INFRA_LAYERS.dataCentersGlobal);
                    if (result.mode !== "pmtiles" && result.mode !== "geojson") return;
                    const spec = layerSpecForMode(result.mode, INFRA_LAYERS.dataCentersGlobal);
                    // Apr 19, 2026 (Morgan: "larger glowing blue squares for
                    // data centers, neon like on opengridview"). Three-layer
                    // stack — outer cyan halo (big blur), mid cyan glow
                    // (medium blur), core bright-blue pixel (sharp edge +
                    // white stroke) — reads as a neon-lit data center from
                    // world view through city zoom.
                    safeAddLayer({
                      id: "crep-dcs-global-halo",
                      type: "circle",
                      source: result.sourceId,
                      ...(spec.sourceLayer ? { "source-layer": spec.sourceLayer } : {}),
                      paint: {
                        // ~3× larger than the old glow; far wider at deep zoom.
                        "circle-radius": [
                          "interpolate", ["linear"], ["zoom"],
                          2, 8, 5, 13, 8, 20, 12, 32, 16, 48,
                        ],
                        "circle-color": "#22d3ee",  // cyan-300
                        "circle-opacity": 0.18,
                        "circle-blur": 1.4,
                      },
                    });
                    safeAddLayer({
                      id: "crep-dcs-global-glow",
                      type: "circle",
                      source: result.sourceId,
                      ...(spec.sourceLayer ? { "source-layer": spec.sourceLayer } : {}),
                      paint: {
                        "circle-radius": [
                          "interpolate", ["linear"], ["zoom"],
                          2, 5, 5, 8, 8, 12, 12, 18, 16, 28,
                        ],
                        "circle-color": "#38bdf8",  // sky-400
                        "circle-opacity": 0.42,
                        "circle-blur": 0.8,
                      },
                    });
                    safeAddLayer({
                      id: "crep-dcs-global-dot",
                      type: "circle",
                      source: result.sourceId,
                      ...(spec.sourceLayer ? { "source-layer": spec.sourceLayer } : {}),
                      paint: {
                        // Bumped core radius: Morgan's OpenGridView reference
                        // shows data centers as hero icons, not pinpricks.
                        "circle-radius": [
                          "interpolate", ["linear"], ["zoom"],
                          2, 3, 5, 4.5, 8, 6, 12, 9, 16, 14,
                        ],
                        "circle-color": "#60a5fa",  // blue-400
                        "circle-opacity": 1.0,
                        "circle-stroke-width": 1.6,
                        "circle-stroke-color": "#ffffff",
                        "circle-stroke-opacity": 0.95,
                      },
                    });
                    // Apr 19, 2026 (Morgan OpenGridView parity: "larger
                    // glowing blue squares for data centers" + "every single
                    // asset name"). Load a diamond-shaped white-with-cyan-
                    // border icon at mount, then overlay a symbol layer
                    // that draws the diamond ON TOP of the circle so the
                    // marker reads as a rotated square (OpenGridView's
                    // signature DC glyph). Label shows "{name}" at zoom ≥ 9.
                    try {
                      if (!(map as any).hasImage?.("dc-diamond")) {
                        const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <defs>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="1.4" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <g transform="translate(16 16) rotate(45)" filter="url(#glow)">
    <rect x="-9" y="-9" width="18" height="18" fill="#bfdbfe" stroke="#22d3ee" stroke-width="1.8"/>
    <rect x="-5" y="-5" width="10" height="10" fill="#ffffff" opacity="0.95"/>
  </g>
</svg>`.trim();
                        const img = new Image(32, 32);
                        img.onload = () => {
                          try {
                            if (!(map as any).hasImage?.("dc-diamond")) {
                              map.addImage("dc-diamond", img as any, { pixelRatio: 2 });
                            }
                          } catch { /* ignore */ }
                        };
                        img.src = `data:image/svg+xml;base64,${typeof btoa === "function" ? btoa(svg) : Buffer.from(svg).toString("base64")}`;
                      }
                    } catch { /* ignore */ }
                    safeAddLayer({
                      id: "crep-dcs-global-icon",
                      type: "symbol",
                      source: result.sourceId,
                      ...(spec.sourceLayer ? { "source-layer": spec.sourceLayer } : {}),
                      minzoom: 3,
                      layout: {
                        "icon-image": "dc-diamond",
                        "icon-size": [
                          "interpolate", ["linear"], ["zoom"],
                          3, 0.35, 6, 0.5, 10, 0.75, 14, 1.1,
                        ],
                        "icon-allow-overlap": true,
                        "icon-ignore-placement": true,
                        "text-field": ["get", "n"],
                        "text-size": ["interpolate", ["linear"], ["zoom"], 9, 10, 14, 13],
                        "text-offset": [0, 1.2],
                        "text-anchor": "top",
                        "text-optional": true,
                        "text-allow-overlap": false,
                        "text-max-width": 9,
                      } as any,
                      paint: {
                        "text-color": "#bfdbfe",
                        "text-halo-color": "rgba(0,0,0,0.9)",
                        "text-halo-width": 1.5,
                        "text-halo-blur": 0.5,
                      },
                    });
                    // Click → InfraAsset panel via the shared __crep_selectAsset hook.
                    map.on("click", "crep-dcs-global-dot", (e: any) => {
                      const f = e.features?.[0]; if (!f) return;
                      const p = f.properties || {};
                      const c = e.lngLat;
                      try {
                        const hook = (window as any).__crep_selectAsset;
                        if (typeof hook === "function") hook({
                          type: "data_center",
                          id: p.id,
                          name: p.n || p.name || "Data Center",
                          lat: c?.lat ?? 0, lng: c?.lng ?? 0,
                          properties: { operator: p.op, tier: p.tier, country: p.country, city: p.city, source: p.src },
                        });
                      } catch { /* ignore */ }
                    });
                    map.on("mouseenter", "crep-dcs-global-dot", () => { map.getCanvas().style.cursor = "pointer"; });
                    map.on("mouseleave", "crep-dcs-global-dot", () => { map.getCanvas().style.cursor = ""; });
                    console.log(`[CREP/Infra] ${INFRA_LAYERS.dataCentersGlobal.label}: ${result.mode} active → crep-dcs-global-dot`);
                  } catch (e) {
                    console.warn("[CREP/Infra] data-centers-global PMTiles path failed (file not generated yet?):", (e as Error)?.message);
                  }
                })();

                // ── Cell towers (antennas) — render from world view (viewport-first) ──
                // Apr 18, 2026: dropped the previous zoom:6+ gate. Cell towers
                // now render at every zoom level; density stays manageable
                // because the bundled set is ~192 points and live MINDEX/FCC
                // hits are bbox-scoped.
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
                  safeAddSource("crep-celltowers", {
                    type: "geojson",
                    data: { type: "FeatureCollection", features },
                    generateId: true, // required for feature-state hover expressions
                  });
                  safeAddLayer({
                    id: "crep-celltowers-circle", type: "circle", source: "crep-celltowers",
                    paint: {
                      // Apr 19, 2026 (see crep-celltowers-global-circle above for
                      // the full bug-history comment). Top-level interpolate on
                      // zoom, with hover-case inside each stop value.
                      // Apr 23, 2026 — Morgan: "if it makes rendering better make
                      // every single cell phone tower dot 50% smaller". Halved
                      // every radius stop. Hover radius kept reasonably hit-able.
                      "circle-radius": [
                        "interpolate", ["linear"], ["zoom"],
                        2,  ["case", ["boolean", ["feature-state", "hover"], false], 1.5, 1],
                        5,  ["case", ["boolean", ["feature-state", "hover"], false], 2,   1.25],
                        8,  ["case", ["boolean", ["feature-state", "hover"], false], 2.75, 1.5],
                        12, ["case", ["boolean", ["feature-state", "hover"], false], 3.5,  2],
                        16, ["case", ["boolean", ["feature-state", "hover"], false], 5,    3],
                      ],
                      "circle-color": "#39ff14",        // neon green (cell tower signature)
                      "circle-opacity": [
                        "case",
                        ["boolean", ["feature-state", "hover"], false], 1.0,
                        0.85,
                      ],
                      "circle-stroke-width": [
                        "case",
                        ["boolean", ["feature-state", "hover"], false], 1.2,
                        0.3,
                      ],
                      "circle-stroke-color": "#ffffff",
                      "circle-stroke-opacity": 0.6,
                    },
                    // No minzoom gate — render from world view upward.
                  });
                  if (!towersClickBound) {
                    towersClickBound = true;
                    // Hover state for the legacy (renderCellTowers) layer
                    let legacyHoveredId: string | number | null = null;
                    const legacyHover = (id: string | number | null, hover: boolean) => {
                      if (id == null) return;
                      try { map.setFeatureState({ source: "crep-celltowers", id }, { hover }); } catch { /* generateId:true required */ }
                    };
                    map.on("mousemove", "crep-celltowers-circle", (e: any) => {
                      const f = e.features?.[0];
                      if (!f) return;
                      if (legacyHoveredId !== f.id) {
                        legacyHover(legacyHoveredId, false);
                        legacyHoveredId = f.id ?? null;
                        legacyHover(legacyHoveredId, true);
                      }
                      map.getCanvas().style.cursor = "pointer";
                    });
                    map.on("mouseleave", "crep-celltowers-circle", () => {
                      legacyHover(legacyHoveredId, false);
                      legacyHoveredId = null;
                      map.getCanvas().style.cursor = "";
                    });
                    map.on("click", "crep-celltowers-circle", (e: any) => {
                      const props = e.features?.[0]?.properties;
                      if (!props) return;
                      lastEntityPickTimeRef.current = Date.now();
                      const coords = e.lngLat;
                      highlightPoint(map, coords?.lng ?? 0, coords?.lat ?? 0);
                      setSelectedInfraAsset({
                        type: "cell_tower",
                        name: props.name || `Cell Tower ${props.id || ""}`.trim(),
                        lat: coords?.lat ?? 0, lng: coords?.lng ?? 0,
                        properties: typeof props === "object" ? { ...props } : {},
                      });
                    });
                  }
                  console.log(`[CREP/Infra] ${features.length} cell towers → MapLibre (${label})`);
                };

                // Military base render helper — handles BOTH polygon and point features
                // Facilities WITH polygon data → crep-military-perimeters source (fill + boundary line)
                // Facilities WITHOUT polygon → crep-live-military source (shield icon)
                let milClickBound = false;
                const renderMilitary = (entities: any[], label: string) => {
                  const valid = entities.filter((e: any) => e.lat != null && e.lng != null);
                  if (!valid.length) return;
                  if (!mapReady()) return; // map torn down between fetch and callback

                  // Split: facilities with polygon vs point-only
                  const withPolygon = valid.filter((e: any) => e.polygon && e.polygon.length > 2);
                  const pointOnly = valid.filter((e: any) => !e.polygon || e.polygon.length <= 2);

                  // Push point-only facilities to crep-live-military source (shield icon)
                  const pointFeatures = pointOnly.map((e: any) => ({
                    type: "Feature" as const,
                    properties: {
                      id: e.id, name: e.name || e.properties?.name || "Military Facility",
                      type: e.properties?.military || e.type || "base",
                      operator: e.properties?.operator || e.operator || "",
                    },
                    geometry: { type: "Point" as const, coordinates: [e.lng, e.lat] },
                  }));
                  if (pointFeatures.length > 0 && mapReady()) {
                    try {
                      const src = map.getSource("crep-live-military") as any;
                      if (src?.setData) src.setData({ type: "FeatureCollection", features: pointFeatures });
                    } catch {}
                  }

                  // Push polygon perimeters to crep-military-perimeters source (fill + boundary line)
                  const polyFeatures = withPolygon.map((e: any) => ({
                    type: "Feature" as const,
                    properties: {
                      id: e.id, name: e.name || "Military Zone",
                      type: e.properties?.military || e.type || "base",
                      operator: e.properties?.operator || e.operator || "",
                    },
                    geometry: { type: "Polygon" as const, coordinates: [e.polygon] },
                  }));
                  if (polyFeatures.length > 0 && mapReady()) {
                    try {
                      const polySrc = map.getSource("crep-military-perimeters") as any;
                      if (polySrc?.setData) {
                        polySrc.setData({ type: "FeatureCollection", features: polyFeatures });
                        console.log(`[CREP/Military] Pushed ${polyFeatures.length} polygon perimeters`);
                      }
                    } catch (err) { console.warn("[CREP/Military] Error pushing polygons:", err); }
                  }

                  setMilitaryBases(valid.map((e: any) => ({
                    id: e.id, name: e.name || "Military Facility", lat: e.lat, lng: e.lng,
                    type: e.properties?.military || e.type || "base", operator: e.properties?.operator || e.operator,
                  })));
                  console.log(`[CREP/Infra] ${valid.length} military facilities → MapLibre (${label}): ${polyFeatures.length} polygons, ${pointFeatures.length} points`);
                };

                // ── Cell / communications towers — instant US+TW bundle, then global PMTiles ──
                // Taiwan + US (+ territories) ship as cell-towers-us-tw-instant.geojson
                // (built by fetch-celltowers-global.mjs). Loaded ASAP (no idle deferral).
                // Global layer: PMTiles → GeoJSON bundle → legacy US sample → live MINDEX.
                const ctState = { globalLoaded: false, instantRendered: false };

                const stripInstantCellOverlay = () => {
                  try {
                    if (map.getLayer("crep-celltowers-circle")) map.removeLayer("crep-celltowers-circle");
                    if (map.getSource("crep-celltowers")) map.removeSource("crep-celltowers");
                  } catch {
                    /* ignore */
                  }
                  ctState.instantRendered = false;
                };

                void (async () => {
                  try {
                    // Apr 22, 2026 — Morgan: "no cell towers are there".
                    // cell-towers-us-tw-instant.geojson was a 43-byte stub
                    // with zero features. Switching to cell-towers-us.geojson
                    // (24 KB, 192 curated US towers) for the instant render.
                    // The global 93 MB set loads on-demand via cellTowersG.
                    const res = await fetch("/data/crep/cell-towers-us.geojson", { cache: "force-cache" });
                    if (!res.ok) return;
                    const gj = await res.json();
                    if (ctState.globalLoaded) return;
                    const feats = gj.features || [];
                    if (!feats.length) return;
                    const entities = feats.map((f: any, i: number) => ({
                      id: String(f.properties?.id ?? `twus-${i}`),
                      name: f.properties?.n ?? "Cell tower",
                      lat: f.geometry.coordinates[1],
                      lng: f.geometry.coordinates[0],
                      properties: {
                        operator: f.properties?.op,
                        height_m: f.properties?.h,
                        mcc: f.properties?.mcc,
                        radio: f.properties?.radio,
                        src: f.properties?.src ?? "instant-bundle",
                      },
                      source: "us-tw-static",
                    }));
                    if (!entities.length || !mapReady()) return;
                    renderCellTowers(entities, "static-us-tw-instant");
                    ctState.instantRendered = true;
                    console.log(`[CREP/Static] ${entities.length} US/TW cell towers (instant bundle)`);
                  } catch (e) {
                    console.warn("[CREP/Static] cell-towers-us-tw-instant failed:", (e as Error)?.message);
                  }
                })();

                // Apr 21, 2026 (Morgan OOM audit): cellTowersG default is
                // `enabled: false` but the infra pipeline was loading
                // 615 k features into heap anyway. Gate the addInfraSource
                // call on the layer's actual enabled flag so OFF = 0 MB.
                idleLoad(async () => {
                  // Apr 22, 2026 — Morgan: "level of detail not working when
                  // im zoomed into a city close like san diego i should see
                  // massive more data assets loaded fast".
                  // The "cellTowers" toggle (ON by default) renders the 192-
                  // tower US bundle only. The richer bbox-scoped batchFetch
                  // (20k at high zoom) + PMTiles global set live in this
                  // idleLoad block — previously gated on `cellTowersG` which
                  // is OFF by default, so nobody ever saw dense tower
                  // coverage at city zoom. Now opens up when EITHER toggle
                  // is on so the default-ON cellTowers gets viewport data.
                  const layersList = (window as any).__crep_layers?.() || [];
                  const cellTowersMain = layersList.find((l: any) => l.id === "cellTowers")?.enabled ?? false;
                  const cellTowersGlobal = layersList.find((l: any) => l.id === "cellTowersG")?.enabled ?? false;
                  const cellTowersOn = cellTowersMain || cellTowersGlobal;
                  if (!cellTowersOn) {
                    console.log("[CREP/Infra] cell towers disabled — skipping load");
                    return;
                  }
                  // Only enable the 93 MB PMTiles / global geojson load when
                  // the explicit global toggle is on. Main toggle uses the
                  // lighter bbox-scoped batchFetch path.
                  const useGlobal = cellTowersGlobal;
                  if (!useGlobal) {
                    console.log("[CREP/Infra] cellTowers ON (viewport mode) — bbox batchFetch at zoom ≥ 10");
                    // Fall through to the legacy US bundle + batchFetch
                    // path below by NOT returning early but skipping the
                    // PMTiles block. We need to skip via a flag so the
                    // existing try-catch stays intact.
                  }
                  try {
                    // Only attempt the 93 MB PMTiles load when global toggle
                    // is explicitly on. Skip otherwise so the bbox path runs.
                    if (!useGlobal) {
                      throw new Error("cellTowers viewport mode — skip PMTiles, use batchFetch below")
                    }
                    const result = await addInfraSourceWithFallback(map, INFRA_LAYERS.cellTowersGlobal);
                    if (result.mode === "pmtiles" || result.mode === "geojson") {
                      ctState.globalLoaded = true;
                      stripInstantCellOverlay();
                      const spec = layerSpecForMode(result.mode, INFRA_LAYERS.cellTowersGlobal);
                      safeAddLayer({
                        id: "crep-celltowers-global-circle",
                        type: "circle",
                        source: result.sourceId,
                        ...(spec.sourceLayer ? { "source-layer": spec.sourceLayer } : {}),
                        paint: {
                          // Apr 19, 2026 (final fix after two bad attempts):
                          //   1. First version nested TWO interpolates inside a case → rejected
                          //      ("Only one zoom-based interpolate per expression").
                          //   2. Second used `*` to multiply interpolate by a hover factor → also
                          //      rejected ("zoom expression may only be used as input to a top-level
                          //      step/interpolate"). MapLibre's validator requires `["zoom"]` to be
                          //      a DIRECT input to interpolate — no wrapping expression allowed.
                          //   3. Correct pattern: top-level interpolate on zoom, with each stop
                          //      VALUE being a feature-state case. Legal MapLibre syntax.
                          // Apr 23, 2026 — Morgan: "make every single cell phone
                          // tower dot 50% smaller". Halved every stop; hover sizes
                          // kept big enough to stay clickable.
                          "circle-radius": [
                            "interpolate", ["linear"], ["zoom"],
                            2,  ["case", ["boolean", ["feature-state", "hover"], false], 1.5, 1],
                            5,  ["case", ["boolean", ["feature-state", "hover"], false], 2,   1.25],
                            8,  ["case", ["boolean", ["feature-state", "hover"], false], 2.75, 1.5],
                            12, ["case", ["boolean", ["feature-state", "hover"], false], 3.5,  2],
                            16, ["case", ["boolean", ["feature-state", "hover"], false], 5,    3],
                          ],
                          "circle-color": "#39ff14",       // neon green
                          "circle-opacity": [
                            "case",
                            ["boolean", ["feature-state", "hover"], false], 1.0,
                            0.85,
                          ],
                          "circle-stroke-width": [
                            "case",
                            ["boolean", ["feature-state", "hover"], false], 1.2,
                            0.3,
                          ],
                          "circle-stroke-color": "#ffffff",
                          "circle-stroke-opacity": 0.6,
                        },
                      });

                      // Hover + click wiring for the global (PMTiles / GeoJSON)
                      // vector layer — previously it rendered but wasn't
                      // selectable, which is why the dots felt "broken".
                      let globalHoveredId: string | number | null = null;
                      const globalSourceHover = (id: string | number | null, hover: boolean) => {
                        if (id == null) return;
                        try {
                          map.setFeatureState(
                            spec.sourceLayer
                              ? { source: result.sourceId, sourceLayer: spec.sourceLayer, id }
                              : { source: result.sourceId, id },
                            { hover },
                          );
                        } catch { /* feature-state only works when the feature has a stable id — PMTiles carries one */ }
                      };
                      map.on("mousemove", "crep-celltowers-global-circle", (e: any) => {
                        const f = e.features?.[0];
                        if (!f) return;
                        const fid = f.id;
                        if (globalHoveredId !== fid) {
                          globalSourceHover(globalHoveredId, false);
                          globalHoveredId = fid ?? null;
                          globalSourceHover(globalHoveredId, true);
                        }
                        map.getCanvas().style.cursor = "pointer";
                      });
                      map.on("mouseleave", "crep-celltowers-global-circle", () => {
                        globalSourceHover(globalHoveredId, false);
                        globalHoveredId = null;
                        map.getCanvas().style.cursor = "";
                      });
                      map.on("click", "crep-celltowers-global-circle", (e: any) => {
                        const f = e.features?.[0];
                        if (!f) return;
                        const props = f.properties || {};
                        lastEntityPickTimeRef.current = Date.now();
                        const coords = e.lngLat;
                        highlightPoint(map, coords?.lng ?? 0, coords?.lat ?? 0);
                        setSelectedInfraAsset({
                          type: "cell_tower",
                          name: props.n || props.name || `Cell Tower ${props.id || ""}`.trim(),
                          lat: coords?.lat ?? 0,
                          lng: coords?.lng ?? 0,
                          properties: {
                            operator: props.op || props.operator,
                            height_m: props.h || props.height_m,
                            radio: props.radio,
                            mcc: props.mcc,
                            source: props.src || "pmtiles",
                          },
                        });
                      });

                      console.log(`[CREP/Infra] ${INFRA_LAYERS.cellTowersGlobal.label}: ${result.mode} active → crep-celltowers-global-circle (click + hover wired)`);
                      return;
                    }
                  } catch (e) {
                    console.warn("[CREP/Infra] cell-towers global source failed:", (e as Error)?.message);
                  }

                  if (!ctState.globalLoaded) {
                    try {
                      const res = await fetch("/data/crep/cell-towers-us.geojson", { cache: "default" });
                      if (res.ok) {
                        const gj = await res.json();
                        const entities = (gj.features || []).map((f: any, i: number) => ({
                          id: `osm-tower-${i}`,
                          name: f.properties?.n ?? "Cell/Comm Tower",
                          lat: f.geometry.coordinates[1],
                          lng: f.geometry.coordinates[0],
                          properties: {
                            operator: f.properties?.op,
                            height_m: f.properties?.h,
                          },
                          source: "osm-static",
                        }));
                        if (entities.length && mapReady()) {
                          renderCellTowers(entities, "static-osm");
                          console.log(`[CREP/Static] ${entities.length} cell towers (legacy US bundle)`);
                        }
                      }
                    } catch (e) {
                      console.warn("[CREP/Static] cell-towers-us.geojson failed:", (e as Error)?.message);
                    }
                  }

                  if (!ctState.globalLoaded) {
                    batchFetch("cell-towers", 20000, (vpResults) => {
                      if (ctState.globalLoaded) return;
                      const vpTowers = vpResults.flatMap((r: any) => r?.entities || []);
                      const seen = new Set<string>();
                      const unique = vpTowers.filter((e: any) => {
                        if (!e.id || seen.has(e.id)) return false;
                        seen.add(e.id);
                        return true;
                      });
                      if (unique.length) renderCellTowers(unique, "viewport");
                    })
                      .then(async (results) => {
                        if (ctState.globalLoaded) return;
                        const allTowers = results.flatMap((r: any) => r?.entities || []);
                        const seen = new Set<string>();
                        const unique = allTowers.filter((e: any) => {
                          if (!e.id || seen.has(e.id)) return false;
                          seen.add(e.id);
                          return true;
                        });
                        if (unique.length) renderCellTowers(unique, "global");
                        await yieldToUI();
                      })
                      .catch((err) => console.warn("[CREP/Infra] Cell towers batchFetch:", err?.message || err));
                  }
                });

                // ── Military bases — direct static file, idle-loaded ──
                // Bypass the /api/oei/military API layer entirely (saves
                // ~200-500 ms of server round-trip). The file is bundled
                // under public/data/ and served statically by Next.js so
                // it hits the browser HTTP cache instantly on re-visits.
                // idleLoad lets the map paint first; a 7 MB GeoJSON parse
                // would otherwise block the first frame.
                idleLoad(async () => {
                  try {
                    const res = await fetch("/data/military-bases.geojson", { cache: "default" });
                    if (!res.ok) return;
                    const gj = await res.json();
                    const feats = gj.features || [];
                    if (!feats.length) return;
                    // Convert GeoJSON features to the shape renderMilitary expects
                    const facilities = feats.map((f: any, i: number) => {
                      const p = f.properties || {};
                      const g = f.geometry;
                      // Pull lat/lng from centroid (for point) or first ring of polygon
                      let lat = 0, lng = 0, polygon: [number, number][] | undefined;
                      if (g?.type === "Point" && Array.isArray(g.coordinates)) {
                        [lng, lat] = g.coordinates;
                      } else if (g?.type === "Polygon" && Array.isArray(g.coordinates?.[0])) {
                        polygon = g.coordinates[0];
                        // Cheap centroid: average of ring vertices
                        const ring = g.coordinates[0];
                        let sx = 0, sy = 0;
                        for (const pt of ring) { sx += pt[0]; sy += pt[1]; }
                        lng = sx / ring.length;
                        lat = sy / ring.length;
                      } else if (g?.type === "MultiPolygon" && Array.isArray(g.coordinates?.[0]?.[0])) {
                        polygon = g.coordinates[0][0];
                        const ring = g.coordinates[0][0];
                        let sx = 0, sy = 0;
                        for (const pt of ring) { sx += pt[0]; sy += pt[1]; }
                        lng = sx / ring.length;
                        lat = sy / ring.length;
                      }
                      return {
                        id: p.id ?? `mil-${i}`,
                        name: p.name ?? p.FULL_NAME ?? "Military Facility",
                        type: p.military ?? p.type ?? "base",
                        operator: p.operator ?? p.COMPONENT ?? "",
                        lat, lng, polygon,
                        properties: p,
                      };
                    });
                    if (mapReady()) renderMilitary(facilities, "static-file");
                  } catch (err) {
                    console.warn("[CREP/Infra] Military static load failed:", err);
                  }
                });

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
                      "crep-txlines-line", "crep-txlines-global-line",
                      "crep-celltowers-circle", "crep-celltowers-global-circle",
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

            {/* Apr 19, 2026 (Morgan: "popup that says new events on map
                needs to never show up again its useless"). Toast deleted.
                newEventIds state is KEPT — the event dots themselves use
                `isNew={newEventIds.has(event.id)}` to blink a few times
                when they first render. The notification itself was
                redundant with the visual blink. */}

            <VoiceMapControls
              {...mapCommandHandlers}
              websocketUrl={VOICE_ENDPOINTS.CREP_BRIDGE_WS}
              className={cn("absolute top-4 z-20", rightPanelOpen ? "right-[340px]" : "right-4")}
            />

            {/* EntityDeckLayer REMOVED — all entities now rendered as MapLibre native layers:
                Aircraft: crep-live-aircraft (symbol + glow)
                Satellites: crep-live-satellites (circle + SGP4 animation)
                Vessels: crep-live-vessels (symbol + glow)
                Fungal: crep-live-fungal (circle, kingdom-colored)
                Events: crep-live-events (circle, type-colored)
                Buoys: crep-live-buoys (circle)
                Click handlers on each native layer handle selection.
                This eliminates duplicate dots from deck.gl ScatterplotLayers. */}

            {/* Trajectory Lines — Apr 19, 2026: only for selected entity
                (Morgan: "plane and vessel and satellite trajectories should
                only show when one is selected like how seacable or
                powerlines show when selected"). Passing selectedAircraftId
                / selectedVesselId limits rendering to that single asset. */}
            <TrajectoryLines
              aircraft={filteredAircraft}
              vessels={filteredVessels}
              selectedAircraftId={selectedAircraft?.id ?? null}
              selectedVesselId={selectedVessel?.id ?? null}
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

            {/* Apr 23, 2026 — Morgan: "none of these green dots in dc are
                selectable". Baked iNat observations (crep-{region}-inat)
                live on MapLibre circle layers, NOT in visibleFungalObservations
                (that array only holds the SSE live-stream). When
                __crep_selectAsset routes an "inat-observation" payload to
                setSelectedFungal, the id never matches anything in the
                array above, so no FungalMarker renders the popup. Render
                a standalone FungalMarker whenever selectedFungal is set
                but isn't already in the array — gives every green dot a
                working species popup regardless of source. */}
            {selectedFungal &&
              !visibleFungalObservations.some(o => o.id === selectedFungal.id) && (
                <FungalMarker
                  key={`fungal-selected-${selectedFungal.id}`}
                  observation={selectedFungal}
                  isSelected={true}
                  onClick={() => handleSelectFungal(null)}
                  onClose={() => handleSelectFungal(null)}
                />
              )}

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
              PROPOSAL OVERLAYS (Apr 2026) — Army contract deliverables
              • Global seaports (WPI + MarineCadastre + OSM + MINDEX)
              • Radar sites (NEXRAD + Mycosoft SDR + FAA ASR)
              • Radio stations (Radio-Browser + KiwiSDR + FCC LMS)
              • Global power plants (WRI 34,936 / 167 countries, bundled)
              • Factories (Climate TRACE + OSM + GEM + MINDEX)
              • Orbital debris catalogued + 1.2M statistical cloud
              ═══════════════════════════════════════════════════════════════ */}
          <ProposalOverlays
            map={mapRef}
            enabled={{
              ports:          layers.find(l => l.id === "ports")?.enabled ?? false,
              radar:          layers.find(l => l.id === "radar")?.enabled ?? false,
              radioStations:  layers.find(l => l.id === "radioStations")?.enabled ?? false,
              powerPlantsG:   layers.find(l => l.id === "powerPlantsG")?.enabled ?? false,
              factories:      layers.find(l => l.id === "factoriesG")?.enabled ?? false,
              orbitalDebris:  layers.find(l => l.id === "orbitalDebris")?.enabled ?? false,
              debrisCloud:    layers.find(l => l.id === "debrisCloud")?.enabled ?? false,
              txLinesGlobal:  layers.find(l => l.id === "txLinesGlobal")?.enabled ?? false,
              cellTowersG:    layers.find(l => l.id === "cellTowersG")?.enabled ?? false,
              bathymetry:     layers.find(l => l.id === "bathymetry")?.enabled ?? false,
              topography:     layers.find(l => l.id === "topography")?.enabled ?? false,
              satImagery:     layers.find(l => l.id === "satImagery")?.enabled ?? false,
              railwayTracks:  layers.find(l => l.id === "railwayTracks")?.enabled ?? false,
              railwayTrains:  layers.find(l => l.id === "railwayTrains")?.enabled ?? false,
              droneNoFly:     layers.find(l => l.id === "droneNoFly")?.enabled ?? false,
              cctv:           layers.find(l => l.id === "cctv")?.enabled ?? false,
            }}
            bbox={mapZoom > 5 ? (() => {
              try {
                if (!mapRef?.getBounds) return undefined
                const b = mapRef.getBounds()
                return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()] as [number, number, number, number]
              } catch { return undefined }
            })() : undefined}
          />

          {/* Eagle Eye VideoWallWidget — universal player (hls.js / WebRTC
              WHEP / iframe / MJPEG) for permanent cameras + ephemeral clips.
              Listens for crep:eagle:{camera,event}-click CustomEvents
              dispatched by EagleEyeOverlay, resolves the source via
              /api/eagle/stream/[sourceId], mounts the right player. */}
          <VideoWallWidget />

          {/* Eagle Eye TimelineScrubber — bottom-left bar for 24h
              ephemeral-event filtering. Polls /api/eagle/events + paints
              per-provider tick density; window selector 1/6/12/24 h;
              broadcasts crep:eagle:time-window so overlays pick up the
              window. */}
          <TimelineScrubber />

          {/* Eagle Eye — dual-plane video intelligence (Apr 20, 2026).
              Cursor applied eagle.* MINDEX schema on VM 189 + deployed
              MediaMTX on MAS 188:8554. Phase 1 ships /api/eagle/sources,
              /api/eagle/events, /api/eagle/stream, + YouTube Live geo
              search connector. See components/crep/layers/eagle-eye-overlay.tsx.
              Phases 2-9 queued per docs/EAGLE_EYE_PLAN.md. */}
          <EagleEyeOverlay
            map={mapRef}
            enabled={{
              eagleEyeCameras:      layers.find(l => l.id === "eagleEyeCameras")?.enabled ?? false,
              eagleEyeEvents:       layers.find(l => l.id === "eagleEyeEvents")?.enabled ?? false,
              eagleEyeShinobi:      true,
              eagleEye511Traffic:   true,
              eagleEyeWeatherCams:  true,
              eagleEyeWebcams:      true,
              eagleEyeNpsUsgs:      true,
              eagleEyeYoutubeLive:  true,
              eagleEyeBluesky:      true,
              eagleEyeMastodon:     true,
              eagleEyeTwitch:       true,
            }}
            bbox={mapZoom > 3 ? (() => {
              try {
                if (!mapRef?.getBounds) return undefined
                const b = mapRef.getBounds()
                return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()] as [number, number, number, number]
              } catch { return undefined }
            })() : undefined}
          />

          {/* Realistic Cloud Layer — Three.js-bound 2D scaffold (Apr 20, 2026).
              Three stacked sources: NASA GIBS MODIS True Color cloud texture,
              RainViewer global radar (2-hr history), and a sun-angle shadow
              projection driven by /api/eagle/weather/multi (Open-Meteo + NWS
              + Windy + OWM + Earth-2 aggregator). The 3D volumetric raymarch
              path mounts later in <ThreeDGlobeView>. Density modulates opacity
              on both 2D + 3D; altitude bands split in 3D (low 600-1800 m /
              mid 2500-5500 m / high 7000-12000 m). Morgan: "realistic clouds
              over the crep map and globe in both 2d and 3d realistically." */}
          <RealisticCloudLayer
            map={mapRef}
            enabled={layers.find(l => l.id === "realisticClouds")?.enabled ?? false}
            opacity={layers.find(l => l.id === "realisticClouds")?.opacity ?? 0.7}
            bbox={mapZoom > 2 ? (() => {
              try {
                if (!mapRef?.getBounds) return undefined
                const b = mapRef.getBounds()
                return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()] as [number, number, number, number]
              } catch { return undefined }
            })() : undefined}
            mode3d={false}
            // Wire into the Earth-2 filter so RealisticCloudLayer shares the
            // same forecast horizon, resolution and GPU-mode routing the
            // Earth-2 tab uses. gpuMode "off" → cheap free APIs; any other
            // mode ("earth2"/"voice"/"physics") → routes through MAS_API_URL
            // → PersonaPlex + 4080a/4080b workstations running NVIDIA
            // Earth-2 for physics.
            forecastHours={earth2Filter.forecastHours}
            resolutionDeg={earth2ApiResolutionDeg}
            gpuMode={earth2Filter.gpuMode !== "off"}
          />

          {/* Mapbox 3D buildings + Satellite Streets hybrid basemap. Uses
              Morgan's full-scope NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN. 3D
              extrusions read building height/min_height from the Composite
              mapbox-streets-v8 source at zoom ≥ 14 — critical for MYCA
              device-placement decisions (shadow / LOS against buildings).
              Satellite Streets is an alternative basemap that beats ESRI
              World Imagery in most regions and ships roads + labels in one
              tileset. Apr 20, 2026. */}
          <Mapbox3DBuildings
            map={mapRef}
            enabled3dBuildings={layers.find(l => l.id === "mapbox3dBuildings")?.enabled ?? false}
            enabledSatelliteStreets={layers.find(l => l.id === "mapboxSatelliteStreets")?.enabled ?? false}
          />

          {/* Photorealistic 3D city meshes — Google Map Tiles API (preferred,
              worldwide photogrammetry) with Cesium Ion fallback (asset 2275207).
              Mounted as its own dedicated non-interleaved MapboxOverlay so it
              doesn't collide with any other deck.gl layers. Renders at any
              zoom but most visible above 14; designed to pair with the
              Mapbox 3D Buildings extrusions as a higher-fidelity alternative.
              Idle (no-op) when keys aren't set — Morgan is adding the Cesium
              Ion token now; Google Map Tiles is already enabled via Cursor. */}
          <Photorealistic3DTiles
            map={mapRef}
            enabled={layers.find(l => l.id === "photorealistic3D")?.enabled ?? false}
            opacity={layers.find(l => l.id === "photorealistic3D")?.opacity ?? 1.0}
            preferred="auto"
          />

          {/* Right-click waypoint / places-saving system (Apr 20, 2026).
              Right-click the map → context menu → save / drop pin / copy
              lat-lng / "what's here" lookup. Persists to localStorage +
              best-effort to MINDEX so waypoints survive across devices. */}
          <WaypointSystem map={mapRef} />
          {/* Apr 22, 2026 — Morgan: "the right click whats here search
              does not work needs to be fixed". WaypointSystem dispatches
              crep:lookup-here when the menu item is clicked; this widget
              listens, calls /api/crep/reverse-geocode, and renders the
              address + nearby MINDEX infrastructure in a floating panel. */}
          <LookupHereWidget />
          {/* Apr 22, 2026 — MYCA waypoint→verify→auto-add live feed.
              Subscribes to SSE /api/myca/entity-feed and paints
              verified entities (Navy depots etc.) on the map within
              100ms of confirmation. Also shows a toast when an entity
              lands. */}
          <MycaVerifiedEntityFeed map={mapRef} />

          {/* Project Oyster (MYCODAO + MYCOSOFT) — Tijuana Estuary
              pollution showcase (Apr 20, 2026). Federated overlay of
              IBWC river discharge + SDAPCD H₂S hotspot + beach closures
              + Navy training waters + oyster restoration sites. */}
          <TijuanaEstuaryLayer
            map={mapRef}
            enabled={{
              tijuanaEstuary:         layers.find(l => l.id === "tijuanaEstuary")?.enabled ?? true,
              projectOysterPerimeter: layers.find(l => l.id === "projectOysterPerimeter")?.enabled ?? true,
              projectOysterSites:     layers.find(l => l.id === "projectOysterSites")?.enabled ?? true,
              h2sHotspot:             layers.find(l => l.id === "h2sHotspot")?.enabled ?? true,
              riverFlow:              layers.find(l => l.id === "tjRiverFlow")?.enabled ?? true,
              beachClosures:          layers.find(l => l.id === "tjBeachClosures")?.enabled ?? true,
              navyTraining:           layers.find(l => l.id === "tjNavyTraining")?.enabled ?? true,
              estuaryMonitors:        layers.find(l => l.id === "tjEstuaryMonitors")?.enabled ?? true,
              // Apr 21, 2026 v2 expansion:
              oysterAnchor:           layers.find(l => l.id === "tijuanaEstuary")?.enabled ?? true,
              oysterCameras:          layers.find(l => l.id === "oysterCameras")?.enabled   ?? true,
              oysterBroadcast:        layers.find(l => l.id === "oysterBroadcast")?.enabled ?? true,
              oysterCell:             layers.find(l => l.id === "oysterCell")?.enabled      ?? true,
              oysterPower:            layers.find(l => l.id === "oysterPower")?.enabled     ?? true,
              oysterNature:           layers.find(l => l.id === "oysterNature")?.enabled    ?? true,
              oysterRails:            layers.find(l => l.id === "oysterRails")?.enabled     ?? true,
              oysterCaves:            layers.find(l => l.id === "oysterCaves")?.enabled     ?? true,
              oysterGovernment:       layers.find(l => l.id === "oysterGovernment")?.enabled?? true,
              oysterTourism:          layers.find(l => l.id === "oysterTourism")?.enabled   ?? true,
              oysterSensors:          layers.find(l => l.id === "oysterSensors")?.enabled   ?? true,
              oysterPlume:            layers.find(l => l.id === "oysterPlume")?.enabled     ?? true,
              oysterEmit:             layers.find(l => l.id === "oysterEmit")?.enabled      ?? true,
              oysterCrossBorder:      layers.find(l => l.id === "oysterCrossBorder")?.enabled ?? true,
              oysterHeatmap:          layers.find(l => l.id === "oysterHeatmap")?.enabled   ?? true,
            }}
          />
          {/* Tijuana station detail widget — legacy crep:tijuana:station-click handler. */}
          <TijuanaStationWidget />
          {/* Apr 21, 2026 v2 — OysterSiteWidget mirrors MojaveSiteWidget.
              Listens for crep:oyster:site-click from the v2 anchor + 11
              new sub-layer click handlers. Shows project thesis metadata
              (owner: Morgan MYCODAO), UCSD PFM / Scripps / NASA EMIT
              deep-links, and category-color-coded glass panels. */}
          <OysterSiteWidget />

          {/* Mojave National Preserve + Goffs, CA (MYCOSOFT project) —
              Apr 21, 2026. NPS MOJA boundary + Goffs anchor marker +
              wilderness POIs + ASOS/RAWS climate + iNat observations.
              Source: /api/crep/mojave (NPS Land Resources ArcGIS +
              api.weather.gov + iNaturalist, 1 h edge cache). */}
          <MojavePreserveLayer
            map={mapRef}
            enabled={{
              mojavePreserve:   layers.find(l => l.id === "mojavePreserve")?.enabled   ?? true,
              mojaveGoffs:      layers.find(l => l.id === "mojaveGoffs")?.enabled      ?? true,
              mojaveWilderness: layers.find(l => l.id === "mojaveWilderness")?.enabled ?? true,
              mojaveClimate:    layers.find(l => l.id === "mojaveClimate")?.enabled    ?? true,
              mojaveINat:       layers.find(l => l.id === "mojaveINat")?.enabled       ?? false,
              // Apr 21, 2026 v2 expansion toggles:
              mojaveCameras:    layers.find(l => l.id === "mojaveCameras")?.enabled    ?? true,
              mojaveBroadcast:  layers.find(l => l.id === "mojaveBroadcast")?.enabled  ?? false,
              mojaveCell:       layers.find(l => l.id === "mojaveCell")?.enabled       ?? false,
              mojavePower:      layers.find(l => l.id === "mojavePower")?.enabled      ?? true,
              mojaveRails:      layers.find(l => l.id === "mojaveRails")?.enabled      ?? true,
              mojaveCaves:      layers.find(l => l.id === "mojaveCaves")?.enabled      ?? true,
              mojaveGovernment: layers.find(l => l.id === "mojaveGovernment")?.enabled ?? true,
              mojaveTourism:    layers.find(l => l.id === "mojaveTourism")?.enabled    ?? true,
              mojaveSensors:    layers.find(l => l.id === "mojaveSensors")?.enabled    ?? true,
              mojaveHeatmap:    layers.find(l => l.id === "mojaveHeatmap")?.enabled    ?? true,
            }}
          />
          <MojaveSiteWidget />

          {/* Apr 22, 2026 — SD + TJ coverage expansion layers. Morgan:
              "massive amount of missing data from TIJUANA including
              infra cell towers enviornmental sensors, military, police,
              hospitals, sewage line data centers, am fm antennas same
              with san diego missing data". Pulls OSM Overpass into 7
              category-specific geojsons refreshed weekly by
              .github/workflows/sdtj-coverage-weekly.yml. */}
          <SdtjCoverageLayer
            map={mapRef}
            enabled={{
              sdtjHospitals:    layers.find(l => l.id === "sdtjHospitals")?.enabled    ?? true,
              sdtjPolice:       layers.find(l => l.id === "sdtjPolice")?.enabled       ?? true,
              sdtjSewage:       layers.find(l => l.id === "sdtjSewage")?.enabled       ?? true,
              sdtjCellTowers:   layers.find(l => l.id === "sdtjCellTowers")?.enabled   ?? true,
              sdtjAmFmAntennas: layers.find(l => l.id === "sdtjAmFmAntennas")?.enabled ?? true,
              sdtjMilitary:     layers.find(l => l.id === "sdtjMilitary")?.enabled     ?? true,
              sdtjDataCenters:  layers.find(l => l.id === "sdtjDataCenters")?.enabled  ?? true,
            }}
          />
          {/* Apr 23, 2026 — Project NYC + Project DC layers (anchor +
              perimeter + 11 regional OSM layers per region). Morgan:
              "massive amount of missing data from ... whitehouse and dc
              ... fly to and layers of details perimeters and special
              icon locations for dc and new york". */}
          {/* Live Transit — Apr 23 2026 (Morgan: "still no trains rendering").
              Aggregates MTA/WMATA/BART/MBTA/511-Bay/CTA/TriMet/MARTA/Amtrak/
              SEPTA/Metrolink/DART into a single MapLibre circle layer. */}
          <LiveTransitLayer
            map={mapRef}
            visible={layers.find(l => l.id === "liveTransit")?.enabled ?? true}
            bbox={mapBounds ? [mapBounds.west, mapBounds.south, mapBounds.east, mapBounds.north] : null}
          />

          <ProjectNycDcLayer
            map={mapRef}
            enabled={{
              projectNyc:        layers.find(l => l.id === "projectNyc")?.enabled        ?? true,
              nycHospitals:      layers.find(l => l.id === "nycHospitals")?.enabled      ?? true,
              nycPolice:         layers.find(l => l.id === "nycPolice")?.enabled         ?? true,
              nycSewage:         layers.find(l => l.id === "nycSewage")?.enabled         ?? true,
              nycCellTowers:     layers.find(l => l.id === "nycCellTowers")?.enabled     ?? true,
              nycAmFmAntennas:   layers.find(l => l.id === "nycAmFmAntennas")?.enabled   ?? true,
              nycMilitary:       layers.find(l => l.id === "nycMilitary")?.enabled       ?? true,
              nycDataCenters:    layers.find(l => l.id === "nycDataCenters")?.enabled    ?? true,
              nycTransitSubway:  layers.find(l => l.id === "nycTransitSubway")?.enabled  ?? true,
              nycTransitRail:    layers.find(l => l.id === "nycTransitRail")?.enabled    ?? true,
              nycAirports:       layers.find(l => l.id === "nycAirports")?.enabled       ?? true,
              nycGovtEmbassy:    layers.find(l => l.id === "nycGovtEmbassy")?.enabled    ?? true,
              projectDc:         layers.find(l => l.id === "projectDc")?.enabled         ?? true,
              dcHospitals:       layers.find(l => l.id === "dcHospitals")?.enabled       ?? true,
              dcPolice:          layers.find(l => l.id === "dcPolice")?.enabled          ?? true,
              dcSewage:          layers.find(l => l.id === "dcSewage")?.enabled          ?? true,
              dcCellTowers:      layers.find(l => l.id === "dcCellTowers")?.enabled      ?? true,
              dcAmFmAntennas:    layers.find(l => l.id === "dcAmFmAntennas")?.enabled    ?? true,
              dcMilitary:        layers.find(l => l.id === "dcMilitary")?.enabled        ?? true,
              dcDataCenters:     layers.find(l => l.id === "dcDataCenters")?.enabled     ?? true,
              dcTransitSubway:   layers.find(l => l.id === "dcTransitSubway")?.enabled   ?? true,
              dcTransitRail:     layers.find(l => l.id === "dcTransitRail")?.enabled     ?? true,
              dcAirports:        layers.find(l => l.id === "dcAirports")?.enabled        ?? true,
              dcGovtEmbassy:     layers.find(l => l.id === "dcGovtEmbassy")?.enabled     ?? true,
            }}
          />

          {/* IM3 Data Center Atlas (PNNL) + EIA-860M generator atlas
              (Operating / Planned / Retired / Canceled). Apr 19, 2026 —
              canonical US infra datasets, ~40k features total. See
              components/crep/layers/eia-im3-overlays.tsx + docs/DATASETS.md. */}
          <EiaIm3Overlays
            map={mapRef}
            enabled={{
              im3DataCenters:          layers.find(l => l.id === "im3DataCenters")?.enabled ?? false,
              im3DataCenterFootprints: layers.find(l => l.id === "im3DataCenterFootprints")?.enabled ?? false,
              eiaOperating:            layers.find(l => l.id === "eiaOperating")?.enabled   ?? false,
              eiaPlanned:              layers.find(l => l.id === "eiaPlanned")?.enabled     ?? false,
              eiaRetired:              layers.find(l => l.id === "eiaRetired")?.enabled     ?? false,
              eiaCanceled:             layers.find(l => l.id === "eiaCanceled")?.enabled    ?? false,
            }}
          />

          {/* V3 orphan layers — events / facilities / pollution / military
              sub-types / transport sub-types / biodiversity / heatmaps.
              See components/crep/layers/v3-overlays.tsx (Apr 19, 2026). */}
          <V3Overlays
            map={mapRef}
            enabled={{
              earthquakes:     layers.find(l => l.id === "earthquakes")?.enabled ?? false,
              volcanoes:       layers.find(l => l.id === "volcanoes")?.enabled ?? false,
              wildfires:       layers.find(l => l.id === "wildfires")?.enabled ?? false,
              storms:          layers.find(l => l.id === "storms")?.enabled ?? false,
              lightning:       layers.find(l => l.id === "lightning")?.enabled ?? false,
              tornadoes:       layers.find(l => l.id === "tornadoes")?.enabled ?? false,
              hospitals:       layers.find(l => l.id === "hospitals")?.enabled ?? false,
              fireStations:    layers.find(l => l.id === "fireStations")?.enabled ?? false,
              universities:    layers.find(l => l.id === "universities")?.enabled ?? false,
              oilGas:          layers.find(l => l.id === "oilGas")?.enabled ?? false,
              methaneSources:  layers.find(l => l.id === "methaneSources")?.enabled ?? false,
              metalOutput:     layers.find(l => l.id === "metalOutput")?.enabled ?? false,
              waterPollution:  layers.find(l => l.id === "waterPollution")?.enabled ?? false,
              population:      layers.find(l => l.id === "population")?.enabled ?? false,
              humanMovement:   layers.find(l => l.id === "humanMovement")?.enabled ?? false,
              events_human:    layers.find(l => l.id === "events_human")?.enabled ?? false,
              signalHeatmap:   layers.find(l => l.id === "signalHeatmap")?.enabled ?? false,
              militaryAir:     layers.find(l => l.id === "militaryAir")?.enabled ?? false,
              militaryNavy:    layers.find(l => l.id === "militaryNavy")?.enabled ?? false,
              tanks:           layers.find(l => l.id === "tanks")?.enabled ?? false,
              militaryDrones:  layers.find(l => l.id === "militaryDrones")?.enabled ?? false,
              aviationRoutes:  layers.find(l => l.id === "aviationRoutes")?.enabled ?? false,
              shipRoutes:      layers.find(l => l.id === "shipRoutes")?.enabled ?? false,
              fishing:         layers.find(l => l.id === "fishing")?.enabled ?? false,
              containers:      layers.find(l => l.id === "containers")?.enabled ?? false,
              vehicles:        layers.find(l => l.id === "vehicles")?.enabled ?? false,
              drones:          layers.find(l => l.id === "drones")?.enabled ?? false,
              biodiversity:    layers.find(l => l.id === "biodiversity")?.enabled ?? false,
            }}
            bbox={mapZoom > 3 ? (() => {
              try {
                if (!mapRef?.getBounds) return undefined
                const b = mapRef.getBounds()
                return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()] as [number, number, number, number]
              } catch { return undefined }
            })() : undefined}
          />

          {/* ═══════════════════════════════════════════════════════════════
              SUN ↔ EARTH IMPACT LAYER (Apr 2026)
              Live solar flares, CMEs, aurora ovals, subsolar earthspot,
              and hypothesis correlation lines to active tropical cyclones.
              ═══════════════════════════════════════════════════════════════ */}
          <SunEarthImpactLayer
            map={mapRef}
            enabled={layers.find(l => l.id === "sunEarthImpact")?.enabled ?? false}
            showCorrelationLines={true}
          />

          {/* ═══════════════════════════════════════════════════════════════
              POWER PLANT DETAIL POPUP (Apr 2026)
              ═══════════════════════════════════════════════════════════════ */}
          {selectedPlant && (
            // Click-away scrim (see infra widget above for rationale).
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-auto"
              onClick={() => setSelectedPlant(null)}
              onKeyDown={(e) => { if (e.key === "Escape") setSelectedPlant(null) }}
              role="dialog"
              tabIndex={-1}
            >
              <div
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
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              INFRASTRUCTURE DETAIL WIDGET (Apr 2026)
              Shows detailed live data for cables, substations, TX lines,
              plants, cell towers, datacenters, military, airports
              ═══════════════════════════════════════════════════════════════ */}
          {selectedInfraAsset && (
            // Apr 20, 2026 (Morgan: "all widgets need click away just like
            // buoy does, infra widgets power, cable, cell tower, ect dont
            // click away"). Wrap with a fixed full-screen click-away
            // scrim like the buoy popup uses. Scrim click or Escape key
            // dismisses; clicks inside the widget still work via
            // stopPropagation on the inner container.
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-auto"
              onClick={() => { setSelectedInfraAsset(null); clearHighlight(mapRef); }}
              onKeyDown={(e) => { if (e.key === "Escape") { setSelectedInfraAsset(null); clearHighlight(mapRef); } }}
              role="dialog"
              tabIndex={-1}
            >
              <div
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
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              FLY-TO COUNTRY BUTTONS + MYCOSOFT PROJECTS (Apr 2026)
              Apr 21 update (Morgan: "make a fly to projects also project
              oyster, project goffs, ect"). Project chips fly to the site
              AND auto-enable the project's layer set so the user lands on
              a fully-painted view.
              ═══════════════════════════════════════════════════════════════ */}
          <div className={cn(
            "absolute top-14 z-20 transition-all duration-300 flex flex-col gap-2",
            rightPanelOpen ? "right-[340px]" : "right-4"
          )}>
            <FlyToButtons
              onFlyTo={(center, zoom) => {
                mapRef?.flyTo({ center, zoom, duration: 1200 });
              }}
              compact
            />
            <FlyToProjects
              onFlyTo={(t) => {
                if (!mapRef?.flyTo) return;
                mapRef.flyTo({
                  center: t.center,
                  zoom: t.zoom,
                  pitch: t.pitch ?? 0,
                  bearing: t.bearing ?? 0,
                  duration: 1800,
                });
              }}
              onEnableLayers={(ids) => {
                setLayers((prev) => prev.map((l) =>
                  ids.includes(l.id) ? { ...l, enabled: true } : l
                ));
              }}
              compact
            />
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              UNIFIED SEARCH (Cmd+K) (Apr 2026)
              ═══════════════════════════════════════════════════════════════ */}
          <UnifiedSearch
            plants={powerPlants}
            aircraft={aircraft}
            vessels={vessels}
            satellites={satellites as any[]}
            fungal={fungalObservations}
            viewportCenter={mapRef ? { lat: mapRef.getCenter().lat, lng: mapRef.getCenter().lng } : undefined}
            onSelect={(result) => {
              if (result.id === "__open") {
                setSearchOpen(true);
                return;
              }
              // Fly to result — zoom in closer for entity types than for plants
              if (result.lat && result.lng) {
                const zoom = result.type === "plant" ? 10
                  : result.type === "aircraft" || result.type === "vessel" ? 8
                  : result.type === "satellite" ? 4
                  : 12;
                mapRef?.flyTo({ center: [result.lng, result.lat], zoom, duration: 800 });
              }
              // Open the right detail panel based on type
              if (result.type === "plant" && result.data) {
                setSelectedPlant(result.data);
                setSelectedInfraAsset(null);
              } else if (result.type === "aircraft" && result.data) {
                setSelectedAircraft(result.data);
              } else if (result.type === "vessel" && result.data) {
                setSelectedVessel(result.data);
              } else if (result.type === "satellite" && result.data) {
                setSelectedSatellite(result.data);
              } else if (result.type === "species" && result.data) {
                setSelectedFungal(result.data);
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
                    title={fungalSpeciesFilter ? `${visibleFungalObservations.length} ${fungalSpeciesFilter} - click for species` : `${fungalObservations.length} nature observations - hover for species filter`}
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
            {layers.find(l => l.id === "militaryBases")?.enabled && militaryBases.length > 0 && (
              <div className="px-2 py-1 rounded bg-black/60 backdrop-blur text-green-400" title={`${militaryBases.length} military installations (OSM+MINDEX)`}>
                <Shield className="w-3 h-3 inline-block mr-1" />
                {militaryBases.length} MIL
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
              <TabsList className="w-full grid grid-cols-6 rounded-none bg-black/40 border-b border-cyan-500/20 h-9">
                <TabsTrigger
                  value="mission"
                  className="text-[7px] px-0.5 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 rounded-none"
                >
                  <Target className="w-3 h-3" />
                </TabsTrigger>
                <TabsTrigger
                  value="data"
                  className="text-[7px] px-0.5 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400 rounded-none"
                  title="Data Filters — all layer on/off toggles"
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
                      {/* ═══════════════════════════════════════════════════════════
                          ALL-LAYER TOGGLE GRID — single source of truth for every
                          data layer on/off. MYCA drives these via window.__crep_setLayer.
                          Advanced per-filter controls (altitude bands, vessel types,
                          NOAA severity) live below in OEIMapControls and apply on top
                          of whichever layers are enabled here.
                          ═══════════════════════════════════════════════════════════ */}
                      <div className="flex items-center justify-between px-1 pt-1">
                        <div className="flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="text-[10px] font-bold text-white">DATA LAYERS</span>
                        </div>
                        <Badge variant="outline" className="text-[8px] border-cyan-600 text-cyan-400">
                          {layers.filter(l => l.enabled).length}/{layers.length}
                        </Badge>
                      </div>
                      <LayerControlPanel
                        layers={layers}
                        onToggleLayer={toggleLayer}
                        onOpacityChange={setLayerOpacity}
                      />

                      {/* Ground Station Toggle (Mar 2026) */}
                      <div className="rounded-lg bg-black/40 border border-cyan-500/20 overflow-hidden">
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
                      <div className="rounded-lg bg-black/40 border border-gray-700/50 overflow-hidden">
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

                      {/* ═══════════════════════════════════════════════════════════
                          LIVE DATA FEEDS — streaming status + granular sub-filters.
                          Sits below DATA LAYERS so the on/off grid stays the primary
                          control; these advanced filters only apply once a layer is on.
                          ═══════════════════════════════════════════════════════════ */}
                      <div className="flex items-center justify-between px-1 pt-2 border-t border-gray-800/50">
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
                    <HumanMachinesPanel liveAircraft={aircraft.length} liveVessels={vessels.length} liveSatellites={satellites.length} />
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
