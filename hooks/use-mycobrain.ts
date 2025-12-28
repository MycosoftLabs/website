"use client"

import { useState, useEffect, useCallback, useRef } from "react"

export interface BME688Data {
  temperature: number
  humidity: number
  pressure: number
  gas_resistance: number
  iaq?: number
  iaq_accuracy?: number
  co2_equivalent?: number
  voc_equivalent?: number
  timestamp?: string
}

export interface MycoBrainSensors {
  bme688_1?: BME688Data
  bme688_2?: BME688Data
  // Future sensors
  soil_moisture?: number
  light_level?: number
  co2?: number
  ph?: number
  ec?: number
  // Generic sensor slots for extensibility
  analog_1?: number
  analog_2?: number
  analog_3?: number
  analog_4?: number
  digital_1?: boolean
  digital_2?: boolean
  i2c_devices?: string[]
  last_update?: string
}

export interface MycoBrainDevice {
  port: string
  connected: boolean
  device_info: {
    side?: string
    mdp_version?: number
    status?: string
    lora_status?: string
    firmware_version?: string
    board_type?: string
    mac_address?: string
    uptime?: number
  }
  sensor_data: MycoBrainSensors
  last_message_time?: string
  location?: {
    lat: number
    lng: number
    accuracy?: number
    source: "gps" | "manual" | "network" | "estimated"
  }
  capabilities: {
    bme688_count: number
    has_lora: boolean
    has_neopixel: boolean
    has_buzzer: boolean
    i2c_bus: boolean
    analog_inputs: number
    digital_io: number
  }
}

export interface MycoBrainState {
  devices: MycoBrainDevice[]
  loading: boolean
  error: string | null
  lastUpdate: Date | null
  isConnected: boolean
}

export function useMycoBrain(refreshInterval = 2000) {
  const [state, setState] = useState<MycoBrainState>({
    devices: [],
    loading: true,
    error: null,
    lastUpdate: null,
    isConnected: false,
  })

  const mountedRef = useRef(true)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchDevices = useCallback(async () => {
    try {
      const response = await fetch("/api/mycobrain")
      if (!response.ok) throw new Error("Failed to fetch devices")

      const data = await response.json()
      const devices: MycoBrainDevice[] = (data.devices || []).map((d: MycoBrainDevice) => ({
        ...d,
        capabilities: d.capabilities || {
          bme688_count: 2,
          has_lora: true,
          has_neopixel: true,
          has_buzzer: true,
          i2c_bus: true,
          analog_inputs: 4,
          digital_io: 4,
        },
        location: d.location || {
          lat: 40.7128, // Default NYC for demo
          lng: -74.006,
          source: "manual" as const,
        },
      }))

      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          devices,
          loading: false,
          error: null,
          lastUpdate: new Date(),
          isConnected: devices.some((d) => d.connected),
        }))
      }
    } catch (error) {
      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }))
      }
    }
  }, [])

  const fetchSensors = useCallback(async (port: string) => {
    try {
      const response = await fetch(`/api/mycobrain/${encodeURIComponent(port)}/sensors`)
      if (!response.ok) throw new Error("Failed to fetch sensors")

      const data = await response.json()

      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          devices: prev.devices.map((d) =>
            d.port === port ? { ...d, sensor_data: { ...d.sensor_data, ...data.sensors } } : d
          ),
          lastUpdate: new Date(),
        }))
      }

      return data.sensors
    } catch (error) {
      console.error("Failed to fetch sensors:", error)
      return null
    }
  }, [])

  const sendControl = useCallback(
    async (port: string, peripheral: string, action: string, data: Record<string, unknown> = {}) => {
      try {
        const response = await fetch(`/api/mycobrain/${encodeURIComponent(port)}/control`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ peripheral, action, ...data }),
        })

        if (!response.ok) throw new Error("Control command failed")

        return await response.json()
      } catch (error) {
        console.error("Control failed:", error)
        throw error
      }
    },
    []
  )

  const setNeoPixel = useCallback(
    async (port: string, r: number, g: number, b: number, brightness = 128) => {
      return sendControl(port, "neopixel", "solid", { r, g, b, brightness })
    },
    [sendControl]
  )

  const neoPixelRainbow = useCallback(
    async (port: string) => {
      return sendControl(port, "neopixel", "rainbow")
    },
    [sendControl]
  )

  const neoPixelOff = useCallback(
    async (port: string) => {
      return sendControl(port, "neopixel", "off")
    },
    [sendControl]
  )

  const buzzerBeep = useCallback(
    async (port: string, frequency = 1000, duration = 100) => {
      return sendControl(port, "buzzer", "beep", { frequency, duration_ms: duration })
    },
    [sendControl]
  )

  const buzzerMelody = useCallback(
    async (port: string) => {
      return sendControl(port, "buzzer", "melody")
    },
    [sendControl]
  )

  const buzzerOff = useCallback(
    async (port: string) => {
      return sendControl(port, "buzzer", "off")
    },
    [sendControl]
  )

  const refresh = useCallback(() => {
    fetchDevices()
    state.devices.forEach((d) => {
      if (d.connected) fetchSensors(d.port)
    })
  }, [fetchDevices, fetchSensors, state.devices])

  useEffect(() => {
    mountedRef.current = true
    fetchDevices()

    intervalRef.current = setInterval(() => {
      fetchDevices()
    }, refreshInterval)

    return () => {
      mountedRef.current = false
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchDevices, refreshInterval])

  // Also fetch sensors for connected devices
  useEffect(() => {
    const connectedDevices = state.devices.filter((d) => d.connected)
    connectedDevices.forEach((d) => fetchSensors(d.port))
  }, [state.devices.filter((d) => d.connected).length, fetchSensors])

  return {
    ...state,
    refresh,
    fetchSensors,
    sendControl,
    setNeoPixel,
    neoPixelRainbow,
    neoPixelOff,
    buzzerBeep,
    buzzerMelody,
    buzzerOff,
  }
}

// Helper functions for sensor data interpretation
export function getIAQLabel(iaq?: number): { label: string; color: string; bgColor: string } {
  if (!iaq) return { label: "Unknown", color: "text-gray-500", bgColor: "bg-gray-500/20" }
  if (iaq <= 50) return { label: "Excellent", color: "text-green-500", bgColor: "bg-green-500/20" }
  if (iaq <= 100) return { label: "Good", color: "text-green-400", bgColor: "bg-green-400/20" }
  if (iaq <= 150) return { label: "Moderate", color: "text-yellow-500", bgColor: "bg-yellow-500/20" }
  if (iaq <= 200) return { label: "Poor", color: "text-orange-500", bgColor: "bg-orange-500/20" }
  if (iaq <= 300) return { label: "Unhealthy", color: "text-red-500", bgColor: "bg-red-500/20" }
  return { label: "Hazardous", color: "text-purple-500", bgColor: "bg-purple-500/20" }
}

export function formatUptime(seconds?: number): string {
  if (!seconds) return "—"
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export function formatGasResistance(ohms?: number): string {
  if (!ohms) return "—"
  if (ohms >= 1000000) return `${(ohms / 1000000).toFixed(2)} MΩ`
  if (ohms >= 1000) return `${(ohms / 1000).toFixed(1)} kΩ`
  return `${ohms} Ω`
}
