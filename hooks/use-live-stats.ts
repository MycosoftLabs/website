"use client";

/**
 * useLiveStats - Real-time biodiversity statistics hook for ALL KINGDOMS
 * 
 * Fetches and maintains live counts for:
 * - FUNGI (Kingdom: Fungi) - Primary focus
 * - PLANTS (Kingdom: Plantae)
 * - BIRDS (Class: Aves)
 * - INSECTS (Class: Insecta)
 * - ANIMALS (Kingdom: Animalia)
 * - MARINE (Ocean life)
 * - MAMMALS (Class: Mammalia)
 * 
 * Data sources: GBIF, iNaturalist, MycoBank, Index Fungorum, eBird, OBIS
 */

import { useState, useEffect, useCallback, useRef } from "react";

// Individual kingdom stats structure
export interface KingdomStats {
  total: number;
  sources: Record<string, number>;
  delta: number;
}

// Environmental impact metrics for a kingdom
export interface EnvironmentalMetrics {
  co2: number;      // tonnes/day (negative = absorption)
  methane: number;  // tonnes/day
  water: number;    // million liters/day
  co2Delta: number;
  methaneDelta: number;
  waterDelta: number;
}

// Full stats for a kingdom (species, observations, images, environmental)
export interface KingdomData {
  species: KingdomStats;
  observations: KingdomStats;
  images: KingdomStats;
  environmental?: EnvironmentalMetrics;
}

// Complete live stats response
export interface LiveStats {
  timestamp: string;
  // All kingdoms
  fungi: KingdomData;
  plants: KingdomData;
  birds: KingdomData;
  insects: KingdomData;
  animals: KingdomData;
  marine: KingdomData;
  mammals: KingdomData;
  protista: KingdomData;
  bacteria: KingdomData;
  archaea: KingdomData;
  // Devices
  devices: {
    registered: number;
    online: number;
    streaming: number;
  };
  // Grand totals
  totals: {
    allSpecies: number;
    allObservations: number;
    allImages: number;
    speciesDelta: number;
    observationsDelta: number;
    imagesDelta: number;
    // Global environmental totals
    netCO2?: number;      // Gt/year
    totalMethane?: number; // Mt/year
    totalWater?: number;   // km³/day
  };
  // Legacy format for backwards compatibility
  species?: {
    total: number;
    gbif: number;
    inaturalist: number;
    mycobank: number;
    indexFungorum: number;
    delta: number;
  };
  observations?: {
    total: number;
    gbif: number;
    inaturalist: number;
    delta: number;
  };
  images?: {
    total: number;
    gbif: number;
    inaturalist: number;
    delta: number;
  };
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
      
      const data = await res.json();
      
      // Transform to include legacy format for backwards compatibility
      const stats: LiveStats = {
        ...data,
        // Legacy format mapping to fungi data
        species: {
          total: data.fungi?.species?.total || 0,
          gbif: data.fungi?.species?.sources?.gbif || 0,
          inaturalist: data.fungi?.species?.sources?.inaturalist || 0,
          mycobank: data.fungi?.species?.sources?.mycobank || 0,
          indexFungorum: data.fungi?.species?.sources?.indexFungorum || 0,
          delta: data.fungi?.species?.delta || 0,
        },
        observations: {
          total: data.fungi?.observations?.total || 0,
          gbif: data.fungi?.observations?.sources?.gbif || 0,
          inaturalist: data.fungi?.observations?.sources?.inaturalist || 0,
          delta: data.fungi?.observations?.delta || 0,
        },
        images: {
          total: data.fungi?.images?.total || 0,
          gbif: data.fungi?.images?.sources?.gbif || 0,
          inaturalist: data.fungi?.images?.sources?.inaturalist || 0,
          delta: data.fungi?.images?.delta || 0,
        },
      };
      
      baseStatsRef.current = stats;
      setStats(stats);
      setLastFetch(new Date());
      setError(null);
      onNewData?.(stats);
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
    const FUNGI_SPECIES_PER_SEC = 5 / 3600;
    const FUNGI_OBS_PER_SEC = 3500 / 3600;
    const FUNGI_IMG_PER_SEC = 2800 / 3600;

    growthIntervalRef.current = setInterval(() => {
      setStats((prev) => {
        if (!prev) return prev;
        
        // Add small random increments to fungi (primary display)
        const speciesIncrement = Math.random() < FUNGI_SPECIES_PER_SEC ? 1 : 0;
        const obsIncrement = Math.floor(Math.random() * (FUNGI_OBS_PER_SEC * 2));
        const imgIncrement = Math.floor(Math.random() * (FUNGI_IMG_PER_SEC * 2));

        return {
          ...prev,
          timestamp: new Date().toISOString(),
          fungi: {
            ...prev.fungi,
            species: {
              ...prev.fungi.species,
              total: prev.fungi.species.total + speciesIncrement,
            },
            observations: {
              ...prev.fungi.observations,
              total: prev.fungi.observations.total + obsIncrement,
            },
            images: {
              ...prev.fungi.images,
              total: prev.fungi.images.total + imgIncrement,
            },
          },
          // Update legacy format too
          species: prev.species ? {
            ...prev.species,
            total: prev.species.total + speciesIncrement,
          } : undefined,
          observations: prev.observations ? {
            ...prev.observations,
            total: prev.observations.total + obsIncrement,
          } : undefined,
          images: prev.images ? {
            ...prev.images,
            total: prev.images.total + imgIncrement,
          } : undefined,
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
