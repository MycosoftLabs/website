/**
 * NatureOS API Integration Layer
 *
 * This module provides integration with the real NatureOS backend running on Azure.
 * Based on: https://github.com/MycosoftLabs/NatureOS
 *
 * Architecture Overview:
 * - Core API: Unified API gateway (Azure API Management)
 * - MINDEX: Multi-model Cosmos DB for heterogeneous biological data
 * - Event Backbone: Azure Event Grid for event-driven processing
 * - IoT Hub: Device connectivity for Mushroom 1, SporeBase, ALARM, etc.
 * - MYCA: Multi-agent AI system for biological intelligence
 * - Mycorrhizae Protocol: Event processing algorithms
 */

import useSWR from "swr"

// API Configuration - Use local API routes that proxy to MAS
const NATUREOS_API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api/natureos"
const API_TIMEOUT = 30000

// Types based on NatureOS architecture
export interface DeviceTelemetry {
  deviceId: string
  deviceType: "mushroom1" | "sporebase" | "trufflebot" | "alarm" | "petreus" | "mycotenna" | "mycoalarm"
  timestamp: string
  location?: {
    latitude: number
    longitude: number
  }
  status: "active" | "inactive" | "maintenance" | "error"
  metrics: {
    batteryLevel?: number
    signalStrength?: number
    temperature?: number
    humidity?: number
    soilMoisture?: number
    sporeCount?: number
    networkConnections?: number
    [key: string]: any
  }
  alerts?: Array<{
    type: "warning" | "error" | "info"
    message: string
    timestamp: string
  }>
}

export interface MyceliumNetworkData {
  totalNodes: number
  activeNodes: number
  networkHealth: number
  signalStrength: number
  growthRate: number
  nutrientFlow: number
  connections: number
  density: number
  propagationSpeed: number
  bioelectricActivity: number
  regions: Array<{
    id: string
    location: [number, number]
    density: number
    health: number
  }>
}

export interface SystemMetrics {
  apiRequests: {
    total: number
    perMinute: number
    successRate: number
  }
  aiOperations: {
    total: number
    successRate: number
    averageResponseTime: number
  }
  storage: {
    used: number
    total: number
    percentage: number
  }
  devices: {
    total: number
    active: number
    byType: Record<string, number>
  }
}

export interface RecentActivity {
  id: string
  type: "ai_training" | "network_event" | "deployment" | "backup" | "alert" | "anomaly"
  message: string
  timestamp: string
  status: "success" | "warning" | "error" | "info"
  metadata?: Record<string, any>
}

// API Fetcher with error handling - returns null on error instead of throwing
async function fetcher<T>(url: string): Promise<T | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.warn(`API Error ${response.status}: ${response.statusText} for ${url}`)
      return null
    }

    return await response.json()
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.warn(`Request timeout for ${url}`)
        return null
      }
      console.warn(`Fetch error for ${url}:`, error.message)
      return null
    }
    console.warn(`Unknown error for ${url}`)
    return null
  }
}

// React Hooks for data fetching with SWR

/**
 * Get all device telemetry data
 */
export function useDeviceTelemetry(refreshInterval = 5000) {
  const { data, error, isLoading } = useSWR<DeviceTelemetry[]>(`${NATUREOS_API_BASE}/devices/telemetry`, fetcher, {
    refreshInterval,
    revalidateOnFocus: true,
    dedupingInterval: 2000,
  })

  return {
    devices: data,
    isLoading,
    isError: error,
    error: error?.message,
  }
}

/**
 * Get specific device telemetry
 */
export function useDeviceById(deviceId: string, refreshInterval = 5000) {
  const { data, error, isLoading } = useSWR<DeviceTelemetry>(
    deviceId ? `${NATUREOS_API_BASE}/devices/${deviceId}/telemetry` : null,
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus: true,
    },
  )

  return {
    device: data,
    isLoading,
    isError: error,
    error: error?.message,
  }
}

/**
 * Get mycelium network data
 */
export function useMyceliumNetwork(refreshInterval = 10000) {
  const { data, error, isLoading } = useSWR<MyceliumNetworkData | null>(
    `${NATUREOS_API_BASE}/mycelium/network`, 
    fetcher, 
    {
      refreshInterval,
      revalidateOnFocus: true,
      onError: (err) => {
        console.warn("Mycelium network fetch error:", err)
      },
    }
  )

  return {
    network: data || null,
    isLoading,
    isError: !!error,
    error: error?.message,
  }
}

