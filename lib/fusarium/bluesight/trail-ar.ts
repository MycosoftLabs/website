/** Trail AR contracts — SYNTHETIC EXERCISE. live=false. No calibrated forecast_p. */

export const TRAIL_AR_SCHEMA = "bluesight-trail-ar-session/v1" as const
export const TRAIL_AR_VIDEO_PUBLIC = "/fusarium/bluesight-lab/test-pxl-20260913.mp4"
export const TRAIL_AR_VIDEO_NAME = "PXL_20260913_211840104.mp4"
export const TRAIL_AR_BANNER = "SYNTHETIC EXERCISE" as const

/** ffprobe PXL_20260913_211840104.mp4 — do not invent extra camera frames. */
export const PXL_SOURCE_FPS = 30
export const PXL_NATIVE_FRAMES = 422
export const PXL_DURATION_S = 14.0691
export const PXL_ORIGINAL_SHA256 =
  "8d93bae890fc03b5b75f2b6565391d6d3e113e9b5228eefa5c28a57eb01827c3"
export const OVERLAY_HZ_TARGET = 120
export const OVERLAY_TICKS_PER_NATIVE = OVERLAY_HZ_TARGET / PXL_SOURCE_FPS

export type ActorMode = "person" | "robot"

export interface Ade20kFraction {
  t: number
  record_id: string
  nav: "HOLD"
  classes: Record<string, number>
}

/** Laptop-lab ADE20K SegFormer-B0 on this exact clip. Appearance fractions, not species. */
export const ADE20K_PXL_RECEIPT: Ade20kFraction[] = [
  { t: 0, record_id: "trail-bee6c1181b76", nav: "HOLD", classes: { tree: 25.95, earth: 70.54, rock: 3.26, plant: 0.25 } },
  { t: 2, record_id: "trail-a2b0656c7a92", nav: "HOLD", classes: { tree: 24.0, earth: 75.87, rock: 0.13 } },
  { t: 4, record_id: "trail-e232b10b0eff", nav: "HOLD", classes: { tree: 26.04, earth: 73.95, plant: 0.01 } },
  { t: 6, record_id: "trail-b5a5db895888", nav: "HOLD", classes: { tree: 19.75, earth: 73.86, rock: 6.32, grass: 0.05, plant: 0, path: 0 } },
  { t: 8, record_id: "trail-07a4695a684b", nav: "HOLD", classes: { tree: 11.15, earth: 88.85 } },
]

export const WEKA_FIXTURE_GOLDEN = {
  labeled_pixels: 240,
  correct_pixels: 176,
  accuracy: 176 / 240,
  miou: 0.5 * (56 / 120 + 120 / 152),
  note: "Authored numeric fixture. Not trail accuracy.",
} as const

export interface MathLogRow {
  schema: "itdx-trail-math-log/v1"
  live: false
  forecast_p: null
  at: string
  loop: number
  video_time_s: number
  native_frame: number
  overlay_tick: number
  source_fps: typeof PXL_SOURCE_FPS
  overlay_hz_target: typeof OVERLAY_HZ_TARGET
  overlay_hz_measured: number
  navigation_status: "HOLD"
  actor: ActorMode
  path_bearing_deg: number
  path_length_px: number
  perimeter_px: number
  step_count: number
  ade20k: Ade20kFraction | null
  detector_status: string
  detection_count: number
  formspace_cell?: number
  novelty_r?: number
  elapsed_ell?: number
  avani?: "DENY" | "PAUSE" | "PASS" | "REVIEW"
  nlm_weights_sha256?: string | null
  nlm_abstained?: boolean
  sim?: boolean
  mode?: "SIMULATION" | "REAL"
  temperature_c?: number
  humidity_pct?: number
  pressure_hpa?: number
  gas_resistance_ohm?: number
  iaq?: number
  fci_strength?: number
  audio_level?: number
  depth_m?: number
  gps_lat?: number
  gps_lon?: number
}

export function nativeFrameIndex(timeS: number): number {
  return Math.max(0, Math.min(PXL_NATIVE_FRAMES - 1, Math.round(timeS * PXL_SOURCE_FPS)))
}

export function ade20kAtTime(timeS: number): Ade20kFraction {
  let best = ADE20K_PXL_RECEIPT[0]
  for (const row of ADE20K_PXL_RECEIPT) {
    if (Math.abs(row.t - timeS) < Math.abs(best.t - timeS)) best = row
  }
  return best
}

export function hypothesizeAlternate(width: number, height: number, tNorm: number): [number, number][] {
  const pts: [number, number][] = []
  const sway = Math.cos(tNorm * Math.PI * 2) * width * 0.09
  for (let i = 0; i < 5; i += 1) {
    const u = (i + 1) / 6
    pts.push([width * 0.42 + sway * (1 - u), height * (0.9 - u * 0.48)])
  }
  return pts
}

