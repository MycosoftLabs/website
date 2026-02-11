/**
 * Fungi Compute - React Hooks
 * 
 * Custom hooks for FCI device management, signal streaming, and data visualization.
 */

"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { FCIWebSocketClient, createFCIClient, ConnectionStatus } from "./websocket-client"
import {
  FCIDevice,
  SDRConfig,
  SDR_PRESETS,
  DetectedPattern,
  FCIEvent,
  SignalBuffer,
  SpectralData,
  SignalFingerprint,
  WSSamplePayload,
  WSSpectrumPayload,
  WSPatternPayload,
  WSEventPayload,
  NLMAnalysis,
  Earth2Correlation,
  FrequencyBandPowers,
} from "./types"

const MAS_API_URL = process.env.NEXT_PUBLIC_MAS_API_URL || "http://192.168.0.188:8001"

// ============================================================================
// Device Management Hooks
// ============================================================================

// Static demo devices to prevent re-renders
const DEMO_DEVICES: FCIDevice[] = [
  {
    id: "demo-fci-001",
    name: "FCI Probe - Lab Demo",
    type: "fci",
    status: "online",
    location: { lat: 40.7128, lon: -74.0060, name: "Lab A, Station 3" },
    sampleRate: 250,
    channels: 4,
    lastSeen: new Date().toISOString(),
  }
]

export function useFCIDevices() {
  const [devices, setDevices] = useState<FCIDevice[]>(DEMO_DEVICES)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const initialFetchDone = useRef(false)

  const fetchDevices = useCallback(async () => {
    try {
      const res = await fetch(`/api/fci/devices`)
      if (!res.ok) {
        // Keep demo devices if API fails - don't update state
        return
      }
      const data = await res.json()
      if (data.devices && data.devices.length > 0) {
        setDevices(data.devices)
      }
      setError(null)
    } catch (err) {
      // Keep demo devices on error - don't update state
      setError(null)
    }
  }, [])

  useEffect(() => {
    if (!initialFetchDone.current) {
      initialFetchDone.current = true
      setLoading(true)
      fetchDevices().finally(() => setLoading(false))
    }
    // Don't poll - it causes re-renders
  }, [fetchDevices])

  return { devices, loading, error, refresh: fetchDevices }
}

export function useFCIDevice(deviceId: string | null) {
  const { devices, loading, error, refresh } = useFCIDevices()
  
  const device = useMemo(() => {
    if (!deviceId) return null
    return devices.find(d => d.id === deviceId) || null
  }, [devices, deviceId])

  return { device, loading, error, refresh }
}

// ============================================================================
// Real-time Signal Streaming Hook
// ============================================================================

interface UseSignalStreamOptions {
  deviceId: string | null
  enabled?: boolean
  bufferSize?: number
  demoMode?: boolean  // Explicit demo mode control - if true, use simulated data; if false, use real WebSocket
  onPattern?: (pattern: DetectedPattern) => void
  onEvent?: (event: FCIEvent) => void
  onDeviceConnected?: (deviceId: string) => void  // Hot-plug callback
  onDeviceDisconnected?: (deviceId: string) => void  // Hot-plug callback
}

