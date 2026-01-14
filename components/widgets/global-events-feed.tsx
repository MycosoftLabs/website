"use client";

/**
 * GlobalEventsFeed - Real-time worldwide event stream
 * 
 * Displays live events from:
 * - USGS Earthquakes
 * - NOAA Space Weather (solar flares, geomagnetic storms)
 * - NASA EONET (wildfires, volcanoes, storms)
 * - Weather events (lightning, tornados, hurricanes)
 * - Biological events (fungal blooms, migrations)
 * - Twitter/X Bot feeds
 * 
 * Designed for "watching the world literally" - continuous situational awareness
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  CloudLightning,
  Flame,
  Globe,
  MapPin,
  Mountain,
  Radio,
  RefreshCw,
  Sun,
  Tornado,
  Waves,
  Wind,
  Zap,
  Bug,
  Trees,
  Droplets,
  Thermometer,
  Satellite,
  ExternalLink,
  Filter,
  Volume2,
  VolumeX,
  Maximize2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface GlobalEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: "info" | "low" | "medium" | "high" | "critical" | "extreme";
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
    name?: string;
    depth?: number;
    altitude?: number;
  };
  magnitude?: number;
  source: string;
  sourceUrl?: string;
  link?: string;
}

const eventIcons: Record<string, typeof Activity> = {
  earthquake: Mountain,
  volcano: Mountain,
  wildfire: Flame,
  storm: CloudLightning,
  flood: Waves,
  drought: Droplets,
  landslide: AlertTriangle,
  tsunami: Waves,
  solar_flare: Sun,
  geomagnetic_storm: Zap,
  aurora: Satellite,
  meteor: Satellite,
  lightning: CloudLightning,
  tornado: Tornado,
  hurricane: Wind,
  blizzard: Wind,
  heatwave: Thermometer,
  coldwave: Thermometer,
  air_quality: Wind,
  radiation: AlertTriangle,
  biological: Bug,
  fungal_bloom: Trees,
  animal_migration: Bug,
  insect_swarm: Bug,
  algae_bloom: Waves,
  other: Globe,
};

const severityColors: Record<string, string> = {
  info: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  low: "bg-green-500/10 text-green-400 border-green-500/30",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  critical: "bg-red-500/10 text-red-400 border-red-500/30",
  extreme: "bg-purple-500/10 text-purple-400 border-purple-500/30 animate-pulse",
};

const severityBadgeColors: Record<string, string> = {
  info: "bg-blue-500",
  low: "bg-green-500",
  medium: "bg-yellow-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
  extreme: "bg-purple-500 animate-pulse",
};

interface GlobalEventsFeedProps {
  className?: string;
  maxEvents?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  showFilters?: boolean;
  compact?: boolean;
  onEventClick?: (event: GlobalEvent) => void;
}

export function GlobalEventsFeed({
  className,
  maxEvents = 50,
  autoRefresh = true,
  refreshInterval = 30000,
  showFilters = true,
  compact = false,
  onEventClick,
}: GlobalEventsFeedProps) {
  const [events, setEvents] = useState<GlobalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [isPaused, setIsPaused] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const previousEventsRef = useRef<string[]>([]);

  const fetchEvents = useCallback(async () => {
    if (isPaused) return;
    
    try {
      const res = await fetch("/api/natureos/global-events");
      if (!res.ok) throw new Error("Failed to fetch events");
      
      const data = await res.json();
      const newEvents = data.events || [];
      
      // Check for new high-severity events
      const currentIds = newEvents.map((e: GlobalEvent) => e.id);
      const newHighSeverity = newEvents.filter(
        (e: GlobalEvent) =>
          !previousEventsRef.current.includes(e.id) &&
          ["critical", "extreme"].includes(e.severity)
      );
      
      if (newHighSeverity.length > 0 && soundEnabled) {
        // Play alert sound for critical events
        playAlertSound();
      }
      
      previousEventsRef.current = currentIds;
      setEvents(newEvents.slice(0, maxEvents));
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection error");
    } finally {
      setLoading(false);
    }
  }, [maxEvents, isPaused, soundEnabled]);

  useEffect(() => {
    fetchEvents();
    
    if (autoRefresh && !isPaused) {
      const interval = setInterval(fetchEvents, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchEvents, autoRefresh, refreshInterval, isPaused]);

  const playAlertSound = () => {
    // Create a simple alert tone using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
      console.log("Audio not available");
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const filteredEvents = activeFilter === "all" 
    ? events 
    : events.filter(e => e.type === activeFilter);

  const eventTypes = Array.from(new Set(events.map(e => e.type)));

  const criticalCount = events.filter(e => 
    ["critical", "extreme"].includes(e.severity)
  ).length;

  if (compact && !isExpanded) {
    return (
      <Card 
        className={cn("cursor-pointer hover:bg-accent/50 transition-colors", className)}
        onClick={() => setIsExpanded(true)}
      >
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-green-500 animate-pulse" />
              <span className="text-sm font-medium">Global Events</span>
              <Badge variant="secondary" className="text-xs">
                {events.length}
              </Badge>
              {criticalCount > 0 && (
                <Badge className="text-xs bg-red-500">
                  {criticalCount} critical
                </Badge>
              )}
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className={cn(
                "h-5 w-5",
                loading ? "animate-spin text-muted-foreground" : "text-green-500"
              )} />
              Global Events
            </CardTitle>
            {criticalCount > 0 && (
              <Badge className="bg-red-500 animate-pulse">
                {criticalCount} CRITICAL
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "Mute alerts" : "Enable sound alerts"}
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4 text-green-500" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsPaused(!isPaused)}
              title={isPaused ? "Resume" : "Pause"}
            >
              {isPaused ? (
                <Activity className="h-4 w-4" />
              ) : (
                <Activity className="h-4 w-4 text-green-500 animate-pulse" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={fetchEvents}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            {compact && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsExpanded(false)}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        {lastUpdate && (
          <p className="text-xs text-muted-foreground mt-1">
            Last updated: {formatTimeAgo(lastUpdate.toISOString())}
            {isPaused && " • PAUSED"}
          </p>
        )}

        {showFilters && eventTypes.length > 1 && (
          <div className="flex flex-wrap gap-1 mt-3">
            <Button
              variant={activeFilter === "all" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setActiveFilter("all")}
            >
              All ({events.length})
            </Button>
            {eventTypes.slice(0, 8).map((type) => {
              const Icon = eventIcons[type] || Globe;
              const count = events.filter(e => e.type === type).length;
              return (
                <Button
                  key={type}
                  variant={activeFilter === type ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setActiveFilter(type)}
                >
                  <Icon className="h-3 w-3 mr-1" />
                  {type.replace(/_/g, " ")} ({count})
                </Button>
              );
            })}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[500px]" ref={scrollRef}>
          <div className="p-4 pt-0 space-y-2">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}
            
            {filteredEvents.length === 0 && !loading && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Globe className="h-12 w-12 mx-auto mb-3 opacity-50" />
                No events to display
              </div>
            )}

            {filteredEvents.map((event, index) => {
              const Icon = eventIcons[event.type] || Globe;
              const colorClass = severityColors[event.severity] || severityColors.info;
              const badgeColor = severityBadgeColors[event.severity] || severityBadgeColors.info;

              return (
                <div
                  key={event.id}
                  className={cn(
                    "p-3 rounded-lg border transition-all cursor-pointer hover:scale-[1.01]",
                    colorClass
                  )}
                  onClick={() => onEventClick?.(event)}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("p-2 rounded-lg bg-background/50")}>
                      <Icon className="h-5 w-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={cn("text-[10px] uppercase", badgeColor)}>
                            {event.severity}
                          </Badge>
                          {event.magnitude && (
                            <Badge variant="outline" className="text-[10px]">
                              M{event.magnitude.toFixed(1)}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatTimeAgo(event.timestamp)}
                        </span>
                      </div>
                      
                      <h4 className="font-medium text-sm mt-1 line-clamp-1">
                        {event.title}
                      </h4>
                      
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {event.description}
                      </p>
                      
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="line-clamp-1">
                            {typeof event.location === "object" 
                              ? (event.location.name || 
                                  `${event.location.latitude?.toFixed(2) || 0}, ${event.location.longitude?.toFixed(2) || 0}`)
                              : (event.location || "Unknown")}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Radio className="h-3 w-3" />
                          <span>{event.source}</span>
                        </div>
                        
                        {event.link && (
                          <a
                            href={event.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-blue-400 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Details
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default GlobalEventsFeed;
