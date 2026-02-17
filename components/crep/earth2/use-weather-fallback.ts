/**
 * Weather Fallback Hook
 * February 12, 2026
 * 
 * Provides weather data with automatic fallback:
 * 1. Try Earth-2 GPU-based API (when gpuMode === "earth2")
 * 2. Fall back to Open-Meteo CPU-based API (when GPU unavailable)
 * 
 * NO MOCK DATA - returns empty state when both APIs unavailable
 */

import { useState, useEffect, useCallback } from "react";
import type { GpuMode } from "./earth2-layer-control";

interface WeatherData {
  source: "earth2" | "openmeteo";
  gpuFallback: boolean;
  current?: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    precipitation: number;
    pressure: number;
  };
  hourly?: Array<{
    time: string;
    temperature: number;
    humidity: number;
    precipitation: number;
    windSpeed: number;
    windDirection: number;
  }>;
  daily?: Array<{
    time: string;
    temperatureMax: number;
    temperatureMin: number;
    precipitationSum: number;
  }>;
  wind?: Array<{
    lat: number;
    lon: number;
    u: number;
    v: number;
    speed: number;
    direction: number;
  }>;
}

interface UseWeatherFallbackOptions {
  latitude: number;
  longitude: number;
  gpuMode: GpuMode;
  cpuFallbackEnabled: boolean;
  refreshInterval?: number;
  type?: "current" | "hourly" | "daily" | "all";
}

interface UseWeatherFallbackResult {
  data: WeatherData | null;
  loading: boolean;
  error: string | null;
  source: "earth2" | "openmeteo" | "none";
  refetch: () => void;
}

export function useWeatherFallback({
  latitude,
  longitude,
  gpuMode,
  cpuFallbackEnabled,
  refreshInterval = 300000, // 5 minutes
  type = "current",
}: UseWeatherFallbackOptions): UseWeatherFallbackResult {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"earth2" | "openmeteo" | "none">("none");

  const fetchWeatherData = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Determine which API to use
    const useGpu = gpuMode === "earth2";
    const useCpuFallback = !useGpu && cpuFallbackEnabled;

    if (!useGpu && !useCpuFallback) {
      // No weather service available
      setData(null);
      setSource("none");
      setLoading(false);
      setError("Weather service disabled - GPU allocated elsewhere and CPU fallback disabled");
      return;
    }

    try {
      if (useGpu) {
        // Try Earth-2 GPU API first
        const earth2Response = await fetch(
          `/api/earth2/weather?lat=${latitude}&lon=${longitude}&type=${type}`,
          { signal: AbortSignal.timeout(10000) }
        );

        if (earth2Response.ok) {
          const earth2Data = await earth2Response.json();
          setData({
            source: "earth2",
            gpuFallback: false,
            current: earth2Data.current,
            hourly: earth2Data.hourly,
            daily: earth2Data.daily,
            wind: earth2Data.wind,
          });
          setSource("earth2");
          setLoading(false);
          return;
        }

        // Earth-2 failed, try CPU fallback if enabled
        if (cpuFallbackEnabled) {
          console.log("[Weather Fallback] Earth-2 unavailable, trying Open-Meteo...");
        } else {
          setError("Earth-2 API unavailable");
          setData(null);
          setSource("none");
          setLoading(false);
          return;
        }
      }

      // Use Open-Meteo CPU fallback
      const openMeteoResponse = await fetch(
        `/api/weather/openmeteo?lat=${latitude}&lon=${longitude}&type=${type}`,
        { signal: AbortSignal.timeout(10000) }
      );

      if (openMeteoResponse.ok) {
        const openMeteoData = await openMeteoResponse.json();
        setData({
          source: "openmeteo",
          gpuFallback: true,
          current: openMeteoData.current,
          hourly: openMeteoData.hourly,
          daily: openMeteoData.daily,
        });
        setSource("openmeteo");
        setLoading(false);
        return;
      }

      // Both APIs failed
      setError("Weather services unavailable");
      setData(null);
      setSource("none");
    } catch (err) {
      console.error("[Weather Fallback] Failed to fetch weather:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch weather");
      setData(null);
      setSource("none");
    } finally {
      setLoading(false);
    }
  }, [latitude, longitude, gpuMode, cpuFallbackEnabled, type]);

  useEffect(() => {
    fetchWeatherData();

    // Set up refresh interval
    const interval = setInterval(fetchWeatherData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchWeatherData, refreshInterval]);

  return {
    data,
    loading,
    error,
    source,
    refetch: fetchWeatherData,
  };
}

