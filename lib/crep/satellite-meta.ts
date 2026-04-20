/**
 * Entity metadata lookup — Apr 19, 2026, extended Apr 20 for vessels + aircraft
 *
 * Morgan (OpenGridView parity): "look at how a satelite picture and live
 * data is on the satelite widget this is minimum needed in crep" + later
 * "also all vessles planes and satelites need images in widget of that
 * object if available". The OpenGridView widget shows:
 *   - Thumbnail photo (from Wikimedia Commons)
 *   - "Mission" one-liner
 *   - "Purpose" description
 *   - Source tags (STARLINK, CELESTRAK STARLINK, etc.)
 *
 * This module resolves a satellite / vessel class / aircraft type name →
 * { imageUrl, mission, purpose, family } by hitting Wikipedia's public
 * REST API for a page summary. Results are cached in memory for 30 min.
 *
 * For satellites we pattern-match constellation families (Starlink, OneWeb,
 * Landsat, Sentinel, GPS…). For vessels + aircraft we use ICAO aircraft
 * type codes (B738 → Boeing_737_Next_Generation, A320 → Airbus_A320) and
 * vessel class names (e.g. "Arleigh Burke-class destroyer"). When nothing
 * matches, we return null and the widget falls back to its default layout.
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
/**
 * ICAO aircraft type designator → Wikipedia article. Incomplete — covers
 * the most common commercial + military types. When a type isn't in the
 * table, we fall back to the raw designator as a Wikipedia lookup term.
 *
 * Source: ICAO Doc 8643 aircraft type designators.
 */
export function aircraftTypeToWiki(icaoType: string | null | undefined): {
  family: string | null
  wikipediaTitle: string | null
} {
  if (!icaoType) return { family: null, wikipediaTitle: null }
  const t = icaoType.trim().toUpperCase()
  const map: Record<string, { family: string; title: string }> = {
    // Boeing commercial
    B737: { family: "Boeing 737", title: "Boeing_737" },
    B738: { family: "Boeing 737-800", title: "Boeing_737_Next_Generation" },
    B739: { family: "Boeing 737-900", title: "Boeing_737_Next_Generation" },
    B38M: { family: "Boeing 737 MAX 8", title: "Boeing_737_MAX" },
    B39M: { family: "Boeing 737 MAX 9", title: "Boeing_737_MAX" },
    B744: { family: "Boeing 747-400", title: "Boeing_747-400" },
    B748: { family: "Boeing 747-8", title: "Boeing_747-8" },
    B752: { family: "Boeing 757-200", title: "Boeing_757" },
    B763: { family: "Boeing 767-300", title: "Boeing_767" },
    B77W: { family: "Boeing 777-300ER", title: "Boeing_777" },
    B772: { family: "Boeing 777-200", title: "Boeing_777" },
    B788: { family: "Boeing 787-8", title: "Boeing_787_Dreamliner" },
    B789: { family: "Boeing 787-9", title: "Boeing_787_Dreamliner" },
    B78X: { family: "Boeing 787-10", title: "Boeing_787_Dreamliner" },
    // Airbus commercial
    A319: { family: "Airbus A319", title: "Airbus_A320_family" },
    A320: { family: "Airbus A320", title: "Airbus_A320_family" },
    A321: { family: "Airbus A321", title: "Airbus_A321" },
    A20N: { family: "Airbus A320neo", title: "Airbus_A320neo_family" },
    A21N: { family: "Airbus A321neo", title: "Airbus_A320neo_family" },
    A332: { family: "Airbus A330-200", title: "Airbus_A330" },
    A333: { family: "Airbus A330-300", title: "Airbus_A330" },
    A339: { family: "Airbus A330neo", title: "Airbus_A330neo" },
    A346: { family: "Airbus A340-600", title: "Airbus_A340" },
    A359: { family: "Airbus A350-900", title: "Airbus_A350_XWB" },
    A35K: { family: "Airbus A350-1000", title: "Airbus_A350_XWB" },
    A388: { family: "Airbus A380-800", title: "Airbus_A380" },
    // Regional jets
    E170: { family: "Embraer E170", title: "Embraer_E-Jet_family" },
    E175: { family: "Embraer E175", title: "Embraer_E-Jet_family" },
    E190: { family: "Embraer E190", title: "Embraer_E-Jet_family" },
    E195: { family: "Embraer E195", title: "Embraer_E-Jet_family" },
    CRJ2: { family: "Bombardier CRJ200", title: "Bombardier_CRJ-100/200" },
    CRJ7: { family: "Bombardier CRJ700", title: "Bombardier_CRJ-700_series" },
    CRJ9: { family: "Bombardier CRJ900", title: "Bombardier_CRJ-700_series" },
    // Military (common US)
    C17: { family: "C-17 Globemaster III", title: "Boeing_C-17_Globemaster_III" },
    C130: { family: "C-130 Hercules", title: "Lockheed_C-130_Hercules" },
    C5M: { family: "C-5 Galaxy", title: "Lockheed_C-5_Galaxy" },
    KC35: { family: "KC-135 Stratotanker", title: "Boeing_KC-135_Stratotanker" },
    KC46: { family: "KC-46 Pegasus", title: "Boeing_KC-46_Pegasus" },
    P8: { family: "P-8 Poseidon", title: "Boeing_P-8_Poseidon" },
    E3TF: { family: "E-3 Sentry (AWACS)", title: "Boeing_E-3_Sentry" },
    F16: { family: "F-16 Fighting Falcon", title: "General_Dynamics_F-16_Fighting_Falcon" },
    F18: { family: "F/A-18 Hornet", title: "McDonnell_Douglas_F/A-18_Hornet" },
    F35: { family: "F-35 Lightning II", title: "Lockheed_Martin_F-35_Lightning_II" },
    // Helicopters
    H60: { family: "UH-60 Black Hawk", title: "Sikorsky_UH-60_Black_Hawk" },
    AH64: { family: "AH-64 Apache", title: "Boeing_AH-64_Apache" },
    // Business jets (common)
    GLF5: { family: "Gulfstream G550", title: "Gulfstream_V" },
    GLF6: { family: "Gulfstream G650", title: "Gulfstream_G650" },
    GLEX: { family: "Bombardier Global Express", title: "Bombardier_Global_Express" },
    C56X: { family: "Cessna Citation Excel", title: "Cessna_Citation_Excel" },
  }
  if (map[t]) return { family: map[t].family, wikipediaTitle: map[t].title }
  return { family: null, wikipediaTitle: t.replace(/\s+/g, "_") }
}

