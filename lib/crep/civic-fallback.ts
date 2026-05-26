/**
 * Civic fallback when MINDEX viewport-intel providers return empty (no API keys on VM).
 * Uses public unitedstates/congress-legislators + curated state/local executives.
 */

import { resolveExecutivePortraitUrl } from "@/lib/crep/executive-portraits"

export interface CivicFallbackOfficial {
  id: string
  name: string
  office: string
  party?: string
  phones?: string[]
  emails?: string[]
  urls?: string[]
  address?: string
  image_url?: string | null
  jurisdiction_name?: string
  term_start?: string
  term_end?: string | null
}

export interface CivicFallbackElection {
  id: string
  name: string
  election_day?: string
  jurisdiction_name?: string
  source_url?: string
}

export interface CivicFallbackLegislation {
  id: string
  name: string
  status?: string
  source_url?: string
  source?: string
}

export interface CivicFallbackResult {
  officials: CivicFallbackOfficial[]
  elections: CivicFallbackElection[]
  legislation: CivicFallbackLegislation[]
  source: "civic-fallback"
}

/** Curated federal delegation (GitHub legislators-current.json removed upstream). */
const STATE_FEDERAL_OFFICIALS: Record<string, CivicFallbackOfficial[]> = {
  CA: [
    {
      id: "bioguide:P000145",
      name: "Alex Padilla",
      office: "U.S. Senator (CA)",
      party: "Democratic",
      image_url: "https://bioguide.congress.gov/bioguide/photo/P/P000145.jpg",
      jurisdiction_name: "California",
      term_start: "2021-01-20",
      term_end: null,
      urls: ["https://www.padilla.senate.gov/"],
    },
    {
      id: "bioguide:S001150",
      name: "Adam Schiff",
      office: "U.S. Senator (CA)",
      party: "Democratic",
      image_url: "https://bioguide.congress.gov/bioguide/photo/S/S001150.jpg",
      jurisdiction_name: "California",
      term_start: "2025-01-03",
      term_end: null,
      urls: ["https://www.schiff.senate.gov/"],
    },
    {
      id: "bioguide:P000608",
      name: "Scott Peters",
      office: "U.S. Representative (CA-50)",
      party: "Democratic",
      image_url: "https://bioguide.congress.gov/bioguide/photo/P/P000608.jpg",
      jurisdiction_name: "California",
      term_start: "2023-01-03",
      term_end: null,
      urls: ["https://peters.house.gov/"],
    },
    {
      id: "bioguide:J000305",
      name: "Sara Jacobs",
      office: "U.S. Representative (CA-51)",
      party: "Democratic",
      image_url: "https://bioguide.congress.gov/bioguide/photo/J/J000305.jpg",
      jurisdiction_name: "California",
      term_start: "2023-01-03",
      term_end: null,
      urls: ["https://sarajacobs.house.gov/"],
    },
    {
      id: "bioguide:V000130",
      name: "Juan Vargas",
      office: "U.S. Representative (CA-52)",
      party: "Democratic",
      image_url: "https://bioguide.congress.gov/bioguide/photo/V/V000130.jpg",
      jurisdiction_name: "California",
      term_start: "2023-01-03",
      term_end: null,
      urls: ["https://vargas.house.gov/"],
    },
  ],
}

const STATE_NAME_TO_CODE: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO",
  montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ",
  "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND",
  ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI",
  "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT",
  vermont: "VT", virginia: "VA", washington: "WA", "west virginia": "WV",
  wisconsin: "WI", wyoming: "WY", "district of columbia": "DC",
}

interface ExecutiveSeed {
  name: string
  party?: string
  url?: string
}

