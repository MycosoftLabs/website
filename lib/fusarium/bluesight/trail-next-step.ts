/** One live next foothold. Taken prints disappear. Not a stamped path. */

import { PXL_DURATION_S } from "@/lib/fusarium/bluesight/trail-ar"
import type { SimFrame } from "@/lib/fusarium/bluesight/trail-sim"

export interface LiveStep {
  id: string
  index: number
  foot: "L" | "R"
  x: number
  y: number
  angle_rad: number
  taken_at_s: number
  remaining_m: number
  surface: "earth" | "rock"
  state: "NEXT"
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

export function nextSafeStep(timeS: number, sim: SimFrame): LiveStep | null {
  const t = clamp(timeS, 0, PXL_DURATION_S)
  const cadence = sim.step_cadence_hz.value
  const period = 1 / Math.max(1.2, cadence)
  const count = Math.ceil(PXL_DURATION_S / period) + 1
  const walk = t / PXL_DURATION_S
  const sway = 0.03 * Math.sin(walk * Math.PI * 2)
  const tiltPenalty = sim.imu_tilt_deg.value / 40

  for (let i = 0; i < count; i += 1) {
    const takenAt = (i + 0.35) * period
    if (t >= takenAt) continue
    const approach = clamp((takenAt - t) / period, 0, 2)
    const y = clamp(0.86 - approach * 0.22 - tiltPenalty * 0.04, 0.48, 0.9)
    const side = i % 2 === 0 ? -1 : 1
    const x = clamp(0.5 + sway + side * 0.07, 0.34, 0.66)
    return {
      id: `next-${i}`,
      index: i + 1,
      foot: i % 2 === 0 ? "L" : "R",
      x,
      y,
      angle_rad: -Math.PI / 2 + side * 0.12,
      taken_at_s: takenAt,
      remaining_m: clamp(sim.lidar_near_m.value + approach * 0.55, 0.3, 3),
      surface: "earth",
      state: "NEXT",
    }
  }
  return null
}

export function gpsTrack(samples = 48): { lat: number; lon: number }[] {
  const lat0 = 31.8762
  const lon0 = -81.6134
  return Array.from({ length: samples }, (_, i) => {
    const u = i / (samples - 1)
    return { lat: lat0 + u * 0.00018, lon: lon0 + u * 0.00009 }
  })
}
