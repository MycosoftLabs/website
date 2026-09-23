/** First-person foothold contact planner. Boot soles only. Not a scene labeler. */

import type { PathCorridor } from "@/lib/fusarium/bluesight/path-corridor"
import type { SimFrame } from "@/lib/fusarium/bluesight/trail-sim"

export const CONTACT_REFRESH_MS = 280
export const REJECT_EDGE_CODE = 25
export const REJECT_SLIP_CODE = 27

export type SoleKind = "COMMIT" | "SLOPE" | "GRIP" | "EDGE" | "SLIP"

export interface ContactSole {
  id: string
  foot: "L" | "R"
  stride_index: number
  global_lock: number
  x: number
  y: number
  angle_rad: number
  kind: SoleKind
  color: "green" | "cyan" | "red"
  plate: string | null
  range_m: number
}

export interface ContactFrame {
  banner: "ANALYSING TERRAIN"
  search: "CONTACT SEARCH"
  pips: 0 | 1 | 2 | 3
  soles: ContactSole[]
  vista: { wonderful: true; drop_m: number; danger: boolean } | null
  reject_codes: { edge: typeof REJECT_EDGE_CODE; slip: typeof REJECT_SLIP_CODE; note: string }
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

function sigmoid(z: number) {
  return 1 / (1 + Math.exp(-z))
}

function corridorAt(corr: PathCorridor | null, y: number): { left: number; right: number; center: number } {
  if (!corr?.left.length) return { left: 0.36, right: 0.64, center: 0.5 }
  let best = 0
  let d = 99
  for (let i = 0; i < corr.left.length; i += 1) {
    const dd = Math.abs(corr.left[i][1] - y)
    if (dd < d) {
      d = dd
      best = i
    }
  }
  const L = corr.left[best][0]
  const R = corr.right[best][0]
  return { left: L, right: R, center: (L + R) / 2 }
}

export function planContact(
  timeS: number,
  sim: SimFrame,
  corr: PathCorridor | null,
  nowMs: number,
  locked: { count: number; foot: "L" | "R" },
): ContactFrame {
  const period = 1 / Math.max(1.2, sim.step_cadence_hz.value)
  const stride = Math.floor(timeS / period)
  const phase = (timeS % period) / period
  const swing: "L" | "R" = stride % 2 === 0 ? "L" : "R"
  const heading = corr?.heading_rad ?? -Math.PI / 2
  const pitchUp = sim.imu_tilt_deg.value < 2.2 && sim.lidar_far_m.value > 20
  if (pitchUp) {
    const drop = 180 + sim.lidar_far_m.value * 4
    return {
      banner: "ANALYSING TERRAIN",
      search: "CONTACT SEARCH",
      pips: 3,
      soles: [],
      vista: { wonderful: true, drop_m: drop, danger: drop > 300 },
      reject_codes: {
        edge: REJECT_EDGE_CODE,
        slip: REJECT_SLIP_CODE,
        note: "Reject percents are sticky canned reason codes from the hike-demo grammar, not live scores.",
      },
    }
  }

  const flicker = Math.floor(nowMs / CONTACT_REFRESH_MS)
  const soles: ContactSole[] = []
  const ranges = [0.45, 0.85, 1.25, 1.65]
  let commitY = 0.78

  ranges.forEach((range, i) => {
    const y = clamp(0.88 - range * 0.22, 0.46, 0.9)
    const lane = corridorAt(corr, y)
    const inset = 0.18 * (lane.right - lane.left)
    const foot: "L" | "R" = i % 2 === 0 ? swing : swing === "L" ? "R" : "L"
    const x = foot === "L" ? lane.center - inset : lane.center + inset
    const slope = clamp(sim.imu_tilt_deg.value / 18 + (range - 0.8) * 0.12, 0, 1)
    const grip = clamp(0.62 - sim.radar_presence.value * 0.3 + (flicker % 3) * 0.03, 0.2, 0.9)
    const edge = clamp((0.11 - (lane.right - lane.left)) * 4 + (i === 3 ? 0.35 : 0), 0, 1)
    const slip = sigmoid(1.4 * slope + 1.1 * (1 - grip) + 1.6 * edge)
    const idx = (i % 4) + 1
    let kind: SoleKind = "GRIP"
    let color: ContactSole["color"] = "cyan"
    let plate: string | null = `${foot}${idx} GRIP CHECK ${Math.round(47 + grip * 15)}%`
    if (edge > 0.55) {
      kind = "EDGE"
      color = "red"
      plate = `${foot}${idx} REJECT EDGE ${REJECT_EDGE_CODE}%`
    } else if (slip > 0.62) {
      kind = "SLIP"
      color = "red"
      plate = `${foot}${idx} REJECT SLIP ${REJECT_SLIP_CODE}%`
    } else if (slope > 0.38) {
      kind = "SLOPE"
      color = "cyan"
      plate = `${foot}${idx} SLOPE CHECK ${Math.round(47 + slope * 45)}%`
    } else if (i === 0 && phase > 0.55) {
      kind = "COMMIT"
      color = "green"
      plate = null
      commitY = y
    }
    if (color === "cyan" || color === "red") {
      const salt = (flicker + i + stride) % 5
      if (salt === 0 && kind !== "EDGE" && kind !== "SLIP") {
        plate = `${foot}${idx} SLOPE CHECK ${47 + ((flicker * 7 + i * 11) % 46)}%`
      }
    }
    soles.push({
      id: `sole-${stride}-${i}`,
      foot,
      stride_index: idx,
      global_lock: locked.count,
      x: clamp(x, 0.08, 0.92),
      y,
      angle_rad: heading,
      kind,
      color,
      plate,
      range_m: range,
    })
  })

  const committed = soles.find((s) => s.kind === "COMMIT")
  if (committed) {
    committed.y = commitY
    committed.global_lock = locked.count + (phase > 0.92 ? 1 : 0)
  }

  return {
    banner: "ANALYSING TERRAIN",
    search: "CONTACT SEARCH",
    pips: (Math.floor(timeS * 3) % 4) as 0 | 1 | 2 | 3,
    soles,
    vista: null,
    reject_codes: {
      edge: REJECT_EDGE_CODE,
      slip: REJECT_SLIP_CODE,
      note: "Reject percents are sticky canned reason codes from the hike-demo grammar (EDGE 25, SLIP 27), not live scores.",
    },
  }
}
