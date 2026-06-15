/**
 * HDOnTap full-catalog provider — Jun 15 2026
 *
 * Morgan: "literally every camera you see on hdontap.com should be on earth
 * simulator in its proper location icon on the map globally" + "wire HDOnTap
 * into the live-refresh connector path so the catalog updates without a manual
 * re-crawl."
 *
 * HDOnTap lists every public cam in https://hdontap.com/sitemap.xml as
 * /stream/{id}/{slug}/ pages, each carrying a schema.org JSON-LD Place.geo
 * (exact lat/lng) + VideoObject (name/thumbnail/isLiveBroadcast). We crawl them
 * and cache the result in-memory, seeded INSTANTLY from the baked seed
 * (public/data/crep/eagle-cameras-hdontap-seed.geojson) so the connector never
 * blocks on a cold crawl, then refresh in the background on a TTL.
 *
 * The baked seed is produced/refreshed by scripts/eagle/crawl-hdontap.mjs
 * (run it in a cron to keep the committed file current for fresh deploys).
 * Played via the `hdontap` provider path in app/api/eagle/stream/[sourceId].
 */

import fs from "node:fs/promises"
import path from "node:path"

export interface HdontapCam {
  id: string
  provider: "hdontap"
  name: string | null
  lat: number
  lng: number
  stream_url: null
  embed_url: string
  media_url: string | null
  category: string
  source_status: string
}

const SITEMAP = "https://hdontap.com/sitemap.xml"
const UA = "Mozilla/5.0 (compatible; MycosoftCREP/1.0; +https://mycosoft.com)"
const SEED_FILE = path.join(process.cwd(), "public", "data", "crep", "eagle-cameras-hdontap-seed.geojson")
const TTL_MS = 12 * 60 * 60 * 1000 // refresh the live catalog at most twice a day
const CONCURRENCY = 6

let cache: { ts: number; cams: HdontapCam[] } = { ts: 0, cams: [] }
let seeded = false
let refreshing = false

