/**
 * Viewport place resolution — reverse geocode + zoom/span-aware geography LOD.
 * May 25–26, 2026
 */

export interface ViewportPlaceLike {
  displayName?: string
  country?: string
  countryCode?: string
  state?: string
  county?: string
  city?: string
  suburb?: string
  postcode?: string
  lat?: number
  lng?: number
}

interface LocalViewportPlaceHint {

  north: number

  south: number

  east: number

  west: number

  place: ViewportPlaceLike

}



const LOCAL_VIEWPORT_PLACE_HINTS: LocalViewportPlaceHint[] = [
  {
    north: 37.84,
    south: 37.70,
    east: -122.35,
    west: -122.53,
    place: {
      displayName: "San Francisco, San Francisco County, California, United States",
      city: "San Francisco",
      county: "San Francisco County",
      state: "California",
      country: "United States",
      countryCode: "US",
    },
  },
  {
    north: 37.51,
    south: 37.45,
    east: -122.13,
    west: -122.23,
    place: {
      displayName: "Menlo Park, San Mateo County, California, United States",
      city: "Menlo Park",
      county: "San Mateo County",
      state: "California",
      country: "United States",
      countryCode: "US",
    },
  },
  {
    north: 37.47,
    south: 37.39,
    east: -122.08,
    west: -122.18,
    place: {
      displayName: "Palo Alto, Santa Clara County, California, United States",
      city: "Palo Alto",
      county: "Santa Clara County",
      state: "California",
      country: "United States",
      countryCode: "US",
    },
  },
  {
    north: 37.61,
    south: 37.49,
    east: -122.25,
    west: -122.38,
    place: {
      displayName: "San Mateo, San Mateo County, California, United States",
      city: "San Mateo",
      county: "San Mateo County",
      state: "California",
      country: "United States",
      countryCode: "US",
    },
  },
  {
    north: 37.56,
    south: 37.45,
    east: -122.17,
    west: -122.30,
    place: {
      displayName: "Redwood City, San Mateo County, California, United States",
      city: "Redwood City",
      county: "San Mateo County",
      state: "California",
      country: "United States",
      countryCode: "US",
    },
  },
  {
    north: 37.45,
    south: 37.35,
    east: -122.00,
    west: -122.15,
    place: {
      displayName: "Mountain View, Santa Clara County, California, United States",
      city: "Mountain View",
      county: "Santa Clara County",
      state: "California",
      country: "United States",
      countryCode: "US",
    },
  },
  {
    north: 37.43,
    south: 37.32,
    east: -121.95,
    west: -122.10,
    place: {
      displayName: "Sunnyvale, Santa Clara County, California, United States",
      city: "Sunnyvale",
      county: "Santa Clara County",
      state: "California",
      country: "United States",
      countryCode: "US",
    },
  },
  {
    north: 37.45,
    south: 37.20,
    east: -121.75,
    west: -122.05,
    place: {
      displayName: "San Jose, Santa Clara County, California, United States",
      city: "San Jose",
      county: "Santa Clara County",
      state: "California",
      country: "United States",
      countryCode: "US",
    },
  },
  {
    north: 38.10,
    south: 37.20,
    east: -121.60,
    west: -123.05,
    place: {
      displayName: "San Francisco Bay Area, California, United States",
      state: "California",
      country: "United States",
      countryCode: "US",
    },
  },

  {

    north: 32.70,

    south: 32.57,

    east: -116.95,

    west: -117.12,

    place: {

      displayName: "Chula Vista, San Diego County, California, United States",

      city: "Chula Vista",

      county: "San Diego County",

      state: "California",

      country: "United States",

      countryCode: "US",

    },

  },

  {

    north: 33.12,

    south: 32.52,

    east: -116.75,

    west: -117.35,

    place: {

      displayName: "San Diego, San Diego County, California, United States",

      city: "San Diego",

      county: "San Diego County",

      state: "California",

      country: "United States",

      countryCode: "US",

    },

  },

  {

    north: 34.35,

    south: 32.45,

    east: -114.1,

    west: -118.8,

    place: {

      displayName: "Southern California, United States",

      state: "California",

      country: "United States",

      countryCode: "US",

    },

  },

  {

    north: 42.1,

    south: 32.4,

    east: -114.0,

    west: -124.6,

    place: {

      displayName: "California, United States",

      state: "California",

      country: "United States",

      countryCode: "US",

    },

  },

  {

    north: 37.1,

    south: 31.2,

    east: -109.0,

    west: -114.9,

    place: {

      displayName: "Arizona, United States",

      state: "Arizona",

      country: "United States",

      countryCode: "US",

    },

  },
  {
    north: 52.75,
    south: 52.30,
    east: 13.75,
    west: 13.05,
    place: {
      displayName: "Berlin, Germany",
      city: "Berlin",
      country: "Germany",
      countryCode: "DE",
    },
  },
  {
    north: 51.05,
    south: 50.65,
    east: 4.65,
    west: 4.10,
    place: {
      displayName: "Brussels, Belgium",
      city: "Brussels",
      country: "Belgium",
      countryCode: "BE",
    },
  },
  {
    north: 52.55,
    south: 52.20,
    east: 5.15,
    west: 4.65,
    place: {
      displayName: "Amsterdam, Netherlands",
      city: "Amsterdam",
      country: "Netherlands",
      countryCode: "NL",
    },
  },
  {
    north: 37.85,
    south: 37.25,
    east: 127.30,
    west: 126.65,
    place: {
      displayName: "Seoul, South Korea",
      city: "Seoul",
      country: "South Korea",
      countryCode: "KR",
    },
  },
  {
    north: -25.85,
    south: -26.45,
    east: 28.35,
    west: 27.75,
    place: {
      displayName: "Johannesburg, South Africa",
      city: "Johannesburg",
      country: "South Africa",
      countryCode: "ZA",
    },
  },
  {
    north: -33.65,
    south: -34.20,
    east: 18.75,
    west: 18.20,
    place: {
      displayName: "Cape Town, South Africa",
      city: "Cape Town",
      country: "South Africa",
      countryCode: "ZA",
    },
  },
  {
    north: 51.2,
    south: 41.2,
    east: 9.7,
    west: -5.2,
    place: {
      displayName: "France",
      country: "France",
      countryCode: "FR",
    },
  },
  {
    north: 55.1,
    south: 47.2,
    east: 15.2,
    west: 5.5,
    place: {
      displayName: "Germany",
      country: "Germany",
      countryCode: "DE",
    },
  },
  {
    north: 47.2,
    south: 35.4,
    east: 18.8,
    west: 6.3,
    place: {
      displayName: "Italy",
      country: "Italy",
      countryCode: "IT",
    },
  },
  {
    north: 44.2,
    south: 35.5,
    east: 4.5,
    west: -9.6,
    place: {
      displayName: "Spain",
      country: "Spain",
      countryCode: "ES",
    },
  },
  {
    north: 51.6,
    south: 49.4,
    east: 6.5,
    west: 2.5,
    place: {
      displayName: "Belgium",
      country: "Belgium",
      countryCode: "BE",
    },
  },
  {
    north: 53.8,
    south: 50.7,
    east: 7.4,
    west: 3.2,
    place: {
      displayName: "Netherlands",
      country: "Netherlands",
      countryCode: "NL",
    },
  },
  {
    north: 38.7,
    south: 33.0,
    east: 132.0,
    west: 124.0,
    place: {
      displayName: "South Korea",
      country: "South Korea",
      countryCode: "KR",
    },
  },
  {
    north: -22.0,
    south: -35.0,
    east: 33.0,
    west: 16.0,
    place: {
      displayName: "South Africa",
      country: "South Africa",
      countryCode: "ZA",
    },
  },
  {
    north: 14.3,
    south: 4.0,
    east: 14.8,
    west: 2.5,
    place: {
      displayName: "Nigeria",
      country: "Nigeria",
      countryCode: "NG",
    },
  },
  {
    north: 31.8,
    south: 22.0,
    east: 36.9,
    west: 24.7,
    place: {
      displayName: "Egypt",
      country: "Egypt",
      countryCode: "EG",
    },
  },
  {
    north: 42.3,
    south: 35.8,
    east: 44.8,
    west: 25.5,
    place: {
      displayName: "Turkey",
      country: "Turkey",
      countryCode: "TR",
    },
  },
  {

    north: 83.2,

    south: 41.4,

    east: -52.0,

    west: -141.2,

    place: {

      displayName: "Canada",

      country: "Canada",

      countryCode: "CA",

    },

  },
  {

    north: 32.8,

    south: 14.4,

    east: -86.5,

    west: -118.5,

    place: {

      displayName: "Mexico",

      country: "Mexico",

      countryCode: "MX",

    },

  },
  {

    north: 53.8,

    south: 18.0,

    east: 135.2,

    west: 73.0,

    place: {

      displayName: "China",

      country: "China",

      countryCode: "CN",

    },

  },
  {

    north: 45.7,

    south: 24.0,

    east: 154.0,

    west: 122.8,

    place: {

      displayName: "Japan",

      country: "Japan",

      countryCode: "JP",

    },

  },
  {

    north: 61.2,

    south: 49.0,

    east: 2.0,

    west: -8.8,

    place: {

      displayName: "United Kingdom",

      country: "United Kingdom",

      countryCode: "GB",

    },

  },
  {

    north: 35.7,

    south: 6.5,

    east: 97.5,

    west: 68.0,

    place: {

      displayName: "India",

      country: "India",

      countryCode: "IN",

    },

  },
  {

    north: -9.0,

    south: -44.0,

    east: 154.0,

    west: 112.0,

    place: {

      displayName: "Australia",

      country: "Australia",

      countryCode: "AU",

    },

  },
  {

    north: 5.5,

    south: -34.0,

    east: -34.0,

    west: -74.0,

    place: {

      displayName: "Brazil",

      country: "Brazil",

      countryCode: "BR",

    },

  },

]



