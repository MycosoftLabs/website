"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Activity,
  AlertTriangle,
  Bell,
  Bot,
  Bug,
  Cloud,
  Database,
  Eye,
  Filter,
  Leaf,
  MapPin,
  Microscope,
  Radio,
  RefreshCw,
  Satellite,
  Server,
  Thermometer,
  Wifi,
  Zap,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";

// Event types for situational awareness
type EventType = 
  | "observation" // iNaturalist/GBIF observation
  | "device" // MycoBrain device event
  | "system" // System event (API, n8n, etc.)
  | "weather" // Weather/environmental
  | "alert" // Alert/warning
  | "ai" // AI/MYCA event
  | "research" // Research/discovery

type EventSeverity = "info" | "success" | "warning" | "error";

interface Event {
  id: string;
  type: EventType;
  severity: EventSeverity;
  title: string;
  description: string;
  source: string;
  timestamp: Date;
  location?: { lat: number; lng: number; name?: string };
  metadata?: Record<string, unknown>;
  link?: string;
}

const eventIcons: Record<EventType, typeof Activity> = {
  observation: Eye,
  device: Radio,
  system: Server,
  weather: Cloud,
  alert: AlertTriangle,
  ai: Bot,
  research: Microscope,
};

const severityColors: Record<EventSeverity, string> = {
  info: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  success: "text-green-500 bg-green-500/10 border-green-500/20",
  warning: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
  error: "text-red-500 bg-red-500/10 border-red-500/20",
};

const typeLabels: Record<EventType, string> = {
  observation: "Species Observation",
  device: "Device",
  system: "System",
  weather: "Weather",
  alert: "Alert",
  ai: "AI/MYCA",
  research: "Research",
};

interface EventFeedProps {
  className?: string;
  maxEvents?: number;
  compact?: boolean;
  filterTypes?: EventType[];
}

