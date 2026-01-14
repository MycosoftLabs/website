"use client";

/**
 * NLM Global Events Widget
 * 
 * Nature Life Monitor - Visual display of global environmental events:
 * - Earthquakes, fires, storms, volcanoes
 * - Massive insect movements, animal migrations
 * - Forest events (fires, deforestation, floods)
 * - Droughts, lightning strikes
 * 
 * Time-stamped, color-coded, icon-coded events for science, research, military, intelligence.
 * Replaces BME688 sensor widget 2 in NatureOS Overview Analysis tab.
 */

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Globe,
  RefreshCw,
  Flame,
  CloudLightning,
  Wind,
  Droplets,
  Bug,
  Bird,
  Mountain,
  TreeDeciduous,
  Thermometer,
  AlertTriangle,
  Waves,
  Zap,
  X,
  Maximize2,
  Minimize2,
} from "lucide-react";

type GlobalEventType = 
  | "earthquake"
  | "fire"
  | "storm"
  | "volcano"
  | "flood"
  | "drought"
  | "lightning"
  | "insect_movement"
  | "animal_migration"
  | "deforestation"
  | "tsunami"
  | "extreme_weather";

type EventSeverity = "minor" | "moderate" | "significant" | "severe" | "critical";

interface GlobalEvent {
  id: string;
  type: GlobalEventType;
  severity: EventSeverity;
  title: string;
  location: string;
  coordinates: { lat: number; lng: number };
  timestamp: Date | string;
  source: string;
  magnitude?: number;
  affected_area?: string;
  military_relevance?: "low" | "medium" | "high";
  research_relevance?: "low" | "medium" | "high";
}

interface NLMGlobalEventsProps {
  className?: string;
  maxEvents?: number;
  onClose?: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
}

const EVENT_ICONS: Record<string, typeof Globe> = {
  earthquake: Mountain,
  fire: Flame,
  wildfire: Flame,
  storm: CloudLightning,
  volcano: Mountain,
  flood: Waves,
  drought: Thermometer,
  lightning: Zap,
  insect_movement: Bug,
  animal_migration: Bird,
  deforestation: TreeDeciduous,
  tsunami: Waves,
  extreme_weather: Wind,
  solar_flare: Zap,
  geomagnetic_storm: Wind,
  aurora: Wind,
  meteor: AlertTriangle,
  tornado: Wind,
  hurricane: Wind,
  blizzard: Droplets,
  heatwave: Thermometer,
  coldwave: Thermometer,
  air_quality: Wind,
  radiation: AlertTriangle,
  biological: Bug,
  fungal_bloom: Bug,
  insect_swarm: Bug,
  algae_bloom: Droplets,
  landslide: Mountain,
  other: Globe,
};

const EVENT_COLORS: Record<string, string> = {
  earthquake: "text-orange-400 bg-orange-500/20 border-orange-500/30",
  fire: "text-red-400 bg-red-500/20 border-red-500/30",
  wildfire: "text-red-400 bg-red-500/20 border-red-500/30",
  storm: "text-purple-400 bg-purple-500/20 border-purple-500/30",
  volcano: "text-red-500 bg-red-500/20 border-red-500/30",
  flood: "text-blue-400 bg-blue-500/20 border-blue-500/30",
  drought: "text-amber-400 bg-amber-500/20 border-amber-500/30",
  lightning: "text-yellow-400 bg-yellow-500/20 border-yellow-500/30",
  insect_movement: "text-lime-400 bg-lime-500/20 border-lime-500/30",
  animal_migration: "text-cyan-400 bg-cyan-500/20 border-cyan-500/30",
  deforestation: "text-emerald-400 bg-emerald-500/20 border-emerald-500/30",
  tsunami: "text-blue-500 bg-blue-500/20 border-blue-500/30",
  extreme_weather: "text-gray-400 bg-gray-500/20 border-gray-500/30",
  solar_flare: "text-yellow-400 bg-yellow-500/20 border-yellow-500/30",
  geomagnetic_storm: "text-purple-400 bg-purple-500/20 border-purple-500/30",
  aurora: "text-cyan-400 bg-cyan-500/20 border-cyan-500/30",
  meteor: "text-orange-400 bg-orange-500/20 border-orange-500/30",
  tornado: "text-gray-400 bg-gray-500/20 border-gray-500/30",
  hurricane: "text-purple-400 bg-purple-500/20 border-purple-500/30",
  blizzard: "text-blue-300 bg-blue-400/20 border-blue-400/30",
  heatwave: "text-red-400 bg-red-500/20 border-red-500/30",
  coldwave: "text-blue-300 bg-blue-400/20 border-blue-400/30",
  air_quality: "text-gray-400 bg-gray-500/20 border-gray-500/30",
  radiation: "text-yellow-500 bg-yellow-500/20 border-yellow-500/30",
  biological: "text-green-400 bg-green-500/20 border-green-500/30",
  fungal_bloom: "text-green-400 bg-green-500/20 border-green-500/30",
  insect_swarm: "text-lime-400 bg-lime-500/20 border-lime-500/30",
  algae_bloom: "text-teal-400 bg-teal-500/20 border-teal-500/30",
  landslide: "text-amber-400 bg-amber-500/20 border-amber-500/30",
  other: "text-gray-400 bg-gray-500/20 border-gray-500/30",
};

