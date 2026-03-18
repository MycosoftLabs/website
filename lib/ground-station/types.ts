/**
 * Ground Station Types
 *
 * TypeScript types derived from the ground-station backend SQLAlchemy models.
 * Covers satellites, transmitters, hardware (SDR, rotators, rigs),
 * observations, groups, locations, and tracking state.
 */

// ============================================================================
// Enums
// ============================================================================

export type CameraType = "webrtc" | "hls" | "mjpeg"
export type SatelliteGroupType = "user" | "system"
export type SDRType =
  | "rtlsdrusbv3" | "rtlsdrtcpv3"
  | "rtlsdrusbv4" | "rtlsdrtcpv4"
  | "soapysdrlocal" | "soapysdrremote"
  | "uhd" | "sigmfplayback"
export type ObservationStatus = "scheduled" | "running" | "completed" | "cancelled" | "failed" | "missed"
export type TrackingRotatorState = "idle" | "tracking" | "parking"
export type TrackingRigState = "idle" | "tracking"

// ============================================================================
// Core Data Models
// ============================================================================

export interface GSSatellite {
  norad_id: number
  name: string
  source: string
  name_other?: string
  alternative_name?: string
  image?: string
  sat_id?: string
  tle1: string
  tle2: string
  status?: string
  decayed?: string
  launched?: string
  deployed?: string
  website?: string
  operator?: string
  countries?: string
  citation?: string
  is_frequency_violator?: boolean
  associated_satellites?: string
  added: string
  updated?: string
}

export interface GSTransmitter {
  id: string
  description?: string
  alive?: boolean
  type?: string
  uplink_low?: number
  uplink_high?: number
  uplink_drift?: number
  downlink_low?: number
  downlink_high?: number
  downlink_drift?: number
  mode?: string
  mode_id?: number
  uplink_mode?: string
  invert?: boolean
  baud?: number
  sat_id?: string
  norad_cat_id: number
  norad_follow_id?: number
  status: string
  citation?: string
  service?: string
  source?: string
  iaru_coordination?: string
  iaru_coordination_url?: string
  itu_notification?: Record<string, unknown>
  frequency_violation?: boolean
  unconfirmed?: boolean
  added?: string
  updated?: string
}

export interface GSRig {
  id: string
  name: string
  host: string
  port: number
  radiotype: string
  radio_mode: string
  vfotype: number
  tx_control_mode: string
  retune_interval_ms: number
  follow_downlink_tuning: boolean
  added: string
  updated: string
}

export interface GSSDR {
  id: string
  name: string
  serial?: string
  host?: string
  port?: number
  type?: SDRType
  driver?: string
  frequency_min?: number
  frequency_max?: number
  added: string
  updated: string
}

export interface GSRotator {
  id: string
  name: string
  host: string
  port: number
  minaz: number
  maxaz: number
  minel: number
  maxel: number
  aztolerance: number
  eltolerance: number
  added: string
  updated: string
}

export interface GSLocation {
  id: string
  name: string
  lat: number
  lon: number
  alt: number
  added: string
  updated?: string
}

export interface GSGroup {
  id: string
  name: string
  identifier?: string
  type: SatelliteGroupType
  satellite_ids?: number[]
  added: string
  updated: string
}

export interface GSCamera {
  id: string
  name: string
  url?: string
  type: CameraType
  status: "active" | "inactive"
  added: string
  updated: string
}

export interface GSTrackingState {
  norad_id?: number
  group_id?: string
  rotator_state: TrackingRotatorState
  rig_state: TrackingRigState
  rig_id?: string
  rotator_id?: string
  transmitter_id?: string
}

export interface GSPreference {
  id: string
  name: string
  value: string
  added: string
  updated?: string
}

export interface GSTLESource {
  id: string
  name: string
  identifier: string
  url: string
  format: string
  added: string
  updated: string
}

// ============================================================================
// Observations & Scheduling
// ============================================================================