export function resolveLocalViewportPlaceHint(

  lat: number,

  lng: number,

): ViewportPlaceLike | null {

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  const matches = LOCAL_VIEWPORT_PLACE_HINTS.filter((hint) =>

    lat >= hint.south &&

    lat <= hint.north &&

    lng >= hint.west &&

    lng <= hint.east,

  )

  const match = matches.sort((a, b) =>
    Math.abs((a.north - a.south) * (a.east - a.west)) -
    Math.abs((b.north - b.south) * (b.east - b.west)),
  )[0]

  if (!match) return null

  return { ...match.place, lat, lng }

}



export interface JurisdictionEntry {
  level: string
  name: string
  code?: string
}

/** Geography display tier — aligned with viewport intelligence + leadership LOD. */
export type ViewportGeographyLod =
  | "global"
  | "macro"
  | "country"
  | "state"
  | "county"
  | "city"

export interface ViewportGeographyContext {
  lod: ViewportGeographyLod
  lodLabel: string
  headline: string
  subheadline: string
  macroRegion: string | null
  jurisdictionStack: JurisdictionEntry[]
}

export function boundsCenter(bounds: {
  north: number
  south: number
  east: number
  west: number
}): { lat: number; lng: number } {
  let lng = (bounds.west + bounds.east) / 2
  if (bounds.west > bounds.east) {
    lng = (((bounds.west + 360) + bounds.east) / 2) % 360
    if (lng > 180) lng -= 360
  }
  return {
    lat: (bounds.north + bounds.south) / 2,
    lng,
  }
}