export interface TrailDetection {
  detection_id: string
  class_name: string
  bbox_xyxy: [number, number, number, number]
  score: number
  score_kind: "UNCALIBRATED_DETECTOR_SCORE"
  source: "yolo26-sahi" | "NOT_SUPPLIED"
}

export interface TrailStep {
  id: string
  foot: "L" | "R"
  index: number
  x: number
  y: number
  angle_rad: number
  state: "HYPOTHESIS" | "REJECT"
  bearing_deg: number
  step_length_px: number
  depth_status: "UNQUALIFIED"
  footing: "UNQUALIFIED"
}

export interface TrailPath {
  steps: TrailStep[]
  polyline: [number, number][]
  perimeter: [number, number][]
  bearing_deg: number
  length_px: number
  perimeter_px: number
  origin: "IMAGE_GEOMETRY_HYPOTHESIS"
}

export interface TrailFramePass {
  video_time_s: number
  input_sha256: string
  detections: TrailDetection[]
  path: TrailPath
  detector_status: "NOT_SUPPLIED" | "SIDECAR_UNBOUND" | "INFERRED"
  model_name: string | null
}

export interface TrailLoopPass {
  loop: number
  at: string
  duration_s: number
  sample_count: number
  sample_mode: "FULL_FILE"
  frames: TrailFramePass[]
  reused_from_session: boolean
}

export interface TrailSession {
  schema: typeof TRAIL_AR_SCHEMA
  live: false
  banner: typeof TRAIL_AR_BANNER
  forecast_p: null
  bound_to_ollama: false
  video_name: string
  video_src: string
  video_sha256: string | null
  duration_s: number
  loop_count: number
  passes: TrailLoopPass[]
}

export interface SensorBind {
  id: string
  label: string
  bind: "BOUND" | "UNBOUND"
  detail: string
}

export function emptySession(videoSrc: string, videoName: string): TrailSession {
  return {
    schema: TRAIL_AR_SCHEMA,
    live: false,
    banner: TRAIL_AR_BANNER,
    forecast_p: null,
    bound_to_ollama: false,
    video_name: videoName,
    video_src: videoSrc,
    video_sha256: null,
    duration_s: 0,
    loop_count: 0,
    passes: [],
  }
}

function hypot(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(bx - ax, by - ay)
}

function perimeterLength(poly: [number, number][]) {
  let n = 0
  for (let i = 0; i < poly.length; i += 1) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    n += hypot(a[0], a[1], b[0], b[1])
  }
  return n
}

/** Image-space pathway hypothesis. Not metric footholds. Not grip/load. */
export function hypothesizePath(width: number, height: number, tNorm: number): TrailPath {
  const steps: TrailStep[] = []
  const polyline: [number, number][] = []
  const count = 6
  const sway = Math.sin(tNorm * Math.PI * 2) * width * 0.04
  for (let i = 0; i < count; i += 1) {
    const u = (i + 1) / (count + 1)
    const x = width * 0.5 + sway * (1 - u) + (i % 2 === 0 ? -width * 0.055 : width * 0.055)
    const y = height * (0.88 - u * 0.52)
    const prev = polyline[polyline.length - 1] ?? [width * 0.5, height * 0.94]
    const angle = Math.atan2(y - prev[1], x - prev[0])
    const bearing = ((angle * 180) / Math.PI + 360) % 360
    const length = hypot(prev[0], prev[1], x, y)
    const reject = i === count - 1
    steps.push({
      id: `step-${i}`,
      foot: i % 2 === 0 ? "L" : "R",
      index: i + 1,
      x,
      y,
      angle_rad: angle,
      state: reject ? "REJECT" : "HYPOTHESIS",
      bearing_deg: bearing,
      step_length_px: length,
      depth_status: "UNQUALIFIED",
      footing: "UNQUALIFIED",
    })
    polyline.push([x, y])
  }
  const half = Math.max(18, width * 0.07)
  const perimeter: [number, number][] = []
  for (const [x, y] of polyline) perimeter.push([x - half, y])
  for (let i = polyline.length - 1; i >= 0; i -= 1) {
    perimeter.push([polyline[i][0] + half, polyline[i][1]])
  }
  const first = polyline[0]
  const last = polyline[polyline.length - 1]
  const bearing_deg =
    first && last ? ((Math.atan2(last[0] - first[0], first[1] - last[1]) * 180) / Math.PI + 360) % 360 : 0
  let length_px = 0
  for (let i = 1; i < polyline.length; i += 1) {
    length_px += hypot(polyline[i - 1][0], polyline[i - 1][1], polyline[i][0], polyline[i][1])
  }
  return {
    steps,
    polyline,
    perimeter,
    bearing_deg,
    length_px,
    perimeter_px: perimeterLength(perimeter),
    origin: "IMAGE_GEOMETRY_HYPOTHESIS",
  }
}