const SEVERITY_COLORS: Record<EventSeverity, string> = {
  minor: "bg-gray-500",
  moderate: "bg-yellow-500",
  significant: "bg-orange-500",
  severe: "bg-red-500",
  critical: "bg-red-600 animate-pulse",
};

const EVENT_LABELS: Record<string, string> = {
  earthquake: "Earthquake",
  fire: "Wildfire",
  wildfire: "Wildfire",
  storm: "Storm",
  volcano: "Volcanic Activity",
  flood: "Flooding",
  drought: "Drought",
  lightning: "Lightning Event",
  insect_movement: "Insect Movement",
  animal_migration: "Animal Migration",
  deforestation: "Deforestation",
  tsunami: "Tsunami",
  extreme_weather: "Extreme Weather",
  solar_flare: "Solar Flare",
  geomagnetic_storm: "Geomagnetic Storm",
  aurora: "Aurora",
  meteor: "Meteor",
  tornado: "Tornado",
  hurricane: "Hurricane",
  blizzard: "Blizzard",
  heatwave: "Heat Wave",
  coldwave: "Cold Wave",
  air_quality: "Air Quality",
  radiation: "Radiation",
  biological: "Biological",
  fungal_bloom: "Fungal Bloom",
  insect_swarm: "Insect Swarm",
  algae_bloom: "Algae Bloom",
  landslide: "Landslide",
  other: "Event",
};

