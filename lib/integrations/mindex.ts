/**
 * MINDEX Integration
 *
 * Functions for interacting with the MINDEX canonical data layer (FastAPI)
 * Server-side only - never expose API keys to client
 */

import { env } from "@/lib/env"
import { createHttpClient } from "./http"
import type {
  Device,
  TelemetrySample,
  Taxon,
  Observation,
  ServiceHealth,
  ApiResponse,
  SearchParams,
  PaginationParams,
} from "./types"

// Create MINDEX HTTP client
const mindexClient = createHttpClient({
  baseUrl: env.mindexApiBaseUrl,
  apiKey: env.mindexApiKey,
  timeout: 15000,
  retries: 2,
})

// ============================================
// Health Check
// ============================================

export async function getMindexHealth(): Promise<ServiceHealth> {
  const startTime = Date.now()
  try {
    await mindexClient.get("/health")
    return {
      service: "mindex",
      status: "healthy",
      latencyMs: Date.now() - startTime,
      lastChecked: new Date().toISOString(),
    }
  } catch (error) {
    return {
      service: "mindex",
      status: "unhealthy",
      latencyMs: Date.now() - startTime,
      message: error instanceof Error ? error.message : "Unknown error",
      lastChecked: new Date().toISOString(),
    }
  }
}

// ============================================
// Taxa (Fungal Taxonomy)
// ============================================

export async function searchTaxa(params: SearchParams): Promise<ApiResponse<Taxon[]>> {
  const queryParams = new URLSearchParams({
    q: params.query,
    page: String(params.page || 1),
    page_size: String(params.pageSize || 20),
  })

  if (params.sortBy) queryParams.set("sort_by", params.sortBy)
  if (params.sortOrder) queryParams.set("sort_order", params.sortOrder)
  if (params.filters) {
    Object.entries(params.filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => queryParams.append(key, v))
      } else {
        queryParams.set(key, value)
      }
    })
  }

  return mindexClient.get<ApiResponse<Taxon[]>>(`/taxa/search?${queryParams.toString()}`)
}

export async function getTaxonById(id: string): Promise<Taxon> {
  return mindexClient.get<Taxon>(`/taxa/${id}`)
}

export async function listTaxa(params?: PaginationParams): Promise<ApiResponse<Taxon[]>> {
  const queryParams = new URLSearchParams({
    page: String(params?.page || 1),
    page_size: String(params?.pageSize || 20),
  })

  return mindexClient.get<ApiResponse<Taxon[]>>(`/taxa?${queryParams.toString()}`)
}

// ============================================
// Devices (MycoBRAIN Device Registry)
// ============================================

export async function getDevices(params?: PaginationParams): Promise<ApiResponse<Device[]>> {
  const queryParams = new URLSearchParams({
    page: String(params?.page || 1),
    page_size: String(params?.pageSize || 50),
  })

  return mindexClient.get<ApiResponse<Device[]>>(`/devices?${queryParams.toString()}`)
}

export async function getDeviceById(id: string): Promise<Device> {
  return mindexClient.get<Device>(`/devices/${id}`)
}

export async function getDevicesByType(type: string): Promise<ApiResponse<Device[]>> {
  return mindexClient.get<ApiResponse<Device[]>>(`/devices?type=${type}`)
}

// ============================================
// Telemetry
// ============================================

export async function getLatestTelemetry(): Promise<ApiResponse<TelemetrySample[]>> {
  return mindexClient.get<ApiResponse<TelemetrySample[]>>("/telemetry/latest")
}

export async function getLatestTelemetryByDevice(deviceId: string): Promise<TelemetrySample> {
  return mindexClient.get<TelemetrySample>(`/telemetry/latest/${deviceId}`)
}

export async function getTelemetryHistory(
  deviceId: string,
  startDate?: string,
  endDate?: string,
): Promise<ApiResponse<TelemetrySample[]>> {
  const queryParams = new URLSearchParams()
  if (startDate) queryParams.set("start", startDate)
  if (endDate) queryParams.set("end", endDate)

  const query = queryParams.toString()
  return mindexClient.get<ApiResponse<TelemetrySample[]>>(`/telemetry/history/${deviceId}${query ? `?${query}` : ""}`)
}

// ============================================
// Observations (Geo/Time Sightings)
// ============================================

export async function searchObservations(params: SearchParams): Promise<ApiResponse<Observation[]>> {
  const queryParams = new URLSearchParams({
    q: params.query,
    page: String(params.page || 1),
    page_size: String(params.pageSize || 20),
  })

  if (params.filters) {
    Object.entries(params.filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => queryParams.append(key, v))
      } else {
        queryParams.set(key, value)
      }
    })
  }

  return mindexClient.get<ApiResponse<Observation[]>>(`/observations/search?${queryParams.toString()}`)
}

export async function getObservationById(id: string): Promise<Observation> {
  return mindexClient.get<Observation>(`/observations/${id}`)
}

export async function getObservationsByLocation(
  lat: number,
  lng: number,
  radiusKm = 10,
): Promise<ApiResponse<Observation[]>> {
  return mindexClient.get<ApiResponse<Observation[]>>(`/observations/nearby?lat=${lat}&lng=${lng}&radius=${radiusKm}`)
}