async function fetchText(url: string, tries = 3): Promise<string | null> {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,application/xml,*/*" },
        signal: AbortSignal.timeout(20_000),
      })
      if (!res.ok) {
        if (res.status === 429 && i + 1 < tries) { await new Promise((r) => setTimeout(r, 2000 * (i + 1))); continue }
        if (i + 1 < tries) continue
        return null
      }
      return await res.text()
    } catch {
      if (i + 1 < tries) { await new Promise((r) => setTimeout(r, 800)); continue }
      return null
    }
  }
  return null
}

function decodeEntities(s: unknown): string {
  return String(s || "")
    .replace(/&amp;/g, "&").replace(/&#0?38;/g, "&")
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim()
}

function categoryFor(name: string, desc: string, addr: string): string {
  const s = `${name} ${desc} ${addr}`.toLowerCase()
  if (/airport|aviation|runway|aircraft|\bplane|air traffic|tower cam/.test(s)) return "aviation"
  if (/\bsurf|\bbeach|\bpier|\bwave|shoreline|boardwalk/.test(s)) return "surf"
  if (/harbor|harbour|\bbay\b|marina|\bport\b|\bboat|\bmarine|waterfront|inlet|lighthouse|sound\b|seaport|ferry/.test(s)) return "marine"
  if (/eagle|osprey|\bbear|wildlife|\bnest|\bzoo|aquarium|falcon|\bowl|\bbird|hummingbird|heron|sanctuary|refuge/.test(s)) return "wildlife"
  if (/\bski\b|\bsnow|mountain|resort|\bslope|summit|\bpeak\b|glacier/.test(s)) return "weather"
  if (/traffic|highway|freeway|\broad\b|intersection|interstate/.test(s)) return "traffic"
  if (/downtown|\bcity\b|street|\bsquare\b|plaza|skyline|landmark|capitol|\bpark\b/.test(s)) return "landmark"
  return "scenic"
}

interface LdMeta { geo: { lat: number; lng: number } | null; name: string | null; desc: string | null; thumb: string | null; addr: string | null; live: boolean | null }

function parseLdJson(html: string): LdMeta {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1])
  let geo: LdMeta["geo"] = null, name: string | null = null, desc: string | null = null, thumb: string | null = null, addr: string | null = null, live: boolean | null = null
  for (const raw of blocks) {
    let j: any
    try { j = JSON.parse(raw) } catch { continue }
    const graph: any[] = Array.isArray(j["@graph"]) ? j["@graph"] : [j]
    for (const node of graph) {
      const types: string[] = ([] as string[]).concat(node?.["@type"] || [])
      if (types.includes("VideoObject")) {
        name = name || node.name
        desc = desc || node.description
        const tu = node.thumbnailUrl
        thumb = thumb || (Array.isArray(tu) ? tu[0] : tu) || null
        if (node.publication) live = node.publication.isLiveBroadcast === true
      }
      if (types.includes("Place")) {
        const g = node.geo
        if (g && Number.isFinite(Number(g.latitude)) && Number.isFinite(Number(g.longitude))) {
          geo = { lat: Number(g.latitude), lng: Number(g.longitude) }
        }
        if (node.address) addr = [node.address.addressLocality, node.address.addressRegion, node.address.addressCountry].filter(Boolean).join(", ")
        name = name || node.name
      }
      if (types.includes("WebPage") && !name) name = node.name
    }
  }
  return { geo, name, desc, thumb, addr, live }
}

/** Crawl the full HDOnTap catalog fresh from their sitemap. */
export async function crawlHdontapCatalog(): Promise<HdontapCam[]> {
  const sm = await fetchText(SITEMAP)
  if (!sm) return []
  const locs = [...sm.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1])
  const streamUrls = [...new Set(locs.filter((u) => /\/stream\/\d+\/[^/]+\/?$/.test(u)))]
  const cams: HdontapCam[] = []
  let idx = 0
  async function worker() {
    while (idx < streamUrls.length) {
      const url = streamUrls[idx++]
      const html = await fetchText(url)
      if (!html) continue
      const m = parseLdJson(html)
      if (!m.geo) continue
      const sid = (url.match(/\/stream\/(\d+)\//) || [])[1] || String(idx)
      const name = decodeEntities(m.name || "HDOnTap Live Webcam")
      cams.push({
        id: `hdontap-${sid}`,
        provider: "hdontap",
        name,
        lat: m.geo.lat,
        lng: m.geo.lng,
        stream_url: null,
        embed_url: url,
        media_url: m.thumb || null,
        category: categoryFor(name, decodeEntities(m.desc || ""), decodeEntities(m.addr || "")),
        source_status: m.live === false ? "temporarily_unavailable" : "online",
      })
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  return cams
}

async function loadBakedSeed(): Promise<HdontapCam[]> {
  try {
    const j = JSON.parse(await fs.readFile(SEED_FILE, "utf8"))
    return (j.features || [])
      .map((f: any): HdontapCam | null => {
        const c = f?.geometry?.coordinates
        const p = f?.properties || {}
        if (!c || !Number.isFinite(Number(c[1])) || !Number.isFinite(Number(c[0]))) return null
        return {
          id: String(p.id),
          provider: "hdontap",
          name: p.name ?? null,
          lat: Number(c[1]),
          lng: Number(c[0]),
          stream_url: null,
          embed_url: p.embed_url,
          media_url: p.media_url ?? null,
          category: p.category ?? "scenic",
          source_status: p.status ?? "online",
        }
      })
      .filter(Boolean) as HdontapCam[]
  } catch {
    return []
  }
}

/**
 * Cached catalog: seeded INSTANTLY from the baked seed (never blocks on a cold
 * crawl), then background-refreshed from HDOnTap on a TTL so the live map stays
 * current without a manual re-crawl.
 */
export async function getHdontapCatalogCached(): Promise<HdontapCam[]> {
  if (!seeded && cache.cams.length === 0) {
    seeded = true
    // Seed from the baked file AND mark it fresh, so a heavy 205-page crawl never
    // fires at boot (which can stall a busy dev machine). The background refresh
    // only runs once the cache is older than the TTL; re-run
    // scripts/eagle/crawl-hdontap.mjs any time for an immediate refresh.
    cache = { ts: Date.now(), cams: await loadBakedSeed() }
  }
  if (Date.now() - cache.ts > TTL_MS && !refreshing) {
    refreshing = true
    crawlHdontapCatalog()
      .then((cams) => { if (cams.length) cache = { ts: Date.now(), cams } })
      .catch(() => { /* keep last-good */ })
      .finally(() => { refreshing = false })
  }
  return cache.cams
}
