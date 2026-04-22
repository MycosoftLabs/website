/**
 * CREP Shodan integration — Apr 22, 2026
 *
 * Morgan: "Shodan integration, prep for Small Business tier, ON only
 * for CREP running in FUSARIUM not in NATUREOS (public)."
 *
 * Shodan indexes every internet-exposed device/service — RTSP cams,
 * ICS/SCADA (Modbus TCP 502, DNP3 20000, IEC 61850, S7comm, BACnet),
 * routers, IP KVMs, exposed databases. For CREP it's a security /
 * attack-surface layer on top of the infra we already render.
 *
 * This module defines:
 *   - Shared TypeScript types for Shodan host records
 *   - Risk-scoring helper that buckets a host into critical/high/medium/low
 *   - Disk-cache helpers that back the /api/shodan/* proxy routes. Shodan
 *     credits are expensive; every proxy response is persisted to
 *     var/cache/shodan/<kind>-<hash>.json with a configurable TTL.
 *
 * Server-side ONLY. SHODAN_API_KEY must never leak to the client bundle.
 */

import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"

// ─── Types ────────────────────────────────────────────────────────────

/** Subset of Shodan host record fields we actually consume. */
export interface ShodanHost {
  ip_str: string
  ip: number
  hostnames?: string[]
  ports?: number[]
  port?: number
  org?: string
  isp?: string
  asn?: string
  os?: string | null
  country_code?: string
  country_name?: string
  city?: string | null
  region_code?: string | null
  latitude?: number
  longitude?: number
  location?: {
    country_code?: string
    country_name?: string
    city?: string | null
    region_code?: string | null
    latitude?: number
    longitude?: number
  }
  product?: string
  version?: string
  transport?: "tcp" | "udp"
  timestamp?: string
  data?: string // first banner
  tags?: string[]
  vulns?: string[] | Record<string, { cvss?: number; verified?: boolean; summary?: string }>
  /** Array of service banners if the host record carries per-port detail. */
  services?: Array<{
    port: number
    transport?: "tcp" | "udp"
    product?: string
    version?: string
    banner?: string
    data?: string
    _shodan?: any
  }>
}

export interface ShodanSearchResult {
  matches: ShodanHost[]
  total: number
  facets?: Record<string, Array<{ value: string; count: number }>>
}

export type ShodanRisk = "critical" | "high" | "medium" | "low"

/** Output shape written to /data/crep/shodan-exposed-latest.geojson */
export interface ShodanFeature {
  type: "Feature"
  geometry: { type: "Point"; coordinates: [number, number] }
  properties: {
    ip: string
    ports: number[]
    products: string[]
    country: string | null
    city: string | null
    org: string | null
    risk_level: ShodanRisk
    tags: string[]
    cve_count: number
    /** Compact summary of top CVEs for popup display (id + cvss). */
    top_cves?: Array<{ id: string; cvss?: number }>
    /** When this record was fetched from Shodan. */
    collected_at: string
    /** Tag identifying why we indexed this host (camera / ics / db / ...). */
    category: ShodanCategory
  }
}

export type ShodanCategory =
  | "rtsp-camera"
  | "mjpeg-camera"
  | "ics-modbus"
  | "ics-dnp3"
  | "ics-iec-61850"
  | "ics-s7comm"
  | "ics-bacnet"
  | "exposed-rdp"
  | "exposed-telnet"
  | "exposed-mongodb"
  | "exposed-elasticsearch"
  | "exposed-redis"
  | "exposed-smb"
  | "router-admin"
  | "other"

// ─── Risk scoring ─────────────────────────────────────────────────────

/**
 * Bucket a host into a risk level for map-layer coloring.
 *
 * Guard-rails:
 *  - We NEVER act on "critical" — we display & monitor only.
 *  - Critical + CVE info is for human analyst review, not automation.
 */
