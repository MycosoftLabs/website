"use client"

/**
 * usePrediction Hook - February 6, 2026
 * 
 * React hook for entity predictions.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import {
  PredictionClient,
  getPredictionClient,
  PredictionResult,
  PredictedPosition,
  GeoPoint,
  PredictionRequest,
  WeatherForecast,
} from "@/lib/prediction/prediction-client"

export interface UsePredictionOptions {
  entityId: string
  entityType: "aircraft" | "vessel" | "satellite" | "wildlife"
  hoursAhead?: number
  resolutionSeconds?: number
  autoRefresh?: boolean
  refreshIntervalMs?: number
}

export interface UsePredictionReturn {
  predictions: PredictedPosition[]
  loading: boolean
  error: string | null
  lastUpdated: Date | null
  source: string | null
  modelVersion: string | null
  warnings: string[]
  refresh: () => Promise<void>
  getPositionAt: (timestamp: Date) => PredictedPosition | null
  getTrack: () => GeoPoint[]
}

/**
 * Hook for getting entity predictions
 */
export function usePrediction(options: UsePredictionOptions): UsePredictionReturn {
  const {
    entityId,
    entityType,
    hoursAhead = 2,
    resolutionSeconds = 60,
    autoRefresh = false,
    refreshIntervalMs = 60000,
  } = options

  const [predictions, setPredictions] = useState<PredictedPosition[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [source, setSource] = useState<string | null>(null)
  const [modelVersion, setModelVersion] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])

  const clientRef = useRef<PredictionClient | null>(null)

  useEffect(() => {
    clientRef.current = getPredictionClient()
  }, [])

  const refresh = useCallback(async () => {
    if (!clientRef.current || !entityId) return

    setLoading(true)
    setError(null)

    try {
      let result: PredictionResult

      switch (entityType) {
        case "aircraft":
          result = await clientRef.current.predictAircraft(
            entityId,
            hoursAhead,
            resolutionSeconds
          )
          break
        case "vessel":
          result = await clientRef.current.predictVessel(
            entityId,
            hoursAhead,
            resolutionSeconds
          )
          break
        case "satellite":
          result = await clientRef.current.predictSatellite(
            entityId,
            hoursAhead,
            resolutionSeconds
          )
          break
        case "wildlife":
          result = await clientRef.current.predictWildlife(
            entityId,
            hoursAhead,
            resolutionSeconds
          )
          break
        default:
          throw new Error(`Unknown entity type: ${entityType}`)
      }

      setPredictions(result.predictions)
      setSource(result.source)
      setModelVersion(result.model_version)
      setWarnings(result.warnings)
      setLastUpdated(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Prediction failed")
    } finally {
      setLoading(false)
    }
  }, [entityId, entityType, hoursAhead, resolutionSeconds])

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh && refreshIntervalMs > 0) {
      const interval = setInterval(refresh, refreshIntervalMs)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshIntervalMs, refresh])

  // Initial load
  useEffect(() => {
    refresh()
  }, [entityId, entityType])

  const getPositionAt = useCallback(
    (timestamp: Date): PredictedPosition | null => {
      if (predictions.length === 0) return null

      const targetTime = timestamp.getTime()

      // Find nearest prediction
      let nearest: PredictedPosition | null = null
      let minDiff = Infinity

      for (const pred of predictions) {
        const predTime = new Date(pred.timestamp).getTime()
        const diff = Math.abs(predTime - targetTime)

        if (diff < minDiff) {
          minDiff = diff
          nearest = pred
        }
      }

      return nearest
    },
    [predictions]
  )

  const getTrack = useCallback((): GeoPoint[] => {
    return predictions.map((p) => p.position)
  }, [predictions])

  return {
    predictions,
    loading,
    error,
    lastUpdated,
    source,
    modelVersion,
    warnings,
    refresh,
    getPositionAt,
    getTrack,
  }
}

export interface UseWeatherForecastOptions {
  location: GeoPoint
  hoursAhead?: number
  resolutionHours?: number
  model?: string
  autoRefresh?: boolean
  refreshIntervalMs?: number
}

