/**
 * Satellite metadata lookup — Apr 19, 2026
 *
 * Morgan (OpenGridView parity): "look at how a satelite picture and live
 * data is on the satelite widget this is minimum needed in crep". The
 * OpenGridView widget shows:
 *   - Thumbnail photo (from Wikimedia Commons)
 *   - "Mission" one-liner
 *   - "Purpose" description
 *   - Source tags (STARLINK, CELESTRAK STARLINK, etc.)
 *
 * This module resolves a satellite name → { imageUrl, mission, purpose,
 * family } by hitting Wikipedia's public REST API for a page summary.
 * Results are cached in memory for 30 min so repeat clicks are free.
 *
 * The strategy is simple pattern-match: strip "STARLINK-34133" → "Starlink",
 * "NOAA 21" → "NOAA-21", "ISS (ZARYA)" → "International Space Station",
 * etc. This gives the constellation-level article (not the exact
 * satellite) which is what OpenGridView shows too.
 *
 * Graceful fail: if Wikipedia 404s or returns no thumbnail, we return
 * null — the widget falls back to its default icon + text-only layout.
 */

export interface SatelliteMeta {
  imageUrl: string | null
  imageAttribution: string | null
  mission: string | null
  purpose: string | null
  family: string | null
  wikipediaUrl: string | null
}

const cache = new Map<string, { ts: number; data: SatelliteMeta | null }>()
const CACHE_MS = 30 * 60 * 1000 // 30 min

/**
 * Strip a specific satellite id down to its constellation / family
 * Wikipedia title. e.g.:
 *   STARLINK-34133     → Starlink
 *   ONEWEB-0123        → OneWeb_satellite_constellation
 *   NOAA 21            → NOAA-21
 *   GPS BIIF-8 (PRN 3) → GPS_(satellite_navigation)
 *   ISS (ZARYA)        → International_Space_Station
 *   LANDSAT 9          → Landsat_9
 */
export function satelliteFamily(name: string | null | undefined): {
  family: string | null
  wikipediaTitle: string | null
} {
  if (!name) return { family: null, wikipediaTitle: null }
  const n = name.trim()
  const nLower = n.toLowerCase()

  if (/^starlink[\s-]?\d+/i.test(n)) return { family: "Starlink", wikipediaTitle: "Starlink" }
  if (/^oneweb[\s-]?\d+/i.test(n)) return { family: "OneWeb", wikipediaTitle: "OneWeb" }
  if (/^iridium[\s-]?(next)?[\s-]?\d+/i.test(n)) return { family: "Iridium", wikipediaTitle: "Iridium_satellite_constellation" }
  if (/^globalstar[\s-]?\d+/i.test(n)) return { family: "Globalstar", wikipediaTitle: "Globalstar" }
  if (/^orbcomm[\s-]?\d+/i.test(n)) return { family: "Orbcomm", wikipediaTitle: "Orbcomm" }
  if (/^planet[\s-]?(labs)?[\s-]?\d+|^flock[\s-]?\d+/i.test(n)) return { family: "Planet", wikipediaTitle: "Planet_Labs" }
  if (/^noaa[\s-]?\d+/i.test(n)) {
    const match = n.match(/^noaa[\s-]?(\d+)/i)
    return { family: "NOAA", wikipediaTitle: match ? `NOAA-${match[1]}` : "NOAA_satellite" }
  }
  if (/^goes[\s-]?\d+/i.test(n)) {
    const match = n.match(/^goes[\s-]?(\d+)/i)
    return { family: "GOES", wikipediaTitle: match ? `GOES_${match[1]}` : "Geostationary_Operational_Environmental_Satellite" }
  }
  if (/^landsat[\s-]?\d+/i.test(n)) {
    const match = n.match(/^landsat[\s-]?(\d+)/i)
    return { family: "Landsat", wikipediaTitle: match ? `Landsat_${match[1]}` : "Landsat_program" }
  }
  if (/^sentinel/i.test(n)) {
    const match = n.match(/^sentinel[\s-]?(\d+[a-z]?)/i)
    return { family: "Sentinel", wikipediaTitle: match ? `Sentinel-${match[1]}` : "Copernicus_Programme" }
  }
  if (/^iss|zarya|international space station/i.test(nLower)) return { family: "ISS", wikipediaTitle: "International_Space_Station" }
  if (/^gps[\s-]?|navstar/i.test(n)) return { family: "GPS", wikipediaTitle: "Global_Positioning_System" }
  if (/^galileo/i.test(n)) return { family: "Galileo", wikipediaTitle: "Galileo_(satellite_navigation)" }
  if (/^glonass/i.test(n)) return { family: "GLONASS", wikipediaTitle: "GLONASS" }
  if (/^beidou/i.test(n)) return { family: "BeiDou", wikipediaTitle: "BeiDou_Navigation_Satellite_System" }
  if (/^cosmos[\s-]?\d+/i.test(n)) return { family: "Kosmos", wikipediaTitle: "Kosmos_(satellite)" }
  if (/^tianhe|tiangong|shenzhou/i.test(nLower)) return { family: "Tiangong", wikipediaTitle: "Tiangong_space_station" }
  if (/^hubble/i.test(n)) return { family: "Hubble", wikipediaTitle: "Hubble_Space_Telescope" }
  if (/^tess/i.test(n)) return { family: "TESS", wikipediaTitle: "Transiting_Exoplanet_Survey_Satellite" }
  if (/^james.webb|jwst/i.test(nLower)) return { family: "JWST", wikipediaTitle: "James_Webb_Space_Telescope" }

  // Generic satellite — no family match. Return the name itself as the
  // Wikipedia query; often a specific military / scientific sat has its
  // own article.
  return { family: null, wikipediaTitle: n.replace(/\s+/g, "_") }
}

/**
 * Fetch satellite family metadata from Wikipedia's REST API (public,
 * no key). Caches results in memory for CACHE_MS. Returns null
 * gracefully if the page doesn't exist or has no image.
 */
export async function fetchSatelliteMeta(name: string | null | undefined): Promise<SatelliteMeta | null> {
  if (!name) return null
  const { family, wikipediaTitle } = satelliteFamily(name)
  if (!wikipediaTitle) return null

  const cacheKey = wikipediaTitle
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_MS) return cached.data

  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikipediaTitle)}`
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8_000),
      headers: { Accept: "application/json" },
    })
    if (!res.ok) {
      cache.set(cacheKey, { ts: Date.now(), data: null })
      return null
    }
    const data = await res.json()
    const imageUrl = data?.thumbnail?.source || data?.originalimage?.source || null
    const extract = (data?.extract || "").trim()
    // First sentence = "Mission" headline. Rest = "Purpose" body.
    const firstDotIdx = extract.indexOf(". ")
    const mission = firstDotIdx > 0 ? extract.slice(0, firstDotIdx + 1) : extract || null
    const purpose = firstDotIdx > 0 ? extract.slice(firstDotIdx + 2).slice(0, 280) : null
    const meta: SatelliteMeta = {
      imageUrl,
      imageAttribution: imageUrl ? "Wikimedia Commons" : null,
      mission,
      purpose,
      family,
      wikipediaUrl: data?.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${wikipediaTitle}`,
    }
    cache.set(cacheKey, { ts: Date.now(), data: meta })
    return meta
  } catch {
    cache.set(cacheKey, { ts: Date.now(), data: null })
    return null
  }
}