export function scoreRisk(host: ShodanHost, category?: ShodanCategory): ShodanRisk {
  const tags = new Set((host.tags || []).map((t) => t.toLowerCase()))
  const ports = new Set(host.ports || (host.port ? [host.port] : []))
  const product = (host.product || "").toLowerCase()
  const data = (host.data || "").toLowerCase()

  const vulnValues = Array.isArray(host.vulns)
    ? []
    : Object.values(host.vulns || {})
  const hasVerifiedHighCvss = vulnValues.some(
    (v) => v && typeof v === "object" && v.verified && typeof v.cvss === "number" && v.cvss >= 9.0,
  )

  // ICS exposed without auth → critical (grid blackout vector)
  const isIcs =
    tags.has("ics") ||
    ports.has(502) ||
    ports.has(20000) ||
    ports.has(102) ||
    ports.has(44818) ||
    ports.has(47808) ||
    ["modbus", "dnp3", "iec", "s7comm", "bacnet", "fins"].some((p) => product.includes(p))
  const icsAuthed = tags.has("authenticated") || /authentication required|unauthorized/i.test(host.data || "")
  if (isIcs && !icsAuthed) return "critical"

  if (hasVerifiedHighCvss) return "critical"

  // Exposed unauthenticated database
  const isDb = /mongodb|elastic|redis|cassandra|postgres|memcached/i.test(product)
  if (isDb && !/401|unauthor/i.test(data)) return "high"

  if (ports.has(3389) || ports.has(23)) return "high" // RDP / Telnet

  // Unauthenticated RTSP (cameras) — medium. Still worth surfacing.
  if (ports.has(554) && !/401 unauthorized/.test(data)) return "medium"

  if (category === "rtsp-camera" || category === "mjpeg-camera") return "medium"

  return "low"
}

/**
 * Map a Shodan host into one of our category buckets. Used by the ETL
 * so every feature gets a stable category tag.
 */
export function categorize(host: ShodanHost): ShodanCategory {
  const ports = new Set(host.ports || (host.port ? [host.port] : []))
  const product = (host.product || "").toLowerCase()
  const tags = new Set((host.tags || []).map((t) => t.toLowerCase()))

  if (ports.has(554)) return "rtsp-camera"
  if (ports.has(80) && /mjpeg|axis camera|hikvision/i.test(product)) return "mjpeg-camera"
  if (ports.has(502) || product.includes("modbus")) return "ics-modbus"
  if (ports.has(20000) || product.includes("dnp3")) return "ics-dnp3"
  if (ports.has(102) || product.includes("iec") || product.includes("s7comm")) return "ics-iec-61850"
  if (product.includes("s7comm")) return "ics-s7comm"
  if (ports.has(47808) || product.includes("bacnet")) return "ics-bacnet"
  if (ports.has(3389)) return "exposed-rdp"
  if (ports.has(23)) return "exposed-telnet"
  if (ports.has(27017) || product.includes("mongodb")) return "exposed-mongodb"
  if (ports.has(9200) || product.includes("elastic")) return "exposed-elasticsearch"
  if (ports.has(6379) || product.includes("redis")) return "exposed-redis"
  if (ports.has(445) || ports.has(139)) return "exposed-smb"
  if (tags.has("router") || /openwrt|mikrotik|routeros/i.test(product)) return "router-admin"
  return "other"
}

/** Convert a Shodan host record into a GeoJSON Feature. */
export function hostToFeature(host: ShodanHost): ShodanFeature | null {
  const lat = host.latitude ?? host.location?.latitude
  const lng = host.longitude ?? host.location?.longitude
  if (typeof lat !== "number" || typeof lng !== "number") return null
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null

  const category = categorize(host)
  const risk = scoreRisk(host, category)

  const ports = host.ports || (host.port ? [host.port] : [])
  const products = host.services?.map((s) => s.product).filter(Boolean) as string[]
    ?? (host.product ? [host.product] : [])

  let cveCount = 0
  let topCves: Array<{ id: string; cvss?: number }> = []
  if (host.vulns) {
    if (Array.isArray(host.vulns)) {
      cveCount = host.vulns.length
      topCves = host.vulns.slice(0, 5).map((id) => ({ id }))
    } else {
      const entries = Object.entries(host.vulns)
      cveCount = entries.length
      topCves = entries
        .map(([id, v]) => ({ id, cvss: v?.cvss }))
        .sort((a, b) => (b.cvss ?? 0) - (a.cvss ?? 0))
        .slice(0, 5)
    }
  }

  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [lng, lat] },
    properties: {
      ip: host.ip_str,
      ports,
      products: Array.from(new Set(products)),
      country: host.country_code ?? host.location?.country_code ?? null,
      city: host.city ?? host.location?.city ?? null,
      org: host.org ?? null,
      risk_level: risk,
      tags: Array.from((host.tags || [])),
      cve_count: cveCount,
      top_cves: topCves,
      collected_at: host.timestamp || new Date().toISOString(),
      category,
    },
  }
}

