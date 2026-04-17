/**
 * SDR Vessel Cache
 *
 * In-memory cache of vessels contributed by user-owned SDR devices
 * (rtl-ais, AIS-catcher, etc.) Lets Mycosoft crowd-source AIS from
 * operators running receivers at sea, harbors, etc.
 *
 * TTL: 5 minutes per vessel (stale drops automatically). Token TTL:
 * 30 days. Neither persists across restarts — register again after a
 * deploy.
 *
 * vessel-registry.ts reads this cache via `getSdrVesselsAsRecords()`
 * as an additional source merged into the multi-source vessel aggregate.
 */

import crypto from "node:crypto"
import type { VesselRecord } from "@/lib/crep/registries/vessel-registry"

// ─────────────────────────────────────────────────────────────────────
// Device registry
// ─────────────────────────────────────────────────────────────────────

export interface SdrDevice {
  id: string
  token: string
  name: string
  operator?: string
  location?: { lat: number; lng: number }
  notes?: string
  registeredAt: string
  lastSeenAt?: string
  messageCount: number
}

const devices = new Map<string /* token */, SdrDevice>()

const DEVICE_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export function registerSdrDevice(init: {
  name: string
  operator?: string
  location?: { lat: number; lng: number }
  notes?: string
  registeredAt: string
}): SdrDevice {
  const token = `sdr_${crypto.randomBytes(24).toString("base64url")}`
  const id = `sdr-${crypto.randomBytes(6).toString("hex")}`
  const device: SdrDevice = {
    id,
    token,
    name: init.name,
    operator: init.operator,
    location: init.location,
    notes: init.notes,
    registeredAt: init.registeredAt,
    messageCount: 0,
  }
  devices.set(token, device)
  return device
}

export function isDeviceTokenValid(token: string): boolean {
  if (!token || !devices.has(token)) return false
  const d = devices.get(token)!
  const age = Date.now() - new Date(d.registeredAt).getTime()
  if (age > DEVICE_TOKEN_TTL_MS) {
    devices.delete(token)
    return false
  }
  return true
}

export function listSdrDevices(): Array<
  Omit<SdrDevice, "token"> & { tokenPrefix: string }
> {
  return Array.from(devices.values()).map((d) => ({
    ...d,
    token: undefined as any,
    tokenPrefix: d.token.slice(0, 10) + "…",
  }))
}

// ─────────────────────────────────────────────────────────────────────
// Vessel cache (keyed by MMSI)
// ─────────────────────────────────────────────────────────────────────

export interface SdrVesselMessage {
  mmsi: string
  lat: number
  lng: number
  /** ISO timestamp of the position fix (from GPS at the SDR) */
  timestamp?: string
  /** Speed over ground in knots */
  sog?: number
  /** Course over ground in degrees */
  cog?: number
  /** True heading in degrees */
  heading?: number
  /** AIS ship type code (0–99) */
  shipType?: number
  /** Destination string if available */
  destination?: string
  /** Ship name */
  name?: string
  /** IMO number */
  imo?: string
  /** Callsign */
  callsign?: string
  /** Navigation status code (0–15) */
  navStatus?: number
}

interface CachedSdrVessel extends SdrVesselMessage {
  deviceId: string
  ingestedAt: number
}

const vessels = new Map<string /* mmsi */, CachedSdrVessel>()

const VESSEL_TTL_MS = 5 * 60 * 1000 // 5 minutes — drops stale tracks

function dropStale() {
  const now = Date.now()
  for (const [mmsi, v] of vessels) {
    if (now - v.ingestedAt > VESSEL_TTL_MS) vessels.delete(mmsi)
  }
}

export function ingestSdrVessels(
  token: string,
  messages: SdrVesselMessage[],
): { accepted: number; rejected: number; reasons: Record<string, number> } {
  const device = devices.get(token)
  if (!device) {
    return {
      accepted: 0,
      rejected: messages.length,
      reasons: { "invalid-token": messages.length },
    }
  }

  dropStale()

  let accepted = 0
  let rejected = 0
  const reasons: Record<string, number> = {}

  for (const m of messages) {
    // Validate MMSI
    const mmsi = String(m.mmsi ?? "").trim()
    if (!mmsi || mmsi === "0" || mmsi.length < 7) {
      rejected++
      reasons["invalid-mmsi"] = (reasons["invalid-mmsi"] || 0) + 1
      continue
    }

    // Validate coords
    const lat = Number(m.lat)
    const lng = Number(m.lng)
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180 ||
      (lat === 0 && lng === 0)
    ) {
      rejected++
      reasons["invalid-coords"] = (reasons["invalid-coords"] || 0) + 1
      continue
    }

    vessels.set(mmsi, {
      ...m,
      mmsi,
      lat,
      lng,
      deviceId: device.id,
      ingestedAt: Date.now(),
    })
    accepted++
  }

  device.messageCount += accepted
  device.lastSeenAt = new Date().toISOString()

  return { accepted, rejected, reasons }
}

export function getSdrVesselCacheStats(): {
  vessels: number
  devices: number
  oldestIngestAgeSec: number | null
} {
  dropStale()
  let oldest: number | null = null
  const now = Date.now()
  for (const v of vessels.values()) {
    const age = (now - v.ingestedAt) / 1000
    if (oldest === null || age > oldest) oldest = age
  }
  return {
    vessels: vessels.size,
    devices: devices.size,
    oldestIngestAgeSec: oldest,
  }
}

/**
 * Called by vessel-registry.ts as an additional data source. Returns all
 * currently cached SDR-contributed vessels formatted as VesselRecords.
 */
export function getSdrVesselsAsRecords(): VesselRecord[] {
  dropStale()
  return Array.from(vessels.values()).map((v) => ({
    id: `sdr_${v.mmsi}`,
    mmsi: v.mmsi,
    name: v.name?.trim() || `MMSI ${v.mmsi}`,
    lat: v.lat,
    lng: v.lng,
    sog: v.sog ?? null,
    cog: v.cog ?? null,
    heading: v.heading ?? null,
    shipType: v.shipType ?? null,
    destination: v.destination ?? null,
    source: "sdr" as const,
    timestamp: v.timestamp ?? new Date(v.ingestedAt).toISOString(),
  }))
}