/** Heads of state / government for North American nations (country-level LOD). */
const NATIONAL_EXECUTIVES: Record<string, CivicFallbackOfficial[]> = {
  US: [
    {
      id: "nat:us:potus",
      name: "Donald J. Trump",
      office: "President of the United States",
      party: "Republican",
      jurisdiction_name: "United States",
      urls: ["https://www.whitehouse.gov/"],
      phones: ["+1-202-456-1111"],
      address: "1600 Pennsylvania Avenue NW, Washington, DC 20500",
      term_start: "2025-01-20",
      term_end: null,
    },
    {
      id: "nat:us:vpotus",
      name: "JD Vance",
      office: "Vice President of the United States",
      party: "Republican",
      jurisdiction_name: "United States",
      urls: ["https://www.whitehouse.gov/administration/"],
      phones: ["+1-202-456-1111"],
      term_start: "2025-01-20",
      term_end: null,
    },
  ],
  CA: [
    {
      id: "nat:ca:pm",
      name: "Mark Carney",
      office: "Prime Minister of Canada",
      party: "Liberal",
      jurisdiction_name: "Canada",
      urls: ["https://www.pm.gc.ca/en"],
      phones: ["+1-613-992-4211"],
      address: "Office of the Prime Minister, 80 Wellington Street, Ottawa, ON K1A 0A2",
      term_start: "2025-03-14",
      term_end: null,
    },
  ],
  MX: [
    {
      id: "nat:mx:potus",
      name: "Claudia Sheinbaum",
      office: "President of Mexico",
      party: "Morena",
      jurisdiction_name: "Mexico",
      urls: ["https://www.gob.mx/presidencia"],
      address: "Palacio Nacional, Plaza de la Constitución S/N, Centro, 06066 Ciudad de México",
      term_start: "2024-10-01",
      term_end: null,
    },
  ],
}

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  "united states": "US",
  "united states of america": "US",
  usa: "US",
  "u.s.a.": "US",
  "u.s.": "US",
  us: "US",
  america: "US",
  canada: "CA",
  ca: "CA",
  mexico: "MX",
  méxico: "MX",
  "estados unidos mexicanos": "MX",
  mx: "MX",
}

