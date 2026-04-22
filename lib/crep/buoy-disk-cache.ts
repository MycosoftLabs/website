/**
 * Buoy Disk Cache — Apr 22, 2026
 *
 * Parallel to vessel-disk-cache. NDBC's latest_obs.txt sometimes 503s
 * under load, and MINDEX's buoys layer is currently empty. This module:
 *  - writes every received buoy set to var/cache/buoys.json,
 *  - serves the last known set if NDBC + MINDEX are both cold,
 *  - ages entries out after BUOY_MAX_AGE_MS (6 h) so the map doesn't
 *    display week-old ocean obs.
 *
 * Debounced writes, keyed by station_id.
 */

import fs from "node:fs"
import path from "node:path"

interface BuoyLike {
  id: string
  station_id: string
  lat: number
  lng: number
  [key: string]: any
}

const CACHE_DIR = path.resolve(process.cwd(), "var", "cache")
const CACHE_FILE = path.join(CACHE_DIR, "buoys.json")
const BUOY_MAX_AGE_MS = 6 * 60 * 60 * 1000 // 6h
const WRITE_DEBOUNCE_MS = 5_000

interface Cached extends BuoyLike { cached_at: string }
interface CacheFile { version: 1; written_at: string; buoys: Record<string, Cached> }

let memCache: Record<string, Cached> | null = null
let writeTimer: NodeJS.Timeout | null = null
let dirty = false

function ensureDir() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true })
}

function loadFromDisk(): Record<string, Cached> {
  try {
    if (!fs.existsSync(CACHE_FILE)) return {}
    const parsed = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")) as CacheFile
    if (parsed.version !== 1 || !parsed.buoys) return {}
    return parsed.buoys
  } catch (err) {
    console.warn("[BuoyDiskCache] load failed, starting empty:", err)
    return {}
  }
}

function getMem(): Record<string, Cached> {
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
        buoys: getMem(),
      }
      fs.writeFileSync(CACHE_FILE, JSON.stringify(data), "utf8")
    } catch (err) {
      console.warn("[BuoyDiskCache] write failed:", err)
    }
  }, WRITE_DEBOUNCE_MS)
}

export function saveBuoysToDiskCache(buoys: BuoyLike[]): number {
  if (!buoys || buoys.length === 0) return 0
  const cache = getMem()
  const cachedAt = new Date().toISOString()
  let stored = 0
  for (const b of buoys) {
    if (!b.station_id) continue
    cache[b.station_id] = { ...b, cached_at: cachedAt }
    stored++
  }
  if (stored > 0) scheduleWrite()
  return stored
}

export function readBuoysFromDiskCache(): BuoyLike[] {
  const cache = getMem()
  const now = Date.now()
  const fresh: BuoyLike[] = []
  const expiredKeys: string[] = []
  for (const [k, b] of Object.entries(cache)) {
    const age = now - new Date(b.cached_at).getTime()
    if (age > BUOY_MAX_AGE_MS || Number.isNaN(age)) {
      expiredKeys.push(k)
      continue
    }
    const { cached_at, ...rest } = b
    fresh.push(rest)
  }
  if (expiredKeys.length > 0) {
    for (const k of expiredKeys) delete cache[k]
    scheduleWrite()
  }
  return fresh
}

export function getBuoyDiskCacheStats() {
  const cache = getMem()
  const now = Date.now()
  let fresh = 0
  let expired = 0
  for (const b of Object.values(cache)) {
    const age = now - new Date(b.cached_at).getTime()
    if (age > BUOY_MAX_AGE_MS || Number.isNaN(age)) expired++
    else fresh++
  }
  return { total: Object.keys(cache).length, fresh, expired, file: CACHE_FILE }
}
