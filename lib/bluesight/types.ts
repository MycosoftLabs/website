export type BlueSightSensorSource =
  | "camera"
  | "lidar"
  | "radar"
  | "wifi_sense"
  | "screen_capture"
  | "microscope"

export type BlueSightProfile = "petri" | "earth_globe" | "device_scene"

export interface BlueSightLinkedEntity {
  type: string
  id: string
  taxon_id?: string
}

export interface BlueSightDetection {
  detection_id: string
  class_name: string
  confidence: number
  track_id?: string
  bbox_xyxy?: [number, number, number, number]
  centroid_xy?: [number, number]
  mask_rle?: string
  linked_entity?: BlueSightLinkedEntity
  visual_label?: string
  attributes?: Record<string, unknown>
}

export interface BlueSightTrack {
  track_id: string
  class_name: string
  status: "created" | "updated" | "lost"
  confidence: number
  centroid_xy?: [number, number]
  last_seen_ts: string
}

export interface BlueSightReconciliation {
  matched_sim_entities: number
  unmatched_visual_entities: number
  visual_truth_disagreement_score: number
  sensor_disagreement_score: number
}

export interface BlueSightObservation {
  schema: string
  profile: BlueSightProfile
  run_id: string
  frame_id: string
  timestamp: string
  source: BlueSightSensorSource
  detections: BlueSightDetection[]
  tracks: BlueSightTrack[]
  reconciliation: BlueSightReconciliation
  model_health?: {
    model_name: string
    model_version: string
    runtime: string
    provider: string
    healthy: boolean
    fps?: number
    latency_ms?: number
    notes?: string
  }
  truth_state_ref?: string
  scene_summary?: string
  metadata?: Record<string, unknown>
}

export interface PetriTruthState {
  run_id: string
  tick: number
  colonies: Array<Record<string, unknown>>
  spores: Array<Record<string, unknown>>
  tips: Array<Record<string, unknown>>
  segments: Array<Record<string, unknown>>
  nodes: Array<Record<string, unknown>>
  chemical_fields_summary: Record<string, number>
  events_since_last_frame: Array<Record<string, unknown>>
}