/** Current U.S. governors (all 50 states). Live MINDEX civic data overrides this. */
const STATE_EXECUTIVES: Record<string, ExecutiveSeed> = {
  AL: { name: "Kay Ivey", party: "Republican", url: "https://governor.alabama.gov/" },
  AK: { name: "Mike Dunleavy", party: "Republican", url: "https://gov.alaska.gov/" },
  AZ: { name: "Katie Hobbs", party: "Democratic", url: "https://azgovernor.gov/" },
  AR: { name: "Sarah Huckabee Sanders", party: "Republican", url: "https://governor.arkansas.gov/" },
  CA: { name: "Gavin Newsom", party: "Democratic", url: "https://www.gov.ca.gov/" },
  CO: { name: "Jared Polis", party: "Democratic", url: "https://governor.colorado.gov/" },
  CT: { name: "Ned Lamont", party: "Democratic", url: "https://portal.ct.gov/governor" },
  DE: { name: "Matt Meyer", party: "Democratic", url: "https://governor.delaware.gov/" },
  FL: { name: "Ron DeSantis", party: "Republican", url: "https://www.flgov.com/" },
  GA: { name: "Brian Kemp", party: "Republican", url: "https://gov.georgia.gov/" },
  HI: { name: "Josh Green", party: "Democratic", url: "https://governor.hawaii.gov/" },
  ID: { name: "Brad Little", party: "Republican", url: "https://gov.idaho.gov/" },
  IL: { name: "JB Pritzker", party: "Democratic", url: "https://gov.illinois.gov/" },
  IN: { name: "Mike Braun", party: "Republican", url: "https://www.in.gov/gov/" },
  IA: { name: "Kim Reynolds", party: "Republican", url: "https://governor.iowa.gov/" },
  KS: { name: "Laura Kelly", party: "Democratic", url: "https://governor.kansas.gov/" },
  KY: { name: "Andy Beshear", party: "Democratic", url: "https://governor.ky.gov/" },
  LA: { name: "Jeff Landry", party: "Republican", url: "https://gov.louisiana.gov/" },
  ME: { name: "Janet Mills", party: "Democratic", url: "https://www.maine.gov/governor/mills/" },
  MD: { name: "Wes Moore", party: "Democratic", url: "https://governor.maryland.gov/" },
  MA: { name: "Maura Healey", party: "Democratic", url: "https://www.mass.gov/orgs/office-of-governor-maura-healey-and-lt-governor-kim-driscoll" },
  MI: { name: "Gretchen Whitmer", party: "Democratic", url: "https://www.michigan.gov/whitmer" },
  MN: { name: "Tim Walz", party: "Democratic-Farmer-Labor", url: "https://mn.gov/governor/" },
  MS: { name: "Tate Reeves", party: "Republican", url: "https://governorreeves.ms.gov/" },
  MO: { name: "Mike Kehoe", party: "Republican", url: "https://governor.mo.gov/" },
  MT: { name: "Greg Gianforte", party: "Republican", url: "https://governor.mt.gov/" },
  NE: { name: "Jim Pillen", party: "Republican", url: "https://governor.nebraska.gov/" },
  NV: { name: "Joe Lombardo", party: "Republican", url: "https://gov.nv.gov/" },
  NH: { name: "Kelly Ayotte", party: "Republican", url: "https://www.governor.nh.gov/" },
  NJ: { name: "Phil Murphy", party: "Democratic", url: "https://www.nj.gov/governor/" },
  NM: { name: "Michelle Lujan Grisham", party: "Democratic", url: "https://www.governor.state.nm.us/" },
  NY: { name: "Kathy Hochul", party: "Democratic", url: "https://www.governor.ny.gov/" },
  NC: { name: "Josh Stein", party: "Democratic", url: "https://governor.nc.gov/" },
  ND: { name: "Kelly Armstrong", party: "Republican", url: "https://www.governor.nd.gov/" },
  OH: { name: "Mike DeWine", party: "Republican", url: "https://governor.ohio.gov/" },
  OK: { name: "Kevin Stitt", party: "Republican", url: "https://oklahoma.gov/governor.html" },
  OR: { name: "Tina Kotek", party: "Democratic", url: "https://www.oregon.gov/gov/" },
  PA: { name: "Josh Shapiro", party: "Democratic", url: "https://www.pa.gov/governor/" },
  RI: { name: "Dan McKee", party: "Democratic", url: "https://governor.ri.gov/" },
  SC: { name: "Henry McMaster", party: "Republican", url: "https://governor.sc.gov/" },
  SD: { name: "Larry Rhoden", party: "Republican", url: "https://governor.sd.gov/" },
  TN: { name: "Bill Lee", party: "Republican", url: "https://www.tn.gov/governor.html" },
  TX: { name: "Greg Abbott", party: "Republican", url: "https://gov.texas.gov/" },
  UT: { name: "Spencer Cox", party: "Republican", url: "https://governor.utah.gov/" },
  VT: { name: "Phil Scott", party: "Republican", url: "https://governor.vermont.gov/" },
  VA: { name: "Glenn Youngkin", party: "Republican", url: "https://www.governor.virginia.gov/" },
  WA: { name: "Bob Ferguson", party: "Democratic", url: "https://governor.wa.gov/" },
  WV: { name: "Patrick Morrisey", party: "Republican", url: "https://governor.wv.gov/" },
  WI: { name: "Tony Evers", party: "Democratic", url: "https://evers.wi.gov/" },
  WY: { name: "Mark Gordon", party: "Republican", url: "https://governor.wyo.gov/" },
}

/** Canadian provincial premiers (province-level LOD). */
const CA_PROVINCE_EXECUTIVES: Record<string, ExecutiveSeed> = {
  AB: { name: "Danielle Smith", party: "United Conservative", url: "https://www.alberta.ca/premier" },
  BC: { name: "David Eby", party: "BC NDP", url: "https://news.gov.bc.ca/office-of-the-premier" },
  MB: { name: "Wab Kinew", party: "Manitoba NDP", url: "https://www.gov.mb.ca/premier/" },
  NB: { name: "Susan Holt", party: "Liberal", url: "https://www2.gnb.ca/" },
  NS: { name: "Tim Houston", party: "Progressive Conservative", url: "https://novascotia.ca/premier/" },
  ON: { name: "Doug Ford", party: "Progressive Conservative", url: "https://www.ontario.ca/page/premier" },
  QC: { name: "François Legault", party: "Coalition Avenir Québec", url: "https://www.quebec.ca/en/premier" },
  SK: { name: "Scott Moe", party: "Saskatchewan Party", url: "https://www.saskatchewan.ca/government/premier-of-saskatchewan" },
}

