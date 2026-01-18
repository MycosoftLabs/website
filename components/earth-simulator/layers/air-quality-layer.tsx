"use client"

/**
 * Air Quality Layer Component
 * 
 * Displays air quality data from OpenAQ:
 * - PM2.5, PM10, O3, NO2, SO2, CO measurements
 * - AQI color coding
 * - Station markers with popups
 */

import { useState, useEffect, useMemo, useCallback } from "react"
import { Marker, Popup } from "react-map-gl/maplibre"
import type { GeoBounds } from "@/types/oei"
import type { AirQualityObservation } from "@/lib/oei/connectors/openaq"

// =============================================================================
// TYPES
// =============================================================================

export interface AirQualityLayerProps {
  visible?: boolean
  bounds?: GeoBounds
  parameter?: "pm25" | "pm10" | "o3" | "no2" | "so2" | "co" | "all"
  onStationClick?: (observation: AirQualityObservation) => void
  onStationHover?: (observation: AirQualityObservation | null) => void
  maxStations?: number
  refreshInterval?: number
}

interface AirQualityData {
  observations: Array<AirQualityObservation & { aqiCategory?: AQICategory }>
  loading: boolean
  error: string | null
  lastUpdated: Date | null
}

interface AQICategory {
  level: string
  color: string
  healthImplication: string
}

// =============================================================================
// AQI CONFIGURATION
// =============================================================================

function getAQICategory(pm25: number): AQICategory {
  if (pm25 <= 12) return { level: "Good", color: "#22c55e", healthImplication: "Air quality is satisfactory" }
  if (pm25 <= 35.4) return { level: "Moderate", color: "#eab308", healthImplication: "Acceptable for most" }
  if (pm25 <= 55.4) return { level: "Unhealthy for Sensitive", color: "#f97316", healthImplication: "Sensitive groups affected" }
  if (pm25 <= 150.4) return { level: "Unhealthy", color: "#ef4444", healthImplication: "Everyone may be affected" }
  if (pm25 <= 250.4) return { level: "Very Unhealthy", color: "#a855f7", healthImplication: "Health alert" }
  return { level: "Hazardous", color: "#7f1d1d", healthImplication: "Emergency conditions" }
}

function getParameterUnit(parameter: string): string {
  const units: Record<string, string> = {
    pm25: "µg/m³",
    pm10: "µg/m³",
    o3: "ppb",
    no2: "ppb",
    so2: "ppb",
    co: "ppm",
  }
  return units[parameter] || ""
}

function getParameterLabel(parameter: string): string {
  const labels: Record<string, string> = {
    pm25: "PM2.5",
    pm10: "PM10",
    o3: "Ozone",
    no2: "NO₂",
    so2: "SO₂",
    co: "CO",
  }
  return labels[parameter] || parameter.toUpperCase()
}

// =============================================================================
// DATA FETCHING
// =============================================================================

function useAirQualityData(
  bounds?: GeoBounds,
  parameter?: string,
  maxStations = 50
): AirQualityData {
  const [data, setData] = useState<AirQualityData>({
    observations: [],
    loading: false,
    error: null,
    lastUpdated: null,
  })

  const fetchData = useCallback(async () => {
    setData(prev => ({ ...prev, loading: true, error: null }))

    try {
      const params = new URLSearchParams({
        limit: String(maxStations),
        ...(bounds ? {
          north: String(bounds.north),
          south: String(bounds.south),
          east: String(bounds.east),
          west: String(bounds.west),
        } : { global: "true" }),
        ...(parameter && parameter !== "all" ? { parameter } : { parameter: "pm25" }),
      })

      const response = await fetch(`/api/oei/openaq?${params}`)
      const result = await response.json()

      if (result.success) {
        setData({
          observations: result.observations || [],
          loading: false,
          error: null,
          lastUpdated: new Date(),
        })
      } else {
        throw new Error(result.error || "Failed to fetch air quality data")
      }
    } catch (error) {
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Failed to fetch air quality data",
      }))
    }
  }, [bounds, parameter, maxStations])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return data
}

// =============================================================================
// MARKER COMPONENT
// =============================================================================

interface AQMarkerProps {
  observation: AirQualityObservation & { aqiCategory?: AQICategory }
  isSelected?: boolean
  onClick?: () => void
  onHover?: (hovering: boolean) => void
}

function AQMarker({ observation, isSelected, onClick, onHover }: AQMarkerProps) {
  if (!observation.location) return null

  const pm25 = observation.values?.pm25 ?? observation.value ?? 0
  const aqi = observation.aqiCategory || getAQICategory(pm25)

  return (
    <Marker
      longitude={observation.location.longitude}
      latitude={observation.location.latitude}
      anchor="center"
      onClick={(e) => {
        e.originalEvent.stopPropagation()
        onClick?.()
      }}
    >
      <button
        className={`
          flex items-center justify-center rounded-full transition-all duration-200
          hover:scale-110 shadow-lg cursor-pointer border-2 border-white/30
          ${isSelected ? "ring-2 ring-white ring-offset-2 ring-offset-black scale-125" : ""}
        `}
        style={{
          width: isSelected ? 40 : 32,
          height: isSelected ? 40 : 32,
          backgroundColor: aqi.color,
        }}
        onMouseEnter={() => onHover?.(true)}
        onMouseLeave={() => onHover?.(false)}
        data-marker="air-quality"
        title={`${aqi.level}: ${pm25.toFixed(1)} µg/m³`}
      >
        <span className="text-white font-bold text-xs">
          {pm25 < 100 ? pm25.toFixed(0) : ">99"}
        </span>
      </button>
    </Marker>
  )
}

