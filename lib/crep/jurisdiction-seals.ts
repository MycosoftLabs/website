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

const COUNTRY_SEALS: Record<string, JurisdictionSealEntry> = {
  US: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Great_Seal_of_the_United_States_%28obverse%29.svg/256px-Great_Seal_of_the_United_States_%28obverse%29.svg.png",
    alt: "Great Seal of the United States",
  },
  CA: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Coat_of_arms_of_Canada.svg/256px-Coat_of_arms_of_Canada.svg.png",
    alt: "Coat of arms of Canada",
  },
  MX: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Coat_of_arms_of_Mexico.svg/256px-Coat_of_arms_of_Mexico.svg.png",
    alt: "Coat of arms of Mexico",
  },
  CN: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/National_Emblem_of_the_People%27s_Republic_of_China_%282%29.svg/256px-National_Emblem_of_the_People%27s_Republic_of_China_%282%29.svg.png",
    alt: "National emblem of China",
  },
  JP: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Imperial_Seal_of_Japan.svg/256px-Imperial_Seal_of_Japan.svg.png",
    alt: "Imperial Seal of Japan",
  },
  GB: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Royal_Coat_of_Arms_of_the_United_Kingdom_%28HM_Government%29.svg/256px-Royal_Coat_of_Arms_of_the_United_Kingdom_%28HM_Government%29.svg.png",
    alt: "Royal coat of arms of the United Kingdom",
  },
  EU: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Flag_of_Europe.svg/256px-Flag_of_Europe.svg.png",
    alt: "European Union emblem",
  },
  IN: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Emblem_of_India.svg/256px-Emblem_of_India.svg.png",
    alt: "State emblem of India",
  },
  AU: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Coat_of_arms_of_Australia.svg/256px-Coat_of_arms_of_Australia.svg.png",
    alt: "Coat of arms of Australia",
  },
  BR: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Coat_of_arms_of_Brazil.svg/256px-Coat_of_arms_of_Brazil.svg.png",
    alt: "Coat of arms of Brazil",
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
  const stackUnion = jurisdictionStack?.find((e) => e.level === "union")?.name
  const stackCountryCode = jurisdictionStack?.find((e) => e.level === "country" && e.code)?.code
  const cityName = place?.city || place?.suburb || stackCity
  const countyName = place?.county || stackCounty
  const countryCode = (place?.countryCode || stackCountryCode || "").trim().toUpperCase()

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

  return (stackUnion === "European Union" ? COUNTRY_SEALS.EU : undefined) ??
    (countryCode ? COUNTRY_SEALS[countryCode] : undefined) ??
    tryState() ??
    sealsFromMediaGallery(mediaGallery)[0] ??
    null
}

export function resolveJurisdictionSealUrls(input: ResolveJurisdictionSealsInput): string[] {
  const seals: JurisdictionSealEntry[] = []
  const push = (entry: JurisdictionSealEntry | undefined | null) => {
    if (!entry || seals.some((seal) => seal.url === entry.url)) return
    seals.push(entry)
  }
  const stack = input.jurisdictionStack ?? []
  if (stack.some((entry) => entry.level === "union" && entry.name === "European Union")) push(COUNTRY_SEALS.EU)
  for (const entry of stack) {
    if (entry.level !== "country") continue
    const code = (entry.code ?? "").trim().toUpperCase()
    if (code) push(COUNTRY_SEALS[code])
    if (!code && entry.name === "United Kingdom") push(COUNTRY_SEALS.GB)
  }
  const countryCode = (input.place?.countryCode ?? "").trim().toUpperCase()
  if (countryCode) push(COUNTRY_SEALS[countryCode])
  push(resolveJurisdictionSeal(input))
  return seals.map((seal) => seal.url).slice(0, 3)
}

export function resolveJurisdictionSealAlt(input: ResolveJurisdictionSealsInput): string {
  const seal = resolveJurisdictionSeal(input)
  if (seal?.alt) return seal.alt
  const city = input.place?.city || input.place?.suburb
  if (city) return `Seal of ${city}`
  return "Government seal or emblem"
}