/**
 * Vessel class / type → Wikipedia article. Best-effort based on AIS type
 * codes + ship name prefixes. Many commercial vessels won't have a
 * dedicated article; we return null and the widget falls back to its icon.
 */
export function vesselClassToWiki(name: string | null | undefined, shipType: number | null | undefined): {
  family: string | null
  wikipediaTitle: string | null
} {
  if (!name) return { family: null, wikipediaTitle: null }
  const n = name.trim()
  const nLower = n.toLowerCase()

  // US Navy / allied naval ship prefixes
  if (/^USS\b|^USNS\b|^HMS\b|^FS\b|^HNLMS\b|^JS\b/i.test(n)) {
    // Arleigh Burke-class destroyers: USS XYZ (DDG)
    if (/\bDDG\b/i.test(n)) return { family: "Arleigh Burke-class destroyer", wikipediaTitle: "Arleigh_Burke-class_destroyer" }
    if (/\bCVN\b/i.test(n)) return { family: "Nimitz / Gerald R. Ford-class carrier", wikipediaTitle: "Aircraft_carrier" }
    if (/\bSSN\b/i.test(n)) return { family: "Attack submarine", wikipediaTitle: "Attack_submarine" }
    if (/\bSSBN\b/i.test(n)) return { family: "Ballistic missile submarine", wikipediaTitle: "Ballistic_missile_submarine" }
    if (/\bLPD\b|\bLHD\b|\bLSD\b/i.test(n)) return { family: "Amphibious ship", wikipediaTitle: "Amphibious_warfare_ship" }
    if (/\bFFG\b/i.test(n)) return { family: "Frigate", wikipediaTitle: "Frigate" }
    if (/\bCG\b/i.test(n)) return { family: "Ticonderoga-class cruiser", wikipediaTitle: "Ticonderoga-class_cruiser" }
  }

  // AIS ship type codes → Wikipedia broad category
  if (shipType) {
    if (shipType >= 70 && shipType <= 79) return { family: "Cargo ship", wikipediaTitle: "Cargo_ship" }
    if (shipType >= 80 && shipType <= 89) return { family: "Tanker", wikipediaTitle: "Tanker_(ship)" }
    if (shipType === 60 || (shipType >= 61 && shipType <= 69)) return { family: "Passenger ship", wikipediaTitle: "Passenger_ship" }
    if (shipType >= 30 && shipType <= 32) return { family: "Fishing vessel", wikipediaTitle: "Fishing_vessel" }
    if (shipType === 35) return { family: "Military ops vessel", wikipediaTitle: "Military_ship" }
    if (shipType === 51 || shipType === 50) return { family: "Search and rescue vessel", wikipediaTitle: "Rescue_boat" }
    if (shipType === 52) return { family: "Tug", wikipediaTitle: "Tugboat" }
  }

  // Known famous ships / container lines
  if (/ever\s|evergreen/i.test(nLower)) return { family: "Evergreen Marine container ship", wikipediaTitle: "Evergreen_Marine" }
  if (/maersk/i.test(nLower)) return { family: "Maersk container ship", wikipediaTitle: "Maersk" }
  if (/queen mary|queen elizabeth/i.test(nLower)) return { family: "Cunard Queen-class liner", wikipediaTitle: "Cunard_Line" }
  if (/^uss\s*constitution/i.test(nLower)) return { family: "USS Constitution", wikipediaTitle: "USS_Constitution" }

  return { family: null, wikipediaTitle: null }
}

export interface EntityMeta extends SatelliteMeta {}

async function fetchWikipediaSummary(wikipediaTitle: string, family: string | null): Promise<EntityMeta | null> {
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
    const firstDotIdx = extract.indexOf(". ")
    const mission = firstDotIdx > 0 ? extract.slice(0, firstDotIdx + 1) : extract || null
    const purpose = firstDotIdx > 0 ? extract.slice(firstDotIdx + 2).slice(0, 280) : null
    const meta: EntityMeta = {
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

export async function fetchSatelliteMeta(name: string | null | undefined): Promise<SatelliteMeta | null> {
  if (!name) return null
  const { family, wikipediaTitle } = satelliteFamily(name)
  if (!wikipediaTitle) return null
  return fetchWikipediaSummary(wikipediaTitle, family)
}

export async function fetchAircraftMeta(icaoType: string | null | undefined): Promise<EntityMeta | null> {
  if (!icaoType) return null
  const { family, wikipediaTitle } = aircraftTypeToWiki(icaoType)
  if (!wikipediaTitle) return null
  return fetchWikipediaSummary(wikipediaTitle, family)
}

export async function fetchVesselMeta(name: string | null | undefined, shipType: number | null | undefined): Promise<EntityMeta | null> {
  const { family, wikipediaTitle } = vesselClassToWiki(name, shipType)
  if (!wikipediaTitle) return null
  return fetchWikipediaSummary(wikipediaTitle, family)
}
