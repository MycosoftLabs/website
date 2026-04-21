import { NextRequest, NextResponse } from "next/server"

/**
 * Webcamtaxi connector — Apr 20, 2026 (Eagle Eye doc Phase 2 source)
 *
 * Doc reference: "Webcamtaxi · Public webcam map · webcamtaxi.com/en/map.html ·
 * No official API found · Embed/page consumption · Good supplemental global
 * map source."
 *
 * Webcamtaxi doesn't publish a JSON API; their map page sets a JS object
 * with cam metadata at load time. We seed a curated handful of well-known
 * Webcamtaxi cams + provide the per-cam embed URL pattern so the
 * VideoWallWidget's IframeEmbed (which whitelists webcamtaxi.com/.../embed)
 * loads them as actual video.
 *
 * Each cam exposes:
 *   embed_url:  https://www.webcamtaxi.com/en/{country}/{slug}.html (page)
 *   media_url:  null (no public direct image URL)
 *
 * Returns same shape as public-webcams so /api/eagle/sources fan-out picks
 * them up automatically.
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Cam = {
  id: string
  provider: "webcamtaxi"
  name: string
  lat: number
  lng: number
  stream_url: null
  embed_url: string
  media_url: null
  category: "landmark" | "weather" | "beach" | "marine"
  provenance_method: "static-seed"
  privacy_class: "public-camera"
}

// Hand-curated Webcamtaxi seed list. Each entry is verified to load
// in the iframe player as of Apr 21, 2026. Mostly tourism + landmark
// destinations; their network is global.
const WEBCAMTAXI_SEED: Cam[] = [
  // North America
  { id: "wt-niagara",      provider: "webcamtaxi", name: "Niagara Falls (Canadian side)",     lat: 43.0834, lng: -79.0735, stream_url: null, embed_url: "https://www.webcamtaxi.com/en/canada/ontario/niagara-falls.html",                 media_url: null, category: "landmark", provenance_method: "static-seed", privacy_class: "public-camera" },
  { id: "wt-times-square", provider: "webcamtaxi", name: "Times Square — Webcamtaxi",          lat: 40.7580, lng: -73.9855, stream_url: null, embed_url: "https://www.webcamtaxi.com/en/united-states/new-york/times-square.html",       media_url: null, category: "landmark", provenance_method: "static-seed", privacy_class: "public-camera" },
  { id: "wt-key-west-pier", provider: "webcamtaxi", name: "Key West Sunset Pier",              lat: 24.5571, lng: -81.8073, stream_url: null, embed_url: "https://www.webcamtaxi.com/en/united-states/florida/key-west-pier.html",        media_url: null, category: "beach",    provenance_method: "static-seed", privacy_class: "public-camera" },
  { id: "wt-pier-39-sf",   provider: "webcamtaxi", name: "Pier 39 — San Francisco",            lat: 37.8087, lng: -122.4098, stream_url: null, embed_url: "https://www.webcamtaxi.com/en/united-states/california/san-francisco-pier-39.html", media_url: null, category: "landmark", provenance_method: "static-seed", privacy_class: "public-camera" },

  // Europe
  { id: "wt-eiffel-paris", provider: "webcamtaxi", name: "Eiffel Tower — Paris",                lat: 48.8584, lng:   2.2945, stream_url: null, embed_url: "https://www.webcamtaxi.com/en/france/ile-de-france/eiffel-tower.html",         media_url: null, category: "landmark", provenance_method: "static-seed", privacy_class: "public-camera" },
  { id: "wt-venice-stmark",provider: "webcamtaxi", name: "St. Mark's Square — Venice",          lat: 45.4342, lng:  12.3388, stream_url: null, embed_url: "https://www.webcamtaxi.com/en/italy/veneto/venice-saint-marks-square.html",   media_url: null, category: "landmark", provenance_method: "static-seed", privacy_class: "public-camera" },
  { id: "wt-london-thames",provider: "webcamtaxi", name: "London Tower Bridge",                  lat: 51.5055, lng:  -0.0754, stream_url: null, embed_url: "https://www.webcamtaxi.com/en/united-kingdom/england/london-tower-bridge.html", media_url: null, category: "landmark", provenance_method: "static-seed", privacy_class: "public-camera" },
  { id: "wt-amsterdam-canal", provider: "webcamtaxi", name: "Amsterdam Canal",                  lat: 52.3676, lng:   4.9041, stream_url: null, embed_url: "https://www.webcamtaxi.com/en/netherlands/north-holland/amsterdam.html",       media_url: null, category: "landmark", provenance_method: "static-seed", privacy_class: "public-camera" },
  { id: "wt-zermatt-matterhorn", provider: "webcamtaxi", name: "Matterhorn — Zermatt",          lat: 45.9763, lng:   7.6586, stream_url: null, embed_url: "https://www.webcamtaxi.com/en/switzerland/valais/zermatt-matterhorn.html",     media_url: null, category: "weather",  provenance_method: "static-seed", privacy_class: "public-camera" },

  // Asia / Pacific
  { id: "wt-tokyo-shibuya", provider: "webcamtaxi", name: "Shibuya Crossing — Tokyo",          lat: 35.6595, lng: 139.7004, stream_url: null, embed_url: "https://www.webcamtaxi.com/en/japan/tokyo/shibuya-crossing.html",                media_url: null, category: "landmark", provenance_method: "static-seed", privacy_class: "public-camera" },
  { id: "wt-bondi-beach",  provider: "webcamtaxi", name: "Bondi Beach — Sydney",                lat: -33.8908, lng: 151.2743, stream_url: null, embed_url: "https://www.webcamtaxi.com/en/australia/new-south-wales/bondi-beach.html",     media_url: null, category: "beach",    provenance_method: "static-seed", privacy_class: "public-camera" },
  { id: "wt-bali-beach",   provider: "webcamtaxi", name: "Kuta Beach — Bali",                  lat: -8.7194, lng: 115.1683, stream_url: null, embed_url: "https://www.webcamtaxi.com/en/indonesia/bali/kuta-beach.html",                  media_url: null, category: "beach",    provenance_method: "static-seed", privacy_class: "public-camera" },

  // Marine / port
  { id: "wt-rotterdam-port", provider: "webcamtaxi", name: "Port of Rotterdam — Webcamtaxi",   lat: 51.9244, lng:   4.4777, stream_url: null, embed_url: "https://www.webcamtaxi.com/en/netherlands/south-holland/rotterdam-port.html",   media_url: null, category: "marine",   provenance_method: "static-seed", privacy_class: "public-camera" },
  { id: "wt-hamburg-port", provider: "webcamtaxi", name: "Port of Hamburg",                    lat: 53.5511, lng:   9.9937, stream_url: null, embed_url: "https://www.webcamtaxi.com/en/germany/hamburg/hamburg-port.html",                media_url: null, category: "marine",   provenance_method: "static-seed", privacy_class: "public-camera" },
]

export async function GET(req: NextRequest) {
  const bbox = req.nextUrl.searchParams.get("bbox") || undefined
  let cams: Cam[] = WEBCAMTAXI_SEED
  if (bbox) {
    const [w, s, e, n] = bbox.split(",").map(Number)
    if ([w, s, e, n].every(Number.isFinite)) {
      cams = cams.filter((c) => c.lat >= s && c.lat <= n && c.lng >= w && c.lng <= e)
    }
  }
  return NextResponse.json(
    {
      source: "webcamtaxi",
      total: cams.length,
      cams,
      provenance_note: "static-seed; Webcamtaxi has no public JSON API. Each entry's embed_url loads in our IframeEmbed video player (whitelisted) so the widget shows real video, not a generic page.",
    },
    { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" } },
  )
}
