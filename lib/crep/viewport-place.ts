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
      signal: AbortSignal.timeout(6_000),
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