export interface GSMonitoredSatellite {
  id: string
  enabled: boolean
  norad_id: number
  sdr_id?: string
  rotator_id?: string
  rig_id?: string
  satellite_config: Record<string, unknown>
  hardware_config: Record<string, unknown>
  generation_config: {
    min_elevation?: number
    lookahead_hours?: number
    [key: string]: unknown
  }
  sessions: GSObservationSession[]
  created_at: string
  updated_at: string
}

export interface GSScheduledObservation {
  id: string
  name: string
  enabled: boolean
  status: ObservationStatus
  norad_id: number
  event_start: string
  event_end: string
  task_start?: string
  task_end?: string
  sdr_id?: string
  rotator_id?: string
  rig_id?: string
  satellite_config: Record<string, unknown>
  pass_config: {
    peak_altitude?: number
    [key: string]: unknown
  }
  hardware_config: Record<string, unknown>
  sessions: GSObservationSession[]
  monitored_satellite_id?: string
  generated_at?: string
  error_message?: string
  error_count: number
  last_error_time?: string
  actual_start_time?: string
  actual_end_time?: string
  execution_log?: Array<{ timestamp: string; message: string }>
  created_at: string
  updated_at: string
}

export interface GSObservationSession {
  sdr?: Record<string, unknown>
  tasks: Array<{
    type: string
    config: Record<string, unknown>
  }>
}

// ============================================================================
// Satellite Pass Data (computed, not from DB)
// ============================================================================

export interface GSSatellitePass {
  norad_id: number
  satellite_name: string
  aos_time: string
  los_time: string
  max_elevation: number
  aos_azimuth: number
  los_azimuth: number
  duration_seconds: number
  is_visible?: boolean
}

export interface GSSatellitePosition {
  norad_id: number
  lat: number
  lon: number
  alt: number // km
  velocity: number // km/s
  az: number
  el: number
  range: number // km
  trend: "rising" | "falling" | "stable" | "peak"
  el_rate: number
  time_to_max_el?: number
  is_visible: boolean
}

// ============================================================================
// Waterfall / SDR
// ============================================================================

export interface GSWaterfallState {
  running: boolean
  sdr_id?: string
  center_frequency: number
  sample_rate: number
  gain: number
  fft_size: number
  averaging: number
}

export interface GSVFOState {
  id: string
  frequency: number
  bandwidth: number
  mode: string
  decoder?: string
  audio_enabled: boolean
  squelch: number
  gain: number
}

// ============================================================================
// System Info
// ============================================================================

export interface GSSystemInfo {
  cpu_percent: number
  memory_percent: number
  disk_percent: number
  uptime_seconds: number
  python_version: string
  os_info: string
  hostname: string
}

// ============================================================================
// Ground Station Connection Config
// ============================================================================

export interface GSConnectionConfig {
  url: string
  apiKey?: string
  name?: string
  location?: GSLocation
}

// ============================================================================
// Mindex Integration Types
// ============================================================================

export interface GSMindexSatelliteTelemetry {
  device_id: string
  source: "ground-station"
  norad_id: number
  satellite_name: string
  position: {
    lat: number
    lon: number
    alt: number
  }
  velocity: number
  azimuth: number
  elevation: number
  range: number
  trend: string
  is_visible: boolean
  timestamp: string
}

export interface GSMindexObservationRecord {
  device_id: string
  source: "ground-station"
  observation_id: string
  norad_id: number
  satellite_name: string
  status: ObservationStatus
  event_start: string
  event_end: string
  peak_elevation: number
  hardware: {
    sdr?: string
    rotator?: string
    rig?: string
  }
  sessions: GSObservationSession[]
  timestamp: string
}

// ============================================================================
// Worldview API Types
// ============================================================================

export interface GSWorldviewPayload {
  source: "ground-station"
  type: "satellite_tracking" | "observation" | "rf_signal" | "hardware_status"
  data: Record<string, unknown>
  location?: { lat: number; lon: number; alt: number }
  timestamp: string
}
