/**
 * Vessel Disk Cache — survives HMR and AISstream WebSocket drops.
 *
 * AISstream.io WebSocket is unstable (drops every ~30s, retries, stops
 * after 5 fails). When it IS connected, it delivers ~1000-15k vessels.
 * Without persistence, those vessels vanish the moment the stream drops.
 *
 * This module:
 *  - writes every received vessel batch to disk at var/cache/vessels.json
 *  - serves last-known vessels on read when nothing else has data
 *  - ages entries out after VESSEL_MAX_AGE_MS (12 hours) so UI doesn't
 *    show stale vessels at wrong positions forever
 *
 * Keyed by MMSI. Concurrent writes debounced.
 */

import fs from "node:fs"
import path from "node:path"
import type { VesselRecord } from "@/lib/crep/registries/vessel-registry"

const CACHE_DIR = path.resolve(process.cwd(), "var", "cache")
const CACHE_FILE = path.join(CACHE_DIR, "vessels.json")
const VESSEL_MAX_AGE_MS = 12 * 60 * 60 * 1000 // 12h — enough to bridge AIS outages
const WRITE_DEBOUNCE_MS = 5_000

interface CachedVessel extends VesselRecord {
  cached_at: string
}

interface CacheFile {
  version: 1
  written_at: string
  vessels: Record<string, CachedVessel>
}

let memCache: Record<string, CachedVessel> | null = null
let writeTimer: NodeJS.Timeout | null = null
let dirty = false

function ensureDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true })
  }
}

function loadFromDisk(): Record<string, CachedVessel> {
  try {
    if (!fs.existsSync(CACHE_FILE)) return {}
    const raw = fs.readFileSync(CACHE_FILE, "utf8")
    const parsed = JSON.parse(raw) as CacheFile
    if (parsed.version !== 1 || !parsed.vessels) return {}
    return parsed.vessels
  } catch (err) {
    console.warn("[VesselDiskCache] load failed, starting empty:", err)
    return {}
  }
}

function getMemCache(): Record<string, CachedVessel> {
  if (!memCache) memCache = loadFromDisk()
  return memCache
}

function scheduleWrite() {
  dirty = true
  if (writeTimer) return
  writeTimer = setTimeout(() => {
    writeTimer = null
    if (!dirty) return
    dirty = false
    try {
      ensureDir()
      const data: CacheFile = {
        version: 1,
        written_at: new Date().toISOString(),
        vessels: getMemCache(),
      }
      fs.writeFileSync(CACHE_FILE, JSON.stringify(data), "utf8")
    } catch (err) {
      console.warn("[VesselDiskCache] write failed:", err)
    }
  }, WRITE_DEBOUNCE_MS)
}

/**
 * Upsert vessels into the disk-backed cache. Keyed by MMSI.
 * Vessels without MMSI are skipped.
 */
export function saveVesselsToDiskCache(vessels: VesselRecord[]): number {
  if (!vessels || vessels.length === 0) return 0
  const cache = getMemCache()
  const cachedAt = new Date().toISOString()
  let stored = 0
  for (const v of vessels) {
    if (!v.mmsi || v.mmsi === "0" || v.mmsi === "") continue
    cache[v.mmsi] = { ...v, cached_at: cachedAt }
    stored++
  }
  if (stored > 0) scheduleWrite()
  return stored
}

/**
 * Read all non-expired vessels from the disk-backed cache.
 * Older than VESSEL_MAX_AGE_MS are dropped.
 */
export function readVesselsFromDiskCache(): VesselRecord[] {
  const cache = getMemCache()
  const now = Date.now()
  const fresh: VesselRecord[] = []
  const expiredKeys: string[] = []
  for (const [mmsi, v] of Object.entries(cache)) {
    const age = now - new Date(v.cached_at).getTime()
    if (age > VESSEL_MAX_AGE_MS || Number.isNaN(age)) {
      expiredKeys.push(mmsi)
      continue
    }
    const { cached_at, ...rest } = v
    fresh.push(rest)
  }
  if (expiredKeys.length > 0) {
    for (const k of expiredKeys) delete cache[k]
    scheduleWrite()
  }
  return fresh
}

export function getVesselDiskCacheStats() {
  const cache = getMemCache()
  const now = Date.now()
  let fresh = 0
  let expired = 0
  for (const v of Object.values(cache)) {
    const age = now - new Date(v.cached_at).getTime()
    if (age > VESSEL_MAX_AGE_MS || Number.isNaN(age)) expired++
    else fresh++
  }
  return { total: Object.keys(cache).length, fresh, expired, file: CACHE_FILE }
}
