// Crawl the FULL HDOnTap public webcam catalog → baked Eagle Eye seed.
//
// Morgan (Jun 15 2026): "literally every camera you see on hdontap.com should
// be on earth simulator in its proper location icon on the map globally."
//
// HDOnTap exposes every live cam in https://hdontap.com/sitemap.xml as
// /stream/{id}/{slug}/ pages. Each page embeds a schema.org JSON-LD block with
// a Place.geo (exact lat/lng), VideoObject (name/desc/thumbnail/isLiveBroadcast),
// and the live .m3u8 in the page body. We crawl every stream page, pull the
// JSON-LD geo + metadata, and write a GeoJSON seed in the same shape as the
// other eagle-cameras-*-seed.geojson files. The stream resolver
// (app/api/eagle/stream/[sourceId]) scrapes the current signed HLS from the
// page URL (resolveHdontapPageHls) and CORS-proxies live.hdontap.com.
//
// Re-run any time to refresh the catalog:
//   node scripts/eagle/crawl-hdontap.mjs
//
// Output: public/data/crep/eagle-cameras-hdontap-seed.geojson

import { writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import path from "node:path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, "../../public/data/crep/eagle-cameras-hdontap-seed.geojson")
const SITEMAP = "https://hdontap.com/sitemap.xml"
const UA = "Mozilla/5.0 (compatible; MycosoftCREP/1.0; +https://mycosoft.com)"
const CONCURRENCY = 6

async function fetchText(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 20000)
      const r = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,application/xml,*/*" },
        signal: ctrl.signal,
      })
      clearTimeout(t)
      if (!r.ok) {
        if (r.status === 429 && i + 1 < tries) { await new Promise((res) => setTimeout(res, 2000 * (i + 1))); continue }
        if (i + 1 < tries) continue
        return null
      }
      return await r.text()
    } catch {
      if (i + 1 < tries) { await new Promise((res) => setTimeout(res, 800)); continue }
      return null
    }
  }
  return null
}

function decodeEntities(s) {
  return String(s || "")
    .replace(/&amp;/g, "&").replace(/&#0?38;/g, "&")
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim()
}

function categoryFor(name, desc, addr) {
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

function parseLdJson(html) {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1])
  let geo = null, name = null, desc = null, thumb = null, addr = null, live = null
  for (const raw of blocks) {
    let j
    try { j = JSON.parse(raw) } catch { continue }
    const graph = Array.isArray(j["@graph"]) ? j["@graph"] : [j]
    for (const node of graph) {
      const types = [].concat(node?.["@type"] || [])
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
        if (node.address) {
          addr = [node.address.addressLocality, node.address.addressRegion, node.address.addressCountry].filter(Boolean).join(", ")
        }
        name = name || node.name
      }
      if (types.includes("WebPage") && !name) name = node.name
    }
  }
  return { geo, name, desc, thumb, addr, live }
}

async function main() {
  console.log(`[hdontap] fetching sitemap ${SITEMAP}`)
  const sm = await fetchText(SITEMAP)
  if (!sm) { console.error("[hdontap] FAILED to fetch sitemap"); process.exit(1) }
  const locs = [...sm.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1])
  const streamUrls = [...new Set(locs.filter((u) => /\/stream\/\d+\/[^/]+\/?$/.test(u)))]
  console.log(`[hdontap] sitemap locs=${locs.length} stream pages=${streamUrls.length}`)

  const features = []
  let withGeo = 0, noGeo = 0, failed = 0, done = 0
  let idx = 0

  async function worker() {
    while (idx < streamUrls.length) {
      const url = streamUrls[idx++]
      const html = await fetchText(url)
      done++
      if (done % 50 === 0) console.log(`[hdontap] ${done}/${streamUrls.length} (geo=${withGeo} nogeo=${noGeo} fail=${failed})`)
      if (!html) { failed++; continue }
      const meta = parseLdJson(html)
      if (!meta.geo) { noGeo++; continue }
      const m = url.match(/\/stream\/(\d+)\//)
      const streamId = m ? m[1] : String(idx)
      const name = decodeEntities(meta.name || "HDOnTap Live Webcam")
      const desc = decodeEntities(meta.desc || "")
      const addr = decodeEntities(meta.addr || "")
      features.push({
        type: "Feature",
        properties: {
          id: `hdontap-${streamId}`,
          provider: "hdontap",
          kind: "permanent",
          name,
          stream_url: null,
          embed_url: url,
          media_url: meta.thumb || null,
          category: categoryFor(name, desc, addr),
          status: meta.live === false ? "temporarily_unavailable" : "online",
          location: addr || null,
          location_confidence: 1,
          source: "hdontap-sitemap-crawl",
        },
        geometry: { type: "Point", coordinates: [meta.geo.lng, meta.geo.lat] },
      })
      withGeo++
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  features.sort((a, b) => a.properties.id.localeCompare(b.properties.id))

  const body = features.map((f) => "    " + JSON.stringify(f)).join(",\n")
  const out =
    `{\n` +
    `  "type": "FeatureCollection",\n` +
    `  "generated_at": ${JSON.stringify(new Date().toISOString())},\n` +
    `  "source": "HDOnTap full public webcam catalog — crawled from https://hdontap.com/sitemap.xml + schema.org JSON-LD Place.geo. Played via the hdontap provider path in /api/eagle/stream (scrapes live.hdontap.com HLS, proxied; falls back to the HDOnTap /embed/ iframe).",\n` +
    `  "count": ${features.length},\n` +
    `  "features": [\n${body}\n  ]\n}\n`
  await writeFile(OUT, out, "utf8")
  console.log(`[hdontap] DONE streams=${streamUrls.length} withGeo=${withGeo} noGeo=${noGeo} failed=${failed} written=${features.length}`)
  console.log(`[hdontap] -> ${OUT}`)
}

main().catch((e) => { console.error("[hdontap] crawl error", e); process.exit(1) })
