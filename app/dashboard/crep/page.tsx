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

import { useState, useEffect, useCallback, useMemo } from "react";
import { Map, MapControls, MapMarker, MarkerContent, MarkerPopup } from "@/components/ui/map";
import Link from "next/link";
import { 
  ArrowLeft, 
  Maximize2, 
  Minimize2, 
  Shield, 
  Globe, 
  Activity, 
  Radio, 
  Zap,
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

// Types
interface GlobalEvent {
  id: string;
  type: string;
  title: string;
  severity: string;
  lat: number;
  lng: number;
  timestamp?: string;
  link?: string;
}

interface Device {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: "online" | "offline";
  type?: string;
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
const eventTypeConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  earthquake: { color: "#ef4444", icon: <Activity className="w-3 h-3" />, label: "Earthquake" },
  volcano: { color: "#f97316", icon: <Mountain className="w-3 h-3" />, label: "Volcano" },
  wildfire: { color: "#dc2626", icon: <Flame className="w-3 h-3" />, label: "Wildfire" },
  storm: { color: "#6366f1", icon: <Cloud className="w-3 h-3" />, label: "Storm" },
  lightning: { color: "#facc15", icon: <Zap className="w-3 h-3" />, label: "Lightning" },
  tornado: { color: "#7c3aed", icon: <Wind className="w-3 h-3" />, label: "Tornado" },
  solar_flare: { color: "#fbbf24", icon: <Satellite className="w-3 h-3" />, label: "Solar Flare" },
  fungal_bloom: { color: "#22c55e", icon: <TreePine className="w-3 h-3" />, label: "Fungal Bloom" },
  migration: { color: "#06b6d4", icon: <Fish className="w-3 h-3" />, label: "Migration" },
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

// Layer categories with icons
const layerCategories = {
  events: { label: "Events", icon: <AlertTriangle className="w-3.5 h-3.5" />, color: "text-red-400" },
  devices: { label: "MycoBrain Devices", icon: <Radar className="w-3.5 h-3.5" />, color: "text-green-400" },
  environment: { label: "Environment", icon: <Leaf className="w-3.5 h-3.5" />, color: "text-emerald-400" },
  human: { label: "Human Activity", icon: <Users className="w-3.5 h-3.5" />, color: "text-blue-400" },
  infrastructure: { label: "Transport & Vehicles", icon: <Plane className="w-3.5 h-3.5" />, color: "text-sky-400" },
  military: { label: "Military & Defense", icon: <Shield className="w-3.5 h-3.5" />, color: "text-amber-400" },
  pollution: { label: "Pollution & Industry", icon: <Factory className="w-3.5 h-3.5" />, color: "text-orange-400" },
};

// Event marker component
function EventMarker({ event, isSelected, onClick }: { 
  event: GlobalEvent; 
  isSelected: boolean;
  onClick: () => void;
}) {
  const config = eventTypeConfig[event.type] || eventTypeConfig.default;
  const isCritical = event.severity === "critical" || event.severity === "extreme";
  
  return (
    <MapMarker 
      longitude={event.lng} 
      latitude={event.lat}
      onClick={onClick}
    >
      <MarkerContent className="relative">
        <div className={cn(
          "relative flex items-center justify-center transition-transform",
          isSelected ? "scale-150" : "scale-100"
        )}>
          {isCritical && (
            <div 
              className="absolute w-8 h-8 rounded-full animate-ping"
              style={{ backgroundColor: `${config.color}40` }}
            />
          )}
          <div 
            className="absolute w-6 h-6 rounded-full blur-sm"
            style={{ backgroundColor: `${config.color}60` }}
          />
          <div 
            className={cn(
              "relative w-4 h-4 rounded-full border-2 flex items-center justify-center",
              isSelected && "ring-2 ring-white"
            )}
            style={{ 
              backgroundColor: config.color,
              borderColor: isSelected ? "#fff" : config.color,
              boxShadow: `0 0 12px ${config.color}` 
            }}
          >
            <span className="text-[8px] text-white">{config.icon}</span>
          </div>
        </div>
      </MarkerContent>
      <MarkerPopup className="min-w-[200px] bg-[#0a1628]/95 backdrop-blur border-cyan-500/30" closeButton>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div 
              className="w-6 h-6 rounded flex items-center justify-center"
              style={{ backgroundColor: `${config.color}30` }}
            >
              {config.icon}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-white">{event.title}</div>
              <div className="text-[10px] text-gray-400 uppercase">{config.label}</div>
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-500">
              {event.lat.toFixed(4)}°, {event.lng.toFixed(4)}°
            </span>
            <Badge 
              variant="outline" 
              className={cn("text-[8px] px-1.5", severityColors[event.severity])}
            >
              {event.severity.toUpperCase()}
            </Badge>
          </div>
          {event.timestamp && (
            <div className="text-[9px] text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(event.timestamp).toLocaleString()}
            </div>
          )}
          {event.link && (
            <a
              href={event.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300"
            >
              View Details <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </MarkerPopup>
    </MapMarker>
  );
}

// Device marker component
function DeviceMarker({ device, isSelected, onClick }: { 
  device: Device; 
  isSelected: boolean;
  onClick: () => void;
}) {
  const isOnline = device.status === "online";
  
  return (
    <MapMarker 
      longitude={device.lng} 
      latitude={device.lat}
      onClick={onClick}
    >
      <MarkerContent className="relative">
        <div className={cn(
          "relative flex items-center justify-center transition-transform",
          isSelected ? "scale-150" : "scale-100"
        )}>
          {isOnline && (
            <div className="absolute w-6 h-6 rounded-sm animate-ping bg-green-500/30" />
          )}
          <div 
            className={cn(
              "relative w-5 h-5 rounded-sm border-2 flex items-center justify-center text-[10px]",
              isOnline ? "bg-green-500/80 border-green-400" : "bg-red-500/80 border-red-400",
              isSelected && "ring-2 ring-white"
            )}
            style={{ boxShadow: isOnline ? "0 0 10px #22c55e" : "0 0 10px #ef4444" }}
          >
            🍄
          </div>
        </div>
      </MarkerContent>
      <MarkerPopup className="min-w-[180px] bg-[#0a1628]/95 backdrop-blur border-green-500/30" closeButton>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-6 h-6 rounded flex items-center justify-center text-lg",
              isOnline ? "bg-green-500/20" : "bg-red-500/20"
            )}>
              🍄
            </div>
            <div>
              <div className="text-sm font-semibold text-white">{device.name}</div>
              <div className={cn(
                "text-[10px] uppercase font-mono",
                isOnline ? "text-green-400" : "text-red-400"
              )}>
                {device.status}
              </div>
            </div>
          </div>
          <div className="text-[10px] text-gray-500">
            {device.lat.toFixed(4)}°, {device.lng.toFixed(4)}°
          </div>
        </div>
      </MarkerPopup>
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
    <div className="space-y-3">
      {/* Current Mission */}
      {mission && (
        <div className="p-3 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border border-cyan-500/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white">ACTIVE MISSION</span>
            </div>
            <Badge 
              variant="outline" 
              className={cn(
                "text-[8px] px-1.5",
                mission.status === "active" ? "border-green-500/50 text-green-400" : "border-yellow-500/50 text-yellow-400"
              )}
            >
              {mission.status.toUpperCase()}
            </Badge>
          </div>
          <h3 className="text-sm font-semibold text-white mb-1">{mission.name}</h3>
          <p className="text-[10px] text-gray-400 mb-2">{mission.objective}</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-gray-500">Progress</span>
              <span className="text-cyan-400 font-mono">{mission.progress}%</span>
            </div>
            <Progress value={mission.progress} className="h-1.5" />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="text-center p-1.5 rounded bg-black/30">
              <div className="text-sm font-bold text-cyan-400">{mission.targets}</div>
              <div className="text-[8px] text-gray-500">TARGETS</div>
            </div>
            <div className="text-center p-1.5 rounded bg-black/30">
              <div className="text-sm font-bold text-orange-400">{mission.alerts}</div>
              <div className="text-[8px] text-gray-500">ALERTS</div>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Stats */}
      <div className="p-3 rounded-lg bg-black/40 border border-gray-700/50">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-white">LIVE STATISTICS</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <div className="text-center p-2 rounded bg-black/30 border border-red-500/20">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-red-400">{stats.events}</div>
            <div className="text-[7px] text-gray-500 uppercase">Events</div>
          </div>
          <div className="text-center p-2 rounded bg-black/30 border border-green-500/20">
            <Radar className="w-3.5 h-3.5 text-green-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-green-400">{stats.devices}</div>
            <div className="text-[7px] text-gray-500 uppercase">Devices</div>
          </div>
          <div className="text-center p-2 rounded bg-black/30 border border-orange-500/20">
            <Zap className="w-3.5 h-3.5 text-orange-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-orange-400">{stats.critical}</div>
            <div className="text-[7px] text-gray-500 uppercase">Critical</div>
          </div>
        </div>
      </div>

      {/* Kingdom Data */}
      <div className="p-3 rounded-lg bg-black/40 border border-gray-700/50">
        <div className="flex items-center gap-2 mb-2">
          <Microscope className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-white">MINDEX KINGDOMS</span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {[
            { key: "fungi", icon: <TreePine className="w-3 h-3" />, color: "text-green-400", label: "Fungi" },
            { key: "plants", icon: <Leaf className="w-3 h-3" />, color: "text-emerald-400", label: "Plants" },
            { key: "birds", icon: <Bird className="w-3 h-3" />, color: "text-sky-400", label: "Birds" },
            { key: "insects", icon: <Bug className="w-3 h-3" />, color: "text-amber-400", label: "Insects" },
            { key: "animals", icon: <PawPrint className="w-3 h-3" />, color: "text-orange-400", label: "Animals" },
            { key: "marine", icon: <Waves className="w-3 h-3" />, color: "text-cyan-400", label: "Marine" },
          ].map(({ key, icon, color, label }) => (
            <div key={key} className="text-center p-1.5 rounded bg-black/30 hover:bg-black/50 transition-colors cursor-pointer">
              <div className={cn("mx-auto mb-0.5", color)}>{icon}</div>
              <div className={cn("text-[10px] font-bold tabular-nums", color)}>
                {((stats.kingdoms[key] || 0) / 1000).toFixed(0)}K
              </div>
              <div className="text-[7px] text-gray-500">{label}</div>
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
            <div className="text-[7px] text-gray-500">t CO₂</div>
          </div>
          <div className="text-center p-1.5 rounded bg-black/30">
            <div className="text-[10px] font-bold text-amber-400">{formatNum(HUMAN_MACHINE_DATA.totalMethanePerDay)}</div>
            <div className="text-[7px] text-gray-500">t CH₄</div>
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
  const [selectedEvent, setSelectedEvent] = useState<GlobalEvent | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  
  // Data states
  const [globalEvents, setGlobalEvents] = useState<GlobalEvent[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
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
  
  // Layer states - Comprehensive tracking for military/scientific use
  const [layers, setLayers] = useState<LayerConfig[]>([
    // Events - Natural & Space Weather
    { id: "earthquakes", name: "Seismic Activity", category: "events", icon: <Activity className="w-3 h-3" />, enabled: true, opacity: 1, color: "#ef4444", description: "Real-time USGS earthquake data" },
    { id: "volcanoes", name: "Volcanic Activity", category: "events", icon: <Mountain className="w-3 h-3" />, enabled: true, opacity: 1, color: "#f97316", description: "Active volcanoes and eruption alerts" },
    { id: "wildfires", name: "Active Wildfires", category: "events", icon: <Flame className="w-3 h-3" />, enabled: true, opacity: 0.9, color: "#dc2626", description: "NASA FIRMS fire detection data" },
    { id: "storms", name: "Storm Systems", category: "events", icon: <Cloud className="w-3 h-3" />, enabled: true, opacity: 0.8, color: "#6366f1", description: "NOAA storm tracking and forecasts" },
    { id: "solar", name: "Space Weather", category: "events", icon: <Satellite className="w-3 h-3" />, enabled: false, opacity: 0.7, color: "#fbbf24", description: "Solar flares, CME, geomagnetic storms" },
    { id: "lightning", name: "Lightning Activity", category: "events", icon: <Zap className="w-3 h-3" />, enabled: false, opacity: 0.8, color: "#facc15", description: "Real-time lightning strikes globally" },
    { id: "tornadoes", name: "Tornado Tracking", category: "events", icon: <Wind className="w-3 h-3" />, enabled: false, opacity: 0.9, color: "#7c3aed", description: "Active tornado cells and warnings" },
    // MycoBrain Devices
    { id: "mycobrain", name: "MycoBrain Devices", category: "devices", icon: <Radar className="w-3 h-3" />, enabled: true, opacity: 1, color: "#22c55e", description: "Connected fungal monitoring devices" },
    { id: "sporebase", name: "SporeBase Sensors", category: "devices", icon: <Cpu className="w-3 h-3" />, enabled: true, opacity: 1, color: "#10b981", description: "Environmental spore detection sensors" },
    { id: "partners", name: "Partner Networks", category: "devices", icon: <Wifi className="w-3 h-3" />, enabled: false, opacity: 0.8, color: "#06b6d4", description: "Third-party research stations" },
    // Environment
    { id: "fungi", name: "Fungal Observations", category: "environment", icon: <TreePine className="w-3 h-3" />, enabled: true, opacity: 0.9, color: "#22c55e", description: "iNat/GBIF fungal observation data" },
    { id: "weather", name: "Weather Overlay", category: "environment", icon: <Thermometer className="w-3 h-3" />, enabled: false, opacity: 0.6, color: "#3b82f6", description: "Temperature, precipitation, wind" },
    { id: "biodiversity", name: "Biodiversity Hotspots", category: "environment", icon: <Sparkles className="w-3 h-3" />, enabled: false, opacity: 0.7, color: "#a855f7", description: "High biodiversity concentration areas" },
    // Human Activity
    { id: "population", name: "Population Density", category: "human", icon: <Users className="w-3 h-3" />, enabled: false, opacity: 0.5, color: "#3b82f6", description: "Global population density heatmap" },
    { id: "humanMovement", name: "Human Movement", category: "human", icon: <Navigation className="w-3 h-3" />, enabled: false, opacity: 0.6, color: "#6366f1", description: "Aggregated human mobility patterns" },
    { id: "events_human", name: "Human Events", category: "human", icon: <Bell className="w-3 h-3" />, enabled: false, opacity: 0.7, color: "#8b5cf6", description: "Gatherings, protests, migrations" },
    // Transport & Vehicles
    { id: "aviation", name: "Air Traffic (OpenSky)", category: "infrastructure", icon: <Plane className="w-3 h-3" />, enabled: true, opacity: 0.8, color: "#0ea5e9", description: "Live aircraft positions worldwide" },
    { id: "aviationRoutes", name: "Flight Trajectories", category: "infrastructure", icon: <Navigation className="w-3 h-3" />, enabled: false, opacity: 0.5, color: "#38bdf8", description: "Aircraft planned routes and paths" },
    { id: "ships", name: "Ships (AIS)", category: "infrastructure", icon: <Ship className="w-3 h-3" />, enabled: true, opacity: 0.8, color: "#14b8a6", description: "AISstream vessel tracking" },
    { id: "shipRoutes", name: "Ship Trajectories", category: "infrastructure", icon: <Anchor className="w-3 h-3" />, enabled: false, opacity: 0.5, color: "#2dd4bf", description: "Vessel routes and port lines" },
    { id: "fishing", name: "Fishing Fleets (GFW)", category: "infrastructure", icon: <Fish className="w-3 h-3" />, enabled: false, opacity: 0.7, color: "#22d3ee", description: "Global Fishing Watch data" },
    { id: "containers", name: "Container Ships", category: "infrastructure", icon: <Container className="w-3 h-3" />, enabled: false, opacity: 0.6, color: "#06b6d4", description: "Shipping container trajectories" },
    { id: "vehicles", name: "Land Vehicles", category: "infrastructure", icon: <Car className="w-3 h-3" />, enabled: false, opacity: 0.4, color: "#f59e0b", description: "Aggregate vehicle traffic patterns" },
    { id: "drones", name: "Drones & UAVs", category: "infrastructure", icon: <Radio className="w-3 h-3" />, enabled: false, opacity: 0.8, color: "#a855f7", description: "Known drone activity and flights" },
    // Military & Defense
    { id: "militaryAir", name: "Military Aircraft", category: "military", icon: <Plane className="w-3 h-3" />, enabled: false, opacity: 0.9, color: "#f59e0b", description: "Military aviation tracking" },
    { id: "militaryNavy", name: "Naval Vessels", category: "military", icon: <Anchor className="w-3 h-3" />, enabled: false, opacity: 0.9, color: "#eab308", description: "Military ship movements" },
    { id: "militaryBases", name: "Military Bases", category: "military", icon: <Shield className="w-3 h-3" />, enabled: false, opacity: 0.7, color: "#ca8a04", description: "Known military installations" },
    { id: "tanks", name: "Ground Forces", category: "military", icon: <CrosshairIcon className="w-3 h-3" />, enabled: false, opacity: 0.8, color: "#d97706", description: "Tanks, carriers, ground vehicles" },
    { id: "militaryDrones", name: "Military UAVs", category: "military", icon: <Target className="w-3 h-3" />, enabled: false, opacity: 0.8, color: "#fbbf24", description: "Military drone operations" },
    // Pollution & Industry
    { id: "factories", name: "Factories & Plants", category: "pollution", icon: <Factory className="w-3 h-3" />, enabled: false, opacity: 0.7, color: "#f97316", description: "Industrial facilities globally" },
    { id: "co2Sources", name: "CO₂ Emission Sources", category: "pollution", icon: <Cloud className="w-3 h-3" />, enabled: false, opacity: 0.6, color: "#ef4444", description: "Major CO₂ emitters and hotspots" },
    { id: "methaneSources", name: "Methane Sources", category: "pollution", icon: <Gauge className="w-3 h-3" />, enabled: false, opacity: 0.6, color: "#dc2626", description: "Methane leaks and emission sources" },
    { id: "oilGas", name: "Oil & Gas Infrastructure", category: "pollution", icon: <Fuel className="w-3 h-3" />, enabled: false, opacity: 0.5, color: "#78350f", description: "Refineries, pipelines, platforms" },
    { id: "powerPlants", name: "Power Plants", category: "pollution", icon: <Power className="w-3 h-3" />, enabled: false, opacity: 0.6, color: "#fbbf24", description: "Thermal, nuclear, renewable plants" },
    { id: "metalOutput", name: "Metal & Mining", category: "pollution", icon: <Wrench className="w-3 h-3" />, enabled: false, opacity: 0.5, color: "#a16207", description: "Mining operations and output" },
    { id: "waterPollution", name: "Water Contamination", category: "pollution", icon: <Droplet className="w-3 h-3" />, enabled: false, opacity: 0.6, color: "#0284c7", description: "Water pollution events and sources" },
  ]);
  
  // Filter states
  const [eventFilter, setEventFilter] = useState<string>("all");
  
  // Fetch data
  useEffect(() => {
    setMounted(true);
    
    async function fetchData() {
      setIsLoading(true);
      try {
        const eventsRes = await fetch("/api/natureos/global-events");
        if (eventsRes.ok) {
          const data = await eventsRes.json();
          const formattedEvents = (data.events || [])
            .filter((e: any) => e.location?.latitude && e.location?.longitude)
            .slice(0, 300)
            .map((e: any) => ({
              id: e.id,
              type: e.type,
              title: e.title,
              severity: e.severity,
              lat: e.location.latitude,
              lng: e.location.longitude,
              timestamp: e.timestamp,
              link: e.link,
            }));
          setGlobalEvents(formattedEvents);
        }

        const devicesRes = await fetch("/api/mycobrain/devices");
        if (devicesRes.ok) {
          const data = await devicesRes.json();
          const formattedDevices = (data.devices || [])
            .filter((d: any) => d.location?.lat && d.location?.lng)
            .map((d: any) => ({
              id: d.id,
              name: d.name || "MycoBrain Device",
              lat: d.location.lat,
              lng: d.location.lng,
              status: d.status === "online" ? "online" : "offline",
            }));
          setDevices(formattedDevices);
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

  // Filter events
  const filteredEvents = globalEvents.filter(event => {
    if (eventFilter !== "all" && event.type !== eventFilter) return false;
    return true;
  });

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

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="text-cyan-400 text-sm font-mono animate-pulse">
          INITIALIZING CREP SYSTEM...
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-[#0a1628] overflow-hidden flex flex-col">
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
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-black/40 border border-green-500/30">
            <Radio className="w-3 h-3 text-green-400 animate-pulse" />
            <span className="text-[9px] text-green-400 font-mono">LIVE</span>
          </div>
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
        {/* Floating Left Sidebar - Intel Feed */}
        <div className={cn(
          "absolute left-3 top-3 bottom-3 z-30 transition-all duration-300 ease-in-out",
          leftPanelOpen ? "w-72 opacity-100" : "w-0 opacity-0 pointer-events-none"
        )}>
          <div className="h-full bg-[#0a1220]/95 backdrop-blur-md border border-cyan-500/20 rounded-lg overflow-hidden flex flex-col shadow-xl">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-cyan-500/20 bg-black/30">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white">INTEL FEED</span>
              </div>
              <Badge variant="outline" className="text-[8px] border-green-500/50 text-green-400">
                {filteredEvents.length} ACTIVE
              </Badge>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-1 p-2 border-b border-cyan-500/10">
              <div className="text-center p-2 rounded bg-black/30">
                <div className="text-lg font-bold text-cyan-400">{globalEvents.length}</div>
                <div className="text-[8px] text-gray-500 uppercase">Events</div>
              </div>
              <div className="text-center p-2 rounded bg-black/30">
                <div className="text-lg font-bold text-green-400">{onlineDevices}</div>
                <div className="text-[8px] text-gray-500 uppercase">Devices</div>
              </div>
              <div className="text-center p-2 rounded bg-black/30">
                <div className="text-lg font-bold text-red-400">{criticalCount}</div>
                <div className="text-[8px] text-gray-500 uppercase">Critical</div>
              </div>
            </div>

            {/* Filters */}
            <div className="p-2 border-b border-cyan-500/10 space-y-2">
              <div className="flex items-center gap-2">
                <Filter className="w-3 h-3 text-gray-500" />
                <span className="text-[10px] text-gray-400">Filters</span>
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

            {/* Event List */}
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {filteredEvents.slice(0, 50).map((event) => {
                  const config = eventTypeConfig[event.type] || eventTypeConfig.default;
                  const isSelected = selectedEvent?.id === event.id;
                  
                  return (
                    <div
                      key={event.id}
                      onClick={() => setSelectedEvent(isSelected ? null : event)}
                      className={cn(
                        "p-2 rounded cursor-pointer transition-all border",
                        isSelected
                          ? "bg-cyan-500/10 border-cyan-500/40"
                          : "bg-black/30 border-transparent hover:border-gray-700/50"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <div 
                          className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: `${config.color}30` }}
                        >
                          {config.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] text-white font-medium truncate">
                            {event.title}
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="text-[8px] text-gray-500">
                              {event.lat.toFixed(2)}°, {event.lng.toFixed(2)}°
                            </span>
                            <Badge 
                              variant="outline" 
                              className={cn("text-[7px] px-1 py-0", severityColors[event.severity])}
                            >
                              {event.severity}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Sidebar Footer */}
            <div className="px-3 py-2 border-t border-cyan-500/20 bg-black/30">
              <div className="flex items-center justify-between text-[8px] font-mono text-gray-500">
                <span>LAST UPDATE</span>
                <span className="text-cyan-400">{new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative crep-map-container">
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
          <Map 
            center={[0, 20]} 
            zoom={2}
            styles={{
              dark: "https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json",
              light: "https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json"
            }}
          >
            <MapControls 
              position="bottom-left" 
              showZoom={true}
              showCompass={true}
              showLocate={true}
              showFullscreen={false}
              className="mb-4 ml-4"
            />

            {/* Event Markers */}
            {layers.find(l => l.id === "earthquakes" || l.id === "volcanoes" || l.id === "wildfires" || l.id === "storms")?.enabled && 
              filteredEvents.map(event => (
                <EventMarker
                  key={event.id}
                  event={event}
                  isSelected={selectedEvent?.id === event.id}
                  onClick={() => setSelectedEvent(selectedEvent?.id === event.id ? null : event)}
                />
              ))
            }

            {/* Device Markers */}
            {layers.find(l => l.id === "mycobrain")?.enabled && devices.map(device => (
              <DeviceMarker
                key={device.id}
                device={device}
                isSelected={selectedDevice?.id === device.id}
                onClick={() => setSelectedDevice(selectedDevice?.id === device.id ? null : device)}
              />
            ))}
          </Map>

          {/* Map Overlay - Corner Decorations */}
          <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-cyan-500/40 pointer-events-none" />
          <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-cyan-500/40 pointer-events-none" />
          <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-cyan-500/40 pointer-events-none" />
          <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-cyan-500/40 pointer-events-none" />

          {/* Map Status Overlay - Top Center */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[9px] font-mono pointer-events-none">
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-black/60 backdrop-blur">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-400">LIVE</span>
            </div>
            <div className="px-2 py-1 rounded bg-black/60 backdrop-blur text-cyan-400">
              {filteredEvents.length} EVENTS
            </div>
            <div className="px-2 py-1 rounded bg-black/60 backdrop-blur text-green-400">
              {onlineDevices} DEVICES
            </div>
          </div>
        </div>

        {/* Right Side Panel */}
        <div className={cn(
          "flex-shrink-0 h-full transition-all duration-300 ease-in-out border-l border-cyan-500/20 bg-[#0a1220]/95 backdrop-blur-md z-30",
          rightPanelOpen ? "w-80" : "w-0 opacity-0 pointer-events-none"
        )}>
          <div className="h-full flex flex-col">
            {/* Tab Navigation */}
            <Tabs value={rightPanelTab} onValueChange={setRightPanelTab} className="flex flex-col h-full">
              <TabsList className="w-full grid grid-cols-5 rounded-none bg-black/40 border-b border-cyan-500/20 h-9">
                <TabsTrigger 
                  value="mission" 
                  className="text-[8px] px-1 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 rounded-none"
                >
                  <Target className="w-3 h-3 mr-0.5" />
                  MISSION
                </TabsTrigger>
                <TabsTrigger 
                  value="intel" 
                  className="text-[8px] px-1 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 rounded-none"
                >
                  <Users className="w-3 h-3 mr-0.5" />
                  INTEL
                </TabsTrigger>
                <TabsTrigger 
                  value="layers" 
                  className="text-[8px] px-1 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 rounded-none"
                >
                  <Layers className="w-3 h-3 mr-0.5" />
                  LAYERS
                </TabsTrigger>
                <TabsTrigger 
                  value="services" 
                  className="text-[8px] px-1 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 rounded-none"
                >
                  <Cpu className="w-3 h-3 mr-0.5" />
                  SVCS
                </TabsTrigger>
                <TabsTrigger 
                  value="myca" 
                  className="text-[8px] px-1 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400 rounded-none"
                >
                  <Bot className="w-3 h-3 mr-0.5" />
                  MYCA
                </TabsTrigger>
              </TabsList>

              {/* Tab Content */}
              <div className="flex-1 overflow-hidden">
                <TabsContent value="mission" className="h-full m-0 p-3 overflow-auto">
                  <MissionContextPanel mission={currentMission} stats={stats} />
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
          <span className="text-green-400">● SYSTEM OPERATIONAL</span>
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
          <span>{new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</span>
          <span className="text-cyan-400 tabular-nums">{new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}
