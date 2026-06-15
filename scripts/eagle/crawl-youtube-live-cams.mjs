// Crawl YouTube live-webcam channels + a playlist → baked Eagle Eye seed.
//
// Morgan (Jun 15 2026): add every CURRENTLY-LIVE camera from these channels +
// the playlist (live ones only). Global cams, so we geocode each from its title
// via Mapbox. Played via the youtube_live path in /api/eagle/stream (iframe).
//
// Liveness is read straight from each channel/playlist page's "style":"LIVE"
// badge — NO per-video watch fetches (those get YouTube-bot-walled at volume).
//
//   node scripts/eagle/crawl-youtube-live-cams.mjs
// Output: public/data/crep/eagle-cameras-youtube-live-seed.geojson

import { writeFile, readFile, stat } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import path from "node:path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "../..")
const OUT = path.resolve(ROOT, "public/data/crep/eagle-cameras-youtube-live-seed.geojson")
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
const GEO_CONCURRENCY = 6

const SOURCES = [
  { tag: "skyline", url: "https://www.youtube.com/@SkylineWebcams/streams" },
  { tag: "camnomad", url: "https://www.youtube.com/@CamNomad/streams" },
  { tag: "teleport", url: "https://www.youtube.com/@Teleport.camera/streams" },
  { tag: "windowseat", url: "https://www.youtube.com/@windowseatworldtravel/streams" },
  { tag: "africam", url: "https://www.youtube.com/@Africamvideos/streams" },
  { tag: "fobbv", url: "https://www.youtube.com/@FOBBVCAM/streams" },
  { tag: "moodygardens", url: "https://www.youtube.com/@TheMoodyGardens/streams" },
  { tag: "ozolio", url: "https://www.youtube.com/@ozolio_live/streams" },
  { tag: "explore", url: "https://www.youtube.com/@ExploreLiveNatureCams/streams" },
  { tag: "playlist", url: "https://www.youtube.com/playlist?list=PLIxAOWvrjwWJtMqXGOkX930YSkNY84TF7" },
]

// Fallback coords for channels whose titles name an animal/subject, not a place.
const CHANNEL_FALLBACK = {
  africam: { lng: 31.49, lat: -24.40, conf: 0.3 },        // Greater Kruger, South Africa
  fobbv: { lng: -116.9114, lat: 34.2439, conf: 0.5 },     // Big Bear Lake, CA
  moodygardens: { lng: -94.8535, lat: 29.2772, conf: 0.5 }, // Galveston, TX
}

// Geocoding bias per channel — keeps a partial place name in the right region
// (e.g. Africam "Lisbon Falls" → South Africa, not Portugal).
const CHANNEL_REGION = {
  africam: "country=za,zw,bw,mz,ke,tz&proximity=31.5,-24.5",
  fobbv: "country=us&proximity=-116.91,34.24",
  moodygardens: "country=us&proximity=-94.85,29.28",
}

async function mapboxToken() {
  for (const f of [".env.local", ".env.production.generated", ".env"]) {
    try {
      const txt = await readFile(path.resolve(ROOT, f), "utf8")
      const m = txt.match(/^(?:NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN|MAPBOX_ACCESS_TOKEN|NEXT_PUBLIC_MAPBOX_TOKEN)\s*=\s*(.+)$/m)
      if (m) return m[1].trim().replace(/^["']|["']$/g, "")
    } catch { /* next */ }
  }
  return null
}

async function fetchText(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 25000)
      const r = await fetch(url, {
        headers: { "User-Agent": UA, "Accept-Language": "en-US,en", Cookie: "CONSENT=YES+cb; SOCS=CAI" },
        signal: ctrl.signal,
      })
      clearTimeout(t)
      if (!r.ok) { if (r.status === 429 && i + 1 < tries) { await new Promise((s) => setTimeout(s, 3000 * (i + 1))); continue } if (i + 1 < tries) continue; return null }
      return await r.text()
    } catch { if (i + 1 < tries) { await new Promise((s) => setTimeout(s, 1000)); continue } return null }
  }
  return null
}

