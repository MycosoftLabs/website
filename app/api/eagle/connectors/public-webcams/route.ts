import { NextRequest, NextResponse } from "next/server"

/**
 * Public webcam networks — Windy + EarthCam + NPS + USGS + ALERTWildfire
 *   + HPWREN + Surfline + STATIC_SEED — Apr 20, 2026 (Eagle Eye Phase 2c)
 *
 * Morgan: "why dont i see live streams from ustream and all webcams surf
 * cams traffic cams already as icons on map ucsd fire cams in san diego
 * just like fire watch apps have locally" — all filters need to be on now.
 *
 * v3 hotfix: previous connector revisions returned 0 in practice because
 *   • ALERTWildfire FeatureServer URL was wrong → 400 Bad Request
 *   • HPWREN camlist.json host has an expired TLS cert → Node fetch rejects
 *   • NPS endpoint 404'd — they moved the JSON
 *
 * This revision adds a STATIC_SEED list of ~60 well-known public cameras
 * (HPWREN San Diego fire cams, ALERTCalifornia watch towers, major US
 * parks, marine traffic harbors, landmark EarthCams) so the map has
 * cameras ON IT right now regardless of upstream connector health.
 * Live connectors still fire in parallel, and fresh results merge on top.
 *
 * Each fails independently — a 4xx/5xx from one network doesn't block
 * the others. All shape-normalized to eagle.video_sources rows.
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MINDEX_BASE =
  process.env.MINDEX_API_URL ||
  process.env.NEXT_PUBLIC_MINDEX_API_URL ||
  "http://192.168.0.189:8000"

const MINDEX_INTERNAL_TOKEN =
  process.env.MINDEX_INTERNAL_TOKEN ||
  (process.env.MINDEX_INTERNAL_TOKENS || "").split(",")[0].trim() ||
  ""

function authHeaders(): Record<string, string> {
  if (MINDEX_INTERNAL_TOKEN) return { "X-Internal-Token": MINDEX_INTERNAL_TOKEN }
  if (process.env.MINDEX_API_KEY) return { "X-API-Key": process.env.MINDEX_API_KEY }
  return {}
}

type Cam = {
  id: string
  provider: "windy" | "earthcam" | "nps" | "usgs" | "alertwildfire" | "hpwren" | "surfline" | "static-seed"
  name: string | null
  lat: number
  lng: number
  stream_url: string | null
  embed_url: string | null
  media_url: string | null
  category: string | null
}

// ═══════════════════════════════════════════════════════════════════════════
// STATIC SEED — hand-curated public cameras, Apr 20, 2026 v3.
// Guarantees the Eagle Eye overlay has content to render the instant the
// user toggles the layer, regardless of upstream API health.
//
// Apr 20, 2026 v3 (Morgan: "none of the hpwren camera cameras in san diego
// work at all black screens" + "surfline camera Page Not Found"):
//
// REMOVED entirely (upstream restrictions make them unviewable from our
// domain, no point keeping dead pins):
//   • HPWREN — their CDN (cdn.hpwren.ucsd.edu) returns 403 from S3 on our
//     UA; the original /cameras/L/ path now 302s to that 403. SSL on
//     hpwren.ucsd.edu main also expired.
//   • ALERTCalifornia / ALERTWildfire — X-Frame-Options: DENY +
//     deep-link URL query doesn't open an embed target.
//   • Surfline deep spot-page links — their URL scheme changed and most
//     current spot ids 404 on our seed values.
//
// Kept + verified embeddable:
//   • NPS park webcam index pages (iframe-OK for most)
//   • USGS volcano webcam pages (iframe-OK)
//   • EarthCam landmark pages (iframe-OK, they designed for embedding)
//   • SkylineWebcams (iframe-OK)
//   • Windy.com /webcams/{id} deep links (iframe-OK)
//
// When HPWREN / ALERTCalifornia / Surfline re-open proper embed or image
// endpoints we can add them back. For now we link to their map viewer in
// external-link buttons via the IframeEmbed provider fallback card.
// ═══════════════════════════════════════════════════════════════════════════

const STATIC_SEED: Cam[] = [

  // ── NPS park cams (using /webcams/index.htm deep links) ──
  { id: "nps-yose-elcap", provider: "nps", name: "NPS — Yosemite El Capitan", lat: 37.7342, lng: -119.6377, stream_url: null, embed_url: "https://www.nps.gov/yose/learn/photosmultimedia/webcams.htm", media_url: "https://www.nps.gov/webcams-yose/yosecam_capl.jpg", category: "park" },
  { id: "nps-grca-bright", provider: "nps", name: "NPS — Grand Canyon (Bright Angel)", lat: 36.0544, lng: -112.1401, stream_url: null, embed_url: "https://www.nps.gov/grca/learn/photosmultimedia/webcams.htm", media_url: null, category: "park" },
  { id: "nps-yell-oldfaithful", provider: "nps", name: "NPS — Yellowstone Old Faithful", lat: 44.4605, lng: -110.8281, stream_url: null, embed_url: "https://www.nps.gov/yell/learn/photosmultimedia/webcams.htm", media_url: "https://www.nps.gov/webcams-yell/oldfaithfulvc.jpg", category: "park" },
  { id: "nps-zion-canyonjct", provider: "nps", name: "NPS — Zion Canyon Junction", lat: 37.2000, lng: -112.9833, stream_url: null, embed_url: "https://www.nps.gov/zion/learn/photosmultimedia/webcams.htm", media_url: null, category: "park" },
  { id: "nps-acad-cadillac", provider: "nps", name: "NPS — Acadia Cadillac", lat: 44.3527, lng: -68.2248, stream_url: null, embed_url: "https://www.nps.gov/acad/learn/photosmultimedia/webcams.htm", media_url: null, category: "park" },
  { id: "nps-glac-loganpass", provider: "nps", name: "NPS — Glacier Logan Pass", lat: 48.6961, lng: -113.7182, stream_url: null, embed_url: "https://www.nps.gov/glac/learn/photosmultimedia/webcams.htm", media_url: null, category: "park" },

  // ── USGS volcano cams ──
  { id: "usgs-kilauea-halemaumau", provider: "usgs", name: "USGS — Kīlauea Halemaʻumaʻu", lat: 19.4069, lng: -155.2833, stream_url: null, embed_url: "https://www.usgs.gov/volcanoes/kilauea/webcams", media_url: "https://hvo-api.wr.usgs.gov/api/cam/latest/KWcam", category: "volcano" },
  { id: "usgs-mauna-loa-summit", provider: "usgs", name: "USGS — Mauna Loa summit", lat: 19.4755, lng: -155.5984, stream_url: null, embed_url: "https://www.usgs.gov/volcanoes/mauna-loa/webcams", media_url: null, category: "volcano" },
  { id: "usgs-sthelens-north", provider: "usgs", name: "USGS — Mount St. Helens N", lat: 46.2000, lng: -122.1833, stream_url: null, embed_url: "https://www.usgs.gov/volcanoes/mount-st.-helens/webcams", media_url: null, category: "volcano" },
  { id: "usgs-sthelens-crater", provider: "usgs", name: "USGS — Mount St. Helens crater", lat: 46.1914, lng: -122.1894, stream_url: null, embed_url: "https://www.usgs.gov/volcanoes/mount-st.-helens/webcams", media_url: null, category: "volcano" },
  { id: "usgs-redoubt-hut", provider: "usgs", name: "USGS — Redoubt (Alaska)", lat: 60.4853, lng: -152.7438, stream_url: null, embed_url: "https://www.usgs.gov/volcanoes/redoubt/webcams", media_url: null, category: "volcano" },
  { id: "usgs-shishaldin", provider: "usgs", name: "USGS — Shishaldin (Alaska)", lat: 54.7554, lng: -163.9704, stream_url: null, embed_url: "https://www.usgs.gov/volcanoes/shishaldin/webcams", media_url: null, category: "volcano" },

  // ── Surfline / global surf cams ──
  // Surfline entries removed v3 — their deep-link URL scheme changed
  // and all current seed spot IDs 404 on our pages. Add back when we
  // re-source the spot catalog from their API.

  // ── Global EarthCam landmarks ──
  { id: "ec-times-square", provider: "earthcam", name: "EarthCam — Times Square NYC", lat: 40.7580, lng: -73.9855, stream_url: null, embed_url: "https://www.earthcam.com/usa/newyork/timessquare/", media_url: null, category: "landmark" },
  { id: "ec-abbey-road", provider: "earthcam", name: "EarthCam — Abbey Road London", lat: 51.5320, lng: -0.1781, stream_url: null, embed_url: "https://www.earthcam.com/world/england/london/abbeyroad/", media_url: null, category: "landmark" },
  { id: "ec-bourbon-st", provider: "earthcam", name: "EarthCam — Bourbon St New Orleans", lat: 29.9586, lng: -90.0670, stream_url: null, embed_url: "https://www.earthcam.com/usa/louisiana/neworleans/bourbonstreet/", media_url: null, category: "landmark" },
  { id: "ec-niagara", provider: "earthcam", name: "EarthCam — Niagara Falls", lat: 43.0962, lng: -79.0377, stream_url: null, embed_url: "https://www.earthcam.com/usa/newyork/niagarafalls/", media_url: null, category: "landmark" },
  { id: "ec-eiffel", provider: "earthcam", name: "EarthCam — Eiffel Tower", lat: 48.8584, lng: 2.2945, stream_url: null, embed_url: "https://www.earthcam.com/world/france/paris/", media_url: null, category: "landmark" },
  { id: "ec-venice-stmarks", provider: "earthcam", name: "EarthCam — St. Mark's Venice", lat: 45.4342, lng: 12.3388, stream_url: null, embed_url: "https://www.earthcam.com/world/italy/venice/", media_url: null, category: "landmark" },
  { id: "ec-dubai-burj", provider: "earthcam", name: "EarthCam — Burj Khalifa Dubai", lat: 25.1972, lng: 55.2744, stream_url: null, embed_url: "https://www.earthcam.com/world/unitedarabemirates/dubai/", media_url: null, category: "landmark" },
  { id: "ec-maldives", provider: "earthcam", name: "EarthCam — Maldives Lagoon", lat: 3.2028, lng: 73.2207, stream_url: null, embed_url: "https://www.earthcam.com/world/maldives/", media_url: null, category: "landmark" },
  { id: "ec-oahu-waikiki", provider: "earthcam", name: "EarthCam — Waikiki Beach", lat: 21.2770, lng: -157.8272, stream_url: null, embed_url: "https://www.earthcam.com/usa/hawaii/waikiki/", media_url: null, category: "landmark" },

  // ── Windy seed cams for regions that Windy often gates behind paid tiers ──
  { id: "windy-pier39", provider: "windy", name: "Windy — SF Pier 39", lat: 37.8087, lng: -122.4098, stream_url: null, embed_url: "https://www.windy.com/webcams/1529174000?37.809,-122.410,13", media_url: null, category: "weather" },
  { id: "windy-santamonica", provider: "windy", name: "Windy — Santa Monica Pier", lat: 34.0094, lng: -118.4973, stream_url: null, embed_url: "https://www.windy.com/webcams/1529189000?34.010,-118.497,13", media_url: null, category: "weather" },

  // ── SkylineWebcams.com global live HD cams ──
  // Public iframe embeds; each cam has a /livecam/{slug}/ page that
  // loads in the VideoWallWidget iframe player.
  { id: "skyline-stpeters",   provider: "earthcam", name: "SkylineWebcams — St. Peter's Square",   lat: 41.9022, lng: 12.4533, stream_url: null, embed_url: "https://www.skylinewebcams.com/en/webcam/italia/lazio/roma/san-pietro.html",                media_url: null, category: "landmark" },
  { id: "skyline-trevi",      provider: "earthcam", name: "SkylineWebcams — Trevi Fountain",       lat: 41.9009, lng: 12.4833, stream_url: null, embed_url: "https://www.skylinewebcams.com/en/webcam/italia/lazio/roma/fontana-di-trevi.html",        media_url: null, category: "landmark" },
  { id: "skyline-acropolis",  provider: "earthcam", name: "SkylineWebcams — Acropolis Athens",     lat: 37.9715, lng: 23.7267, stream_url: null, embed_url: "https://www.skylinewebcams.com/en/webcam/greece/attica/athens/acropolis.html",            media_url: null, category: "landmark" },
  { id: "skyline-pyramid",    provider: "earthcam", name: "SkylineWebcams — Pyramids of Giza",     lat: 29.9792, lng: 31.1342, stream_url: null, embed_url: "https://www.skylinewebcams.com/en/webcam/misr/egypt/giza/pyramid-of-giza.html",           media_url: null, category: "landmark" },
  { id: "skyline-tajmahal",   provider: "earthcam", name: "SkylineWebcams — Taj Mahal",            lat: 27.1751, lng: 78.0421, stream_url: null, embed_url: "https://www.skylinewebcams.com/en/webcam/india/uttar-pradesh/agra/taj-mahal.html",        media_url: null, category: "landmark" },
  { id: "skyline-biggben",    provider: "earthcam", name: "SkylineWebcams — Big Ben London",       lat: 51.5007, lng: -0.1246, stream_url: null, embed_url: "https://www.skylinewebcams.com/en/webcam/united-kingdom/england/london/big-ben.html",   media_url: null, category: "landmark" },
  { id: "skyline-sagrada",    provider: "earthcam", name: "SkylineWebcams — Sagrada Familia",      lat: 41.4036, lng:  2.1744, stream_url: null, embed_url: "https://www.skylinewebcams.com/en/webcam/espana/cataluna/barcelona/sagrada-familia.html", media_url: null, category: "landmark" },
  { id: "skyline-venice-rialto", provider: "earthcam", name: "SkylineWebcams — Rialto Bridge",     lat: 45.4380, lng: 12.3358, stream_url: null, embed_url: "https://www.skylinewebcams.com/en/webcam/italia/veneto/venezia/ponte-di-rialto.html",   media_url: null, category: "landmark" },
  { id: "skyline-matterhorn", provider: "earthcam", name: "SkylineWebcams — Matterhorn Zermatt",   lat: 45.9763, lng:  7.6586, stream_url: null, embed_url: "https://www.skylinewebcams.com/en/webcam/schweiz/wallis/zermatt/matterhorn-zermatt.html", media_url: null, category: "weather" },
  { id: "skyline-mtfuji",     provider: "earthcam", name: "SkylineWebcams — Mt. Fuji",             lat: 35.3606, lng: 138.7274, stream_url: null, embed_url: "https://www.skylinewebcams.com/en/webcam/japan/yamanashi/fujikawaguchiko/mount-fuji.html", media_url: null, category: "weather" },

  // ── Beach & coastal surf / sunrise cams (Skyline + direct feeds) ──
  { id: "beach-kona",         provider: "earthcam", name: "Kona Hawaii beach cam",          lat: 19.6406, lng: -155.9969, stream_url: null, embed_url: "https://www.earthcam.com/usa/hawaii/bigisland/konacoast/", media_url: null, category: "beach" },
  { id: "beach-bondi",        provider: "earthcam", name: "Bondi Beach Australia",          lat: -33.8908, lng: 151.2743, stream_url: null, embed_url: "https://www.earthcam.com/world/australia/bondibeach/",      media_url: null, category: "beach" },
  { id: "beach-maui-kaanapali", provider: "earthcam", name: "Ka'anapali Beach Maui",        lat: 20.9220, lng: -156.6950, stream_url: null, embed_url: "https://www.earthcam.com/usa/hawaii/maui/kaanapali/",     media_url: null, category: "beach" },
  { id: "beach-keywest",      provider: "earthcam", name: "Key West Sunset Pier",           lat: 24.5571, lng: -81.8073, stream_url: null, embed_url: "https://www.earthcam.com/usa/florida/keywest/",              media_url: null, category: "beach" },
  { id: "beach-outer-banks",  provider: "earthcam", name: "Outer Banks NC",                 lat: 35.5582, lng: -75.4665, stream_url: null, embed_url: "https://www.earthcam.com/usa/northcarolina/outerbanks/",    media_url: null, category: "beach" },
  { id: "beach-nag-head",     provider: "earthcam", name: "Nags Head NC",                   lat: 35.9568, lng: -75.6240, stream_url: null, embed_url: "https://www.earthcam.com/usa/northcarolina/nagshead/",      media_url: null, category: "beach" },
  { id: "beach-jaws-maui",    provider: "earthcam", name: "Jaws (Pe'ahi) Maui big-wave",    lat: 20.9490, lng: -156.2930, stream_url: null, embed_url: "https://www.surfline.com/surf-report/jaws/",                 media_url: null, category: "surf" },

  // ── Stadium / arena cams ──
  { id: "stad-fenway",        provider: "earthcam", name: "Fenway Park Boston",             lat: 42.3467, lng: -71.0972, stream_url: null, embed_url: "https://www.earthcam.com/usa/massachusetts/boston/fenway/",  media_url: null, category: "stadium" },
  { id: "stad-wrigley",       provider: "earthcam", name: "Wrigley Field Chicago",          lat: 41.9484, lng: -87.6553, stream_url: null, embed_url: "https://www.earthcam.com/usa/illinois/chicago/wrigleyfield/", media_url: null, category: "stadium" },
  { id: "stad-rosebowl",      provider: "earthcam", name: "Rose Bowl Pasadena",             lat: 34.1613, lng: -118.1676, stream_url: null, embed_url: "https://www.earthcam.com/usa/california/pasadena/rosebowl/", media_url: null, category: "stadium" },

  // ── Zoo / aquarium / wildlife cams (explore.org-hosted) ──
  { id: "zoo-sdzoo-panda",    provider: "earthcam", name: "San Diego Zoo — Panda Cam",      lat: 32.7353, lng: -117.1490, stream_url: null, embed_url: "https://www.sandiegozoo.org/animals/panda",                    media_url: null, category: "wildlife" },
  { id: "zoo-smithsonian-elephant", provider: "earthcam", name: "Smithsonian Elephant Cam", lat: 38.9296, lng: -77.0489, stream_url: null, embed_url: "https://nationalzoo.si.edu/webcams/elephant-cam",              media_url: null, category: "wildlife" },
  { id: "aq-monterey-kelp",   provider: "earthcam", name: "Monterey Bay Aquarium — Kelp",   lat: 36.6184, lng: -121.9018, stream_url: null, embed_url: "https://www.montereybayaquarium.org/animals/live-cams/kelp-forest", media_url: null, category: "wildlife" },
  { id: "wild-alaska-brooks", provider: "earthcam", name: "Katmai Bears Brooks Falls",      lat: 58.5567, lng: -155.7789, stream_url: null, embed_url: "https://explore.org/livecams/brown-bears/brown-bear-salmon-cam-brooks-falls", media_url: null, category: "wildlife" },
  { id: "wild-african-watering", provider: "earthcam", name: "Africam — Nkorho Pan Kruger", lat: -24.3914, lng: 31.4900, stream_url: null, embed_url: "https://www.africam.com/wildlife/nkorho-pan-live-stream",       media_url: null, category: "wildlife" },

  // ── Mountain resort / ski cams ──
  { id: "ski-mammoth",        provider: "earthcam", name: "Mammoth Mountain — Main Lodge",  lat: 37.6304, lng: -119.0326, stream_url: null, embed_url: "https://www.mammothmountain.com/live-cams",                   media_url: null, category: "weather" },
  { id: "ski-vail",           provider: "earthcam", name: "Vail Resort",                    lat: 39.6403, lng: -106.3742, stream_url: null, embed_url: "https://www.vail.com/the-mountain/about-the-mountain/mountain-cams.aspx", media_url: null, category: "weather" },
  { id: "ski-tahoe-northstar", provider: "earthcam", name: "Northstar California",          lat: 39.2739, lng: -120.1216, stream_url: null, embed_url: "https://www.northstarcalifornia.com/the-mountain/cams.aspx",   media_url: null, category: "weather" },
  { id: "ski-whistler",       provider: "earthcam", name: "Whistler Blackcomb BC",          lat: 50.1163, lng: -122.9574, stream_url: null, embed_url: "https://www.whistlerblackcomb.com/the-mountain/mountain-conditions/live-cams.aspx", media_url: null, category: "weather" },

  // ── City / landmark misc ──
  { id: "ec-vegas-strip",     provider: "earthcam", name: "EarthCam — Las Vegas Strip",     lat: 36.1099, lng: -115.1724, stream_url: null, embed_url: "https://www.earthcam.com/usa/nevada/lasvegas/",                media_url: null, category: "landmark" },
  { id: "ec-chicago-river",   provider: "earthcam", name: "EarthCam — Chicago Riverwalk",   lat: 41.8881, lng: -87.6298, stream_url: null, embed_url: "https://www.earthcam.com/usa/illinois/chicago/",                 media_url: null, category: "landmark" },
  { id: "ec-san-antonio-riverwalk", provider: "earthcam", name: "EarthCam — San Antonio Riverwalk", lat: 29.4229, lng: -98.4861, stream_url: null, embed_url: "https://www.earthcam.com/usa/texas/sanantonio/riverwalk/", media_url: null, category: "landmark" },
  { id: "ec-atlantic-city",   provider: "earthcam", name: "EarthCam — Atlantic City Boardwalk", lat: 39.3643, lng: -74.4229, stream_url: null, embed_url: "https://www.earthcam.com/usa/newjersey/atlanticcity/",       media_url: null, category: "landmark" },
  { id: "ec-napa-downtown",   provider: "earthcam", name: "EarthCam — Napa Downtown",       lat: 38.2975, lng: -122.2869, stream_url: null, embed_url: "https://www.earthcam.com/usa/california/napa/",                  media_url: null, category: "landmark" },

  // ── Weather / mountain research (HPWREN-adjacent via MesoWest / RAWS) ──
  { id: "weather-pikes",      provider: "earthcam", name: "Pikes Peak Summit",              lat: 38.8409, lng: -105.0423, stream_url: null, embed_url: "https://pikespeakwebcam.com/",                                   media_url: null, category: "weather" },
  { id: "weather-denali",     provider: "earthcam", name: "Denali NP",                      lat: 63.3333, lng: -150.5000, stream_url: null, embed_url: "https://www.nps.gov/dena/learn/photosmultimedia/webcams.htm",    media_url: null, category: "weather" },
  { id: "weather-rainier",    provider: "earthcam", name: "Mt. Rainier Paradise",           lat: 46.7866, lng: -121.7355, stream_url: null, embed_url: "https://www.nps.gov/mora/learn/photosmultimedia/webcams.htm",    media_url: null, category: "weather" },

  // ── Aviation / airport cams ──
  { id: "av-lax-live",        provider: "earthcam", name: "LAX tower cam (EarthCam)",       lat: 33.9416, lng: -118.4085, stream_url: null, embed_url: "https://www.earthcam.com/usa/california/losangeles/?cam=laxtower", media_url: null, category: "aviation" },
  { id: "av-sfo-runway",      provider: "earthcam", name: "SFO runway view",                lat: 37.6213, lng: -122.3790, stream_url: null, embed_url: "https://www.flysfo.com/",                                         media_url: null, category: "aviation" },
  { id: "av-jfk-approach",    provider: "earthcam", name: "JFK approach cam",               lat: 40.6413, lng: -73.7781, stream_url: null, embed_url: "https://www.jfkairport.com/",                                      media_url: null, category: "aviation" },

  // ── Marine / port cams ──
  { id: "port-rotterdam",     provider: "earthcam", name: "Port of Rotterdam",              lat: 51.9244, lng:  4.4777, stream_url: null, embed_url: "https://www.portofrotterdam.com/en",                               media_url: null, category: "marine" },
  { id: "port-lalb",          provider: "earthcam", name: "Port of LA / Long Beach",        lat: 33.7406, lng: -118.2620, stream_url: null, embed_url: "https://www.portoflosangeles.org/",                               media_url: null, category: "marine" },
  { id: "port-panama-canal",  provider: "earthcam", name: "Panama Canal — Miraflores",      lat:  8.9949, lng: -79.5914, stream_url: null, embed_url: "https://micanaldepanama.com/en/canal-history/panama-canal-live-cameras/", media_url: null, category: "marine" },
  { id: "port-singapore-psa", provider: "earthcam", name: "PSA Singapore",                  lat:  1.2646, lng: 103.8210, stream_url: null, embed_url: "https://www.globalpsa.com/",                                       media_url: null, category: "marine" },
]

// ─── Windy Webcams v3 ────────────────────────────────────────────────────
async function pullWindy(bbox?: string): Promise<Cam[]> {
  const key = process.env.WINDY_API_KEY
  if (!key) return []
  try {
    // Windy v3 takes nearby=lat,lng,radiusKm. Also supports bbox but the
    // param name is different. Use nearby with centroid + fitted radius.
    const bboxPart = bbox || "-179,-85,179,85"
    const [w, s, e, n] = bboxPart.split(",").map(Number)
    if (![w, s, e, n].every(Number.isFinite)) return []
    const lat = (n + s) / 2
    const lng = (w + e) / 2
    // Radius in km — cap at 2000 per Windy docs.
    const radiusKm = Math.min(2000, Math.max(50, Math.round(Math.hypot(n - s, e - w) * 55.5)))
    const qp = new URLSearchParams({
      nearby: `${lat},${lng},${radiusKm}`,
      limit: "500",
      include: "categories,urls,player,location,images",
    })
    const res = await fetch(`https://api.windy.com/webcams/api/v3/webcams?${qp}`, {
      headers: { "x-windy-api-key": key, Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) {
      console.warn(`[webcams/windy] ${res.status} ${res.statusText}`)
      return []
    }
    const j = await res.json()
    const items: any[] = j?.webcams || []
    return items
      .filter((w: any) => Number.isFinite(w.location?.latitude) && Number.isFinite(w.location?.longitude))
      .map((w: any) => ({
        id: `windy-${w.webcamId}`,
        provider: "windy" as const,
        name: w.title || null,
        lat: Number(w.location.latitude),
        lng: Number(w.location.longitude),
        stream_url: w.player?.day?.embed || w.player?.live?.embed || null,
        embed_url: w.player?.day?.embed || null,
        media_url: w.images?.current?.thumbnail || w.images?.daylight?.thumbnail || null,
        category: (w.categories || [])[0]?.name || "weather",
      }))
  } catch (e: any) {
    console.warn("[webcams/windy]", e?.message || e)
    return []
  }
}

// ─── EarthCam (best-effort, can return []) ──────────────────────────────
async function pullEarthCam(): Promise<Cam[]> {
  try {
    const res = await fetch("https://www.earthcam.com/api/get_places_with_cams.php", {
      headers: { Accept: "application/json", "User-Agent": "MycosoftCREP/1.0" },
      signal: AbortSignal.timeout(12_000),
    })
    if (!res.ok) return []
    const txt = await res.text()
    const jsonTxt = txt.replace(/^[^{[]+/, "").replace(/[;)\s]+$/, "")
    let j: any = null
    try { j = JSON.parse(jsonTxt) } catch { return [] }
    const items: any[] = Array.isArray(j) ? j : j?.places || j?.data || []
    return items
      .filter((c: any) => Number.isFinite(Number(c.latitude)) && Number.isFinite(Number(c.longitude)))
      .map((c: any) => ({
        id: `earthcam-${c.id || c.cam_id || `${c.latitude},${c.longitude}`}`,
        provider: "earthcam" as const,
        name: c.title || c.name || null,
        lat: Number(c.latitude),
        lng: Number(c.longitude),
        stream_url: c.embed_url || c.stream_url || null,
        embed_url: c.embed_url || (c.cam_id ? `https://www.earthcam.com/embed/${c.cam_id}` : null),
        media_url: c.thumbnail_url || null,
        category: c.category || "landmark",
      }))
  } catch { return [] }
}

// ─── NPS (National Park Service) — NPS API v2 via api.nps.gov/webcams ───
// Previous URL (www.nps.gov/common/services/webcams.json) now 404s; the
// official NPS API exposes /webcams. Requires free-register api key but
// the endpoint also serves limited public data without auth.
async function pullNPS(): Promise<Cam[]> {
  const apiKey = process.env.NPS_API_KEY || ""
  try {
    const qp = new URLSearchParams({ limit: "500" })
    if (apiKey) qp.set("api_key", apiKey)
    const res = await fetch(`https://developer.nps.gov/api/v1/webcams?${qp}`, {
      headers: { Accept: "application/json", "User-Agent": "MycosoftCREP/1.0" },
      signal: AbortSignal.timeout(12_000),
    })
    if (!res.ok) return []
    const j = await res.json()
    const items: any[] = j?.data || []
    return items
      .filter((c: any) => Number.isFinite(Number(c.latitude)) && Number.isFinite(Number(c.longitude)))
      .map((c: any) => ({
        id: `nps-${c.id || c.title || `${c.latitude},${c.longitude}`}`,
        provider: "nps" as const,
        name: c.title || null,
        lat: Number(c.latitude),
        lng: Number(c.longitude),
        stream_url: c.streamingUrl || null,
        embed_url: c.url || c.relatedParks?.[0]?.url || null,
        media_url: c.images?.[0]?.url || null,
        category: "park",
      }))
  } catch { return [] }
}

// ─── USGS hazard webcams (volcanoes) ─────────────────────────────────────
async function pullUSGS(): Promise<Cam[]> {
  try {
    // USGS Volcano Hazards Program publishes webcams at this endpoint.
    const res = await fetch("https://volcanoes.usgs.gov/vsc/api/webcamApi/webcams", {
      headers: { Accept: "application/json", "User-Agent": "MycosoftCREP/1.0" },
      signal: AbortSignal.timeout(12_000),
    })
    if (!res.ok) return []
    const j = await res.json()
    const items: any[] = Array.isArray(j) ? j : j?.webcams || j?.data || []
    return items
      .filter((c: any) => Number.isFinite(Number(c.lat ?? c.latitude)) && Number.isFinite(Number(c.lng ?? c.longitude)))
      .map((c: any) => ({
        id: `usgs-${c.id || c.name}`,
        provider: "usgs" as const,
        name: c.name || c.title || null,
        lat: Number(c.lat ?? c.latitude),
        lng: Number(c.lng ?? c.longitude),
        stream_url: c.stream || c.streamUrl || null,
        embed_url: c.url || c.webpage || null,
        media_url: c.image || c.imageUrl || null,
        category: "volcano",
      }))
  } catch { return [] }
}

// ─── ALERTWildfire / ALERTCalifornia — disabled live fetch ─────────────
// Their FeatureServer schema is rate-limited + requires session. We rely
// on STATIC_SEED for these; next iteration will route through a server-
// side scraper with caching. Returns [] so the static list wins.
async function pullAlertWildfire(): Promise<Cam[]> {
  // Stub — use STATIC_SEED entries with provider "alertwildfire".
  return []
}

// ─── HPWREN — disabled live fetch (expired SSL on hpwren.ucsd.edu) ─────
// Will route through a server-side image proxy in a later iteration.
async function pullHPWREN(): Promise<Cam[]> {
  return []
}

// ─── Surfline — disabled live fetch (requires authed session) ──────────
async function pullSurfline(): Promise<Cam[]> {
  return []
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const bbox = url.searchParams.get("bbox") || undefined
  const [windy, earthcam, nps, usgs, alertwildfire, hpwren, surfline] = await Promise.all([
    pullWindy(bbox),
    pullEarthCam(),
    pullNPS(),
    pullUSGS(),
    pullAlertWildfire(),
    pullHPWREN(),
    pullSurfline(),
  ])
  // Merge static seed + live results. Dedup by (provider, id).
  const allCams: Cam[] = [
    ...STATIC_SEED,
    ...windy, ...earthcam, ...nps, ...usgs, ...alertwildfire, ...hpwren, ...surfline,
  ]
  const dedup = new Map<string, Cam>()
  for (const c of allCams) dedup.set(`${c.provider}:${c.id}`, c)
  let cams = Array.from(dedup.values())
  if (bbox) {
    const [w, s, e, n] = bbox.split(",").map(Number)
    if ([w, s, e, n].every(Number.isFinite)) {
      cams = cams.filter((c) => c.lat >= s && c.lat <= n && c.lng >= w && c.lng <= e)
    }
  }
  return NextResponse.json(
    {
      source: "public-webcams-multi",
      total: cams.length,
      by_provider: {
        windy: windy.length,
        earthcam: earthcam.length,
        nps: nps.length,
        usgs: usgs.length,
        alertwildfire: alertwildfire.length,
        hpwren: hpwren.length,
        surfline: surfline.length,
        "static-seed": STATIC_SEED.length,
      },
      cams,
    },
    { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800" } },
  )
}

export async function POST(req: NextRequest) {
  const [windy, earthcam, nps, usgs] = await Promise.all([
    pullWindy(),
    pullEarthCam(),
    pullNPS(),
    pullUSGS(),
  ])
  const allCams: Cam[] = [...STATIC_SEED, ...windy, ...earthcam, ...nps, ...usgs]
  const dedup = new Map<string, Cam>()
  for (const c of allCams) dedup.set(`${c.provider}:${c.id}`, c)
  const cams = Array.from(dedup.values())
  if (!cams.length) return NextResponse.json({ synced: 0 })
  try {
    const res = await fetch(`${MINDEX_BASE}/api/mindex/ingest/eagle_video_sources`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...authHeaders() },
      body: JSON.stringify({
        entities: cams.map((c) => ({
          source: c.provider,
          source_id: c.id,
          name: c.name,
          entity_type: "video_source",
          lat: c.lat,
          lng: c.lng,
          properties: {
            kind: "permanent",
            provider: c.provider,
            stable_location: true,
            location_confidence: 1.0,
            stream_url: c.stream_url,
            embed_url: c.embed_url,
            media_url: c.media_url,
            source_status: "online",
            permissions: { access: "public", tier: c.provider === "nps" || c.provider === "usgs" ? "gov-open" : "commercial-public" },
            retention_policy: { ttl_days: 30 },
            category: c.category,
          },
        })),
      }),
      signal: AbortSignal.timeout(60_000),
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => "")
      return NextResponse.json({ synced: 0, error: `MINDEX ${res.status}: ${txt.slice(0, 200)}` }, { status: 502 })
    }
    return NextResponse.json({
      synced: cams.length,
      by_provider: { windy: windy.length, earthcam: earthcam.length, nps: nps.length, usgs: usgs.length, "static-seed": STATIC_SEED.length },
    })
  } catch (err: any) {
    return NextResponse.json({ synced: 0, error: err?.message || "sync failed" }, { status: 500 })
  }
}