export function boundsSpanDeg(bounds: {
  north: number
  south: number
  east: number
  west: number
}): { lat: number; lng: number } {
  const lat = Math.abs(bounds.north - bounds.south)
  let lng = bounds.west <= bounds.east
    ? Math.abs(bounds.east - bounds.west)
    : 360 - Math.abs(bounds.west - bounds.east)
  return { lat, lng }
}

/** Unified LOD from map zoom + viewport span (whichever is coarser). */
export function resolveViewportGeographyLod(
  mapZoom: number,
  bounds?: { north: number; south: number; east: number; west: number } | null,
): ViewportGeographyLod {
  const span = bounds ? boundsSpanDeg(bounds) : { lat: 180, lng: 360 }

  if (mapZoom < 2.2 || span.lat > 40 || span.lng > 80) return "global"
  if (mapZoom < 3.8 || span.lat > 18 || span.lng > 28) return "macro"
  if (mapZoom < 5.5 || span.lat > 7 || span.lng > 10) return "country"
  if (mapZoom < 8 || span.lat > 2.2 || span.lng > 3.5) return "state"
  if (mapZoom < 11 || span.lat > 0.55 || span.lng > 0.85) return "county"
  return "city"
}

export function geographyLodToLabel(lod: ViewportGeographyLod): string {
  switch (lod) {
    case "global":
      return "global"
    case "macro":
      return "continent / union"
    case "country":
      return "country"
    case "state":
      return "state / region"
    case "county":
      return "county"
    case "city":
      return "city"
  }
}