function decodeEntities(s) {
  return String(s || "")
    .replace(/\\u0026/g, "&").replace(/&amp;/g, "&").replace(/&#0?39;/g, "'").replace(/&#0?38;/g, "&")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\\"/g, '"').replace(/\s+/g, " ").trim()
}

// Extract CURRENTLY-LIVE {id, title} from a channel/streams or playlist page by
// splitting into per-video renderer chunks and keeping ones with a LIVE badge.
function liveFromPage(html) {
  // YouTube uses lockupViewModel now (channel /streams) + older renderers (playlists).
  const chunks = html.split(/"(?:lockupViewModel|richItemRenderer|playlistVideoRenderer|videoRenderer|gridVideoRenderer|reelItemRenderer)":\{/)
  const out = new Map()
  for (const ch of chunks) {
    // LIVE badge: "text":"LIVE" (lockup), "style":"LIVE", or the live badge style.
    const isLive = /"text":"LIVE"/.test(ch) || /"style":"LIVE"/.test(ch) ||
      /THUMBNAIL_OVERLAY_BADGE_STYLE_LIVE/.test(ch) || /"iconType":"LIVE"/.test(ch)
    if (!isLive) continue
    const idm = ch.match(/"videoId":"([A-Za-z0-9_-]{11})"/)
    if (!idm) continue
    const id = idm[1]
    const tm = ch.match(/"title":\{"content":"((?:[^"\\]|\\.)*)"/) ||      // lockupViewModel
      ch.match(/"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/) ||        // videoRenderer
      ch.match(/"title":\{"simpleText":"((?:[^"\\]|\\.)*)"/) ||
      ch.match(/"accessibilityText":"((?:[^"\\]|\\.)*?)(?:,| \d+ watching| - )/)
    const title = tm ? decodeEntities(tm[1]) : ""
    if (title && !out.has(id)) out.set(id, { id, title })
  }
  return [...out.values()]
}

function placeQuery(title) {
  let t = title.split("|")[0].split("｜")[0]
  t = t.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, " ")
  t = t.replace(/\b(live\s*(web)?cam(era)?s?|web\s?cam|webcam|live\s?stream(ing)?|live|4k|uhd|hd|now|24\/?7|stream|view|powered by)\b/gi, " ")
  t = t.replace(/[-–—:•·]+/g, " ").replace(/\s+/g, " ").trim()
  return t.length >= 2 ? t : title
}

function categoryFor(title) {
  const s = title.toLowerCase()
  if (/beach|surf|pier|ocean|sea\b|coast|bay|harbor|harbour|island|lagoon|reef/.test(s)) return "marine"
  if (/eagle|osprey|bear|falcon|owl|nest|zoo|safari|wildlife|kruger|africa|animal|hummingbird|panda|elephant|shark|penguin|aquarium/.test(s)) return "wildlife"
  if (/mountain|ski|snow|alps|peak|volcano|glacier|fuji|valley/.test(s)) return "weather"
  if (/square|street|city|downtown|plaza|times|piazza|cathedral|bridge|tower|skyline|old town|harbor view|castle/.test(s)) return "landmark"
  return "scenic"
}

