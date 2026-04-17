/**
 * CCTV Registry
 *
 * In-memory registry of CCTV camera assets for the CREP dashboard. Cameras
 * are permanent map assets (single lat/lng with viewing direction + field
 * of view) that can display live video when selected.
 *
 * Architectural rule (Morgan, 2026-04-17):
 *   - Camera LOCATIONS are permanent map assets (do not re-fetch per pan).
 *   - Camera STREAM URLs may be live RTSP/HLS feeds when selected.
 *   - CCTV register issues a device token (same pattern as SDR vessel
 *     receiver) so operators can POST camera registrations and keep-alive
 *     status updates.
 *
 * Future (not in this file — deferred to MINDEX integration):
 *   - Persistence to MINDEX `cctv_cameras` table
 *   - AI visual model hookup for live frame analysis (validate infra /
 *     aircraft / satellite / nature observations against what the camera
 *     actually sees)
 *   - Historical frame archive + hover-preview
 *
 * Non-durable: tokens + cameras clear on container restart. Re-register
 * after a deploy.
 */

import crypto from "node:crypto"

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

export type CctvStreamProtocol = "rtsp" | "hls" | "dash" | "mjpeg" | "webrtc" | "iframe"

export interface CctvCamera {
  id: string
  /** Human-readable label shown in the widget */
  name: string
  /** Free-form description (model, mount location, etc.) */
  description?: string
  /** WGS84 coordinates of the camera mount */
  lat: number
  lng: number
  /** Elevation above ground level (meters), optional */
  altitudeM?: number
  /** Compass bearing of the lens center (deg, 0=N, 90=E) — optional */
  bearingDeg?: number | null
  /** Horizontal field of view in degrees — optional */
  fovDeg?: number | null
  /** Max distance in meters at which the camera can usefully resolve detail */
  rangeM?: number | null
  /** Stream protocol */
  streamProtocol: CctvStreamProtocol
  /** Public stream URL (may be null if stream is private and requires auth) */
  streamUrl?: string | null
  /** Whether this camera has audio */
  hasAudio?: boolean
  /** Whether this camera can pan/tilt/zoom */
  ptz?: boolean
  /** Operator / owner (e.g. "DOT", "Smith family", "Mycosoft") */
  operator?: string
  /** Tags for filtering — e.g. ["traffic","weather","wildlife","security"] */
  tags?: string[]
  /** When the camera went online */
  firstSeenAt: string
  /** Last keep-alive or status update */
  lastSeenAt: string
  /** Registered = operator-owned SDR camera; Scraped = from public CCTV directory */
  provenance: "registered" | "scraped" | "official"
  /** ID of the SDR/operator that registered this camera, if any */
  deviceId?: string
}

export interface CctvDevice {
  id: string
  token: string
  name: string
  operator?: string
  registeredAt: string
  lastSeenAt?: string
  cameraCount: number
}

// ─────────────────────────────────────────────────────────────────────
// Device registry (for operators pushing their own CCTV feeds)
// ─────────────────────────────────────────────────────────────────────

const devices = new Map<string /* token */, CctvDevice>()
const DEVICE_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export function registerCctvDevice(init: {
  name: string
  operator?: string
}): CctvDevice {
  const token = `cctv_${crypto.randomBytes(24).toString("base64url")}`
  const id = `cctv-op-${crypto.randomBytes(6).toString("hex")}`
  const device: CctvDevice = {
    id,
    token,
    name: init.name,
    operator: init.operator,
    registeredAt: new Date().toISOString(),
    cameraCount: 0,
  }
  devices.set(token, device)
  return device
}

export function isCctvTokenValid(token: string): boolean {
  if (!token || !devices.has(token)) return false
  const d = devices.get(token)!
  if (Date.now() - new Date(d.registeredAt).getTime() > DEVICE_TOKEN_TTL_MS) {
    devices.delete(token)
    return false
  }
  return true
}

export function listCctvDevices(): Array<Omit<CctvDevice, "token"> & { tokenPrefix: string }> {
  return Array.from(devices.values()).map((d) => ({
    ...d,
    token: undefined as any,
    tokenPrefix: d.token.slice(0, 12) + "…",
  }))
}

// ─────────────────────────────────────────────────────────────────────
// Camera registry
// ─────────────────────────────────────────────────────────────────────