// ─── Disk cache for /api/shodan/* proxy ───────────────────────────────

export interface CacheRecord<T = any> {
  key: string
  written_at: number
  ttl_ms: number
  payload: T
}

const CACHE_ROOT = path.resolve(process.cwd(), "var", "cache", "shodan")

function ensureDir() {
  if (!fs.existsSync(CACHE_ROOT)) fs.mkdirSync(CACHE_ROOT, { recursive: true })
}

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex").slice(0, 24)
}

function cachePath(kind: string, key: string): string {
  return path.join(CACHE_ROOT, `${kind}-${hashKey(key)}.json`)
}

/** Read a cache record if present and not expired. Returns null otherwise. */
export function readCache<T = any>(kind: string, key: string): T | null {
  try {
    ensureDir()
    const file = cachePath(kind, key)
    if (!fs.existsSync(file)) return null
    const raw = fs.readFileSync(file, "utf8")
    const rec = JSON.parse(raw) as CacheRecord<T>
    if (!rec || !rec.written_at || !rec.ttl_ms) return null
    if (Date.now() - rec.written_at > rec.ttl_ms) return null
    return rec.payload
  } catch {
    return null
  }
}

/** Persist a cache record to disk. */
export function writeCache<T = any>(kind: string, key: string, payload: T, ttlMs: number): void {
  try {
    ensureDir()
    const rec: CacheRecord<T> = {
      key,
      written_at: Date.now(),
      ttl_ms: ttlMs,
      payload,
    }
    fs.writeFileSync(cachePath(kind, key), JSON.stringify(rec))
  } catch (err) {
    console.warn("[shodan-cache] write failed:", (err as Error).message)
  }
}

// ─── Shared constants + defaults ──────────────────────────────────────

export const SHODAN_BASE = "https://api.shodan.io"

/** TTLs — Shodan credits are expensive; cache aggressively. */
export const TTL = {
  search: 24 * 60 * 60 * 1000,  // 24 h
  host:   7 * 24 * 60 * 60 * 1000, // 7 d
  count:  12 * 60 * 60 * 1000, // 12 h
}

/** Pre-defined queries the nightly ETL runs to build the exposure layer. */
export const PREDEFINED_QUERIES: Array<{ id: string; q: string; category: ShodanCategory; limit?: number }> = [
  { id: "global-ics-modbus",    q: "port:502 !authentication",                   category: "ics-modbus",        limit: 500 },
  { id: "global-ics-dnp3",      q: "port:20000 product:DNP3",                    category: "ics-dnp3",          limit: 500 },
  { id: "global-ics-iec-61850", q: "port:102 product:S7-1200",                   category: "ics-iec-61850",     limit: 300 },
  { id: "global-ics-bacnet",    q: "port:47808 BACnet",                          category: "ics-bacnet",        limit: 300 },
  { id: "global-rtsp",          q: "port:554 has_screenshot:true",               category: "rtsp-camera",       limit: 1000 },
  { id: "us-ics",               q: "tag:ics country:US",                         category: "ics-modbus",        limit: 500 },
  { id: "us-exposed-mongo",     q: "product:MongoDB country:US !authentication", category: "exposed-mongodb",   limit: 200 },
  { id: "us-exposed-elastic",   q: "product:Elasticsearch country:US",           category: "exposed-elasticsearch", limit: 200 },
  { id: "us-exposed-redis",     q: "product:Redis country:US !authentication",   category: "exposed-redis",     limit: 200 },
  { id: "us-exposed-rdp",       q: "port:3389 country:US",                       category: "exposed-rdp",       limit: 300 },
  { id: "us-exposed-telnet",    q: "port:23 country:US",                         category: "exposed-telnet",    limit: 300 },
]

/** Access-tier check — which CREP contexts are allowed to see Shodan data. */
export type CrepContext = "fusarium" | "natureos" | "dashboard"
export function isShodanAllowed(ctx: CrepContext): boolean {
  // FUSARIUM (defense) + internal MYCA dashboard may see. NATUREOS (public) may NOT.
  return ctx === "fusarium" || ctx === "dashboard"
}
