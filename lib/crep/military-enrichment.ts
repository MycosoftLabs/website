/**
 * Military base enrichment lookup — Apr 23, 2026
 *
 * Morgan: "update all military base widgets with more data contact
 * information base commander what branches are at base and way more
 * usable data".
 *
 * Loads public/data/crep/military-bases-enrichment.geojson once, indexes
 * it by id + normalized-name + aliases, and exposes `findEnrichment()`
 * so the InfraAsset widget (or any other consumer) can merge richer
 * fields into the default TIGER Census properties.
 *
 * Works client-side (browser fetch on first call, cached in a module
 * singleton) OR server-side (fs read for server components).
 */

export interface MilitaryEnrichment {
  id?: string
  name: string
  aliases?: string[]
  branches?: string[]
  primary_component?: string
  command?: string
  commander?: string
  pao_phone?: string
  pao_email?: string
  website?: string
  address?: string
  commissioned?: string
  area_acres?: number
  personnel?: string
  notable_tenants?: string[]
  last_updated?: string
}

let _cache: Map<string, MilitaryEnrichment> | null = null
let _loading: Promise<void> | null = null

function normalize(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/[._—–-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

async function loadIfNeeded(): Promise<void> {
  if (_cache) return
  if (_loading) return _loading
  _loading = (async () => {
    try {
      let raw: string
      if (typeof window === "undefined") {
        // Server: read from disk
        const fs = await import("node:fs")
        const path = await import("node:path")
        const p = path.resolve(process.cwd(), "public", "data", "crep", "military-bases-enrichment.geojson")
        raw = fs.readFileSync(p, "utf8")
      } else {
        // Browser: fetch
        const r = await fetch("/data/crep/military-bases-enrichment.geojson", { cache: "force-cache" })
        if (!r.ok) throw new Error(`fetch ${r.status}`)
        raw = await r.text()
      }
      const gj = JSON.parse(raw)
      const map = new Map<string, MilitaryEnrichment>()
      for (const f of gj.features || []) {
        const p = f.properties as MilitaryEnrichment | undefined
        if (!p?.name) continue
        if (p.id) map.set(normalize(p.id), p)
        map.set(normalize(p.name), p)
        for (const alias of p.aliases || []) map.set(normalize(alias), p)
      }
      _cache = map
    } catch (err) {
      console.warn("[military-enrichment] load failed:", (err as Error).message)
      _cache = new Map()
    } finally {
      _loading = null
    }
  })()
  return _loading
}

/**
 * Find enrichment metadata for a clicked military installation.
 * Caller passes any candidate strings — id, name, site_name, aliases.
 * Returns the first match or null.
 */
export async function findEnrichment(candidates: (string | null | undefined)[]): Promise<MilitaryEnrichment | null> {
  await loadIfNeeded()
  if (!_cache) return null
  for (const c of candidates) {
    if (!c) continue
    const hit = _cache.get(normalize(String(c)))
    if (hit) return hit
  }
  return null
}

/** Synchronous lookup once the cache is warm. Returns null if not loaded yet. */
export function findEnrichmentSync(candidates: (string | null | undefined)[]): MilitaryEnrichment | null {
  if (!_cache) return null
  for (const c of candidates) {
    if (!c) continue
    const hit = _cache.get(normalize(String(c)))
    if (hit) return hit
  }
  return null
}

/** Preload the enrichment cache (call on app boot for instant lookups). */
export function preloadMilitaryEnrichment(): void {
  loadIfNeeded().catch(() => {})
}
