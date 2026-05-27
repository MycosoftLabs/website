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

/** Curated U.S. federal executives — shown at country zoom via civic fallback. May 24, 2026 */
const US_FEDERAL_EXECUTIVES: CivicFallbackOfficial[] = [
  {
    id: "exec:potus",
    name: "Donald J. Trump",
    office: "President of the United States",
    party: "Republican",
    jurisdiction_name: "United States",
    urls: ["https://www.whitehouse.gov/"],
    term_start: "2025-01-20",
    term_end: null,
  },
  {
    id: "exec:vpotus",
    name: "JD Vance",
    office: "Vice President of the United States",
    party: "Republican",
    jurisdiction_name: "United States",
    urls: ["https://www.whitehouse.gov/administration/vice-president-vance/"],
    term_start: "2025-01-20",
    term_end: null,
  },
]

/** Congressional leadership — country-level Viewport Intelligence. May 24, 2026 */
const US_CONGRESS_LEADERSHIP: CivicFallbackOfficial[] = [
  {
    id: "congress:senate-majority",
    name: "John Thune",
    office: "U.S. Senate Majority Leader",
    party: "Republican",
    jurisdiction_name: "United States Senate",
    urls: ["https://www.thune.senate.gov/"],
  },
  {
    id: "congress:house-speaker",
    name: "Mike Johnson",
    office: "Speaker of the U.S. House of Representatives",
    party: "Republican",
    jurisdiction_name: "United States House of Representatives",
    urls: ["https://www.speaker.gov/"],
  },
]

type CountryCivicProfile = {
  aliases: string[]
  officials: CivicFallbackOfficial[]
  elections: CivicFallbackElection[]
  legislation: CivicFallbackLegislation[]
}

const COUNTRY_CIVIC_PROFILES: CountryCivicProfile[] = [
  {
    aliases: ["canada", "ca"],
    officials: [
      {
        id: "ca:pm:carney",
        name: "Mark Carney",
        office: "Prime Minister of Canada",
        jurisdiction_name: "Canada",
        urls: ["https://www.pm.gc.ca/"],
        term_start: "2025-03-14",
        term_end: null,
      },
      {
        id: "ca:monarch:charles-iii",
        name: "Charles III",
        office: "King of Canada",
        jurisdiction_name: "Canada",
        urls: ["https://www.canada.ca/en/canadian-heritage/services/royal-family/king.html"],
        term_start: "2022-09-08",
        term_end: null,
      },
    ],
    elections: [
      {
        id: "ca:elections",
        name: "Federal elections and ridings",
        jurisdiction_name: "Canada",
        source_url: "https://www.elections.ca/",
      },
    ],
    legislation: [
      {
        id: "ca:parliament",
        name: "Parliament of Canada proceedings",
        status: "tracked",
        source: "civic-fallback",
        source_url: "https://www.parl.ca/",
      },
    ],
  },
  {
    aliases: ["mexico", "mx", "méxico", "estados unidos mexicanos"],
    officials: [
      {
        id: "mx:president:sheinbaum",
        name: "Claudia Sheinbaum Pardo",
        office: "President of Mexico",
        jurisdiction_name: "Mexico",
        urls: ["https://www.gob.mx/presidencia/"],
        term_start: "2024-10-01",
        term_end: null,
      },
    ],
    elections: [
      {
        id: "mx:ine",
        name: "Federal and local electoral processes",
        jurisdiction_name: "Mexico",
        source_url: "https://www.ine.mx/",
      },
    ],
    legislation: [
      {
        id: "mx:congreso",
        name: "Congress of the Union legislative information",
        status: "tracked",
        source: "civic-fallback",
        source_url: "https://www.diputados.gob.mx/",
      },
    ],
  },
  {
    aliases: ["china", "cn", "people's republic of china", "peoples republic of china"],
    officials: [
      {
        id: "cn:president:xi",
        name: "Xi Jinping",
        office: "President of China; General Secretary of the Chinese Communist Party",
        jurisdiction_name: "People's Republic of China",
        urls: ["https://english.www.gov.cn/"],
        term_start: "2013-03-14",
        term_end: null,
      },
      {
        id: "cn:premier:li-qiang",
        name: "Li Qiang",
        office: "Premier of China",
        jurisdiction_name: "People's Republic of China",
        urls: ["https://english.www.gov.cn/"],
        term_start: "2023-03-11",
        term_end: null,
      },
    ],
    elections: [
      {
        id: "cn:npc",
        name: "National People's Congress",
        jurisdiction_name: "People's Republic of China",
        source_url: "http://www.npc.gov.cn/englishnpc/index.shtml",
      },
    ],
    legislation: [
      {
        id: "cn:state-council",
        name: "State Council policy and legislation",
        status: "tracked",
        source: "civic-fallback",
        source_url: "https://english.www.gov.cn/policies/",
      },
    ],
  },
  {
    aliases: ["japan", "jp"],
    officials: [
      {
        id: "jp:pm:takaichi",
        name: "TAKAICHI Sanae",
        office: "Prime Minister of Japan",
        jurisdiction_name: "Japan",
        urls: ["https://japan.kantei.go.jp/"],
        term_start: "2026-02-18",
        term_end: null,
      },
      {
        id: "jp:emperor:naruhito",
        name: "Naruhito",
        office: "Emperor of Japan",
        jurisdiction_name: "Japan",
        urls: ["https://www.kunaicho.go.jp/eindex.html"],
        term_start: "2019-05-01",
        term_end: null,
      },
    ],
    elections: [
      {
        id: "jp:elections",
        name: "National elections",
        jurisdiction_name: "Japan",
        source_url: "https://www.soumu.go.jp/english/",
      },
    ],
    legislation: [
      {
        id: "jp:diet",
        name: "National Diet legislation",
        status: "tracked",
        source: "civic-fallback",
        source_url: "https://www.sangiin.go.jp/eng/",
      },
    ],
  },
  {
    aliases: ["european union and united kingdom", "europe", "european union", "eu", "united kingdom", "uk"],
    officials: [
      {
        id: "eu:council:costa",
        name: "António Costa",
        office: "President of the European Council",
        jurisdiction_name: "European Union",
        urls: ["https://www.consilium.europa.eu/european-council/president/role/"],
        term_start: "2024-12-01",
        term_end: null,
      },
      {
        id: "eu:commission:von-der-leyen",
        name: "Ursula von der Leyen",
        office: "President of the European Commission",
        jurisdiction_name: "European Union",
        urls: ["https://commission.europa.eu/"],
        term_start: "2024-12-01",
        term_end: null,
      },
      {
        id: "uk:pm:starmer",
        name: "Keir Starmer",
        office: "Prime Minister of the United Kingdom",
        jurisdiction_name: "United Kingdom",
        urls: ["https://www.gov.uk/government/ministers/prime-minister"],
        term_start: "2024-07-05",
        term_end: null,
      },
    ],
    elections: [
      {
        id: "eu:elections",
        name: "European Parliament elections",
        jurisdiction_name: "European Union",
        source_url: "https://elections.europa.eu/",
      },
      {
        id: "uk:elections",
        name: "UK elections and voting",
        jurisdiction_name: "United Kingdom",
        source_url: "https://www.gov.uk/how-to-vote",
      },
    ],
    legislation: [
      {
        id: "eu:law",
        name: "European Union law and policy",
        status: "tracked",
        source: "civic-fallback",
        source_url: "https://eur-lex.europa.eu/",
      },
      {
        id: "uk:parliament",
        name: "UK Parliament bills and legislation",
        status: "tracked",
        source: "civic-fallback",
        source_url: "https://bills.parliament.uk/",
      },
    ],
  },
]

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