/**
 * Hook for wind data with GPU fallback
 * Wind data is particularly important for spore dispersal simulation
 */
export function useWindFallback({
  bounds,
  gpuMode,
  cpuFallbackEnabled,
}: {
  bounds: { north: number; south: number; east: number; west: number };
  gpuMode: GpuMode;
  cpuFallbackEnabled: boolean;
}) {
  const [windData, setWindData] = useState<Array<{
    lat: number;
    lon: number;
    u: number;
    v: number;
    speed: number;
    direction: number;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"earth2" | "openmeteo" | "none">("none");

  const fetchWindData = useCallback(async () => {
    setLoading(true);
    const useGpu = gpuMode === "earth2";
    const useCpuFallback = !useGpu && cpuFallbackEnabled;

    if (!useGpu && !useCpuFallback) {
      setWindData([]);
      setSource("none");
      setLoading(false);
      return;
    }

    try {
      if (useGpu) {
        // Try Earth-2 wind grid
        const response = await fetch(
          `/api/earth2/wind?north=${bounds.north}&south=${bounds.south}&east=${bounds.east}&west=${bounds.west}`,
          { signal: AbortSignal.timeout(10000) }
        );

        if (response.ok) {
          const data = await response.json();
          setWindData(data.wind || []);
          setSource("earth2");
          setLoading(false);
          return;
        }
      }

      // Open-Meteo fallback - get wind at grid points
      // Generate grid points within bounds
      const gridPoints: { lat: number; lon: number }[] = [];
      const latStep = (bounds.north - bounds.south) / 5;
      const lonStep = (bounds.east - bounds.west) / 5;

      for (let lat = bounds.south; lat <= bounds.north; lat += latStep) {
        for (let lon = bounds.west; lon <= bounds.east; lon += lonStep) {
          gridPoints.push({ lat, lon });
        }
      }

      // Fetch wind for each grid point (limit to avoid too many requests)
      const limitedPoints = gridPoints.slice(0, 16);
      const windResults = await Promise.all(
        limitedPoints.map(async (point) => {
          try {
            const response = await fetch(
              `/api/weather/openmeteo?lat=${point.lat}&lon=${point.lon}&type=current`,
              { signal: AbortSignal.timeout(5000) }
            );
            if (response.ok) {
              const data = await response.json();
              if (data.current) {
                const speed = data.current.windSpeed;
                const direction = data.current.windDirection;
                // Convert to u,v components (meteorological convention)
                const dirRad = ((270 - direction) * Math.PI) / 180;
                return {
                  lat: point.lat,
                  lon: point.lon,
                  u: speed * Math.cos(dirRad),
                  v: speed * Math.sin(dirRad),
                  speed,
                  direction,
                };
              }
            }
            return null;
          } catch {
            return null;
          }
        })
      );

      const validResults = windResults.filter((r): r is NonNullable<typeof r> => r !== null);
      setWindData(validResults);
      setSource(validResults.length > 0 ? "openmeteo" : "none");
    } catch (err) {
      console.error("[Wind Fallback] Failed to fetch wind data:", err);
      setWindData([]);
      setSource("none");
    } finally {
      setLoading(false);
    }
  }, [bounds, gpuMode, cpuFallbackEnabled]);

  useEffect(() => {
    fetchWindData();
  }, [fetchWindData]);

  return { windData, loading, source, refetch: fetchWindData };
}
