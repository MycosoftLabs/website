/**
 * Curated jurisdiction seals/logos for Viewport Intelligence header.
 * Shown beside the country flag at the appropriate LOD (city → county → state).
 * May 25, 2026
 */

import type { JurisdictionEntry, ViewportPlaceLike } from "@/lib/crep/viewport-place"

export interface JurisdictionSealEntry {
  url: string
  alt: string
}

const STATE_NAME_TO_CODE: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
  "district of columbia": "DC",
}

/** City seals — key: `city|ST` (lowercase city name). */
const CITY_SEALS: Record<string, JurisdictionSealEntry> = {
  "san diego|CA": {
    url: "https://upload.wikimedia.org/wikipedia/commons/5/5d/Seal_of_San_Diego%2C_California.png",
    alt: "Seal of the City of San Diego",
  },
  "imperial beach|CA": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Seal_of_Imperial_Beach%2C_California.png/256px-Seal_of_Imperial_Beach%2C_California.png",
    alt: "Seal of the City of Imperial Beach",
  },
  "chula vista|CA": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Seal_of_Chula_Vista%2C_California.png/256px-Seal_of_Chula_Vista%2C_California.png",
    alt: "Seal of the City of Chula Vista",
  },
  "los angeles|CA": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Seal_of_Los_Angeles%2C_California.png/256px-Seal_of_Los_Angeles%2C_California.png",
    alt: "Seal of the City of Los Angeles",
  },
  "san francisco|CA": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Seal_of_San_Francisco%2C_California.png/256px-Seal_of_San_Francisco%2C_California.png",
    alt: "Seal of the City and County of San Francisco",
  },
  "new york|NY": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Seal_of_New_York_City.svg/256px-Seal_of_New_York_City.svg.png",
    alt: "Seal of the City of New York",
  },
  "washington|DC": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Seal_of_Washington%2C_D.C..svg/256px-Seal_of_Washington%2C_D.C..svg.png",
    alt: "Seal of the District of Columbia",
  },
}

/** County seals — key: normalized county name + `|ST`. */
const COUNTY_SEALS: Record<string, JurisdictionSealEntry> = {
  "san diego county|CA": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Seal_of_San_Diego_County%2C_California.png/256px-Seal_of_San_Diego_County%2C_California.png",
    alt: "Seal of San Diego County",
  },
  "los angeles county|CA": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Seal_of_Los_Angeles_County%2C_California.png/256px-Seal_of_Los_Angeles_County%2C_California.png",
    alt: "Seal of Los Angeles County",
  },
}

/** State / territory seals — key: two-letter code. */
const STATE_SEALS: Record<string, JurisdictionSealEntry> = {
  CA: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Seal_of_California.svg/256px-Seal_of_California.svg.png",
    alt: "Great Seal of the State of California",
  },
  NY: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Seal_of_New_York.svg/256px-Seal_of_New_York.svg.png",
    alt: "Seal of the State of New York",
  },
  TX: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Seal_of_Texas.svg/256px-Seal_of_Texas.svg.png",
    alt: "Seal of the State of Texas",
  },
  FL: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Seal_of_Florida.svg/256px-Seal_of_Florida.svg.png",
    alt: "Seal of the State of Florida",
  },
}

function resolveStateCode(state?: string | null): string | null {
  if (!state) return null
  const trimmed = state.trim()
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase()
  return STATE_NAME_TO_CODE[trimmed.toLowerCase()] ?? null
}

function normalizeToken(value?: string | null): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
}

function cityKey(city: string | undefined, stateCode: string | null, stateName?: string | null): string {
  const st = stateCode ?? resolveStateCode(stateName) ?? normalizeToken(stateName).toUpperCase()
  return `${normalizeToken(city)}|${st}`
}

function countyKey(county: string | undefined, stateCode: string | null, stateName?: string | null): string {
  let name = normalizeToken(county)
  if (name && !name.includes("county")) name = `${name} county`
  const st = stateCode ?? resolveStateCode(stateName) ?? normalizeToken(stateName).toUpperCase()
  return `${name}|${st}`
}

function isOfficialPortraitUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return true
  const value = url.toLowerCase()
  return (
    value.includes("bioguide.congress.gov") ||
    value.includes("ballotpedia.org") ||
    value.includes("/photo/") ||
    value.includes("gravatar.com") ||
    value.includes("avatar")
  )
}

function sealsFromMediaGallery(
  mediaGallery: Array<{ entity_type?: string; image_url?: string | null }> | undefined,
): JurisdictionSealEntry[] {
  const seals: JurisdictionSealEntry[] = []
  for (const item of mediaGallery ?? []) {
    const url = item?.image_url
    if (!url || isOfficialPortraitUrl(url)) continue
    const entityType = (item.entity_type ?? "").toLowerCase()
    if (entityType.includes("official") || entityType.includes("person")) continue
    seals.push({ url, alt: "Government seal or emblem" })
  }
  return seals.slice(0, 1)
}

export type JurisdictionSealLod = "country" | "state / region" | "county" | "city" | "facility"

function resolveLodTarget(lodLabel: string): "city" | "county" | "state" | "country" {
  if (lodLabel === "facility" || lodLabel === "city") return "city"
  if (lodLabel === "county") return "county"
  if (lodLabel.includes("state")) return "state"
  return "country"
}

export interface ResolveJurisdictionSealsInput {
  place?: ViewportPlaceLike | null
  jurisdictionStack?: JurisdictionEntry[]
  lodLabel: string
  mediaGallery?: Array<{ entity_type?: string; image_url?: string | null }>
}

/** Primary seal for the viewport header (one emblem beside the country flag). */
export function resolveJurisdictionSeal(
  input: ResolveJurisdictionSealsInput,
): JurisdictionSealEntry | null {
  const { place, jurisdictionStack, lodLabel, mediaGallery } = input
  const target = resolveLodTarget(lodLabel)
  const stateCode = resolveStateCode(place?.state)
  const stackCity = jurisdictionStack?.find((e) => e.level === "city")?.name
  const stackCounty = jurisdictionStack?.find((e) => e.level === "county")?.name
  const cityName = place?.city || place?.suburb || stackCity
  const countyName = place?.county || stackCounty

  const tryCity = () =>
    cityName ? CITY_SEALS[cityKey(cityName, stateCode, place?.state)] : undefined
  const tryCounty = () =>
    countyName ? COUNTY_SEALS[countyKey(countyName, stateCode, place?.state)] : undefined
  const tryState = () => (stateCode ? STATE_SEALS[stateCode] : undefined)

  if (target === "city") {
    return tryCity() ?? tryCounty() ?? tryState() ?? sealsFromMediaGallery(mediaGallery)[0] ?? null
  }
  if (target === "county") {
    return tryCounty() ?? tryCity() ?? tryState() ?? sealsFromMediaGallery(mediaGallery)[0] ?? null
  }
  if (target === "state") {
    return tryState() ?? tryCounty() ?? tryCity() ?? sealsFromMediaGallery(mediaGallery)[0] ?? null
  }

  return tryState() ?? sealsFromMediaGallery(mediaGallery)[0] ?? null
}

export function resolveJurisdictionSealUrls(input: ResolveJurisdictionSealsInput): string[] {
  const seal = resolveJurisdictionSeal(input)
  return seal ? [seal.url] : []
}

export function resolveJurisdictionSealAlt(input: ResolveJurisdictionSealsInput): string {
  const seal = resolveJurisdictionSeal(input)
  if (seal?.alt) return seal.alt
  const city = input.place?.city || input.place?.suburb
  if (city) return `Seal of ${city}`
  return "Government seal or emblem"
}