/** Nominatim reverse zoom — coarser LOD → lower zoom (broader admin area). */
export function nominatimZoomForGeographyLod(lod: ViewportGeographyLod): number {
  switch (lod) {
    case "global":
      return 3
    case "macro":
      return 4
    case "country":
      return 5
    case "state":
      return 6
    case "county":
      return 8
    case "city":
      return 10
  }
}

const JURISDICTION_LEVEL_ORDER = ["macro", "country", "state", "county", "city"] as const

function jurisdictionLevelRank(level: string): number {
  const idx = JURISDICTION_LEVEL_ORDER.indexOf(level as (typeof JURISDICTION_LEVEL_ORDER)[number])
  return idx >= 0 ? idx : 99
}

function maxJurisdictionLevelForLod(lod: ViewportGeographyLod): string {
  switch (lod) {
    case "global":
    case "macro":
      return "macro"
    case "country":
      return "country"
    case "state":
      return "state"
    case "county":
      return "county"
    case "city":
      return "city"
  }
}

/** Macro region when viewport spans multiple countries at continental zoom. */
export function resolveMacroRegionLabel(
  bounds: { north: number; south: number; east: number; west: number },
  mapZoom: number,
): string | null {
  const { lat, lng } = boundsCenter(bounds)
  const span = boundsSpanDeg(bounds)

  // North America — US + Canada + Mexico visible (NAFTA corridor)
  if (
    lat >= 8 &&
    lat <= 75 &&
    lng >= -175 &&
    lng <= -50 &&
    (span.lat >= 10 || span.lng >= 22 || mapZoom < 3.5)
  ) {
    if (mapZoom < 5 || span.lat >= 8) return "North America"
  }

  // Europe + UK — EU macro; UK called out in subheadline when in view
  if (lat >= 34 && lat <= 72 && lng >= -12 && lng <= 45) {
    if (mapZoom < 5.5 || span.lat >= 6 || span.lng >= 8) return "Europe"
  }

  // South America
  if (lat >= -58 && lat <= 14 && lng >= -82 && lng <= -32 && span.lat >= 12) {
    return "South America"
  }

  // East Asia
  if (lat >= 0 && lat <= 55 && lng >= 95 && lng <= 150 && span.lat >= 8) {
    return "East Asia"
  }

  // Oceania
  if (lat >= -48 && lat <= 0 && lng >= 110 && lng <= 180 && span.lat >= 10) {
    return "Oceania"
  }

  // Africa
  if (lat >= -36 && lat <= 38 && lng >= -20 && lng <= 55 && span.lat >= 14) {
    return "Africa"
  }

  // Middle East
  if (lat >= 12 && lat <= 42 && lng >= 25 && lng <= 65 && span.lat >= 6) {
    return "Middle East"
  }

  return null
}

