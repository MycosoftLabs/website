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
  device_id?: string  // Actual device ID from service (e.g., "mycobrain-side-a-COM5")
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

export function useMycoBrain(refreshInterval = 15000) {
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
      const response = await fetch("/api/mycobrain", {
        signal: AbortSignal.timeout(5000),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || "Failed to fetch devices")
      }

      const data = await response.json()
      
      // Handle both error responses and successful responses
      if (data.error) {
        if (mountedRef.current) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: data.message || data.error,
            lastUpdate: new Date(),
            // Keep previous devices to prevent UI flicker on transient errors
            devices: prev.devices,
            isConnected: prev.devices.some((d) => d.connected),
          }))
        }
        return
      }

      if (mountedRef.current) {
        setState((prev) => {
          // Filter to only include verified MycoBrain devices
          // Devices must be explicitly marked as MycoBrain or have verified=true
          const rawDevices = (data.devices || []).filter((d: any) => {
            // Include if explicitly verified as MycoBrain
            if (d.verified === true || d.is_mycobrain === true) return true
            // Include if device has MycoBrain-specific fields
            if (d.device_info?.side || d.device_info?.mdp_version) return true
            if (d.device_info?.bme688_count !== undefined) return true
            // Include if already tracked (may have connected before verification was added)
            const alreadyTracked = prev.devices.find((e) => e.port === d.port)
            if (alreadyTracked?.connected) return true
            // Exclude unverified devices
            return false
          })
          
          // Map filtered devices while preserving existing sensor_data to prevent blinking
          const devices: MycoBrainDevice[] = rawDevices.map((d: any) => {
            // Find existing device to preserve its sensor_data
            const existing = prev.devices.find((e) => e.port === d.port || e.device_id === d.device_id)
            
            return {
              ...d,
              device_id: d.device_id || `mycobrain-${d.port?.replace(/[\/\\]/g, '-') || 'unknown'}`,
              connected: d.connected ?? (d.status === "connected"),  // Map status to connected boolean
              // Preserve existing sensor_data if new data doesn't have it
              sensor_data: d.sensor_data || existing?.sensor_data || {},
              capabilities: d.capabilities || existing?.capabilities || {
                bme688_count: 0,  // Default to 0 when no sensors detected
                has_lora: false,  // Will be updated from firmware status
                has_neopixel: true,
                has_buzzer: true,
                i2c_bus: true,
                analog_inputs: 4,
                digital_io: 4,
              },
              location: d.location || existing?.location || {
                lat: 40.7128, // Default NYC for demo
                lng: -74.006,
                source: "manual" as const,
              },
            }
          })
          
          return {
            ...prev,
            devices,
            loading: false,
            error: null,
            lastUpdate: new Date(),
            isConnected: devices.some((d) => d.connected),
          }
        })
      }
    } catch (error) {
      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : "Unknown error",
          devices: prev.devices.length > 0 ? prev.devices : [], // Keep existing devices if any
        }))
      }
    }
  }, [])

  const fetchSensors = useCallback(async (portOrDeviceId: string) => {
    try {
      // Always use clean port name (strip mycobrain- prefix if present)
      const cleanPort = portOrDeviceId.replace("mycobrain-", "")
      
      const response = await fetch(`/api/mycobrain/${encodeURIComponent(cleanPort)}/sensors`)
      if (!response.ok) throw new Error("Failed to fetch sensors")

      const data = await response.json()

      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          devices: prev.devices.map((d) =>
            (d.port === portOrDeviceId || d.device_id === portOrDeviceId) 
              ? { ...d, sensor_data: { ...d.sensor_data, ...data.sensors } } 
              : d
          ),
          lastUpdate: new Date(),
        }))
      }

      return data.sensors
    } catch (error) {
      // Avoid spamming console on timeouts; UI keeps last known values.
      return null
    }
  }, [state.devices])

  const sendControl = useCallback(
    async (port: string, peripheral: string, action: string, data: Record<string, unknown> = {}) => {
      try {
        // Always use clean port name (strip mycobrain- prefix if present)
        const cleanPort = port.replace("mycobrain-", "")
        
        const response = await fetch(`/api/mycobrain/${encodeURIComponent(cleanPort)}/control`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ peripheral, action, ...data }),
        })

        if (!response.ok) throw new Error("Control command failed")

        return await response.json()
      } catch (error) {
        throw error
      }
    },
    [state.devices]
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

  // Sensor polling is handled by individual components that need it
  // Removed automatic sensor polling for all devices to prevent resource exhaustion

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