export function useSignalStream({
  deviceId,
  enabled = true,
  bufferSize = 1024,
  demoMode,  // If undefined, auto-detect from deviceId prefix "demo-"
  onPattern,
  onEvent,
  onDeviceConnected,
  onDeviceDisconnected,
}: UseSignalStreamOptions) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected")
  const [signalBuffer, setSignalBuffer] = useState<SignalBuffer[]>([])
  const [spectrum, setSpectrum] = useState<SpectralData | null>(null)
  const [patterns, setPatterns] = useState<DetectedPattern[]>([])
  const [events, setEvents] = useState<FCIEvent[]>([])
  
  const clientRef = useRef<FCIWebSocketClient | null>(null)
  const bufferRef = useRef<Map<number, number[]>>(new Map())
  const demoIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Determine if we should use demo mode:
  // - If demoMode is explicitly set, use that value
  // - If demoMode is undefined, auto-detect from deviceId prefix "demo-"
  const shouldUseDemoMode = demoMode ?? (deviceId?.startsWith("demo-") ?? false)

  // Demo mode simulation
  useEffect(() => {
    if (!deviceId || !enabled) {
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current)
        demoIntervalRef.current = null
      }
      setStatus("disconnected")
      setSignalBuffer([])
      setSpectrum(null)
      return
    }

    // Demo mode - visualization components handle their own animations
    // This hook only provides connection status and occasional events
    if (shouldUseDemoMode) {
      setStatus("connected")
      
      // Very slow interval just for patterns/events - components handle visuals
      demoIntervalRef.current = setInterval(() => {
        const t = Date.now() / 1000
        const patternTypes = ["baseline", "growth", "stress", "spike", "communication"]
        const currentPatternType = patternTypes[Math.floor(t / 10) % patternTypes.length]
        
        // Generate pattern occasionally (not every tick)
        if (Math.random() > 0.7) {
          const pattern: DetectedPattern = {
            id: Math.random().toString(36),
            deviceId: deviceId!,
            channelId: 0,
            pattern: currentPatternType as any,  // PatternType
            category: "metabolic" as any,  // PatternCategory
            confidence: 0.6 + Math.random() * 0.3,
            timestamp: new Date().toISOString(),
            duration: 1 + Math.random() * 5,
            semanticMeaning: `Demo ${currentPatternType} signal detected`,
            implications: ["Demo mode - simulated data"],
            recommendedActions: ["Connect real FCI device for live data"],
            metadata: {
              avgAmplitude: 1 + Math.random() * 2,
              peakFrequency: 0.5 + Math.random() * 10,
              bandwidth: 2 + Math.random() * 5,
            },
          }
          setPatterns(prev => [pattern, ...prev].slice(0, 20))
          onPattern?.(pattern)
        }
      }, 5000) // Every 5 seconds, not 100ms
      
      return () => {
        if (demoIntervalRef.current) {
          clearInterval(demoIntervalRef.current)
        }
      }
    }

    // Real WebSocket connection for non-demo devices
    // This happens when demoMode is explicitly false or device doesn't start with "demo-"
    const client = createFCIClient({
      deviceId,
      onStatusChange: setStatus,
      onSample: (payload: WSSamplePayload) => {
        // Update signal buffers for each channel
        payload.channels.forEach((channel, idx) => {
          const samples = payload.samples[idx] || []
          const existing = bufferRef.current.get(channel) || []
          const updated = [...existing, ...samples].slice(-bufferSize)
          bufferRef.current.set(channel, updated)
        })

        // Update state periodically
        const buffers: SignalBuffer[] = Array.from(bufferRef.current.entries()).map(
          ([channel, samples]) => ({
            deviceId: deviceId!,
            channel,
            samples,
            timestamps: samples.map((_, i) => Date.now() - (samples.length - i) * (1000 / payload.sampleRate)),
            sampleRate: payload.sampleRate,
          })
        )
        setSignalBuffer(buffers)
      },
      onSpectrum: (payload: WSSpectrumPayload) => {
        setSpectrum(payload.data)
      },
      onPattern: (payload: WSPatternPayload) => {
        setPatterns(prev => [payload.pattern, ...prev].slice(0, 100))
        onPattern?.(payload.pattern)
      },
      onEvent: (payload: WSEventPayload) => {
        // Handle hot-plug events
        const eventType = (payload as any).type || payload.event?.type
        if (eventType === "device_connected") {
          onDeviceConnected?.(deviceId!)
        } else if (eventType === "device_disconnected") {
          onDeviceDisconnected?.(deviceId!)
        }
        
        // Add to events list
        const event = payload.event || { type: eventType, timestamp: new Date().toISOString(), data: payload }
        setEvents(prev => [event, ...prev].slice(0, 100))
        onEvent?.(event)
      },
      onError: (error) => {
        console.error("[useSignalStream] Error:", error)
      },
    })

    clientRef.current = client
    client.connect()

    return () => {
      client.disconnect()
    }
  }, [deviceId, enabled, bufferSize, shouldUseDemoMode, onPattern, onEvent, onDeviceConnected, onDeviceDisconnected])

  // Configure SDR filters
  const setSDRConfig = useCallback((config: SDRConfig) => {
    clientRef.current?.sendSDRConfig(config)
  }, [])

  // Apply preset
  const applyPreset = useCallback((presetName: keyof typeof SDR_PRESETS) => {
    if (!deviceId) return
    const preset = SDR_PRESETS[presetName]
    if (preset) {
      setSDRConfig({ ...preset, deviceId } as SDRConfig)
    }
  }, [deviceId, setSDRConfig])

  // Send stimulation command
  const sendStimulation = useCallback((command: {
    waveform: string
    frequency: number
    amplitude: number
    duration: number
    channel: number
  }) => {
    clientRef.current?.sendStimulationCommand(command)
  }, [])

  // Set simulated pattern (dev mode)
  const setPattern = useCallback((pattern: string) => {
    clientRef.current?.setPattern(pattern)
  }, [])

  return {
    status,
    isConnected: status === "connected",
    isDemoMode: shouldUseDemoMode,
    signalBuffer,
    spectrum,
    patterns,
    events,
    setSDRConfig,
    applyPreset,
    sendStimulation,
    setPattern,  // For testing: set simulated pattern on server
  }
}