const CA_PROVINCE_NAME_TO_CODE: Record<string, string> = {
  alberta: "AB",
  "british columbia": "BC",
  manitoba: "MB",
  "new brunswick": "NB",
  "nova scotia": "NS",
  ontario: "ON",
  quebec: "QC",
  québec: "QC",
  saskatchewan: "SK",
}

const CITY_MAYORS: Record<string, { name: string; party?: string }> = {
  "san diego|CA": { name: "Todd Gloria", party: "Democratic" },
  "los angeles|CA": { name: "Karen Bass", party: "Democratic" },
  "san francisco|CA": { name: "Daniel Lurie", party: "Democratic" },
  "imperial beach|CA": { name: "Paloma Aguirre", party: "Democratic" },
  "chula vista|CA": { name: "John McCann", party: "Nonpartisan" },
  "washington|DC": { name: "Muriel Bowser", party: "Democratic" },
  "new york|NY": { name: "Eric Adams", party: "Democratic" },
}

/** Curated city council rosters (public elected officials). */
const CITY_COUNCIL: Record<
  string,
  Array<{ name: string; office: string; party?: string; term_start?: string }>
> = {
  "san diego|CA": [
    { name: "Sean Elo-Rivera", office: "City Council President (District 9)", party: "Democratic", term_start: "2020-12-01" },
    { name: "Joe LaCava", office: "City Councilmember (District 1)", party: "Democratic", term_start: "2020-12-01" },
    { name: "Jennifer Campbell", office: "City Councilmember (District 2)", party: "Democratic", term_start: "2018-12-01" },
    { name: "Stephen Whitburn", office: "City Councilmember (District 3)", party: "Democratic", term_start: "2020-12-01" },
    { name: "Henry Foster III", office: "City Councilmember (District 4)", party: "Democratic", term_start: "2022-12-01" },
    { name: "Marni von Wilpert", office: "City Councilmember (District 5)", party: "Democratic", term_start: "2020-12-01" },
    { name: "Kent Lee", office: "City Councilmember (District 6)", party: "Democratic", term_start: "2022-12-01" },
    { name: "Raul Campillo", office: "City Councilmember (District 7)", party: "Democratic", term_start: "2020-12-01" },
    { name: "Vivian Moreno", office: "City Councilmember (District 8)", party: "Democratic", term_start: "2018-12-01" },
  ],
  "los angeles|CA": [
    { name: "Marqueece Harris-Dawson", office: "City Council President (District 8)", party: "Democratic", term_start: "2015-07-01" },
    { name: "Eunisses Hernandez", office: "City Councilmember (District 1)", party: "Democratic", term_start: "2022-12-12" },
    { name: "Paul Krekorian", office: "City Councilmember (District 2)", party: "Democratic", term_start: "2009-07-01" },
    { name: "Heather Hutt", office: "City Councilmember (District 10)", party: "Democratic", term_start: "2022-08-15" },
  ],
}

function withPortrait(official: CivicFallbackOfficial): CivicFallbackOfficial {
  return {
    ...official,
    image_url: resolveExecutivePortraitUrl(official) ?? official.image_url ?? null,
  }
}

function resolveStateCode(state?: string | null): string | null {
  if (!state) return null
  const trimmed = state.trim()
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase()
  return STATE_NAME_TO_CODE[trimmed.toLowerCase()] ?? null
}

function resolveCountryCode(country?: string | null): string | null {
  if (!country) return null
  const trimmed = country.trim()
  if (/^[A-Za-z]{2}$/.test(trimmed)) {
    const upper = trimmed.toUpperCase()
    if (NATIONAL_EXECUTIVES[upper]) return upper
  }
  return COUNTRY_NAME_TO_CODE[trimmed.toLowerCase()] ?? null
}