/**
 * Get system-wide metrics
 */
export function useSystemMetrics(refreshInterval = 5000) {
  const { data, error, isLoading } = useSWR<SystemMetrics | null>(
    `${NATUREOS_API_BASE}/system/metrics`, 
    fetcher, 
    {
      refreshInterval,
      revalidateOnFocus: true,
      onError: (err) => {
        console.warn("System metrics fetch error:", err)
      },
    }
  )

  return {
    metrics: data || null,
    isLoading,
    isError: !!error,
    error: error?.message,
  }
}

/**
 * Get recent activity feed
 */
export function useRecentActivity(limit = 10, refreshInterval = 10000) {
  const { data, error, isLoading } = useSWR<RecentActivity[] | null>(
    `${NATUREOS_API_BASE}/activity/recent?limit=${limit}`,
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus: true,
      onError: (err) => {
        console.warn("Recent activity fetch error:", err)
      },
    },
  )

  return {
    activities: data || [],
    isLoading,
    isError: !!error,
    error: error?.message,
  }
}

// Mock data fallback for development/testing
export const mockDeviceTelemetry: DeviceTelemetry[] = [
  {
    deviceId: "mushroom1-sf-001",
    deviceType: "mushroom1",
    timestamp: new Date().toISOString(),
    location: { latitude: 37.7749, longitude: -122.4194 },
    status: "active",
    metrics: {
      batteryLevel: 87,
      signalStrength: 92,
      temperature: 22.5,
      soilMoisture: 45,
      networkConnections: 12,
    },
  },
  {
    deviceId: "sporebase-nyc-001",
    deviceType: "sporebase",
    timestamp: new Date().toISOString(),
    location: { latitude: 40.7128, longitude: -74.006 },
    status: "active",
    metrics: {
      batteryLevel: 94,
      sporeCount: 1245,
      temperature: 18.3,
      humidity: 65,
    },
  },
  {
    deviceId: "alarm-austin-001",
    deviceType: "alarm",
    timestamp: new Date().toISOString(),
    location: { latitude: 30.2672, longitude: -97.7431 },
    status: "active",
    metrics: {
      batteryLevel: 78,
      airQuality: 92,
      temperature: 24.1,
    },
  },
]

export const mockMyceliumNetwork: MyceliumNetworkData = {
  totalNodes: 2345,
  activeNodes: 2165,
  networkHealth: 92,
  signalStrength: 87,
  growthRate: 78,
  nutrientFlow: 92,
  connections: 12543,
  density: 1.87,
  propagationSpeed: 3.2,
  bioelectricActivity: 78,
  regions: [
    { id: "region-1", location: [-122.4194, 37.7749], density: 0.92, health: 95 },
    { id: "region-2", location: [-74.006, 40.7128], density: 0.88, health: 91 },
    { id: "region-3", location: [-97.7431, 30.2672], density: 0.75, health: 87 },
  ],
}

export const mockSystemMetrics: SystemMetrics = {
  apiRequests: {
    total: 1200000,
    perMinute: 23000,
    successRate: 99.2,
  },
  aiOperations: {
    total: 845000,
    successRate: 98.2,
    averageResponseTime: 145,
  },
  storage: {
    used: 1.8,
    total: 2.5,
    percentage: 72,
  },
  devices: {
    total: 4790,
    active: 4612,
    byType: {
      mushroom1: 1245,
      sporebase: 879,
      trufflebot: 432,
      alarm: 2156,
      petreus: 78,
    },
  },
}

export const mockRecentActivity: RecentActivity[] = [
  {
    id: "1",
    type: "ai_training",
    message: "AI Model training completed",
    timestamp: new Date(Date.now() - 120000).toISOString(),
    status: "success",
  },
  {
    id: "2",
    type: "alert",
    message: "High network load detected",
    timestamp: new Date(Date.now() - 300000).toISOString(),
    status: "warning",
  },
  {
    id: "3",
    type: "deployment",
    message: "New node cluster deployed",
    timestamp: new Date(Date.now() - 900000).toISOString(),
    status: "success",
  },
  {
    id: "4",
    type: "backup",
    message: "Database backup completed",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    status: "success",
  },
  {
    id: "5",
    type: "anomaly",
    message: "Anomaly detected in sector 7",
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    status: "warning",
  },
]