const cameras = new Map<string /* camera id */, CctvCamera>()

export interface RegisterCameraInput {
  /** Client-provided camera ID. If omitted, one is generated */
  id?: string
  name: string
  description?: string
  lat: number
  lng: number
  altitudeM?: number
  bearingDeg?: number | null
  fovDeg?: number | null
  rangeM?: number | null
  streamProtocol: CctvStreamProtocol
  streamUrl?: string | null
  hasAudio?: boolean
  ptz?: boolean
  operator?: string
  tags?: string[]
  provenance?: "registered" | "scraped" | "official"
  /** Token of the operator device registering this camera, if any */
  deviceToken?: string
}

export function registerCamera(input: RegisterCameraInput): CctvCamera | { error: string } {
  // Validate coords
  const lat = Number(input.lat)
  const lng = Number(input.lng)
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 || lat > 90 ||
    lng < -180 || lng > 180 ||
    (lat === 0 && lng === 0)
  ) {
    return { error: "Invalid coordinates (lat -90..90, lng -180..180, not 0/0)" }
  }
  if (!input.name?.trim()) {
    return { error: "Missing camera name" }
  }
  if (!input.streamProtocol) {
    return { error: "Missing streamProtocol (rtsp|hls|dash|mjpeg|webrtc|iframe)" }
  }

  const id = input.id || `cam-${crypto.randomBytes(8).toString("hex")}`
  const now = new Date().toISOString()

  let deviceId: string | undefined
  if (input.deviceToken) {
    const d = devices.get(input.deviceToken)
    if (d) {
      deviceId = d.id
      d.cameraCount += 1
      d.lastSeenAt = now
    }
  }

  const existing = cameras.get(id)
  const camera: CctvCamera = {
    id,
    name: input.name.trim(),
    description: input.description?.trim(),
    lat,
    lng,
    altitudeM: input.altitudeM,
    bearingDeg: input.bearingDeg ?? null,
    fovDeg: input.fovDeg ?? null,
    rangeM: input.rangeM ?? null,
    streamProtocol: input.streamProtocol,
    streamUrl: input.streamUrl ?? null,
    hasAudio: input.hasAudio ?? false,
    ptz: input.ptz ?? false,
    operator: input.operator,
    tags: input.tags?.map((t) => t.trim()).filter(Boolean) ?? [],
    firstSeenAt: existing?.firstSeenAt ?? now,
    lastSeenAt: now,
    provenance: input.provenance ?? (deviceId ? "registered" : "official"),
    deviceId,
  }
  cameras.set(id, camera)
  return camera
}

export function touchCamera(id: string): boolean {
  const cam = cameras.get(id)
  if (!cam) return false
  cam.lastSeenAt = new Date().toISOString()
  return true
}

export function getCamera(id: string): CctvCamera | undefined {
  return cameras.get(id)
}

export function listCameras(filter?: {
  bbox?: { north: number; south: number; east: number; west: number }
  tags?: string[]
  operator?: string
}): CctvCamera[] {
  let list = Array.from(cameras.values())
  if (filter?.bbox) {
    const b = filter.bbox
    list = list.filter((c) => c.lat >= b.south && c.lat <= b.north && c.lng >= b.west && c.lng <= b.east)
  }
  if (filter?.tags?.length) {
    const want = new Set(filter.tags.map((t) => t.toLowerCase()))
    list = list.filter((c) => c.tags?.some((t) => want.has(t.toLowerCase())))
  }
  if (filter?.operator) {
    const op = filter.operator.toLowerCase()
    list = list.filter((c) => c.operator?.toLowerCase() === op)
  }
  return list
}

export function deleteCamera(id: string): boolean {
  return cameras.delete(id)
}

export function getCctvRegistryStats(): {
  cameras: number
  devices: number
  byProvenance: Record<string, number>
  byProtocol: Record<string, number>
} {
  const byProvenance: Record<string, number> = {}
  const byProtocol: Record<string, number> = {}
  for (const c of cameras.values()) {
    byProvenance[c.provenance] = (byProvenance[c.provenance] || 0) + 1
    byProtocol[c.streamProtocol] = (byProtocol[c.streamProtocol] || 0) + 1
  }
  return { cameras: cameras.size, devices: devices.size, byProvenance, byProtocol }
}