export interface UseWeatherForecastReturn {
  forecasts: WeatherForecast[]
  loading: boolean
  error: string | null
  lastUpdated: Date | null
  model: string | null
  refresh: () => Promise<void>
  getForecastAt: (timestamp: Date) => WeatherForecast | null
}

/**
 * Hook for weather forecasts
 */
export function useWeatherForecast(
  options: UseWeatherForecastOptions
): UseWeatherForecastReturn {
  const {
    location,
    hoursAhead = 24,
    resolutionHours = 1,
    model = "fcn",
    autoRefresh = false,
    refreshIntervalMs = 300000, // 5 minutes
  } = options

  const [forecasts, setForecasts] = useState<WeatherForecast[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [modelUsed, setModelUsed] = useState<string | null>(null)

  const clientRef = useRef<PredictionClient | null>(null)

  useEffect(() => {
    clientRef.current = getPredictionClient()
  }, [])

  const refresh = useCallback(async () => {
    if (!clientRef.current) return

    setLoading(true)
    setError(null)

    try {
      const result = await clientRef.current.getWeatherForecast(
        location,
        hoursAhead,
        resolutionHours,
        model
      )

      setForecasts(result.forecasts)
      setModelUsed(result.model)
      setLastUpdated(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Weather forecast failed")
    } finally {
      setLoading(false)
    }
  }, [location.lat, location.lng, hoursAhead, resolutionHours, model])

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh && refreshIntervalMs > 0) {
      const interval = setInterval(refresh, refreshIntervalMs)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshIntervalMs, refresh])

  // Initial load
  useEffect(() => {
    refresh()
  }, [location.lat, location.lng])

  const getForecastAt = useCallback(
    (timestamp: Date): WeatherForecast | null => {
      if (forecasts.length === 0) return null

      const targetTime = timestamp.getTime()

      let nearest: WeatherForecast | null = null
      let minDiff = Infinity

      for (const forecast of forecasts) {
        const forecastTime = new Date(forecast.timestamp).getTime()
        const diff = Math.abs(forecastTime - targetTime)

        if (diff < minDiff) {
          minDiff = diff
          nearest = forecast
        }
      }

      return nearest
    },
    [forecasts]
  )

  return {
    forecasts,
    loading,
    error,
    lastUpdated,
    model: modelUsed,
    refresh,
    getForecastAt,
  }
}

export interface UseBatchPredictionsOptions {
  entities: Array<{ id: string; type: string }>
  hoursAhead?: number
  resolutionSeconds?: number
}

export interface UseBatchPredictionsReturn {
  results: Map<string, PredictionResult>
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * Hook for batch predictions
 */
export function useBatchPredictions(
  options: UseBatchPredictionsOptions
): UseBatchPredictionsReturn {
  const { entities, hoursAhead = 2, resolutionSeconds = 60 } = options

  const [results, setResults] = useState<Map<string, PredictionResult>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clientRef = useRef<PredictionClient | null>(null)

  useEffect(() => {
    clientRef.current = getPredictionClient()
  }, [])

  const refresh = useCallback(async () => {
    if (!clientRef.current || entities.length === 0) return

    setLoading(true)
    setError(null)

    try {
      const requests: PredictionRequest[] = entities.map((e) => ({
        entity_id: e.id,
        entity_type: e.type,
        hours_ahead: hoursAhead,
        resolution_seconds: resolutionSeconds,
      }))

      const response = await clientRef.current.predictBatch(requests)

      const resultMap = new Map<string, PredictionResult>()
      for (const result of response.results) {
        resultMap.set(result.entity_id, result)
      }

      setResults(resultMap)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Batch prediction failed")
    } finally {
      setLoading(false)
    }
  }, [entities, hoursAhead, resolutionSeconds])

  // Refresh when entities change
  useEffect(() => {
    refresh()
  }, [JSON.stringify(entities)])

  return { results, loading, error, refresh }
}