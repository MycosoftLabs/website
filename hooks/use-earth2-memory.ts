/**
 * Earth2 Memory Hook - February 5, 2026
 * 
 * React hook for interacting with Earth2 weather AI memory:
 * - Retrieve forecast history
 * - Access user weather preferences
 * - Check cached forecasts
 * - Get model statistics
 */

import { useState, useCallback } from "react"
import useSWR from "swr"

// Types
export interface ForecastResult {
  id: string
  user_id: string
  model: string
  location: { lat: number; lng: number }
  location_name?: string
  lead_time_hours: number
  variables: string[]
  timestamp: string
  result_summary?: Record<string, unknown>
  inference_time_ms?: number
  source: string
}

export interface UserWeatherPreferences {
  user_id: string
  favorite_locations: Array<{
    location: { lat: number; lng: number }
    name?: string
    count: number
  }>
  preferred_models: string[]
  common_lead_times: number[]
  variables_of_interest: string[]
  forecast_frequency: number
}

export interface ModelStats {
  model: string
  total_runs: number
  total_inference_time_ms: number
  avg_inference_time_ms: number
  last_used?: string
  error_count: number
  vram_mb: number
}

export interface PopularLocation {
  location: string
  count: number
}

export interface Earth2MemoryStats {
  initialized: boolean
  database_connected: boolean
  cached_forecasts: number
  cached_user_prefs: number
  model_stats: Record<string, ModelStats>
}

// API fetcher
const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`)
  }
  return res.json()
}

// Main hook
export function useEarth2Memory(userId?: string) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // SWR for user preferences (auto-refresh)
  const {
    data: preferences,
    error: prefsError,
    mutate: refreshPreferences,
  } = useSWR<UserWeatherPreferences>(
    userId ? `/api/memory/earth2/preferences/${userId}` : null,
    fetcher,
    { refreshInterval: 60000 } // Refresh every minute
  )

  // SWR for forecast history
  const {
    data: forecastHistory,
    error: historyError,
    mutate: refreshHistory,
  } = useSWR<{ forecasts: ForecastResult[]; total: number }>(
    userId ? `/api/memory/earth2/forecasts/${userId}` : null,
    fetcher
  )

  // SWR for model stats
  const {
    data: modelStats,
    error: statsError,
    mutate: refreshStats,
  } = useSWR<{ stats: Record<string, ModelStats> }>(
    "/api/memory/earth2/model-stats",
    fetcher,
    { refreshInterval: 30000 }
  )

  // SWR for popular locations
  const {
    data: popularLocations,
    error: locationsError,
  } = useSWR<{ locations: PopularLocation[] }>(
    "/api/memory/earth2/popular-locations",
    fetcher
  )

  // Check for cached forecast
  const checkCachedForecast = useCallback(
    async (
      model: string,
      lat: number,
      lng: number,
      leadTimeHours: number = 24,
      maxAgeHours: number = 6
    ): Promise<ForecastResult | null> => {
      if (!userId) return null

      setIsLoading(true)
      setError(null)

      try {
        const res = await fetch("/api/memory/earth2/check-cache", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            model,
            lat,
            lng,
            lead_time_hours: leadTimeHours,
            max_age_hours: maxAgeHours,
          }),
        })

        if (!res.ok) throw new Error(`API error: ${res.status}`)

        const data = await res.json()
        return data.cached ? data.forecast : null
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to check cache")
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [userId]
  )

  // Get voice context
  const getVoiceContext = useCallback(async (): Promise<Record<string, unknown> | null> => {
    if (!userId) return null

    try {
      const res = await fetch(`/api/memory/earth2/voice-context/${userId}`)
      if (!res.ok) throw new Error(`API error: ${res.status}`)
      return await res.json()
    } catch (err) {
      console.error("Failed to get voice context:", err)
      return null
    }
  }, [userId])

  // Get overall stats
  const getStats = useCallback(async (): Promise<Earth2MemoryStats | null> => {
    try {
      const res = await fetch("/api/memory/earth2/stats")
      if (!res.ok) throw new Error(`API error: ${res.status}`)
      return await res.json()
    } catch (err) {
      console.error("Failed to get stats:", err)
      return null
    }
  }, [])

  return {
    // Data
    preferences,
    forecastHistory: forecastHistory?.forecasts || [],
    modelStats: modelStats?.stats || {},
    popularLocations: popularLocations?.locations || [],
    
    // State
    isLoading,
    error: error || prefsError?.message || historyError?.message || statsError?.message,
    
    // Actions
    checkCachedForecast,
    getVoiceContext,
    getStats,
    refreshPreferences,
    refreshHistory,
    refreshStats,
  }
}

export default useEarth2Memory