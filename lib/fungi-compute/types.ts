/**
 * Fungi Compute - TypeScript Types
 * 
 * Core types for the biological computing visualization platform.
 * Supports FCI signal processing, SDR filtering, and real-time streaming.
 */

// ============================================================================
// Signal Types
// ============================================================================

export interface SignalSample {
  timestamp: number
  channel: number
  value: number // microvolts (µV)
  filtered: boolean
}

export interface SignalBuffer {
  deviceId: string
  channel: number
  samples: number[]
  timestamps: number[]
  sampleRate: number // Hz
}

export interface SpectralData {
  frequencies: number[]
  magnitudes: number[]
  phases: number[]
  dominantFrequency: number
  totalPower: number
  bandPowers: FrequencyBandPowers
}

export interface FrequencyBandPowers {
  delta: number   // 0.1-0.5 Hz - resting state
  theta: number   // 0.5-2.0 Hz - active growth
  alpha: number   // 2.0-8.0 Hz - environmental response
  beta: number    // 8.0-30.0 Hz - stress/action potentials
  gamma: number   // 30.0-50.0 Hz - rapid signaling
}

// ============================================================================
// FCI Device Types
// ============================================================================

export type ProbeType = 
  | "copper_steel" 
  | "silver_chloride" 
  | "platinum_iridium" 
  | "carbon_fiber"
  | "agar_interface"

export type DeviceType = "mycobrain" | "mushroom1" | "myconode" | "sporebase"

export interface FCIDevice {
  id: string
  name: string
  type: DeviceType
  probeType: ProbeType
  status: "online" | "offline" | "connecting" | "error"
  channels: number
  sampleRate: number
  location?: {
    lat: number
    lng: number
    altitude?: number
  }
  lastSeen: string
  firmwareVersion: string
  calibrationDate?: string
}

export interface FCIChannel {
  id: number
  label: string
  enabled: boolean
  gain: number
  offset: number
  color: string
}

// ============================================================================
// SDR Filter Types
// ============================================================================

export type FilterType = 
  | "bandpass" 
  | "notch" 
  | "highpass" 
  | "lowpass" 
  | "butterworth"
  | "chebyshev"
  | "bessel"

export interface FilterConfig {
  type: FilterType
  enabled: boolean
  order: number
  lowCutoff?: number  // Hz
  highCutoff?: number // Hz
  centerFreq?: number // Hz (for notch)
  q?: number          // Quality factor
}

export interface SDRConfig {
  deviceId: string
  bandpass: {
    enabled: boolean
    lowCutoff: number
    highCutoff: number
    order: number
  }
  notchFilters: {
    enabled: boolean
    frequencies: number[] // 50, 60, etc.
    q: number
  }
  rfRejection: {
    enabled: boolean
    preset: RFPreset
  }
  emfRejection: {
    enabled: boolean
    presets: EMFPreset[]
  }
}

export type RFPreset = 
  | "none" 
  | "broadband" 
  | "cellular" 
  | "wifi" 
  | "bluetooth"
  | "microwave"

export type EMFPreset = 
  | "power_line_50hz"
  | "power_line_60hz"
  | "motor_noise"
  | "fluorescent"
  | "hvac"
  | "switching_power_supply"

export interface SDRPreset {
  id: string
  name: string
  description: string
  config: SDRConfig
}