export function NLMGlobalEvents({
  className = "",
  maxEvents = 50,
  onClose,
  onMaximize,
  isMaximized = false,
}: NLMGlobalEventsProps) {
  const [events, setEvents] = useState<GlobalEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [filter, setFilter] = useState<GlobalEventType | "all">("all");

  const fetchEvents = useCallback(async () => {
    try {
      // Try to fetch from our global events API
      const response = await fetch("/api/natureos/global-events");
      
      if (response.ok) {
        const data = await response.json();
        // Transform events to handle location object from API
        const transformedEvents = (data.events || []).map((e: any) => ({
          ...e,
          // Convert location object to string if needed
          location: typeof e.location === "object" 
            ? (e.location?.name || `${e.location?.latitude?.toFixed(2) || 0}, ${e.location?.longitude?.toFixed(2) || 0}`)
            : (e.location || "Unknown"),
          // Ensure coordinates are present
          coordinates: e.coordinates || { lat: e.location?.latitude || 0, lng: e.location?.longitude || 0 },
        }));
        setEvents(transformedEvents);
      } else {
        // Use simulated data if API not available
        setEvents(generateSimulatedEvents());
      }
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Failed to fetch global events:", error);
      setEvents(generateSimulatedEvents());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchEvents]);

  const filteredEvents = filter === "all" 
    ? events 
    : events.filter(e => e.type === filter);

  const formatTimeAgo = (date: Date | string) => {
    const timestamp = typeof date === "string" ? new Date(date) : date;
    const seconds = Math.floor((Date.now() - timestamp.getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <Card className={`bg-gray-900/95 border-gray-700 ${className}`}>
      <CardHeader className="py-2 px-3 border-b border-gray-700 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2 text-cyan-400">
          <Globe className="h-4 w-4" />
          NLM GLOBAL EVENTS
          {!isLoading && (
            <Badge variant="outline" className="text-[10px] font-mono text-gray-400 border-gray-600">
              {filteredEvents.length} events
            </Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-400 hover:text-white"
            onClick={fetchEvents}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          {onMaximize && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-gray-400 hover:text-white"
              onClick={onMaximize}
            >
              {isMaximized ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            </Button>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-gray-400 hover:text-red-400"
              onClick={onClose}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className={isMaximized ? "h-[600px]" : "h-[200px]"}>
          <div className="p-2 space-y-2">
            {isLoading ? (
              <div className="text-center py-4 text-gray-400 text-sm">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                Loading global events...
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">
                No events to display
              </div>
            ) : (
              filteredEvents.map((event) => {
                const Icon = EVENT_ICONS[event.type] || Globe;
                const colorClass = EVENT_COLORS[event.type] || "text-gray-400 bg-gray-500/20 border-gray-500/30";

                return (
                  <div
                    key={event.id}
                    className={`p-2 rounded-lg border ${colorClass} transition-all hover:brightness-110`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="p-1.5 rounded-md bg-black/30">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium truncate">
                            {event.title}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${SEVERITY_COLORS[event.severity]}`} />
                            <span className="text-[10px] text-gray-400 whitespace-nowrap">
                              {formatTimeAgo(event.timestamp)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400">
                          <span className="truncate">{event.location}</span>
                          {event.magnitude && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                              M{event.magnitude.toFixed(1)}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                            {EVENT_LABELS[event.type] || event.type}
                          </Badge>
                          {event.military_relevance === "high" && (
                            <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">
                              MIL
                            </Badge>
                          )}
                          {event.research_relevance === "high" && (
                            <Badge className="text-[9px] px-1 py-0 h-4 bg-purple-600">
                              SCI
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Generate simulated events for demonstration
function generateSimulatedEvents(): GlobalEvent[] {
  const now = Date.now();
  return [
    {
      id: "eq-1",
      type: "earthquake",
      severity: "moderate",
      title: "M4.2 Earthquake",
      location: "Baja California, Mexico",
      coordinates: { lat: 32.4, lng: -115.2 },
      timestamp: new Date(now - 15 * 60 * 1000),
      source: "USGS",
      magnitude: 4.2,
      military_relevance: "low",
      research_relevance: "medium",
    },
    {
      id: "fire-1",
      type: "fire",
      severity: "significant",
      title: "Wildfire Spreading",
      location: "Riverside County, CA",
      coordinates: { lat: 33.8, lng: -117.4 },
      timestamp: new Date(now - 30 * 60 * 1000),
      source: "NASA FIRMS",
      affected_area: "2,400 acres",
      military_relevance: "medium",
      research_relevance: "high",
    },
    {
      id: "storm-1",
      type: "storm",
      severity: "severe",
      title: "Tropical Storm Warning",
      location: "Gulf of Mexico",
      coordinates: { lat: 25.8, lng: -90.2 },
      timestamp: new Date(now - 45 * 60 * 1000),
      source: "NOAA",
      military_relevance: "high",
      research_relevance: "high",
    },
    {
      id: "migration-1",
      type: "animal_migration",
      severity: "minor",
      title: "Whale Migration Detected",
      location: "Pacific Coast, CA",
      coordinates: { lat: 34.0, lng: -119.5 },
      timestamp: new Date(now - 2 * 60 * 60 * 1000),
      source: "NOAA Fisheries",
      military_relevance: "low",
      research_relevance: "high",
    },
    {
      id: "insect-1",
      type: "insect_movement",
      severity: "moderate",
      title: "Locust Swarm Movement",
      location: "East Africa",
      coordinates: { lat: 2.0, lng: 38.5 },
      timestamp: new Date(now - 3 * 60 * 60 * 1000),
      source: "FAO",
      affected_area: "150 km corridor",
      military_relevance: "medium",
      research_relevance: "high",
    },
    {
      id: "volcano-1",
      type: "volcano",
      severity: "significant",
      title: "Increased Activity",
      location: "Mount Etna, Italy",
      coordinates: { lat: 37.75, lng: 14.99 },
      timestamp: new Date(now - 4 * 60 * 60 * 1000),
      source: "INGV",
      military_relevance: "low",
      research_relevance: "high",
    },
    {
      id: "flood-1",
      type: "flood",
      severity: "moderate",
      title: "Flash Flood Warning",
      location: "Arizona Desert",
      coordinates: { lat: 33.4, lng: -111.9 },
      timestamp: new Date(now - 5 * 60 * 60 * 1000),
      source: "NWS",
      military_relevance: "medium",
      research_relevance: "medium",
    },
    {
      id: "lightning-1",
      type: "lightning",
      severity: "minor",
      title: "Significant Lightning Activity",
      location: "Florida Panhandle",
      coordinates: { lat: 30.4, lng: -86.5 },
      timestamp: new Date(now - 6 * 60 * 60 * 1000),
      source: "NOAA",
      military_relevance: "medium",
      research_relevance: "medium",
    },
  ];
}

export default NLMGlobalEvents;