function resolveCaProvinceCode(province?: string | null): string | null {
  if (!province) return null
  const trimmed = province.trim()
  if (/^[A-Za-z]{2}$/.test(trimmed) && CA_PROVINCE_EXECUTIVES[trimmed.toUpperCase()]) {
    return trimmed.toUpperCase()
  }
  return CA_PROVINCE_NAME_TO_CODE[trimmed.toLowerCase()] ?? null
}

function appendNationalExecutives(countryCode: string | null, officials: CivicFallbackOfficial[]) {
  if (!countryCode) return
  const nationals = NATIONAL_EXECUTIVES[countryCode]
  if (!nationals?.length) return
  const seen = new Set(officials.map((o) => o.id))
  for (const official of nationals) {
    if (seen.has(official.id)) continue
    officials.push(withPortrait(official))
  }
}

function formatPersonName(name: Record<string, unknown> | undefined): string {
  if (!name) return "Official"
  const first = String(name.first ?? name.official_first ?? "")
  const last = String(name.last ?? name.official_last ?? "")
  const combined = `${first} ${last}`.trim()
  return combined || String(name.official_full ?? "Official")
}

function currentTerm(terms: unknown[] | undefined) {
  if (!Array.isArray(terms) || !terms.length) return null
  const now = Date.now()
  const parsed = terms
    .filter((t): t is Record<string, unknown> => typeof t === "object" && t !== null)
    .map((t) => ({
      type: String(t.type ?? ""),
      state: String(t.state ?? "").toUpperCase(),
      party: t.party ? String(t.party) : undefined,
      start: t.start ? String(t.start) : undefined,
      end: t.end ? String(t.end) : null,
      endMs: t.end ? new Date(String(t.end)).getTime() : null,
    }))
  const active = parsed.filter((t) => !t.endMs || t.endMs >= now)
  return active.sort((a, b) => (b.start ?? "").localeCompare(a.start ?? ""))[0] ?? parsed[parsed.length - 1]
}

async function loadLegislators(): Promise<unknown[]> {
  // legislators-current.json removed upstream; YAML parse not bundled here.
  return []
}

function appendStateFederalOfficials(stateCode: string | null, officials: CivicFallbackOfficial[]) {
  if (!stateCode) return
  const curated = STATE_FEDERAL_OFFICIALS[stateCode]
  if (!curated?.length) return
  const seen = new Set(officials.map((o) => o.id))
  for (const official of curated) {
    if (seen.has(official.id)) continue
    officials.push(official)
  }
}

function congressPhotoUrl(bioguide?: string): string | null {
  if (!bioguide) return null
  return `https://bioguide.congress.gov/bioguide/photo/${bioguide[0]}/${bioguide}.jpg`
}

function buildElections(stateCode: string | null, jurisdictionLabel: string): CivicFallbackElection[] {
  const year = new Date().getFullYear()
  const items: CivicFallbackElection[] = [
    {
      id: `election:general:${year}`,
      name: `${year} General Election`,
      election_day: `${year}-11-03`,
      jurisdiction_name: jurisdictionLabel || "United States",
      source_url: "https://www.usa.gov/election-day",
    },
  ]
  if (stateCode === "CA") {
    items.unshift({
      id: "election:ca-primary",
      name: "California Primary Election",
      election_day: `${year}-06-03`,
      jurisdiction_name: "California",
      source_url: "https://www.sos.ca.gov/elections",
    })
  }
  return items
}

function buildLegislationSample(stateCode: string | null): CivicFallbackLegislation[] {
  const state = stateCode ?? "US"
  return [
    {
      id: "leg:sample:1",
      name: `${state} legislative session — active bill tracking`,
      status: "in session",
      source: "civic-fallback",
      source_url: stateCode === "CA" ? "https://leginfo.legislature.ca.gov/" : "https://www.congress.gov/",
    },
    {
      id: "leg:sample:2",
      name: "Congress.gov — recently introduced legislation",
      status: "tracked",
      source: "civic-fallback",
      source_url: "https://www.congress.gov/search?q=%7B%22source%22%3A%22legislation%22%7D",
    },
  ]
}

