/** Authored 35-cell BlueSight geometry fixture. SYNTHETIC EXERCISE. No safety probability. */

export const BLUESIGHT_TRAIL_SCHEMA = "bluesight-trail-result/v1" as const
export const SCENARIO_SIM_SCHEMA = "fusarium-scenario-sim/v1" as const

export interface ContactPatch {
  id: string
  cell: [number, number]
  center: [number, number, number]
  polygon: number[][]
  point_count: number
  sample_coverage: number
  slope_deg: number
  max_plane_residual_m: number
  plane_coefficients_local_xy: number[]
  state: "GEOMETRY_CANDIDATE" | "REJECT"
  reasons: string[]
  grip_coefficient: null
  load_capacity_n: null
  stability_probability: null
  safe_to_step: null
}

export interface TrailAnalysis {
  schema: typeof BLUESIGHT_TRAIL_SCHEMA
  video_time_s: number
  data_origin: string
  input_sha256: string
  result_sha256: string
  patches: ContactPatch[]
  depth_status: "NO_DEPTH" | "SYNTHETIC_GEOMETRY" | "MEASURED_GEOMETRY"
  navigation_status: "HOLD" | "REVIEW_CANDIDATES"
  safe_to_travel_probability: null
  actuator_command: null
  nlm: { terrain_chart_qualified: false; forecast_p: null; bound_to_ollama: false }
  reasons: string[]
  live: false
  banner: "SYNTHETIC EXERCISE"
  detector: { status: "NOT_SUPPLIED" }
  ouster: { status: "NOT_SUPPLIED" }
}

const FOOT = { length_m: 0.28, width_m: 0.12, margin_m: 0.04, max_slope_deg: 20, max_residual_m: 0.02 }

function sha256Sync(text: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return `fnv1a32-${(h >>> 0).toString(16).padStart(8, "0")}`
}

function lstsqPlane(xs: number[], ys: number[], zs: number[], cx: number, cy: number) {
  const n = xs.length
  let sxx = 0
  let sxy = 0
  let syy = 0
  let sxz = 0
  let syz = 0
  let sz = 0
  for (let i = 0; i < n; i += 1) {
    const x = xs[i] - cx
    const y = ys[i] - cy
    sxx += x * x
    sxy += x * y
    syy += y * y
    sxz += x * zs[i]
    syz += y * zs[i]
    sz += zs[i]
  }
  const a00 = sxx
  const a01 = sxy
  const a02 = 0
  const a10 = sxy
  const a11 = syy
  const a12 = 0
  const a20 = 0
  const a21 = 0
  const a22 = n
  const det = a00 * (a11 * a22 - a12 * a21) - a01 * (a10 * a22 - a12 * a20) + a02 * (a10 * a21 - a11 * a20)
  const rank = Math.abs(det) > 1e-12 ? 3 : 2
  const invDet = rank === 3 ? 1 / det : 0
  const b0 = sxz
  const b1 = syz
  const b2 = sz
  const a = rank === 3 ? invDet * ((a11 * a22 - a12 * a21) * b0 - (a01 * a22 - a02 * a21) * b1 + (a01 * a12 - a02 * a11) * b2) : 0
  const b = rank === 3 ? invDet * (-(a10 * a22 - a12 * a20) * b0 + (a00 * a22 - a02 * a20) * b1 - (a00 * a12 - a02 * a10) * b2) : 0
  const c = rank === 3 ? sz / n : zs.reduce((s, z) => s + z, 0) / n
  let residual = 0
  for (let i = 0; i < n; i += 1) {
    residual = Math.max(residual, Math.abs(zs[i] - (a * (xs[i] - cx) + b * (ys[i] - cy) + c)))
  }
  return { a, b, c, residual, rank }
}

function buildFixturePoints() {
  const points: [number, number, number][] = []
  for (let ix = -2; ix <= 2; ix += 1) {
    for (let iy = 3; iy <= 9; iy += 1) {
      for (let i = 0; i < 12; i += 1) {
        for (let j = 0; j < 12; j += 1) {
          const x = (ix + (i + 0.5) / 12) * 0.4
          const y = (iy + (j + 0.5) / 12) * 0.4
          const z = ix === 1 && (iy === 5 || iy === 6) ? 0.5 * (x - ix * 0.4) : 0
          points.push([x, y, z])
        }
      }
    }
  }
  return points
}

