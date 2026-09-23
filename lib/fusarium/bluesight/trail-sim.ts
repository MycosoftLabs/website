/** Bounded SIMULATION traces locked to PXL currentTime. Never live COP. */

import { PXL_DURATION_S } from "@/lib/fusarium/bluesight/trail-ar"

export type TrailMode = "SIMULATION" | "REAL"

export interface SimChannel {
  id: string
  label: string
  value: number
  unit: string
  lo: number
  hi: number
  source: "simulation"
}

export interface SimTrack {
  title: string
  kind: "earth" | "rock" | "plant" | "tree"
  /** Normalized 0–1 in the video frame. */
  x: number
  y: number
  w: number
  h: number
  range_m: number
  label: string
}

export interface SimFrame {
  mode: "SIMULATION"
  live: false
  source: "simulation"
  video_time_s: number
  t_norm: number
  nlm: {
    temperature_c: SimChannel
    humidity_pct: SimChannel
    pressure_hpa: SimChannel
    gas_resistance_ohm: SimChannel
    iaq: SimChannel
    fci_strength: SimChannel
    audio_level: SimChannel
  }
  depth_m: SimChannel
  lidar_near_m: SimChannel
  lidar_far_m: SimChannel
  imu_tilt_deg: SimChannel
  step_cadence_hz: SimChannel
  voc_ppb: SimChannel
  bme688_res_ohm: SimChannel
  bme690_res_ohm: SimChannel
  radar_presence: SimChannel
  wifi_sense: SimChannel
  gps: { lat: number; lon: number; source: "simulation"; note: string }
  tracks: SimTrack[]
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

function wave(t: number, period: number, phase = 0) {
  return Math.sin((t / period) * Math.PI * 2 + phase)
}

function ch(id: string, label: string, value: number, unit: string, lo: number, hi: number): SimChannel {
  return { id, label, value: clamp(value, lo, hi), unit, lo, hi, source: "simulation" }
}

/** Short walk near Fort Stewart AO. Public AO only. Labeled simulation. */
const GPS0 = { lat: 31.8762, lon: -81.6134 }

export function simulateAtTime(timeS: number): SimFrame {
  const t = clamp(timeS, 0, PXL_DURATION_S)
  const u = t / PXL_DURATION_S
  const temp = 22.4 + 1.6 * wave(t, 9.5)
  const rh = 58 + 8 * wave(t, 11, 0.4)
  const press = 1013.2 + 1.1 * wave(t, 14, 1.1)
  const gas = 142000 + 18000 * wave(t, 8, 0.7)
  const iaq = 38 + 12 * wave(t, 10, 0.2)
  const fci = 14 + 9 * wave(t, 7, 1.6)
  const audio = 48 + 9 * wave(t, 3.2, 0.3)
  const depth = 4.2 + 3.1 * wave(t, 5.5) + u * 2.4
  const near = 0.55 + 0.25 * wave(t, 1.1)
  const far = 16.5 + 4.2 * wave(t, 6.5, 0.8)
  const tilt = 6 + 4 * wave(t, 2.4) + 2 * wave(t, 0.8, 1)
  const cadence = 1.55 + 0.15 * wave(t, 4)
  const voc = 180 + 70 * wave(t, 12, 0.5)
  const bme688 = 118000 + 22000 * wave(t, 9, 0.2)
  const bme690 = 126000 + 19000 * wave(t, 8.5, 1.3)
  const radar = 0.22 + 0.18 * Math.max(0, wave(t, 4.5))
  const wifi = 0.18 + 0.16 * Math.max(0, wave(t, 5.2, 0.9))

  const sway = 0.035 * wave(t, PXL_DURATION_S)
  const tracks: SimTrack[] = [
    {
      title: "EARTH TRAIL",
      kind: "earth",
      x: 0.28 + sway,
      y: 0.58,
      w: 0.44,
      h: 0.34,
      range_m: clamp(depth, 0.3, 25),
      label: "earth · ADE20K appearance",
    },
    {
      title: "ROCK",
      kind: "rock",
      x: 0.58 + sway * 0.6,
      y: 0.62 + 0.02 * wave(t, 7),
      w: 0.2,
      h: 0.16,
      range_m: clamp(2.1 + 0.6 * wave(t, 6), 0.3, 25),
      label: "rock perimeter · unknown / not in MINDEX",
    },
    {
      title: "PLANT",
      kind: "plant",
      x: 0.08,
      y: 0.22 + 0.03 * wave(t, 8, 0.4),
      w: 0.22,
      h: 0.28,
      range_m: clamp(3.4 + 0.8 * wave(t, 5), 0.3, 25),
      label: "plant · unknown / not in MINDEX",
    },
    {
      title: "TREE",
      kind: "tree",
      x: 0.66,
      y: 0.08,
      w: 0.28,
      h: 0.36,
      range_m: clamp(8.5 + 1.4 * wave(t, 9, 1), 0.3, 25),
      label: "tree · unknown / not in MINDEX",
    },
  ]

  return {
    mode: "SIMULATION",
    live: false,
    source: "simulation",
    video_time_s: t,
    t_norm: u,
    nlm: {
      temperature_c: ch("temperature", "Temperature", temp, "°C", 18, 28),
      humidity_pct: ch("humidity", "Humidity", rh, "%RH", 45, 75),
      pressure_hpa: ch("pressure", "Pressure", press, "hPa", 1008, 1018),
      gas_resistance_ohm: ch("gas_resistance", "Gas resistance", gas, "Ω", 80000, 200000),
      iaq: ch("iaq", "IAQ index", iaq, "IAQ", 20, 80),
      fci_strength: ch("fci_strength", "FCI summary", fci, "arb", 0, 40),
      audio_level: ch("audio_level", "Audio level", audio, "dB-eq", 35, 65),
    },
    depth_m: ch("depth", "ToF / depth (path)", depth, "m", 0.3, 25),
    lidar_near_m: ch("lidar_near", "LiDAR-like near", near, "m", 0.3, 3),
    lidar_far_m: ch("lidar_far", "LiDAR-like far", far, "m", 8, 25),
    imu_tilt_deg: ch("imu_tilt", "IMU tilt", tilt, "deg", 0, 18),
    step_cadence_hz: ch("cadence", "Step cadence", cadence, "Hz", 1.2, 1.9),
    voc_ppb: ch("voc", "VOC", voc, "ppb", 80, 320),
    bme688_res_ohm: ch("bme688", "BME688-like", bme688, "Ω", 80000, 200000),
    bme690_res_ohm: ch("bme690", "BME690-like", bme690, "Ω", 80000, 200000),
    radar_presence: ch("radar", "Radar presence", radar, "score", 0, 0.6),
    wifi_sense: ch("wifi", "WiFi Sense", wifi, "score", 0, 0.55),
    gps: {
      lat: GPS0.lat + u * 0.00018,
      lon: GPS0.lon + u * 0.00009,
      source: "simulation",
      note: "Simulated short track near Fort Stewart AO. Not EXIF. Not a live fix.",
    },
    tracks,
  }
}

export function simChannelList(frame: SimFrame): SimChannel[] {
  return [
    frame.nlm.temperature_c,
    frame.nlm.humidity_pct,
    frame.nlm.pressure_hpa,
    frame.nlm.gas_resistance_ohm,
    frame.nlm.iaq,
    frame.nlm.fci_strength,
    frame.nlm.audio_level,
    frame.depth_m,
    frame.lidar_near_m,
    frame.lidar_far_m,
    frame.imu_tilt_deg,
    frame.step_cadence_hz,
    frame.voc_ppb,
    frame.bme688_res_ohm,
    frame.bme690_res_ohm,
    frame.radar_presence,
    frame.wifi_sense,
  ]
}