// =============================================================================
// POPUP COMPONENT
// =============================================================================

interface AQPopupProps {
  observation: AirQualityObservation & { aqiCategory?: AQICategory }
  onClose: () => void
}

function AQPopup({ observation, onClose }: AQPopupProps) {
  if (!observation.location) return null

  const pm25 = observation.values?.pm25 ?? observation.value ?? 0
  const aqi = observation.aqiCategory || getAQICategory(pm25)

  return (
    <Popup
      longitude={observation.location.longitude}
      latitude={observation.location.latitude}
      anchor="bottom"
      offset={[0, -20]}
      closeButton
      closeOnClick={false}
      onClose={onClose}
      className="air-quality-popup"
      maxWidth="320px"
    >
      <div className="p-3 min-w-[280px]">
        {/* Header with AQI color */}
        <div 
          className="flex items-center gap-2 mb-3 pb-2 border-b"
          style={{ borderColor: aqi.color }}
        >
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: aqi.color }}
          >
            {pm25.toFixed(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white">{aqi.level}</h3>
            <p className="text-xs text-gray-400">{aqi.healthImplication}</p>
          </div>
        </div>

        {/* Measurements */}
        <div className="space-y-2 text-sm">
          {/* PM2.5 */}
          {observation.values?.pm25 !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-gray-400">PM2.5</span>
              <span className="text-white font-medium">
                {observation.values.pm25.toFixed(1)} µg/m³
              </span>
            </div>
          )}

          {/* PM10 */}
          {observation.values?.pm10 !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-gray-400">PM10</span>
              <span className="text-white font-medium">
                {observation.values.pm10.toFixed(1)} µg/m³
              </span>
            </div>
          )}

          {/* O3 */}
          {observation.values?.o3 !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Ozone (O₃)</span>
              <span className="text-white font-medium">
                {observation.values.o3.toFixed(1)} ppb
              </span>
            </div>
          )}

          {/* NO2 */}
          {observation.values?.no2 !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-gray-400">NO₂</span>
              <span className="text-white font-medium">
                {observation.values.no2.toFixed(1)} ppb
              </span>
            </div>
          )}

          {/* Location */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-700">
            <span className="text-gray-400">Location</span>
            <span className="text-gray-300 text-xs">
              {observation.location.latitude.toFixed(3)}, {observation.location.longitude.toFixed(3)}
            </span>
          </div>

          {/* Timestamp */}
          {observation.observedAt && (
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Updated</span>
              <span className="text-gray-300 text-xs">
                {new Date(observation.observedAt).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>

        {/* External Link */}
        {observation.provenance?.url && (
          <a
            href={observation.provenance.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-2 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm transition-all"
          >
            View on OpenAQ →
          </a>
        )}
      </div>
    </Popup>
  )
}

// =============================================================================
// LEGEND COMPONENT
// =============================================================================

function AQILegend() {
  const levels = [
    { range: "0-12", level: "Good", color: "#22c55e" },
    { range: "12-35", level: "Moderate", color: "#eab308" },
    { range: "35-55", level: "Unhealthy (Sens.)", color: "#f97316" },
    { range: "55-150", level: "Unhealthy", color: "#ef4444" },
    { range: "150-250", level: "Very Unhealthy", color: "#a855f7" },
    { range: "250+", level: "Hazardous", color: "#7f1d1d" },
  ]

  return (
    <div className="absolute bottom-4 left-4 bg-black/80 rounded-lg p-3 text-xs">
      <div className="text-white font-medium mb-2">Air Quality Index (PM2.5)</div>
      <div className="space-y-1">
        {levels.map(({ range, level, color }) => (
          <div key={level} className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded"
              style={{ backgroundColor: color }}
            />
            <span className="text-gray-400 w-16">{range}</span>
            <span className="text-gray-300">{level}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AirQualityLayer({
  visible = true,
  bounds,
  parameter = "pm25",
  onStationClick,
  onStationHover,
  maxStations = 50,
  refreshInterval,
}: AirQualityLayerProps) {
  const [selectedStation, setSelectedStation] = useState<AirQualityObservation | null>(null)
  const [showLegend, setShowLegend] = useState(true)
  
  const data = useAirQualityData(bounds, parameter, maxStations)

  // Refresh interval
  useEffect(() => {
    if (!refreshInterval) return
    
    const interval = setInterval(() => {
      // Would trigger re-fetch
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [refreshInterval])

  if (!visible) return null

  return (
    <>
      {/* Markers */}
      {data.observations.map((obs) => (
        <AQMarker
          key={obs.id}
          observation={obs}
          isSelected={selectedStation?.id === obs.id}
          onClick={() => {
            setSelectedStation(obs)
            onStationClick?.(obs)
          }}
          onHover={(hovering) => onStationHover?.(hovering ? obs : null)}
        />
      ))}

      {/* Popup */}
      {selectedStation && (
        <AQPopup
          observation={selectedStation}
          onClose={() => setSelectedStation(null)}
        />
      )}

      {/* Legend */}
      {showLegend && <AQILegend />}

      {/* Loading indicator */}
      {data.loading && (
        <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded text-sm">
          Loading air quality data...
        </div>
      )}

      {/* Station count */}
      {!data.loading && data.observations.length > 0 && (
        <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded text-sm">
          {data.observations.length} stations
        </div>
      )}
    </>
  )
}

export default AirQualityLayer