const geoCache = new Map()
async function geocode(token, query, bias = "") {
  const key = `${query}|${bias}`.toLowerCase()
  if (geoCache.has(key)) return geoCache.get(key)
  let out = null
  try {
    const u = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&limit=1&language=en${bias ? `&${bias}` : ""}`
    const res = await fetch(u, { signal: AbortSignal.timeout(10000) })
    if (res.ok) { const j = await res.json(); const c = j?.features?.[0]?.center; const rel = j?.features?.[0]?.relevance ?? 0; if (c && rel >= 0.5) out = { lng: c[0], lat: c[1] } }
  } catch { /* skip */ }
  geoCache.set(key, out)
  return out
}

async function mapPool(items, fn, conc) {
  let i = 0
  async function worker() { while (i < items.length) { const idx = i++; await fn(items[idx], idx) } }
  await Promise.all(Array.from({ length: conc }, worker))
}

async function main() {
  const token = await mapboxToken()
  if (!token) { console.error("[yt-live] no Mapbox token in env"); process.exit(1) }

  const candidates = new Map() // id -> { title, tag }
  for (const s of SOURCES) {
    const html = await fetchText(s.url)
    if (!html) { console.warn("[yt-live] fetch failed", s.tag); continue }
    const live = liveFromPage(html)
    for (const v of live) if (!candidates.has(v.id)) candidates.set(v.id, { title: v.title, tag: s.tag })
    console.log(`[yt-live]   ${s.tag}: ${live.length} LIVE on page`)
    await new Promise((r) => setTimeout(r, 400)) // be polite between channel pages
  }
  const live = [...candidates.entries()].map(([id, v]) => ({ id, ...v }))
  console.log(`[yt-live] ${live.length} unique LIVE cams → geocoding`)

  const features = []
  let geoOk = 0, geoFail = 0
  await mapPool(live, async (info) => {
    let geo = await geocode(token, placeQuery(info.title), CHANNEL_REGION[info.tag] || "")
    let conf = 0.7, loc = placeQuery(info.title)
    if (!geo) { const fb = CHANNEL_FALLBACK[info.tag]; if (fb) { geo = { lng: fb.lng, lat: fb.lat }; conf = fb.conf; loc = `${info.tag} (approx)` } }
    if (!geo) { geoFail++; return }
    geoOk++
    features.push({
      type: "Feature",
      properties: {
        id: `yt-${info.id}`, provider: "youtube_live", kind: "permanent", name: info.title,
        stream_url: null, embed_url: `https://www.youtube.com/watch?v=${info.id}`,
        media_url: `https://i.ytimg.com/vi/${info.id}/hqdefault.jpg`,
        category: categoryFor(info.title), status: "online", location: loc,
        location_confidence: conf, source: `youtube-live-crawl:${info.tag}`,
      },
      geometry: { type: "Point", coordinates: [Number(geo.lng.toFixed(5)), Number(geo.lat.toFixed(5))] },
    })
  }, GEO_CONCURRENCY)

  if (features.length === 0) {
    // Safety: never overwrite a good seed with an empty result (bot-wall / fetch failure).
    let existing = 0
    try { existing = (await stat(OUT)).size } catch { /* none */ }
    console.error(`[yt-live] 0 features resolved — NOT overwriting existing seed (${existing} bytes). Likely all channel fetches failed.`)
    process.exit(2)
  }

  features.sort((a, b) => a.properties.id.localeCompare(b.properties.id))
  const body = features.map((f) => "    " + JSON.stringify(f)).join(",\n")
  const out =
    `{\n  "type": "FeatureCollection",\n  "generated_at": ${JSON.stringify(new Date().toISOString())},\n` +
    `  "source": "YouTube live-webcam channels (SkylineWebcams, CamNomad, Teleport, WindowSeatWorldTravel, Africam, FOBBV, MoodyGardens, Ozolio, ExploreLiveNatureCams) + curated playlist — LIVE-only (page LIVE badge), geocoded via Mapbox. Played as youtube_live iframes.",\n` +
    `  "count": ${features.length},\n  "features": [\n${body}\n  ]\n}\n`
  await writeFile(OUT, out, "utf8")
  console.log(`[yt-live] DONE live=${live.length} geocoded=${geoOk} geoFail=${geoFail} written=${features.length}`)
  console.log(`[yt-live] -> ${OUT}`)
}

main().catch((e) => { console.error("[yt-live] error", e); process.exit(1) })