/** Subheadline blocs / trade unions / visible countries for macro views. */
export function buildMacroSubheadline(
  macroRegion: string,
  place: ViewportPlaceLike | null | undefined,
  bounds: { north: number; south: number; east: number; west: number },
): string {
  switch (macroRegion) {
    case "North America":
      return "United States · Canada · Mexico · USMCA"
    case "Europe": {
      const parts = ["European Union"]
      const { lat, lng } = boundsCenter(bounds)
      const span = boundsSpanDeg(bounds)
      // UK visible when viewport includes British Isles
      if (lat >= 49 && lat <= 61 && lng >= -11 && lng <= 3) {
        parts.push("United Kingdom")
      }
      if (place?.country && !parts.includes(place.country)) {
        parts.push(place.country)
      }
      if (span.lat < 8 && place?.state) parts.push(place.state)
      return parts.join(" · ")
    }
    default:
      return [place?.state, place?.country].filter(Boolean).join(" · ")
  }
}

export function buildJurisdictionStackFromPlace(
  place: ViewportPlaceLike | null | undefined,
  macroRegion?: string | null,
): JurisdictionEntry[] {
  const stack: JurisdictionEntry[] = []
  if (macroRegion) {
    stack.push({ level: "macro", name: macroRegion })
  }
  if (place?.country) {
    stack.push({
      level: "country",
      name: place.country,
      code: place.countryCode,
    })
  }
  if (place?.state) stack.push({ level: "state", name: place.state })
  if (place?.county) stack.push({ level: "county", name: place.county })
  const cityName = place?.city || place?.suburb
  if (cityName) stack.push({ level: "city", name: cityName })
  return stack
}

export function truncateJurisdictionStackForLod(
  stack: JurisdictionEntry[],
  lod: ViewportGeographyLod,
): JurisdictionEntry[] {
  const maxLevel = maxJurisdictionLevelForLod(lod)
  const maxRank = jurisdictionLevelRank(maxLevel)
  return stack.filter((entry) => jurisdictionLevelRank(entry.level) <= maxRank)
}

export function pickPlaceHeadlineForLod(
  place: ViewportPlaceLike | null | undefined,
  lod: ViewportGeographyLod,
  options?: {
    macroRegion?: string | null
    flyToLabel?: string | null
    regionLabel?: string
  },
): string {
  const macro = options?.macroRegion ?? null
  const flyTo = options?.flyToLabel?.trim()

  if (lod === "global") {
    return macro || flyTo || place?.country || options?.regionLabel || "Global view"
  }
  if (lod === "macro") {
    return macro || flyTo || place?.country || options?.regionLabel || "Regional view"
  }
  if (lod === "country") {
    return flyTo || place?.country || place?.state || macro || options?.regionLabel || "Country view"
  }
  if (lod === "state") {
    return place?.state || place?.country || flyTo || options?.regionLabel || "State / region"
  }
  if (lod === "county") {
    return place?.county || place?.state || place?.country || options?.regionLabel || "County"
  }
  return (
    place?.city ||
    place?.suburb ||
    place?.county ||
    place?.state ||
    flyTo ||
    options?.regionLabel ||
    "Local view"
  )
}

export function pickPlaceSubheadlineForLod(
  place: ViewportPlaceLike | null | undefined,
  lod: ViewportGeographyLod,
  headline: string,
  bounds?: { north: number; south: number; east: number; west: number } | null,
  macroRegion?: string | null,
): string {
  if ((lod === "global" || lod === "macro") && macroRegion && bounds) {
    return buildMacroSubheadline(macroRegion, place, bounds)
  }
  if (lod === "country") {
    return [place?.state, macroRegion].filter((p) => p && p !== headline).join(" · ")
  }
  if (lod === "state") {
    return [place?.county && place.county !== headline ? place.county : null, place?.country]
      .filter(Boolean)
      .join(" · ")
  }
  if (lod === "county") {
    return [place?.state, place?.country].filter((p) => p && p !== headline).join(" · ")
  }
  return [place?.county && place.county !== headline ? place.county : null, place?.state, place?.country]
    .filter(Boolean)
    .join(" · ")
}