function supportPatches(points: [number, number, number][]): ContactPatch[] {
  const cell = 0.4
  const groups = new Map<string, [number, number, number][]>()
  for (const p of points) {
    const key = `${Math.floor(p[0] / cell)},${Math.floor(p[1] / cell)}`
    const list = groups.get(key) ?? []
    list.push(p)
    groups.set(key, list)
  }
  const patches: ContactPatch[] = []
  for (const [key, values] of [...groups.entries()].sort()) {
    const [ix, iy] = key.split(",").map(Number) as [number, number]
    const cx = (ix + 0.5) * cell
    const cy = (iy + 0.5) * cell
    const xs = values.map((v) => v[0])
    const ys = values.map((v) => v[1])
    const zs = values.map((v) => v[2])
    const fit = lstsqPlane(xs, ys, zs, cx, cy)
    const slope = (Math.atan(Math.hypot(fit.a, fit.b)) * 180) / Math.PI
    const bins = new Set<string>()
    for (const v of values) {
      const bx = Math.min(3, Math.max(0, Math.floor(((v[0] / cell) - ix) * 4)))
      const by = Math.min(3, Math.max(0, Math.floor(((v[1] / cell) - iy) * 4)))
      bins.add(`${bx},${by}`)
    }
    const coverage = bins.size / 16
    const reasons: string[] = []
    if (values.length < 24 || fit.rank < 3 || coverage < 1) reasons.push("INCOMPLETE_SURFACE_SAMPLING")
    if (slope > FOOT.max_slope_deg) reasons.push("SLOPE_LIMIT")
    if (fit.residual > FOOT.max_residual_m) reasons.push("ROUGHNESS_OR_MULTILAYER_SURFACE")
    const hx = FOOT.width_m / 2 + FOOT.margin_m
    const hy = FOOT.length_m / 2 + FOOT.margin_m
    const loX = Math.min(...xs)
    const hiX = Math.max(...xs)
    const loY = Math.min(...ys)
    const hiY = Math.max(...ys)
    if (loX > cx - hx || hiX < cx + hx || loY > cy - hy || hiY < cy + hy) reasons.push("FOOTPRINT_NOT_CONTAINED")
    const corners = [
      [cx - hx, cy - hy, fit.c + fit.a * -hx + fit.b * -hy],
      [cx + hx, cy - hy, fit.c + fit.a * hx + fit.b * -hy],
      [cx + hx, cy + hy, fit.c + fit.a * hx + fit.b * hy],
      [cx - hx, cy + hy, fit.c + fit.a * -hx + fit.b * hy],
    ]
    patches.push({
      id: `patch-${ix}-${iy}`,
      cell: [ix, iy],
      center: [cx, cy, fit.c],
      polygon: corners,
      point_count: values.length,
      sample_coverage: coverage,
      slope_deg: slope,
      max_plane_residual_m: fit.residual,
      plane_coefficients_local_xy: [fit.a, fit.b, fit.c],
      state: reasons.length ? "REJECT" : "GEOMETRY_CANDIDATE",
      reasons,
      grip_coefficient: null,
      load_capacity_n: null,
      stability_probability: null,
      safe_to_step: null,
    })
  }
  return patches
}

export function runGeometryFixture(): TrailAnalysis {
  const points = buildFixturePoints()
  const patches = supportPatches(points)
  const candidates = patches.filter((p) => p.state === "GEOMETRY_CANDIDATE").length
  const payload = {
    schema: BLUESIGHT_TRAIL_SCHEMA,
    video_time_s: 0,
    data_origin: "SYNTHETIC_FIXTURE",
    patches,
    depth_status: "SYNTHETIC_GEOMETRY" as const,
    navigation_status: candidates > 0 ? ("REVIEW_CANDIDATES" as const) : ("HOLD" as const),
    safe_to_travel_probability: null,
    actuator_command: null,
    nlm: { terrain_chart_qualified: false as const, forecast_p: null, bound_to_ollama: false as const },
    reasons: [
      "Authored 35-cell plane fixture. Not a mountain-trail performance estimate.",
      "Grip, load bearing, balance, and swept volume remain unqualified.",
    ],
    live: false as const,
    banner: "SYNTHETIC EXERCISE" as const,
    detector: { status: "NOT_SUPPLIED" as const },
    ouster: { status: "NOT_SUPPLIED" as const },
  }
  const hash = sha256Sync(JSON.stringify({ cells: patches.map((p) => [p.id, p.state, p.slope_deg]) }))
  return { ...payload, input_sha256: hash, result_sha256: hash }
}

export function videoOnlyHold(videoTimeS: number, inputSha: string): TrailAnalysis {
  return {
    schema: BLUESIGHT_TRAIL_SCHEMA,
    video_time_s: videoTimeS,
    data_origin: "PHONE_VIDEO_ONLY",
    input_sha256: inputSha,
    result_sha256: inputSha,
    patches: [],
    depth_status: "NO_DEPTH",
    navigation_status: "HOLD",
    safe_to_travel_probability: null,
    actuator_command: null,
    nlm: { terrain_chart_qualified: false, forecast_p: null, bound_to_ollama: false },
    reasons: ["Video-only: no metric ground surface, foot placement or wheel clearance is asserted"],
    live: false,
    banner: "SYNTHETIC EXERCISE",
    detector: { status: "NOT_SUPPLIED" },
    ouster: { status: "NOT_SUPPLIED" },
  }
}