// ============================================================================
// Pattern Detection Hook
// ============================================================================

export function usePatternHistory(deviceId: string | null, hours: number = 24) {
  const [patterns, setPatterns] = useState<DetectedPattern[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const initialFetchDone = useRef(false)

  const fetchPatterns = useCallback(async () => {
    if (!deviceId) return
    
    try {
      setLoading(true)
      const res = await fetch(`/api/fci/patterns?device_id=${deviceId}&hours=${hours}`)
      if (!res.ok) throw new Error("Failed to fetch patterns")
      const data = await res.json()
      setPatterns(data.patterns || [])
      setError(null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [deviceId, hours])

  useEffect(() => {
    if (deviceId && !initialFetchDone.current) {
      initialFetchDone.current = true
      fetchPatterns()
    }
    // Don't poll - prevents re-renders
  }, [deviceId, hours, fetchPatterns])

  // Compute pattern statistics
  const stats = useMemo(() => {
    if (patterns.length === 0) return null

    const byCategory = patterns.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const byType = patterns.reduce((acc, p) => {
      acc[p.pattern] = (acc[p.pattern] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const avgConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length

    return {
      total: patterns.length,
      byCategory,
      byType,
      avgConfidence,
      uniquePatterns: Object.keys(byType).length,
    }
  }, [patterns])

  return { patterns, stats, loading, error, refresh: fetchPatterns }
}

// ============================================================================
// Signal Fingerprint Hook
// ============================================================================

// Static demo fingerprint to prevent re-renders
const DEMO_FINGERPRINT: SignalFingerprint = {
  hash: "a3f2c8d9e1b4",
  features: {
    avgAmplitude: 1.5,
    peakFrequency: 2.8,
    spikeRate: 0.65,
    snr: 20,
    impedance: 3000,
    bandPowers: {
      delta: 0.75,
      theta: 0.8,
      alpha: 0.65,
      beta: 0.4,
      gamma: 0.25,
    },
  },
  similarity: 0.85,
  matchedPatterns: ["growth", "baseline"],
}

export function useSignalFingerprint(deviceId: string | null) {
  const [fingerprint, setFingerprint] = useState<SignalFingerprint | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const initialFetchDone = useRef(false)

  const fetchFingerprint = useCallback(async () => {
    if (!deviceId) return
    
    // Demo mode fingerprint - use static data to prevent re-renders
    if (deviceId.startsWith("demo-")) {
      if (!fingerprint) {
        setFingerprint(DEMO_FINGERPRINT)
      }
      return
    }
    
    try {
      setLoading(true)
      const res = await fetch(`/api/fci/fingerprint/${deviceId}`)
      if (!res.ok) throw new Error("Failed to fetch fingerprint")
      const data = await res.json()
      setFingerprint(data.fingerprint || null)
      setError(null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [deviceId, fingerprint])

  useEffect(() => {
    if (deviceId && !initialFetchDone.current) {
      initialFetchDone.current = true
      fetchFingerprint()
    }
    // Don't poll - components handle their own animation
  }, [deviceId, fetchFingerprint])

  return { fingerprint, loading, error, refresh: fetchFingerprint }
}

// ============================================================================
// NLM Analysis Hook
// ============================================================================

export function useNLMAnalysis(deviceId: string | null) {
  const [analysis, setAnalysis] = useState<NLMAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const initialFetchDone = useRef(false)

  const fetchAnalysis = useCallback(async () => {
    if (!deviceId) return
    
    try {
      setLoading(true)
      const res = await fetch(`/api/fci/nlm/${deviceId}`)
      if (!res.ok) throw new Error("Failed to fetch NLM analysis")
      const data = await res.json()
      setAnalysis(data.analysis || null)
      setError(null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [deviceId])

  useEffect(() => {
    if (deviceId && !initialFetchDone.current) {
      initialFetchDone.current = true
      fetchAnalysis()
    }
    // Don't poll - prevents re-renders
  }, [deviceId, fetchAnalysis])

  return { analysis, loading, error, refresh: fetchAnalysis }
}

// ============================================================================
// Event Correlation Hook
// ============================================================================

export function useEventCorrelations(deviceId: string | null) {
  const [correlations, setCorrelations] = useState<Earth2Correlation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const initialFetchDone = useRef(false)

  const fetchCorrelations = useCallback(async () => {
    if (!deviceId) return
    
    try {
      setLoading(true)
      const res = await fetch(`/api/fci/correlations/${deviceId}`)
      if (!res.ok) throw new Error("Failed to fetch correlations")
      const data = await res.json()
      setCorrelations(data.correlations || [])
      setError(null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [deviceId])

  useEffect(() => {
    if (deviceId && !initialFetchDone.current) {
      initialFetchDone.current = true
      fetchCorrelations()
    }
    // Don't poll - prevents re-renders
  }, [deviceId, fetchCorrelations])

  return { correlations, loading, error, refresh: fetchCorrelations }
}

// ============================================================================
// Oscilloscope Configuration Hook
// ============================================================================

interface OscilloscopeSettings {
  timeDiv: number
  voltDiv: number
  triggerLevel: number
  triggerEdge: "rising" | "falling" | "both"
  triggerMode: "auto" | "single" | "normal"
  channels: Record<number, { enabled: boolean; color: string; offset: number; scale: number }>
  gridEnabled: boolean
  persistenceEnabled: boolean
}

const DEFAULT_OSCILLOSCOPE_SETTINGS: OscilloscopeSettings = {
  timeDiv: 0.1, // 100ms per division
  voltDiv: 1.0, // 1mV per division
  triggerLevel: 0,
  triggerEdge: "rising",
  triggerMode: "auto",
  channels: {
    0: { enabled: true, color: "#00ffcc", offset: 0, scale: 1 },
    1: { enabled: true, color: "#ff00ff", offset: 0, scale: 1 },
    2: { enabled: false, color: "#ffff00", offset: 0, scale: 1 },
    3: { enabled: false, color: "#00ccff", offset: 0, scale: 1 },
  },
  gridEnabled: true,
  persistenceEnabled: false,
}

export function useOscilloscopeSettings() {
  const [settings, setSettings] = useState<OscilloscopeSettings>(DEFAULT_OSCILLOSCOPE_SETTINGS)

  const updateTimeDiv = useCallback((value: number) => {
    setSettings(prev => ({ ...prev, timeDiv: value }))
  }, [])

  const updateVoltDiv = useCallback((value: number) => {
    setSettings(prev => ({ ...prev, voltDiv: value }))
  }, [])

  const updateTrigger = useCallback((updates: Partial<Pick<OscilloscopeSettings, "triggerLevel" | "triggerEdge" | "triggerMode">>) => {
    setSettings(prev => ({ ...prev, ...updates }))
  }, [])

  const updateChannel = useCallback((channel: number, updates: Partial<OscilloscopeSettings["channels"][0]>) => {
    setSettings(prev => ({
      ...prev,
      channels: {
        ...prev.channels,
        [channel]: { ...prev.channels[channel], ...updates },
      },
    }))
  }, [])

  const toggleGrid = useCallback(() => {
    setSettings(prev => ({ ...prev, gridEnabled: !prev.gridEnabled }))
  }, [])

  const togglePersistence = useCallback(() => {
    setSettings(prev => ({ ...prev, persistenceEnabled: !prev.persistenceEnabled }))
  }, [])

  const reset = useCallback(() => {
    setSettings(DEFAULT_OSCILLOSCOPE_SETTINGS)
  }, [])

  return {
    settings,
    updateTimeDiv,
    updateVoltDiv,
    updateTrigger,
    updateChannel,
    toggleGrid,
    togglePersistence,
    reset,
  }
}