export function classCounts(detections: TrailDetection[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const d of detections) {
    counts[d.class_name] = (counts[d.class_name] ?? 0) + 1
  }
  return counts
}

function arffEscape(value: string) {
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`
}

/** Frozen session features for WEKA Explorer. Not a safety probability. */
export function sessionToArff(session: TrailSession): string {
  const lines = [
    "% SYNTHETIC EXERCISE · live=false · forecast_p=null",
    "% Full-file Trail AR passes only. Do not train J48 as a navigation gate.",
    `@relation ${TRAIL_AR_SCHEMA.replace(/\//g, "_")}`,
    "",
    "@attribute loop_index numeric",
    "@attribute video_time_s numeric",
    "@attribute class_name string",
    "@attribute score numeric",
    "@attribute bbox_x1 numeric",
    "@attribute bbox_y1 numeric",
    "@attribute bbox_x2 numeric",
    "@attribute bbox_y2 numeric",
    "@attribute path_bearing_deg numeric",
    "@attribute step_length_px numeric",
    "@attribute perimeter_px numeric",
    "@attribute step_count numeric",
    "@attribute detector_status string",
    "@attribute sim {true,false}",
    "",
    "@data",
  ]
  for (const pass of session.passes) {
    for (const frame of pass.frames) {
      const det = frame.detections.length ? frame.detections : [null]
      for (const d of det) {
        const row = [
          String(pass.loop),
          frame.video_time_s.toFixed(3),
          arffEscape(d?.class_name ?? "none"),
          d ? d.score.toFixed(4) : "?",
          d ? d.bbox_xyxy[0].toFixed(1) : "?",
          d ? d.bbox_xyxy[1].toFixed(1) : "?",
          d ? d.bbox_xyxy[2].toFixed(1) : "?",
          d ? d.bbox_xyxy[3].toFixed(1) : "?",
          frame.path.bearing_deg.toFixed(2),
          frame.path.steps[0]?.step_length_px.toFixed(2) ?? "?",
          frame.path.perimeter_px.toFixed(2),
          String(frame.path.steps.length),
          arffEscape(frame.detector_status),
          "true",
        ]
        lines.push(row.join(","))
      }
    }
  }
  if (session.passes.every((p) => p.frames.length === 0)) {
    lines.push("0,0,none,?,?,?,?,?,?,?,?,?,NOT_SUPPLIED,true")
  }
  return `${lines.join("\n")}\n`
}

export function fnv1a32(text: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return `fnv1a32-${(h >>> 0).toString(16).padStart(8, "0")}`
}

export function hashMathRow(row: MathLogRow): string {
  return fnv1a32(
    JSON.stringify({
      loop: row.loop,
      native_frame: row.native_frame,
      video_time_s: row.video_time_s,
      path_bearing_deg: row.path_bearing_deg,
      perimeter_px: row.perimeter_px,
      detection_count: row.detection_count,
    }),
  )
}

/** Per-frame WEKA table. class_label stays ? until an independent reviewer scores it. */
export function mathLogsToArff(rows: MathLogRow[], seed: string): string {
  const header = [
    "% SYNTHETIC EXERCISE · live=false · forecast_p=null",
    `% source_fps=${PXL_SOURCE_FPS} overlay_hz_target=${OVERLAY_HZ_TARGET}`,
    `% video_sha256=${PXL_ORIGINAL_SHA256}`,
    `% reproducible_seed=${seed}`,
    "% class_label is missing (?) until independent ground truth exists.",
    "% Do not train J48 as a navigation-safety gate.",
    "@relation itdx_trail_math_log_v1",
    "",
    "@attribute loop numeric",
    "@attribute native_frame numeric",
    "@attribute video_time_s numeric",
    "@attribute overlay_hz_measured numeric",
    "@attribute path_bearing_deg numeric",
    "@attribute path_length_px numeric",
    "@attribute perimeter_px numeric",
    "@attribute step_count numeric",
    "@attribute earth_pct numeric",
    "@attribute tree_pct numeric",
    "@attribute rock_pct numeric",
    "@attribute plant_pct numeric",
    "@attribute detection_count numeric",
    "@attribute formspace_cell numeric",
    "@attribute novelty_r numeric",
    "@attribute elapsed_ell numeric",
    "@attribute avani string",
    "@attribute nlm_weights_sha256 string",
    "@attribute sim {true,false}",
    "@attribute temperature_c numeric",
    "@attribute humidity_pct numeric",
    "@attribute pressure_hpa numeric",
    "@attribute gas_resistance_ohm numeric",
    "@attribute iaq numeric",
    "@attribute fci_strength numeric",
    "@attribute audio_level numeric",
    "@attribute depth_m numeric",
    "@attribute gps_lat numeric",
    "@attribute gps_lon numeric",
    "@attribute row_hash string",
    "@attribute class_label {unscored}",
    "",
    "@data",
  ]
  const data = rows.map((row) => {
    const earth = row.ade20k?.classes.earth ?? "?"
    const tree = row.ade20k?.classes.tree ?? "?"
    const rock = row.ade20k?.classes.rock ?? "?"
    const plant = row.ade20k?.classes.plant ?? "?"
    return [
      row.loop,
      row.native_frame,
      row.video_time_s.toFixed(4),
      row.overlay_hz_measured.toFixed(2),
      row.path_bearing_deg.toFixed(3),
      row.path_length_px.toFixed(2),
      row.perimeter_px.toFixed(2),
      row.step_count,
      typeof earth === "number" ? earth.toFixed(3) : "?",
      typeof tree === "number" ? tree.toFixed(3) : "?",
      typeof rock === "number" ? rock.toFixed(3) : "?",
      typeof plant === "number" ? plant.toFixed(3) : "?",
      row.detection_count,
      row.formspace_cell ?? "?",
      row.novelty_r != null ? row.novelty_r.toFixed(4) : "?",
      row.elapsed_ell != null ? row.elapsed_ell.toFixed(6) : "?",
      arffEscape(row.avani ?? "PAUSE"),
      arffEscape(row.nlm_weights_sha256 ?? "unbound"),
      row.sim === false ? "false" : "true",
      row.temperature_c != null ? row.temperature_c.toFixed(3) : "?",
      row.humidity_pct != null ? row.humidity_pct.toFixed(3) : "?",
      row.pressure_hpa != null ? row.pressure_hpa.toFixed(3) : "?",
      row.gas_resistance_ohm != null ? row.gas_resistance_ohm.toFixed(1) : "?",
      row.iaq != null ? row.iaq.toFixed(3) : "?",
      row.fci_strength != null ? row.fci_strength.toFixed(3) : "?",
      row.audio_level != null ? row.audio_level.toFixed(3) : "?",
      row.depth_m != null ? row.depth_m.toFixed(3) : "?",
      row.gps_lat != null ? row.gps_lat.toFixed(6) : "?",
      row.gps_lon != null ? row.gps_lon.toFixed(6) : "?",
      arffEscape(hashMathRow(row)),
      "?",
    ].join(",")
  })
  if (!data.length) {
    data.push("0,0,0,0,0,0,0,0,?,?,?,?,0,?,?,?,'PAUSE','unbound',true,?,?,?,?,?,?,?,?,?,?,'none',?")
  }
  return `${header.join("\n")}\n${data.join("\n")}\n`
}

/** Runbook §3 prediction ARFF: p_background, p_candidate, actual. Abstention is ?,? not 0.5. */
export function mathLogsToPredictionArff(rows: MathLogRow[], seed: string): string {
  const header = [
    "% SYNTHETIC EXERCISE · live=false",
    "% Prediction ARFF (WEKA runbook §3). Do NOT train J48 on these columns.",
    "% actual=? means no known outcome — accuracy cannot be scored.",
    `% reproducible_seed=${seed}`,
    "@relation itdx_trail_predictions_v1",
    "",
    "@attribute native_frame numeric",
    "@attribute video_time_s numeric",
    "@attribute p_background numeric",
    "@attribute p_candidate numeric",
    "@attribute actual {background,candidate}",
    "",
    "@data",
  ]
  const data = rows.map((row) =>
    [row.native_frame, row.video_time_s.toFixed(4), "?", "?", "?"].join(","),
  )
  if (!data.length) data.push("0,0,?,?,?")
  return `${header.join("\n")}\n${data.join("\n")}\n`
}

export function improvePathWithTerrain(path: TrailPath, earthPct: number | undefined): TrailPath {
  const earth = earthPct ?? 0
  const widen = 1 + Math.min(0.45, earth / 220)
  const perimeter = path.perimeter.map(([x, y], i) => {
    const inward = i < path.perimeter.length / 2 ? -1 : 1
    return [x + inward * (widen - 1) * 12, y] as [number, number]
  })
  return { ...path, perimeter, perimeter_px: perimeterLength(perimeter) }
}

export const BOOT_OUTLINE: [number, number][] = [
  [0.32, 0.08],
  [0.68, 0.08],
  [0.72, 0.38],
  [0.86, 0.62],
  [0.72, 0.92],
  [0.28, 0.92],
  [0.16, 0.64],
  [0.3, 0.38],
]
