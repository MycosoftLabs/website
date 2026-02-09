/**
 * Prediction Client - February 6, 2026
 * 
 * Client for interacting with the MAS Prediction API.
 */

export interface GeoPoint {
  lat: number
  lng: number
  altitude?: number
}

export interface Velocity {
  speed: number
  heading: number
  climb_rate?: number
}

export interface PredictedPosition {
  entity_id: string
  entity_type: string
  timestamp: string
  position: GeoPoint
  velocity?: Velocity
  confidence: number
  uncertainty_radius_m?: number
  prediction_source: string
  metadata?: Record<string, unknown>
}

export interface PredictionResult {
  entity_id: string
  entity_type: string
  predictions: PredictedPosition[]
  source: string
  model_version: string
  computation_time_ms: number
  warnings: string[]
}

export interface EntityState {
  entity_id: string
  entity_type: string
  timestamp?: string
  position: GeoPoint
  velocity?: Velocity
  metadata?: Record<string, unknown>
  flight_plan?: Record<string, unknown>
  destination?: string
  tle_line1?: string
  tle_line2?: string
  species?: string
}

export interface PredictionRequest {
  entity_id: string
  entity_type: string
  from_time?: string
  to_time?: string
  hours_ahead?: number
  resolution_seconds?: number
  include_uncertainty?: boolean
  current_state?: EntityState
}

export interface WeatherForecast {
  timestamp: string
  location: GeoPoint
  temperature_c: number
  feels_like_c: number
  humidity_percent: number
  precipitation_mm: number
  precipitation_probability: number
  wind_speed_kmh: number
  wind_direction_deg: number
  cloud_cover_percent: number
  uv_index: number
  model: string
}

export interface WildfireSpread {
  hour: number
  timestamp: string
  center: GeoPoint
  radii: {
    downwind_km: number
    crosswind_km: number
    upwind_km: number
  }
  wind_direction: number
  area_km2: number
}

const MAS_URL = process.env.NEXT_PUBLIC_MAS_URL || "http://192.168.0.188:8001"

/**
 * Prediction API client
 */
export class PredictionClient {
  private baseUrl: string

  constructor(baseUrl: string = MAS_URL) {
    this.baseUrl = baseUrl
  }

  /**
   * Get predictions for a single entity
   */
  async predict(request: PredictionRequest): Promise<PredictionResult> {
    const response = await fetch(`${this.baseUrl}/prediction/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error(`Prediction failed: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get predictions for multiple entities in parallel
   */
  async predictBatch(requests: PredictionRequest[]): Promise<{
    results: PredictionResult[]
    total_computation_time_ms: number
  }> {
    const response = await fetch(`${this.baseUrl}/prediction/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requests }),
    })

    if (!response.ok) {
      throw new Error(`Batch prediction failed: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get aircraft prediction by ID
   */
  async predictAircraft(
    entityId: string,
    hours: number = 2,
    resolution: number = 60
  ): Promise<PredictionResult> {
    const params = new URLSearchParams({
      hours: hours.toString(),
      resolution: resolution.toString(),
    })

    const response = await fetch(
      `${this.baseUrl}/prediction/aircraft/${entityId}?${params}`
    )

    if (!response.ok) {
      throw new Error(`Aircraft prediction failed: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get vessel prediction by ID
   */
  async predictVessel(
    entityId: string,
    hours: number = 24,
    resolution: number = 300
  ): Promise<PredictionResult> {
    const params = new URLSearchParams({
      hours: hours.toString(),
      resolution: resolution.toString(),
    })

    const response = await fetch(
      `${this.baseUrl}/prediction/vessel/${entityId}?${params}`
    )

    if (!response.ok) {
      throw new Error(`Vessel prediction failed: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get satellite prediction by NORAD ID
   */
  async predictSatellite(
    noradId: string,
    hours: number = 12,
    resolution: number = 60
  ): Promise<PredictionResult> {
    const params = new URLSearchParams({
      hours: hours.toString(),
      resolution: resolution.toString(),
    })

    const response = await fetch(
      `${this.baseUrl}/prediction/satellite/${noradId}?${params}`
    )

    if (!response.ok) {
      throw new Error(`Satellite prediction failed: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get wildlife prediction
   */
  async predictWildlife(
    entityId: string,
    hours: number = 24,
    resolution: number = 3600,
    species?: string
  ): Promise<PredictionResult> {
    const params = new URLSearchParams({
      hours: hours.toString(),
      resolution: resolution.toString(),
    })
    if (species) {
      params.append("species", species)
    }

    const response = await fetch(
      `${this.baseUrl}/prediction/wildlife/${entityId}?${params}`
    )

    if (!response.ok) {
      throw new Error(`Wildlife prediction failed: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get weather forecast for a location
   */
  async getWeatherForecast(
    location: GeoPoint,
    hoursAhead: number = 24,
    resolutionHours: number = 1,
    model: string = "fcn"
  ): Promise<{
    location: GeoPoint
    forecasts: WeatherForecast[]
    model: string
    generated_at: string
  }> {
    const response = await fetch(`${this.baseUrl}/prediction/weather`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location,
        hours_ahead: hoursAhead,
        resolution_hours: resolutionHours,
        model,
      }),
    })

    if (!response.ok) {
      throw new Error(`Weather forecast failed: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get storm predictions for a region
   */
  async getStormPredictions(
    bounds: { minLat: number; minLng: number; maxLat: number; maxLng: number },
    hours: number = 72
  ): Promise<{ storms: unknown[] }> {
    const params = new URLSearchParams({
      min_lat: bounds.minLat.toString(),
      min_lng: bounds.minLng.toString(),
      max_lat: bounds.maxLat.toString(),
      max_lng: bounds.maxLng.toString(),
      hours: hours.toString(),
    })

    const response = await fetch(`${this.baseUrl}/prediction/storms?${params}`)

    if (!response.ok) {
      throw new Error(`Storm prediction failed: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Predict wildfire spread
   */
  async predictWildfireSpread(
    location: GeoPoint,
    windSpeed: number,
    windDirection: number,
    fuelMoisture: number = 0.3,
    hours: number = 24
  ): Promise<{ predictions: WildfireSpread[] }> {
    const params = new URLSearchParams({
      lat: location.lat.toString(),
      lng: location.lng.toString(),
      wind_speed: windSpeed.toString(),
      wind_direction: windDirection.toString(),
      fuel_moisture: fuelMoisture.toString(),
      hours: hours.toString(),
    })

    const response = await fetch(
      `${this.baseUrl}/prediction/wildfire/spread?${params}`,
      { method: "POST" }
    )

    if (!response.ok) {
      throw new Error(`Wildfire prediction failed: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Check prediction engine health
   */
  async healthCheck(): Promise<{
    status: string
    predictors: Record<string, string>
    earth2_available: boolean
    timestamp: string
  }> {
    const response = await fetch(`${this.baseUrl}/prediction/health`)

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`)
    }

    return response.json()
  }
}

// Singleton instance
let _client: PredictionClient | null = null

export function getPredictionClient(): PredictionClient {
  if (!_client) {
    _client = new PredictionClient()
  }
  return _client
}