export const SDR_PRESETS: Record<string, Omit<SDRConfig, "deviceId">> = {
  lab: {
    bandpass: { enabled: true, lowCutoff: 0.1, highCutoff: 50, order: 4 },
    notchFilters: { enabled: true, frequencies: [50, 60], q: 30 },
    rfRejection: { enabled: false, preset: "none" },
    emfRejection: { enabled: true, presets: ["fluorescent"] }
  },
  field: {
    bandpass: { enabled: true, lowCutoff: 0.1, highCutoff: 50, order: 4 },
    notchFilters: { enabled: true, frequencies: [50, 60], q: 30 },
    rfRejection: { enabled: true, preset: "broadband" },
    emfRejection: { enabled: true, presets: ["power_line_50hz", "power_line_60hz", "motor_noise"] }
  },
  urban: {
    bandpass: { enabled: true, lowCutoff: 0.1, highCutoff: 50, order: 6 },
    notchFilters: { enabled: true, frequencies: [50, 60], q: 50 },
    rfRejection: { enabled: true, preset: "cellular" },
    emfRejection: { enabled: true, presets: ["power_line_50hz", "power_line_60hz", "hvac", "switching_power_supply"] }
  },
  clean_room: {
    bandpass: { enabled: true, lowCutoff: 0.1, highCutoff: 100, order: 2 },
    notchFilters: { enabled: false, frequencies: [], q: 30 },
    rfRejection: { enabled: false, preset: "none" },
    emfRejection: { enabled: false, presets: [] }
  }
}

// ============================================================================
// Pattern Detection Types (GFST)
// ============================================================================

export type PatternCategory = 
  | "metabolic" 
  | "environmental" 
  | "communication" 
  | "predictive" 
  | "defensive"
  | "reproductive"

export type PatternType =
  | "baseline"
  | "active_growth"
  | "nutrient_seeking"
  | "temperature_stress"
  | "moisture_stress"
  | "chemical_stress"
  | "network_communication"
  | "action_potential"
  | "seismic_precursor"
  | "defense_activation"
  | "sporulation_initiation"

export interface GFSTPattern {
  type: PatternType
  category: PatternCategory
  name: string
  description: string
  frequencyRange: [number, number] // Hz
  amplitudeRange: [number, number] // mV
  color: string
  icon: string
}

export interface DetectedPattern {
  id: string
  deviceId: string
  channelId: number
  pattern: PatternType
  category: PatternCategory
  confidence: number // 0-1
  timestamp: string
  duration: number // seconds
  semanticMeaning: string
  implications: string[]
  recommendedActions: string[]
  metadata: Record<string, unknown>
}

// ============================================================================
// Signal Fingerprint Types
// ============================================================================

export interface SignalFingerprint {
  id: string
  deviceId: string
  generatedAt: string
  hash: string // SHA-256 of normalized features
  features: {
    bandPowers: FrequencyBandPowers
    spikeRate: number
    avgAmplitude: number
    peakFrequency: number
    spectralEntropy: number
    crossCorrelation: number[][] // channel x channel matrix
  }
  similarity: number // 0-1 similarity to known patterns
  matchedPatterns: PatternType[]
}

// ============================================================================
// Event Types
// ============================================================================

export type EventType = 
  | "pattern_detected"
  | "correlation_found"
  | "external_event"
  | "device_event"
  | "stimulation_sent"
  | "stimulation_response"

export interface FCIEvent {
  id: string
  type: EventType
  timestamp: string
  deviceId?: string
  pattern?: DetectedPattern
  correlation?: EventCorrelation
  externalSource?: string
  confidence: number
  data: Record<string, unknown>
}

export interface EventCorrelation {
  id: string
  fciEventId: string
  externalEventId: string
  source: "earth2" | "crep" | "mwave" | "petri_dish" | "nlm"
  correlationType: "temporal" | "spatial" | "causal" | "associative"
  confidence: number
  lag: number // milliseconds
  description: string
}

// ============================================================================
// Stimulation Types
// ============================================================================

export type WaveformType = "sine" | "square" | "triangle" | "pulse" | "custom"

export interface StimulationConfig {
  waveform: WaveformType
  frequency: number // Hz
  amplitude: number // mV
  duration: number // seconds
  channel: number
  offset: number
  dutyCycle?: number // for pulse waveform
}

