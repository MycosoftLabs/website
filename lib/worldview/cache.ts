/**
 * Worldview v1 server-side cache — Apr 23, 2026
 *
 * Disk-backed cache keyed by `<dataset_id>|<param_key>`. Each entry has
 * a wall-clock expiry. Lives at var/cache/worldview/ which is persistent
 * on the VM 187 Docker volume.
 *
 * The in-memory Map (`MEM`) fronts the disk so the hot path doesn't
 * re-read JSON every request. Cold start loads nothing — entries
 * populate as they're requested.
 *
 * Keep this minimal — heavier caching should live in MINDEX or a
 * dedicated Redis deployment when traffic warrants it.
 */

import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"

interface CacheEntry {
  data: any
  meta?: Record<string, any>
  expiresAt: number
}

const CACHE_ROOT = path.resolve(process.cwd(), "var", "cache", "worldview")
const MEM = new Map<string, CacheEntry>()
const MEM_MAX_ENTRIES = 500

function ensureDir() {
  try { if (!fs.existsSync(CACHE_ROOT)) fs.mkdirSync(CACHE_ROOT, { recursive: true }) } catch { /* readonly FS */ }
}

function pathFor(key: string): string {
  const hash = crypto.createHash("sha256").update(key).digest("hex").slice(0, 28)
  return path.join(CACHE_ROOT, `${hash}.json`)
}

export function readCache(key: string, maxAgeMs: number): CacheEntry | null {
  const now = Date.now()
  const mem = MEM.get(key)
  if (mem && mem.expiresAt > now) return mem
  if (mem) MEM.delete(key)

  try {
    ensureDir()
    const p = pathFor(key)
    if (!fs.existsSync(p)) return null
    const raw = fs.readFileSync(p, "utf8")
    const entry = JSON.parse(raw) as CacheEntry
    if (!entry.expiresAt || entry.expiresAt <= now) {
      try { fs.unlinkSync(p) } catch { /* race */ }
      return null
    }
    // Honor the original expiresAt, but respect caller's maxAgeMs ceiling.
    const effectiveExpiry = Math.min(entry.expiresAt, now + maxAgeMs)
    const hydrated = { ...entry, expiresAt: effectiveExpiry }
    MEM.set(key, hydrated)
    trimMem()
    return hydrated
  } catch {
    return null
  }
}

export function writeCache(key: string, entry: CacheEntry): void {
  MEM.set(key, entry)
  trimMem()
  try {
    ensureDir()
    fs.writeFileSync(pathFor(key), JSON.stringify(entry))
  } catch { /* readonly FS */ }
}

function trimMem() {
  if (MEM.size <= MEM_MAX_ENTRIES) return
  const entries = [...MEM.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt)
  for (let i = 0; i < entries.length - MEM_MAX_ENTRIES; i++) MEM.delete(entries[i][0])
}

export function stats() {
  return { mem_entries: MEM.size, mem_cap: MEM_MAX_ENTRIES }
}