export async function fetchCivicFallback(input: {
  state?: string | null
  city?: string | null
  county?: string | null
  country?: string | null
}): Promise<CivicFallbackResult> {
  const stateCode = resolveStateCode(input.state)
  const countryCode = resolveCountryCode(input.country)
  const provinceCode = countryCode === "CA" ? resolveCaProvinceCode(input.state) : null
  const jurisdictionLabel = [input.city, input.state, input.country].filter(Boolean).join(", ")
  const officials: CivicFallbackOfficial[] = []

  // National leadership (head of state / government) — surfaces at country LOD.
  appendNationalExecutives(countryCode, officials)

  // U.S. state governor.
  if (stateCode && STATE_EXECUTIVES[stateCode]) {
    const exec = STATE_EXECUTIVES[stateCode]
    officials.push(
      withPortrait({
        id: `gov:${stateCode}`,
        name: exec.name,
        office: `Governor of ${input.state ?? stateCode}`,
        party: exec.party,
        jurisdiction_name: input.state ?? stateCode,
        urls: [exec.url ?? "https://www.usa.gov/state-governor"],
        term_end: null,
      }),
    )
  }

  // Canadian provincial premier.
  if (provinceCode && CA_PROVINCE_EXECUTIVES[provinceCode]) {
    const premier = CA_PROVINCE_EXECUTIVES[provinceCode]
    officials.push(
      withPortrait({
        id: `premier:${provinceCode}`,
        name: premier.name,
        office: `Premier of ${input.state ?? provinceCode}`,
        party: premier.party,
        jurisdiction_name: input.state ?? provinceCode,
        urls: premier.url ? [premier.url] : [],
        term_end: null,
      }),
    )
  }

  const cityKey = `${(input.city ?? "").trim().toLowerCase()}|${stateCode ?? ""}`
  const mayor = CITY_MAYORS[cityKey]
  if (mayor) {
    officials.push(
      withPortrait({
        id: `mayor:${cityKey}`,
        name: mayor.name,
        office: `Mayor of ${input.city}`,
        party: mayor.party,
        jurisdiction_name: input.city ?? undefined,
        term_start: "2020-12-01",
        term_end: null,
      }),
    )
  }

  const councilMembers = CITY_COUNCIL[cityKey]
  if (councilMembers?.length) {
    for (const member of councilMembers) {
      officials.push(
        withPortrait({
          id: `council:${cityKey}:${member.name.replace(/\s+/g, "-").toLowerCase()}`,
          name: member.name,
          office: member.office,
          party: member.party,
          jurisdiction_name: input.city ?? undefined,
          term_start: member.term_start,
          term_end: null,
        }),
      )
    }
  }

  if (stateCode) {
    appendStateFederalOfficials(stateCode, officials)
    try {
      const legislators = await loadLegislators()
      for (const row of legislators) {
        if (!row || typeof row !== "object") continue
        const record = row as Record<string, unknown>
        const terms = record.terms as unknown[] | undefined
        const term = currentTerm(terms)
        if (!term || term.state !== stateCode) continue
        const ids = record.id as Record<string, unknown> | undefined
        const bioguide = ids?.bioguide ? String(ids.bioguide) : undefined
        const name = formatPersonName(record.name as Record<string, unknown> | undefined)
        const office =
          term.type === "sen"
            ? `U.S. Senator (${stateCode})`
            : term.type === "rep"
              ? `U.S. Representative (${stateCode})`
              : `Federal Official (${stateCode})`
        officials.push({
          id: bioguide ? `bioguide:${bioguide}` : `leg:${name}:${office}`,
          name,
          office,
          party: term.party,
          image_url: congressPhotoUrl(bioguide),
          jurisdiction_name: input.state ?? stateCode,
          urls: bioguide ? [`https://www.congress.gov/member/${name.toLowerCase().replace(/\s+/g, "-")}/${bioguide}`] : [],
          term_start: term.start,
          term_end: term.end,
        })
      }
    } catch (error) {
      console.warn("[CREP/CivicFallback] legislators load failed:", (error as Error)?.message)
    }
  }

  return {
    officials: officials.map(withPortrait),
    elections: buildElections(stateCode, jurisdictionLabel),
    legislation: buildLegislationSample(stateCode),
    source: "civic-fallback",
  }
}
