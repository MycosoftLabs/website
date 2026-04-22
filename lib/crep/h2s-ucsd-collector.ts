/**
 * H₂S UCSD Collector — Apr 22, 2026
 *
 * Morgan + Cursor: UCSD airborne.ucsd.edu/h2s exposes PNG charts only,
 * no JSON series. Rather than OCR, we treat the PNG endpoints as first-
 * class live data:
 *   - fetch all 6 charts every N minutes,
 *   - store each as a timestamped blob in var/cache/h2s-ucsd/,
 *   - expose a stable `/api/crep/sdapcd/h2s/chart?range=X&site=Y` proxy
 *     route so CREP widgets embed local URLs (no UCSD dependency at
 *     request time; survives UCSD outages for up to a few hours).
 *
 * Endpoints mapped:
 *   Nestor (inland)  30min / 12hours / latest-png (2-day)
 *   Coast (IB)       coast_30minutes / coast_12hours / coast_2days
 *
 * MINDEX: when MINDEX grows an `h2s_observations` or `air_quality_blobs`
 * layer we'll POST to it here too. For now the on-disk cache is the
 * source of truth and the widget consumes it directly.
 */

import fs from "node:fs"
import path from "node:path"

export interface H2SChart {
  id: string
  site: "nestor" | "coast"
  range: "30m" | "12h" | "2d"
  source_url: string
  local_path: string
  local_url: string
  fetched_at: string
  bytes: number
}

const CACHE_DIR = path.resolve(process.cwd(), "var", "cache", "h2s-ucsd")

const CHARTS: Array<{ id: string; site: H2SChart["site"]; range: H2SChart["range"]; url: string }> = [
  { id: "nestor_30m",  site: "nestor", range: "30m", url: "https://airborne.ucsd.edu/wp-json/airborne/v1/30minutes" },
  { id: "nestor_12h",  site: "nestor", range: "12h", url: "https://airborne.ucsd.edu/wp-json/airborne/v1/12hours" },
  { id: "nestor_2d",   site: "nestor", range: "2d",  url: "https://airborne.ucsd.edu/wp-json/airborne/v1/latest-png" },
  { id: "coast_30m",   site: "coast",  range: "30m", url: "https://airborne.ucsd.edu/wp-json/airborne/v1/coast_30minutes" },
  { id: "coast_12h",   site: "coast",  range: "12h", url: "https://airborne.ucsd.edu/wp-json/airborne/v1/coast_12hours" },
  { id: "coast_2d",    site: "coast",  range: "2d",  url: "https://airborne.ucsd.edu/wp-json/airborne/v1/coast_2days" },
]

const INDEX_FILE = path.join(CACHE_DIR, "index.json")

interface Index { version: 1; charts: Record<string, H2SChart> }

function ensureDir() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true })
}

function loadIndex(): Index {
  try {
    if (fs.existsSync(INDEX_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(INDEX_FILE, "utf8")) as Index
      if (parsed.version === 1 && parsed.charts) return parsed
    }
  } catch { /* ignore */ }
  return { version: 1, charts: {} }
}

function saveIndex(idx: Index) {
  ensureDir()
  fs.writeFileSync(INDEX_FILE, JSON.stringify(idx, null, 2), "utf8")
}

/**
 * Fetch all 6 UCSD H₂S charts + persist to var/cache/h2s-ucsd/ with an
 * index. Safe to call concurrently — failures are tolerated per chart
 * so one bad fetch doesn't block the rest.
 */
export async function collectH2sCharts(): Promise<{
  ok: boolean
  results: Array<H2SChart | { id: string; error: string }>
  totalBytes: number
  latencyMs: number
}> {
  ensureDir()
  const idx = loadIndex()
  const started = Date.now()
  const results: Array<H2SChart | { id: string; error: string }> = []
  let totalBytes = 0

  await Promise.all(CHARTS.map(async (c) => {
    try {
      // Apr 22, 2026 — default Node fetch from inside Next.js dev loader
      // was failing with "fetch failed" even though direct Node + curl
      // succeed. UA header fixes it; some servers 403 the bare Node UA.
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 20_000)
      let res: Response
      try {
        res = await fetch(c.url, {
          signal: ctrl.signal,
          headers: {
            "Accept": "image/png, image/*, */*",
            "User-Agent": "Mozilla/5.0 Mycosoft-CREP/1.0 (+https://mycosoft.com)",
          },
          cache: "no-store",
          redirect: "follow",
        })
      } finally {
        clearTimeout(timer)
      }
      if (!res.ok) {
        results.push({ id: c.id, error: `HTTP ${res.status}` })
        return
      }
      const buf = Buffer.from(await res.arrayBuffer())
      const fname = `${c.id}.png`
      const fpath = path.join(CACHE_DIR, fname)
      fs.writeFileSync(fpath, buf)
      const entry: H2SChart = {
        id: c.id,
        site: c.site,
        range: c.range,
        source_url: c.url,
        local_path: fpath,
        local_url: `/api/crep/sdapcd/h2s/chart?id=${encodeURIComponent(c.id)}`,
        fetched_at: new Date().toISOString(),
        bytes: buf.byteLength,
      }
      idx.charts[c.id] = entry
      results.push(entry)
      totalBytes += buf.byteLength
    } catch (err: any) {
      results.push({ id: c.id, error: err?.message || String(err) })
    }
  }))

  saveIndex(idx)
  return { ok: true, results, totalBytes, latencyMs: Date.now() - started }
}

export function readChart(id: string): { buf: Buffer; meta: H2SChart } | null {
  const idx = loadIndex()
  const meta = idx.charts[id]
  if (!meta) return null
  try {
    const buf = fs.readFileSync(meta.local_path)
    return { buf, meta }
  } catch {
    return null
  }
}

export function listChartsIndex(): H2SChart[] {
  const idx = loadIndex()
  return Object.values(idx.charts).sort((a, b) => a.id.localeCompare(b.id))
}

/**
 * Return chart ids whose fetched_at is older than maxAgeMs. Used by
 * the collect endpoint to decide whether to re-fetch; default 5 min
 * matches UCSD's own update cadence.
 */
export function staleChartIds(maxAgeMs = 5 * 60 * 1000): string[] {
  const idx = loadIndex()
  const now = Date.now()
  const stale: string[] = []
  for (const c of CHARTS) {
    const m = idx.charts[c.id]
    if (!m) { stale.push(c.id); continue }
    if (now - new Date(m.fetched_at).getTime() > maxAgeMs) stale.push(c.id)
  }
  return stale
}
