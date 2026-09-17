/** Additive bridge for BlueSight schemas. No timer, bus, or network call. */
export interface TrailResult {
  schema: "bluesight-trail-result/v1"
  video_time_s: number
  input_sha256: string
  result_sha256: string
  data_origin: string
  navigation_status: string
  safe_to_travel_probability: null
  actuator_command: null
  patches: unknown[]
  detector?: {
    status: string
    model_sha256?: string
    detections: Array<{
      detection_id: string
      class_name: string
      bbox_xyxy: number[]
      score: number
    }>
  }
}

export interface ReplayBinding {
  runId: string
  frameId: string
  clockIso: string
  videoTimeS: number
  deviceId: string
  calibrationId?: string
}

export function toBlueSightObservation(result: TrailResult, binding: ReplayBinding) {
  if (result.schema !== "bluesight-trail-result/v1" || !Number.isFinite(binding.videoTimeS)) {
    throw new Error("Invalid trail binding")
  }
  if (Math.abs(result.video_time_s - binding.videoTimeS) > 0.05) {
    throw new Error("Trail result does not match replay time")
  }
  if (!Number.isFinite(Date.parse(binding.clockIso))) {
    throw new Error("Explicit replay timestamp required")
  }
  return {
    schema: "org.mycosoft.bluesight.device.observation.v1",
    profile: "device_scene",
    run_id: binding.runId,
    frame_id: binding.frameId,
    timestamp: binding.clockIso,
    source: "camera",
    device_id: binding.deviceId,
    calibration_id: binding.calibrationId,
    detections: (result.detector?.detections ?? []).map((d) => ({
      detection_id: d.detection_id,
      class_name: d.class_name,
      bbox_xyxy: d.bbox_xyxy,
      confidence: d.score,
      attributes: { score_kind: "UNCALIBRATED_DETECTOR_SCORE", safe_to_step: null },
    })),
    tracks: [],
    metadata: {
      evidence_kind: "recorded-trail-analysis",
      live: false,
      data_origin: result.data_origin,
      input_sha256: result.input_sha256,
      result_sha256: result.result_sha256,
      terrain_geometry: result.patches,
      navigation_status: result.navigation_status,
      forecast_qualified: false,
      forecast_p: null,
      actuator_command: null,
      detector_model_sha256: result.detector?.model_sha256 ?? null,
      reconciliation_state: "NOT_COMPUTED",
    },
  }
}

export function attachTrailExtension<T extends { schema: string; index: number; clockIso: string }>(
  frame: T,
  result: TrailResult,
  binding: ReplayBinding,
) {
  if (frame.schema !== "fusarium-scenario-sim/v1" || frame.clockIso !== binding.clockIso) {
    throw new Error("Use the existing scenario frame and clock")
  }
  return {
    ...frame,
    extensions: {
      ...((frame as T & { extensions?: Record<string, unknown> }).extensions ?? {}),
      bluesightTrail: toBlueSightObservation(result, binding),
    },
  }
}
