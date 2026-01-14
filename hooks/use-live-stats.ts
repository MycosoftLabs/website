"use client";

/**
 * useLiveStats - Real-time biodiversity statistics hook
 * 
 * Fetches and maintains live counts from:
 * - GBIF (species, observations)
 * - iNaturalist (observations, images)
 * - MycoBank (species)
 * - Index Fungorum (species)
 * - MycoBrain devices
 * 
 * Returns continuously updating numbers for dashboard display
 */

import { useState, useEffect, useCallback, useRef } from "react";

export interface LiveStats {
  timestamp: string;
  species: {
    total: number;
    gbif: number;
    inaturalist: number;
    mycobank: number;
    indexFungorum: number;
    delta: number;
  };
  observations: {
    total: number;
    gbif: number;
    inaturalist: number;
    delta: number;
  };
  images: {
    total: number;
    gbif: number;
    inaturalist: number;
    delta: number;
  };
  devices: {
    registered: number;
    online: number;
    streaming: number;
  };
  lastUpdated: string;
  sources: {
    name: string;
    status: "online" | "offline" | "degraded";
    lastSync: string;
    count: number;
  }[];
}

interface UseLiveStatsOptions {
  refreshInterval?: number;
  simulateGrowth?: boolean;
  onNewData?: (stats: LiveStats) => void;
}

export function useLiveStats(options: UseLiveStatsOptions = {}) {
  const {
    refreshInterval = 30000, // 30 seconds
    simulateGrowth = true,
    onNewData,
  } = options;

  const [stats, setStats] = useState<LiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  
  const growthIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const baseStatsRef = useRef<LiveStats | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/natureos/live-stats");
      if (!res.ok) throw new Error("Failed to fetch live stats");
      
      const data: LiveStats = await res.json();
      baseStatsRef.current = data;
      setStats(data);
      setLastFetch(new Date());
      setError(null);
      onNewData?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [onNewData]);

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchStats, refreshInterval]);

  // Simulate real-time growth between fetches
  useEffect(() => {
    if (!simulateGrowth || !stats) return;

    // Growth rates per second (derived from hourly rates)
    const SPECIES_PER_SECOND = 25 / 3600; // ~25 species per hour
    const OBS_PER_SECOND = 130000 / 3600; // ~130k observations per hour
    const IMAGES_PER_SECOND = 90000 / 3600; // ~90k images per hour

    growthIntervalRef.current = setInterval(() => {
      setStats((prev) => {
        if (!prev) return prev;
        
        // Add small random increments
        const speciesIncrement = Math.random() < SPECIES_PER_SECOND ? 1 : 0;
        const obsIncrement = Math.floor(Math.random() * (OBS_PER_SECOND * 2));
        const imgIncrement = Math.floor(Math.random() * (IMAGES_PER_SECOND * 2));

        return {
          ...prev,
          timestamp: new Date().toISOString(),
          species: {
            ...prev.species,
            total: prev.species.total + speciesIncrement,
          },
          observations: {
            ...prev.observations,
            total: prev.observations.total + obsIncrement,
          },
          images: {
            ...prev.images,
            total: prev.images.total + imgIncrement,
          },
        };
      });
    }, 1000);

    return () => {
      if (growthIntervalRef.current) {
        clearInterval(growthIntervalRef.current);
      }
    };
  }, [simulateGrowth, stats?.timestamp]);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    lastFetch,
    refresh,
    isConnected: !error && !!stats,
  };
}

/**
 * useGlobalEvents - Real-time global event stream hook
 */
export interface GlobalEvent {
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

interface UseGlobalEventsOptions {
  refreshInterval?: number;
  maxEvents?: number;
  filterTypes?: string[];
  onNewEvent?: (event: GlobalEvent) => void;
}

export function useGlobalEvents(options: UseGlobalEventsOptions = {}) {
  const {
    refreshInterval = 30000,
    maxEvents = 50,
    filterTypes,
    onNewEvent,
  } = options;

  const [events, setEvents] = useState<GlobalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<Record<string, string>>({});
  
  const previousIdsRef = useRef<Set<string>>(new Set());

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/natureos/global-events");
      if (!res.ok) throw new Error("Failed to fetch global events");
      
      const data = await res.json();
      const newEvents: GlobalEvent[] = data.events || [];
      
      // Check for new events
      newEvents.forEach((event) => {
        if (!previousIdsRef.current.has(event.id)) {
          onNewEvent?.(event);
        }
      });
      
      previousIdsRef.current = new Set(newEvents.map((e) => e.id));
      
      // Apply filters if specified
      const filtered = filterTypes?.length
        ? newEvents.filter((e) => filterTypes.includes(e.type))
        : newEvents;
      
      setEvents(filtered.slice(0, maxEvents));
      setSources(data.sources || {});
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [maxEvents, filterTypes, onNewEvent]);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchEvents, refreshInterval]);

  const criticalCount = events.filter((e) =>
    ["critical", "extreme"].includes(e.severity)
  ).length;

  return {
    events,
    loading,
    error,
    sources,
    criticalCount,
    refresh: fetchEvents,
  };
}

/**
 * useIntelReports - Defense/environmental intelligence reports hook
 */
export interface IntelReport {
  id: string;
  type: "eta" | "esi" | "bar" | "rer" | "eew";
  title: string;
  summary: string;
  details?: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  classification: string;
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
    name: string;
    region?: string;
    country?: string;
  };
  source: string;
  analyst?: string;
  confidence: number;
  indicators?: {
    name: string;
    value: number | string;
    status: string;
  }[];
  recommendations?: string[];
}

interface UseIntelReportsOptions {
  refreshInterval?: number;
  filterTypes?: ("eta" | "esi" | "bar" | "rer" | "eew")[];
}

export function useIntelReports(options: UseIntelReportsOptions = {}) {
  const { refreshInterval = 60000, filterTypes } = options;

  const [reports, setReports] = useState<IntelReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<{
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
  }>({ bySeverity: {}, byType: {} });

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch("/api/natureos/intel-reports");
      if (!res.ok) throw new Error("Failed to fetch intel reports");
      
      const data = await res.json();
      const allReports: IntelReport[] = data.reports || [];
      
      const filtered = filterTypes?.length
        ? allReports.filter((r) => filterTypes.includes(r.type))
        : allReports;
      
      setReports(filtered);
      setCounts({
        bySeverity: data.bySeverity || {},
        byType: data.byType || {},
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [filterTypes]);

  useEffect(() => {
    fetchReports();
    const interval = setInterval(fetchReports, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchReports, refreshInterval]);

  return {
    reports,
    loading,
    error,
    counts,
    refresh: fetchReports,
  };
}

export default useLiveStats;