const STATE_EXECUTIVES: Record<string, { name: string; party?: string }> = {
  CA: { name: "Gavin Newsom", party: "Democratic" },
  TX: { name: "Greg Abbott", party: "Republican" },
  NY: { name: "Kathy Hochul", party: "Democratic" },
  FL: { name: "Ron DeSantis", party: "Republican" },
  AZ: { name: "Katie Hobbs", party: "Democratic" },
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

function resolveCountryProfile(countryNorm: string): CountryCivicProfile | null {
  if (!countryNorm) return null
  return COUNTRY_CIVIC_PROFILES.find((profile) =>
    profile.aliases.some((alias) => countryNorm === alias || countryNorm.includes(alias)),
  ) ?? null
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
  const jurisdictionLabel = [input.city, input.state, input.country].filter(Boolean).join(", ")
  const officials: CivicFallbackOfficial[] = []

  const countryNorm = (input.country ?? "").trim().toLowerCase()
  const isUnitedStates =
    !countryNorm ||
    countryNorm === "us" ||
    countryNorm === "usa" ||
    countryNorm.includes("united states")

  const countryProfile = isUnitedStates ? null : resolveCountryProfile(countryNorm)
  if (countryProfile) {
    return {
      officials: countryProfile.officials.map(withPortrait),
      elections: countryProfile.elections,
      legislation: countryProfile.legislation,
      source: "civic-fallback",
    }
  }

  if (!isUnitedStates) {
    return {
      officials: [],
      elections: [],
      legislation: [],
      source: "civic-fallback",
    }
  }

  if (isUnitedStates) {
    for (const exec of US_FEDERAL_EXECUTIVES) {
      officials.push(withPortrait(exec))
    }
    for (const leader of US_CONGRESS_LEADERSHIP) {
      officials.push(withPortrait(leader))
    }
  }

  if (stateCode && STATE_EXECUTIVES[stateCode]) {
    const exec = STATE_EXECUTIVES[stateCode]
    officials.push(
      withPortrait({
        id: `gov:${stateCode}`,
        name: exec.name,
        office: `Governor of ${input.state ?? stateCode}`,
        party: exec.party,
        jurisdiction_name: input.state ?? stateCode,
        urls: [`https://www.usa.gov/state-governor`],
        term_start: "2019-01-07",
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