export function EventFeed({ 
  className = "", 
  maxEvents = 50,
  compact = false,
  filterTypes,
}: EventFeedProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [activeFilters, setActiveFilters] = useState<EventType[]>(filterTypes || []);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      // Aggregate events from multiple sources in parallel
      const [
        systemEvents,
        deviceEvents,
        observationEvents,
      ] = await Promise.allSettled([
        // System/n8n events
        fetch("/api/natureos/activity").then(r => r.ok ? r.json() : { events: [] }),
        // Device events
        fetch("/api/mycobrain/events").then(r => r.ok ? r.json() : { events: [] }),
        // Recent observations
        fetch("/api/mindex/observations?limit=20").then(r => r.ok ? r.json() : { observations: [] }),
      ]);

      const allEvents: Event[] = [];

      // Parse system events
      if (systemEvents.status === "fulfilled" && systemEvents.value.events) {
        systemEvents.value.events.forEach((e: any) => {
          allEvents.push({
            id: e.id || `sys-${Date.now()}-${Math.random()}`,
            type: "system",
            severity: e.status === "error" ? "error" : e.status === "warning" ? "warning" : "success",
            title: e.message || e.title || "System Event",
            description: e.details || e.type || "",
            source: e.source || "MAS",
            timestamp: new Date(e.timestamp || Date.now()),
            metadata: e,
          });
        });
      }

      // Parse device events
      if (deviceEvents.status === "fulfilled" && deviceEvents.value.events) {
        deviceEvents.value.events.forEach((e: any) => {
          allEvents.push({
            id: e.id || `dev-${Date.now()}-${Math.random()}`,
            type: "device",
            severity: e.connected ? "success" : "warning",
            title: `MycoBrain ${e.device_id || "Device"}`,
            description: e.message || (e.connected ? "Connected" : "Disconnected"),
            source: e.port || "MycoBrain",
            timestamp: new Date(e.timestamp || Date.now()),
            location: e.location,
            metadata: e,
          });
        });
      }

      // Parse observations as events
      if (observationEvents.status === "fulfilled" && observationEvents.value.observations) {
        observationEvents.value.observations.slice(0, 10).forEach((obs: any) => {
          allEvents.push({
            id: obs.id?.toString() || `obs-${Date.now()}-${Math.random()}`,
            type: "observation",
            severity: "info",
            title: obs.scientificName || obs.species || "Unknown Species",
            description: obs.observedOn ? `Observed on ${new Date(obs.observedOn).toLocaleDateString()}` : "Recent observation",
            source: obs.source || "iNaturalist",
            timestamp: new Date(obs.observedOn || obs.created_at || Date.now()),
            location: obs.latitude && obs.longitude ? {
              lat: obs.latitude,
              lng: obs.longitude,
              name: obs.placeName || obs.location,
            } : undefined,
            link: obs.uri || obs.url,
            metadata: obs,
          });
        });
      }

      // Add some simulated real-time events for demonstration
      const now = new Date();
      const simulatedEvents: Event[] = [
        {
          id: `sim-weather-${Date.now()}`,
          type: "weather",
          severity: "info",
          title: "Weather Update",
          description: "Atmospheric conditions favorable for spore dispersal",
          source: "NatureOS Weather",
          timestamp: new Date(now.getTime() - 5 * 60 * 1000),
        },
        {
          id: `sim-ai-${Date.now()}`,
          type: "ai",
          severity: "success",
          title: "MYCA Analysis Complete",
          description: "Species distribution model updated with 50 new data points",
          source: "MYCA",
          timestamp: new Date(now.getTime() - 15 * 60 * 1000),
        },
      ];

      allEvents.push(...simulatedEvents);

      // Sort by timestamp (newest first) and limit
      allEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setEvents(allEvents.slice(0, maxEvents));
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setIsLoading(false);
    }
  }, [maxEvents]);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchEvents]);

  const filteredEvents = activeFilters.length > 0
    ? events.filter(e => activeFilters.includes(e.type))
    : events;

  const toggleFilter = (type: EventType) => {
    setActiveFilters(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (compact && !isExpanded) {
    return (
      <Card className={`${className} cursor-pointer`} onClick={() => setIsExpanded(true)}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-500 animate-pulse" />
              <span className="text-sm font-medium">Live Events</span>
              <Badge variant="secondary" className="text-xs">
                {events.length}
              </Badge>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-5 w-5 text-green-500" />
              Situational Awareness
              {events.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {filteredEvents.length} events
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Real-time event stream from all systems
              {lastUpdate && ` • Updated ${formatTimeAgo(lastUpdate)}`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={fetchEvents}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
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

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-1 mt-3">
          {(Object.keys(eventIcons) as EventType[]).map((type) => {
            const Icon = eventIcons[type];
            const isActive = activeFilters.length === 0 || activeFilters.includes(type);
            const count = events.filter(e => e.type === type).length;
            
            return (
              <Button
                key={type}
                variant={activeFilters.includes(type) ? "default" : "outline"}
                size="sm"
                className={`h-7 text-xs ${!isActive ? "opacity-50" : ""}`}
                onClick={() => toggleFilter(type)}
              >
                <Icon className="h-3 w-3 mr-1" />
                {typeLabels[type]}
                {count > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                    {count}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="p-4 pt-0 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No events to display
              </div>
            ) : (
              filteredEvents.map((event, index) => {
                const Icon = eventIcons[event.type];
                const colorClass = severityColors[event.severity];

                return (
                  <div key={event.id}>
                    <div
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors hover:bg-muted/50 ${colorClass}`}
                    >
                      <div className={`p-1.5 rounded-lg ${colorClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm truncate">
                            {event.title}
                          </p>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatTimeAgo(event.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {event.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <Badge variant="outline" className="text-[10px] h-5">
                            {event.source}
                          </Badge>
                          {event.location && (
                            <Badge variant="outline" className="text-[10px] h-5">
                              <MapPin className="h-2.5 w-2.5 mr-1" />
                              {event.location.name || `${event.location.lat.toFixed(2)}, ${event.location.lng.toFixed(2)}`}
                            </Badge>
                          )}
                          {event.link && (
                            <a
                              href={event.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5"
                            >
                              View <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    {index < filteredEvents.length - 1 && (
                      <Separator className="my-2 opacity-50" />
                    )}
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