export function buildViewportGeographyContext(
  place: ViewportPlaceLike | null | undefined,
  mapZoom: number,
  bounds: { north: number; south: number; east: number; west: number },
  options?: {
    flyToLabel?: string | null
    regionLabel?: string
    jurisdictionStack?: JurisdictionEntry[]
  },
): ViewportGeographyContext {
  let lod = resolveViewportGeographyLod(mapZoom, bounds)
  const macroRegion = resolveMacroRegionLabel(bounds, mapZoom)

  // Wide multi-country view → macro even if zoom would say country
  if (macroRegion && (lod === "country" || lod === "global") && mapZoom < 5) {
    lod = "macro"
  }

  const stackSource =
    options?.jurisdictionStack?.length
      ? options.jurisdictionStack
      : buildJurisdictionStackFromPlace(place, macroRegion)

  const headline = pickPlaceHeadlineForLod(place, lod, {
    macroRegion,
    flyToLabel: options?.flyToLabel,
    regionLabel: options?.regionLabel,
  })
  const subheadline = pickPlaceSubheadlineForLod(place, lod, headline, bounds, macroRegion)

  return {
    lod,
    lodLabel: geographyLodToLabel(lod),
    headline,
    subheadline,
    macroRegion,
    jurisdictionStack: truncateJurisdictionStackForLod(stackSource, lod),
  }
}

export function buildPlaceDisplayName(
  place: ViewportPlaceLike | null | undefined,
  lod?: ViewportGeographyLod,
): string {
  if (!place) return ""
  if (lod) {
    return pickPlaceHeadlineForLod(place, lod, { regionLabel: place.displayName ?? undefined })
  }
  if (place.displayName?.trim()) return place.displayName.trim()
  const parts = [
    place.city || place.suburb,
    place.county,
    place.state,
    place.country,
  ].filter(Boolean)
  return parts.join(", ")
}

export function placeNeedsEnrichment(place: ViewportPlaceLike | null | undefined): boolean {
  if (!place) return true
  return !(
    place.city ||
    place.suburb ||
    place.county ||
    place.state ||
    place.country ||
    (place.displayName && place.displayName.length > 3)
  )
}

export async function reverseGeocodePlace(
  lat: number,
  lng: number,
  geographyLod: ViewportGeographyLod = "city",
): Promise<ViewportPlaceLike | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const nominatimZoom = nominatimZoomForGeographyLod(geographyLod)
  try {
    const params = new URLSearchParams({
      format: "json",
      lat: String(lat),
      lon: String(lng),
      zoom: String(nominatimZoom),
      addressdetails: "1",
    })
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mycosoft-CREP/1.0 (contact: ops@mycosoft.com)",
      },
      signal: AbortSignal.timeout(1_500),
      cache: "no-store",
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      display_name?: string
      address?: Record<string, string>
    }
    const addr = data.address ?? {}
    const city =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.hamlet ||
      addr.municipality ||
      undefined
    const state = addr.state || addr.region || undefined
    const county = addr.county || undefined
    const country = addr.country || undefined
    const countryCode = addr.country_code?.toUpperCase()
    const displayName =
      data.display_name ||
      [city, county, state, country].filter(Boolean).join(", ")
    return {
      displayName,
      city,
      county,
      state,
      country,
      countryCode,
      suburb: addr.suburb || addr.neighbourhood || undefined,
      postcode: addr.postcode,
      lat,
      lng,
    }
  } catch {
    return null
  }
}

/** Merge MINDEX + Nominatim stacks — fill missing county/city/state when API only returns country. */
export function mergeJurisdictionStacks(
  primary: JurisdictionEntry[] | undefined,
  fallback: JurisdictionEntry[],
): JurisdictionEntry[] {
  const merged = new Map<string, JurisdictionEntry>()
  for (const entry of [...(primary ?? []), ...fallback]) {
    if (!entry?.level || !entry.name) continue
    const key = entry.level.toLowerCase()
    const existing = merged.get(key)
    if (!existing || entry.name.length > existing.name.length) {
      merged.set(key, entry)
    }
  }
  const stack = Array.from(merged.values()).sort(
    (a, b) => jurisdictionLevelRank(a.level) - jurisdictionLevelRank(b.level),
  )
  if (stack.length) return stack
  return fallback
}