export interface StimulationCommand {
  id: string
  deviceId: string
  config: StimulationConfig
  status: "pending" | "sent" | "acknowledged" | "completed" | "error"
  sentAt?: string
  completedAt?: string
  responseData?: Record<string, unknown>
}

// ============================================================================
// WebSocket Message Types
// ============================================================================

export type WSMessageType = 
  | "sample"
  | "spectrum"
  | "pattern"
  | "event"
  | "fingerprint"
  | "status"
  | "error"
  | "config_update"

export interface WSMessage<T = unknown> {
  type: WSMessageType
  deviceId: string
  timestamp: string
  payload: T
}

export interface WSSamplePayload {
  channels: number[]
  samples: number[][]
  filtered: boolean
  sampleRate: number
}

export interface WSSpectrumPayload {
  channel: number
  data: SpectralData
}

export interface WSPatternPayload {
  pattern: DetectedPattern
}

export interface WSEventPayload {
  event: FCIEvent
}

// ============================================================================
// Oscilloscope Display Types
// ============================================================================

export interface OscilloscopeConfig {
  timeDiv: number // seconds per division
  voltDiv: number // mV per division
  triggerLevel: number
  triggerEdge: "rising" | "falling" | "both"
  triggerMode: "auto" | "single" | "normal"
  channels: {
    [key: number]: {
      enabled: boolean
      color: string
      offset: number
      scale: number
    }
  }
  gridEnabled: boolean
  persistenceEnabled: boolean
  persistenceTime: number // seconds
}

// ============================================================================
// Integration Types
// ============================================================================

export interface NLMAnalysis {
  deviceId: string
  timestamp: string
  growthPhase: string
  bioactivityPredictions: {
    compound: string
    confidence: number
    action: string
  }[]
  environmentalCorrelations: {
    factor: string
    correlation: number
    suggestion: string
  }[]
  recommendations: string[]
}

export interface PetriDishSync {
  simulationId: string
  status: "connected" | "disconnected" | "syncing"
  lastSync: string
  parameters: {
    temperature: number
    humidity: number
    pH: number
    substrate: string
  }
  comparisonMode: boolean
}

export interface Earth2Correlation {
  weatherEvent?: {
    type: string
    severity: number
    location: { lat: number; lng: number }
    timestamp: string
  }
  seismicEvent?: {
    magnitude: number
    depth: number
    location: { lat: number; lng: number }
    timestamp: string
  }
  correlationStrength: number
  timeOffset: number // seconds
}

// ============================================================================
// Color Constants
// ============================================================================

export const FUNGI_COLORS = {
  // Background
  bg: "#050810",
  panel: "rgba(10, 25, 50, 0.8)",
  border: "rgba(0, 200, 255, 0.3)",
  glow: "rgba(0, 255, 200, 0.5)",
  
  // Signal channels
  ch1: "#00ffcc", // cyan-green
  ch2: "#ff00ff", // magenta
  ch3: "#ffff00", // yellow
  ch4: "#00ccff", // cyan
  
  // Pattern categories
  metabolic: "#22c55e",
  environmental: "#f59e0b",
  communication: "#3b82f6",
  predictive: "#a855f7",
  defensive: "#ef4444",
  reproductive: "#ec4899",
  
  // UI states
  active: "#00ff88",
  warning: "#ffaa00",
  error: "#ff4444",
  info: "#00aaff",
} as const

export const CHANNEL_COLORS = [
  FUNGI_COLORS.ch1,
  FUNGI_COLORS.ch2,
  FUNGI_COLORS.ch3,
  FUNGI_COLORS.ch4,
]

export const PATTERN_COLORS: Record<PatternCategory, string> = {
  metabolic: FUNGI_COLORS.metabolic,
  environmental: FUNGI_COLORS.environmental,
  communication: FUNGI_COLORS.communication,
  predictive: FUNGI_COLORS.predictive,
  defensive: FUNGI_COLORS.defensive,
  reproductive: FUNGI_COLORS.reproductive,
}
