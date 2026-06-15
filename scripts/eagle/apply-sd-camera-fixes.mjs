// Apply the Jun 15 2026 San Diego camera harvest to the manual seed.
//
// - Fixes broken entries with verified-live replacements (and they get unblocked
//   in app/api/eagle/stream/[sourceId]/route.ts KNOWN_UNAVAILABLE_SOURCE_IDS).
// - Marks entries with NO working camera at their location as status "offline"
//   (rendered red/off on the map — a DELIBERATE confirmed-dead signal, never an
//   auto-flag from a render failure).
// - Appends new verified SunDiegoLive / EarthCam / HDOnTap / Skyline / HLS /
//   snapshot cameras across downtown SD, the bay, and Coronado.
//
//   node scripts/eagle/apply-sd-camera-fixes.mjs

import { readFile, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import path from "node:path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SEED = path.resolve(__dirname, "../../public/data/crep/eagle-cameras-manual-seed.geojson")

// id -> property patch (verified-live replacements; these get unblocked).
const FIXES = {
  "nps-cabrillo-ref": {
    provider: "youtube_live",
    name: "Cabrillo / Point Loma — live view (Harbor Island South cam faces the monument)",
    stream_url: null,
    embed_url: "https://www.youtube.com/watch?v=hhIUB-W5Z50",
    media_url: null,
    status: "online",
    notes: "Fixed Jun 15 2026: old YouTube ekYm0PJ6YuM is permanently dead and NO live Cabrillo YouTube stream exists (the SkylineWebcams 'Cabrillo' page just re-embeds the SD Bay rotating feed). This SunDiegoLive Harbor Island South PTZ (hhIUB-W5Z50, verified LIVE) faces SOUTH toward the harbor entrance / Point Loma / Cabrillo — the truest live view of the monument area; pin marks Cabrillo, label notes the vantage.",
  },
  "earthcam-san-diego-bay": {
    provider: "youtube_live",
    name: "San Diego Bay Live — Downtown + Bay (SunDiegoLive rotating 4K)",
    stream_url: null,
    embed_url: "https://www.youtube.com/watch?v=edz0ux7JClE",
    media_url: null,
    status: "online",
    notes: "Fixed Jun 15 2026: dead EarthCam SD Bay replaced with the SunDiegoLive rotating/switched 4K feed (edz0ux7JClE, verified LIVE) — auto-rotates across Harbor Island / Shelter Island / Seaport Village downtown+bay views; Coronado Bridge appears in rotation.",
  },
  "earthcam-sd-bay": {
    provider: "earthcam",
    name: "EarthCam — San Diego Harbor (Maritime Museum / Star of India)",
    stream_url: null,
    embed_url: "https://www.earthcam.com/usa/california/sandiego/harbor/?cam=sandiego",
    media_url: null,
    status: "online",
    notes: "Fixed Jun 15 2026: replaced the offline /sandiego/bay/ cam (serving a 2025 archive) with the live EarthCam San Diego Harbor cam 20288 (Maritime Museum, N. Harbor Dr) — verified live; server re-scrapes its per-minute td-tokened HLS.",
  },
  "caltrans-d11-sr75-coronado-bridge": {
    provider: "caltrans",
    name: "SR-282 at 4th & Alameda, Coronado (Bay Bridge approach)",
    stream_url: "https://wzmedia.dot.ca.gov/D11/C304_SB_282_at_4th_and_Alameda_Coronado.stream/playlist.m3u8",
    embed_url: "https://cwwp2.dot.ca.gov/vm/loc/d11/c304sb2824thandalamedacoronado.htm",
    media_url: "https://cwwp2.dot.ca.gov/data/d11/cctv/image/c304sb2824thandalamedacoronado/c304sb2824thandalamedacoronado.jpg",
    status: "online",
    coordinates: [-117.1838, 32.6984],
    notes: "Fixed Jun 15 2026: legacy SR-75 row dropped by Caltrans D11; replaced with live D11 C304 SR-282 at 4th & Alameda — the Coronado-end Bay Bridge approach. Direct HLS (no token gate) + JPEG snapshot, verified 200. (Bay/SD-end view via youtube-sd-bay-east-mike-hess-seaport.)",
  },
}

// ids with NO working camera at their location → deliberate red/off.
const MARK_OFFLINE = {
  "caltrans-d11-sr75-orange-ave": "Confirmed Jun 15 2026: no live camera on SR-75/Orange Ave. Hotel del Coronado cams (nearby) cover Coronado beachfront. Shown red/off — not auto-flagged.",
  "caltrans-d11-sr75-silverstrand": "Confirmed Jun 15 2026: no live bay-side Silver Strand camera exists. Shown red/off — not auto-flagged.",
  "caltrans-d11-sr75-palm-ave": "Confirmed Jun 15 2026: no live camera at SR-75 Palm Ave / Imperial Beach. Shown red/off — not auto-flagged.",
  "scripps-pier-sio-cam": "Confirmed Jun 15 2026: the SIO surface piercam feed is down. A live Scripps Pier Underwater cam is on the map separately (hdontap-018408). Shown red/off — not auto-flagged.",
  "earthcam-imperial-beach-pier": "Confirmed Jun 15 2026: no working live Imperial Beach Pier camera found. Shown red/off — not auto-flagged.",
}

function ytFeature(id, name, lat, lng, videoId, category, notes) {
  return {
    type: "Feature",
    properties: { id, provider: "youtube_live", kind: "permanent", name, stream_url: null, embed_url: `https://www.youtube.com/watch?v=${videoId}`, media_url: null, category, status: "online", location_confidence: 1, source: "sd-harvest-jun15-2026", notes },
    geometry: { type: "Point", coordinates: [lng, lat] },
  }
}

const ADD = [
  ytFeature("youtube-sd-harbor-island-east-downtown", "Harbor Island East — faces Downtown San Diego skyline (4K)", 32.7269, -117.2106, "iaBfYxbmwXA", "marine", "SunDiegoLive PTZ at Tom Ham's Lighthouse; usually points east at the downtown skyline / Embarcadero / USS Midway. Verified LIVE 2026-06-15."),
  ytFeature("youtube-sd-bay-east-mike-hess-seaport", "San Diego Bay East — Seaport Village (downtown / Convention Center / Coronado Bridge)", 32.7088, -117.1709, "OAk3giBu5_k", "marine", "SunDiegoLive at Mike Hess Brewery, Seaport Village — eastern bay toward downtown, Convention Center, Coronado Bridge, USS Midway, Navy vessels. Verified LIVE 2026-06-15."),
  ytFeature("youtube-sd-shelter-island-balihai-east-downtown", "Bali Hai, Shelter Island — faces EAST toward Downtown skyline (4K)", 32.7106, -117.2243, "OUB8NDFSmFI", "marine", "SunDiegoLive at Bali Hai, faces east across the bay toward the downtown skyline. Verified LIVE 2026-06-15."),
  ytFeature("youtube-sd-shelter-island-balihai-north", "Bali Hai, Shelter Island (N) — San Diego Bay / airport departures", 32.7108, -117.2240, "ct7IRmzDggk", "marine", "SunDiegoLive at Bali Hai facing north over the bay toward Lindbergh departures; wide bay, Navy vessels. Verified LIVE 2026-06-15."),
  ytFeature("youtube-sd-shelter-island-pier", "Shelter Island Pier — San Diego Bay channel entrance", 32.7080, -117.2330, "UnTDO-7BV1k", "marine", "SunDiegoLive atop Fathom Bistro, Shelter Island Pier — bay channel entrance; vessels transiting to/from downtown pass through frame. Verified LIVE 2026-06-15."),
  {
    type: "Feature",
    properties: { id: "redideo-sd-gaslamp-quarter-hls", provider: "redideo", kind: "permanent", name: "Gaslamp Quarter — Fifth Ave toward Convention Center / Petco Park", stream_url: "https://redideostudio.com/hls/stream_1080p.m3u8", embed_url: null, media_url: null, category: "landmark", status: "online", location_confidence: 1, source: "sd-harvest-jun15-2026", notes: "Direct HLS (#EXTM3U verified, growing media sequence) — Gaslamp Quarter, Fifth Avenue looking SE. Proxied for CORS." },
    geometry: { type: "Point", coordinates: [-117.1601, 32.7113] },
  },
  {
    type: "Feature",
    properties: { id: "ipcamlive-altitude-sky-lounge-downtown", provider: "ipcamlive", kind: "permanent", name: "Altitude Sky Lounge (Marriott Gaslamp, 22nd fl) — Downtown skyline + Petco Park + Bay", stream_url: null, embed_url: null, media_url: "/api/eagle/cam-image?url=" + encodeURIComponent("https://www.ipcamlive.com/player/snapshot.php?alias=6183ebf49a06f"), category: "landmark", status: "online", location_confidence: 1, source: "sd-harvest-jun15-2026", notes: "22nd-floor rooftop (660 K St) panorama: downtown skyline, Petco Park, Coronado, San Diego Bay. Auto-updating JPEG (HLS is token-gated)." },
    geometry: { type: "Point", coordinates: [-117.1572, 32.7095] },
  },
  {
    type: "Feature",
    properties: { id: "sandiegosailing-harbor-channel-snapshot", provider: "snapshot", kind: "permanent", name: "San Diego Sailing (Point Loma) — Harbor Island, bay channel, downtown skyline (4K)", stream_url: null, embed_url: null, media_url: "https://www.sandiegosailing.com/images/webcam.jpg", category: "marine", status: "online", location_confidence: 1, source: "sd-harvest-jun15-2026", notes: "Point Loma / Harbor Island — bay channel entrance, a bit of Coronado, downtown skyline. Auto-updating JPEG." },
    geometry: { type: "Point", coordinates: [-117.2330, 32.7270] },
  },
  {
    type: "Feature",
    properties: { id: "windy-coronado-hotel-del", provider: "windy", kind: "permanent", name: "Windy — Coronado (Hotel del area)", stream_url: null, embed_url: "https://www.windy.com/webcams/1513635070", media_url: null, category: "surf", status: "online", location_confidence: 1, source: "sd-harvest-jun15-2026", notes: "Windy webcam — Coronado / Hotel del / Pacific beachfront." },
    geometry: { type: "Point", coordinates: [-117.1780, 32.6810] },
  },
]

// ids to delete (superseded — e.g. now covered by a fixed entry on the same stream).
const REMOVE = new Set(["youtube-sd-harbor-island-south"])

const fc = JSON.parse(await readFile(SEED, "utf8"))
const removedCount = fc.features.filter((f) => REMOVE.has(f.properties.id)).length
fc.features = fc.features.filter((f) => !REMOVE.has(f.properties.id))
const byId = new Map(fc.features.map((f) => [f.properties.id, f]))
let fixed = 0, reddened = 0, added = 0, skipped = 0

for (const [id, patch] of Object.entries(FIXES)) {
  const f = byId.get(id)
  if (!f) { console.warn(`[fix] MISSING ${id}`); continue }
  const { coordinates, ...props } = patch
  Object.assign(f.properties, props)
  delete f.properties.source_status
  if (coordinates) f.geometry.coordinates = coordinates
  fixed++
}
for (const [id, note] of Object.entries(MARK_OFFLINE)) {
  const f = byId.get(id)
  if (!f) { console.warn(`[red] MISSING ${id}`); continue }
  f.properties.status = "offline"
  f.properties.source_status = "offline"
  f.properties.notes = note
  reddened++
}
for (const feat of ADD) {
  if (byId.has(feat.properties.id)) { skipped++; continue }
  fc.features.push(feat)
  byId.set(feat.properties.id, feat)
  added++
}

fc.generated_at = new Date().toISOString()
const header = `{\n  "type": "FeatureCollection",\n  "generated_at": ${JSON.stringify(fc.generated_at)},\n  "source": ${JSON.stringify(fc.source)},\n  "note": ${JSON.stringify(fc.note || "")},\n  "features": [\n`
const body = fc.features.map((f) => "    " + JSON.stringify(f)).join(",\n")
await writeFile(SEED, header + body + "\n  ]\n}\n", "utf8")
console.log(`[sd-fixes] fixed=${fixed} reddened=${reddened} added=${added} removed=${removedCount} skipped(dupe)=${skipped} total=${fc.features.length}`)
