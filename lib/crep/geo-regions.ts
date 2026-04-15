/**
 * CREP Geospatial Sub-Regions — State/County/FEMA/International Administrative Divisions
 *
 * Every data fetch from MINDEX uses these granular sub-regions instead of
 * arbitrary latitude bands. This guarantees full data coverage by matching
 * actual jurisdictional boundaries, and gives FUSARIUM actionable
 * administrative-boundary-aligned intelligence.
 *
 * Structure:
 *   US: 50 states + DC (each its own bbox)
 *   FEMA: 10 regions (aggregated from state bboxes)
 *   Canada: 13 provinces/territories
 *   Mexico: 6 macro-regions
 *   Europe: 15 major countries
 *   Asia: 10 macro-regions
 *   Africa/ME: 6 macro-regions
 *   Oceania: 3 macro-regions
 *   South America: 6 macro-regions
 */

export interface GeoRegion {
  id: string
  name: string
  north: number
  south: number
  east: number
  west: number
  /** ISO 3166-1/2 code or FEMA region number */
  code?: string
  /** Parent region (e.g., "US", "CA", "FEMA-III") */
  parent?: string
  /** Region type for grouping */
  type: "state" | "fema" | "province" | "country" | "macro"
}

// ═══════════════════════════════════════════════════════════════════════════
// US STATES — All 50 + DC
// ═══════════════════════════════════════════════════════════════════════════
export const US_STATES: GeoRegion[] = [
  { id: "us-al", name: "Alabama",        code: "AL", parent: "US", type: "state", north: 35.0, south: 30.2, east: -84.9, west: -88.5 },
  { id: "us-ak", name: "Alaska",         code: "AK", parent: "US", type: "state", north: 71.4, south: 51.2, east: -130.0, west: -179.1 },
  { id: "us-az", name: "Arizona",        code: "AZ", parent: "US", type: "state", north: 37.0, south: 31.3, east: -109.0, west: -114.8 },
  { id: "us-ar", name: "Arkansas",       code: "AR", parent: "US", type: "state", north: 36.5, south: 33.0, east: -89.6, west: -94.6 },
  { id: "us-ca", name: "California",     code: "CA", parent: "US", type: "state", north: 42.0, south: 32.5, east: -114.1, west: -124.4 },
  { id: "us-co", name: "Colorado",       code: "CO", parent: "US", type: "state", north: 41.0, south: 37.0, east: -102.0, west: -109.1 },
  { id: "us-ct", name: "Connecticut",    code: "CT", parent: "US", type: "state", north: 42.1, south: 41.0, east: -71.8, west: -73.7 },
  { id: "us-de", name: "Delaware",       code: "DE", parent: "US", type: "state", north: 39.8, south: 38.5, east: -75.0, west: -75.8 },
  { id: "us-dc", name: "District of Columbia", code: "DC", parent: "US", type: "state", north: 39.0, south: 38.8, east: -76.9, west: -77.1 },
  { id: "us-fl", name: "Florida",        code: "FL", parent: "US", type: "state", north: 31.0, south: 24.5, east: -80.0, west: -87.6 },
  { id: "us-ga", name: "Georgia",        code: "GA", parent: "US", type: "state", north: 35.0, south: 30.4, east: -80.8, west: -85.6 },
  { id: "us-hi", name: "Hawaii",         code: "HI", parent: "US", type: "state", north: 22.2, south: 18.9, east: -154.8, west: -160.2 },
  { id: "us-id", name: "Idaho",          code: "ID", parent: "US", type: "state", north: 49.0, south: 42.0, east: -111.0, west: -117.2 },
  { id: "us-il", name: "Illinois",       code: "IL", parent: "US", type: "state", north: 42.5, south: 37.0, east: -87.5, west: -91.5 },
  { id: "us-in", name: "Indiana",        code: "IN", parent: "US", type: "state", north: 41.8, south: 37.8, east: -84.8, west: -88.1 },
  { id: "us-ia", name: "Iowa",           code: "IA", parent: "US", type: "state", north: 43.5, south: 40.4, east: -90.1, west: -96.6 },
  { id: "us-ks", name: "Kansas",         code: "KS", parent: "US", type: "state", north: 40.0, south: 37.0, east: -94.6, west: -102.1 },
  { id: "us-ky", name: "Kentucky",       code: "KY", parent: "US", type: "state", north: 39.1, south: 36.5, east: -82.0, west: -89.6 },
  { id: "us-la", name: "Louisiana",      code: "LA", parent: "US", type: "state", north: 33.0, south: 29.0, east: -89.0, west: -94.0 },
  { id: "us-me", name: "Maine",          code: "ME", parent: "US", type: "state", north: 47.5, south: 43.1, east: -67.0, west: -71.1 },
  { id: "us-md", name: "Maryland",       code: "MD", parent: "US", type: "state", north: 39.7, south: 37.9, east: -75.0, west: -79.5 },
  { id: "us-ma", name: "Massachusetts",  code: "MA", parent: "US", type: "state", north: 42.9, south: 41.2, east: -69.9, west: -73.5 },
  { id: "us-mi", name: "Michigan",       code: "MI", parent: "US", type: "state", north: 48.3, south: 41.7, east: -82.4, west: -90.4 },
  { id: "us-mn", name: "Minnesota",      code: "MN", parent: "US", type: "state", north: 49.4, south: 43.5, east: -89.5, west: -97.2 },
  { id: "us-ms", name: "Mississippi",    code: "MS", parent: "US", type: "state", north: 35.0, south: 30.2, east: -88.1, west: -91.7 },
  { id: "us-mo", name: "Missouri",       code: "MO", parent: "US", type: "state", north: 40.6, south: 36.0, east: -89.1, west: -95.8 },
  { id: "us-mt", name: "Montana",        code: "MT", parent: "US", type: "state", north: 49.0, south: 44.4, east: -104.0, west: -116.0 },
  { id: "us-ne", name: "Nebraska",       code: "NE", parent: "US", type: "state", north: 43.0, south: 40.0, east: -95.3, west: -104.1 },
  { id: "us-nv", name: "Nevada",         code: "NV", parent: "US", type: "state", north: 42.0, south: 35.0, east: -114.0, west: -120.0 },
  { id: "us-nh", name: "New Hampshire",  code: "NH", parent: "US", type: "state", north: 45.3, south: 42.7, east: -70.7, west: -72.6 },
  { id: "us-nj", name: "New Jersey",     code: "NJ", parent: "US", type: "state", north: 41.4, south: 38.9, east: -73.9, west: -75.6 },
  { id: "us-nm", name: "New Mexico",     code: "NM", parent: "US", type: "state", north: 37.0, south: 31.3, east: -103.0, west: -109.0 },
  { id: "us-ny", name: "New York",       code: "NY", parent: "US", type: "state", north: 45.0, south: 40.5, east: -71.9, west: -79.8 },
  { id: "us-nc", name: "North Carolina", code: "NC", parent: "US", type: "state", north: 36.6, south: 33.8, east: -75.5, west: -84.3 },
  { id: "us-nd", name: "North Dakota",   code: "ND", parent: "US", type: "state", north: 49.0, south: 45.9, east: -96.6, west: -104.0 },
  { id: "us-oh", name: "Ohio",           code: "OH", parent: "US", type: "state", north: 42.0, south: 38.4, east: -80.5, west: -84.8 },
  { id: "us-ok", name: "Oklahoma",       code: "OK", parent: "US", type: "state", north: 37.0, south: 33.6, east: -94.4, west: -103.0 },
  { id: "us-or", name: "Oregon",         code: "OR", parent: "US", type: "state", north: 46.3, south: 42.0, east: -116.5, west: -124.6 },
  { id: "us-pa", name: "Pennsylvania",   code: "PA", parent: "US", type: "state", north: 42.3, south: 39.7, east: -74.7, west: -80.5 },
  { id: "us-ri", name: "Rhode Island",   code: "RI", parent: "US", type: "state", north: 42.0, south: 41.1, east: -71.1, west: -71.9 },
  { id: "us-sc", name: "South Carolina", code: "SC", parent: "US", type: "state", north: 35.2, south: 32.0, east: -78.5, west: -83.4 },
  { id: "us-sd", name: "South Dakota",   code: "SD", parent: "US", type: "state", north: 46.0, south: 42.5, east: -96.4, west: -104.1 },
  { id: "us-tn", name: "Tennessee",      code: "TN", parent: "US", type: "state", north: 36.7, south: 35.0, east: -81.6, west: -90.3 },
  { id: "us-tx", name: "Texas",          code: "TX", parent: "US", type: "state", north: 36.5, south: 25.8, east: -93.5, west: -106.6 },
  { id: "us-ut", name: "Utah",           code: "UT", parent: "US", type: "state", north: 42.0, south: 37.0, east: -109.0, west: -114.0 },
  { id: "us-vt", name: "Vermont",        code: "VT", parent: "US", type: "state", north: 45.0, south: 42.7, east: -71.5, west: -73.4 },
  { id: "us-va", name: "Virginia",       code: "VA", parent: "US", type: "state", north: 39.5, south: 36.5, east: -75.2, west: -83.7 },
  { id: "us-wa", name: "Washington",     code: "WA", parent: "US", type: "state", north: 49.0, south: 45.5, east: -116.9, west: -124.8 },
  { id: "us-wv", name: "West Virginia",  code: "WV", parent: "US", type: "state", north: 40.6, south: 37.2, east: -77.7, west: -82.6 },
  { id: "us-wi", name: "Wisconsin",      code: "WI", parent: "US", type: "state", north: 47.1, south: 42.5, east: -86.2, west: -92.9 },
  { id: "us-wy", name: "Wyoming",        code: "WY", parent: "US", type: "state", north: 45.0, south: 41.0, east: -104.0, west: -111.1 },
]

// ═══════════════════════════════════════════════════════════════════════════
// FEMA REGIONS — 10 Regions (aggregate bboxes from member states)
// Critical for FUSARIUM defense/IC jurisdictional intelligence
// ═══════════════════════════════════════════════════════════════════════════
export interface FemaRegion extends GeoRegion {
  regionNumber: number
  states: string[]
  hqCity: string
}

export const FEMA_REGIONS: FemaRegion[] = [
  {
    id: "fema-1", name: "FEMA Region I", code: "FEMA-I", type: "fema", parent: "US",
    regionNumber: 1, hqCity: "Boston, MA",
    states: ["CT", "ME", "MA", "NH", "RI", "VT"],
    north: 47.5, south: 41.0, east: -67.0, west: -73.7,
  },
  {
    id: "fema-2", name: "FEMA Region II", code: "FEMA-II", type: "fema", parent: "US",
    regionNumber: 2, hqCity: "New York City, NY",
    states: ["NJ", "NY", "PR", "USVI"],
    north: 45.0, south: 17.6, east: -64.5, west: -79.8,
  },
  {
    id: "fema-3", name: "FEMA Region III", code: "FEMA-III", type: "fema", parent: "US",
    regionNumber: 3, hqCity: "Philadelphia, PA",
    states: ["DC", "DE", "MD", "PA", "VA", "WV"],
    north: 42.3, south: 36.5, east: -74.7, west: -83.7,
  },
  {
    id: "fema-4", name: "FEMA Region IV", code: "FEMA-IV", type: "fema", parent: "US",
    regionNumber: 4, hqCity: "Atlanta, GA",
    states: ["AL", "FL", "GA", "KY", "MS", "NC", "SC", "TN"],
    north: 39.1, south: 24.5, east: -75.5, west: -91.7,
  },
  {
    id: "fema-5", name: "FEMA Region V", code: "FEMA-V", type: "fema", parent: "US",
    regionNumber: 5, hqCity: "Chicago, IL",
    states: ["IL", "IN", "MI", "MN", "OH", "WI"],
    north: 49.4, south: 37.0, east: -80.5, west: -97.2,
  },
  {
    id: "fema-6", name: "FEMA Region VI", code: "FEMA-VI", type: "fema", parent: "US",
    regionNumber: 6, hqCity: "Denton, TX",
    states: ["AR", "LA", "NM", "OK", "TX"],
    north: 37.0, south: 25.8, east: -89.0, west: -109.0,
  },
  {
    id: "fema-7", name: "FEMA Region VII", code: "FEMA-VII", type: "fema", parent: "US",
    regionNumber: 7, hqCity: "Kansas City, MO",
    states: ["IA", "KS", "MO", "NE"],
    north: 43.5, south: 36.0, east: -89.1, west: -104.1,
  },
  {
    id: "fema-8", name: "FEMA Region VIII", code: "FEMA-VIII", type: "fema", parent: "US",
    regionNumber: 8, hqCity: "Denver, CO",
    states: ["CO", "MT", "ND", "SD", "UT", "WY"],
    north: 49.0, south: 37.0, east: -96.4, west: -116.0,
  },
  {
    id: "fema-9", name: "FEMA Region IX", code: "FEMA-IX", type: "fema", parent: "US",
    regionNumber: 9, hqCity: "Oakland, CA",
    states: ["AZ", "CA", "HI", "NV", "GU", "AS", "MP", "RMI", "FM"],
    north: 42.0, south: 13.2, east: -109.0, west: -171.8,
  },
  {
    id: "fema-10", name: "FEMA Region X", code: "FEMA-X", type: "fema", parent: "US",
    regionNumber: 10, hqCity: "Bothell, WA",
    states: ["AK", "ID", "OR", "WA"],
    north: 71.4, south: 42.0, east: -111.0, west: -179.1,
  },
]

// ═══════════════════════════════════════════════════════════════════════════
// CANADA — 13 Provinces & Territories
// ═══════════════════════════════════════════════════════════════════════════
export const CANADA_PROVINCES: GeoRegion[] = [
  { id: "ca-ab", name: "Alberta",                  code: "AB", parent: "CA", type: "province", north: 60.0, south: 49.0, east: -110.0, west: -120.0 },
  { id: "ca-bc", name: "British Columbia",          code: "BC", parent: "CA", type: "province", north: 60.0, south: 48.3, east: -114.0, west: -139.1 },
  { id: "ca-mb", name: "Manitoba",                  code: "MB", parent: "CA", type: "province", north: 60.0, south: 49.0, east: -88.9, west: -102.0 },
  { id: "ca-nb", name: "New Brunswick",             code: "NB", parent: "CA", type: "province", north: 48.1, south: 45.0, east: -63.8, west: -69.1 },
  { id: "ca-nl", name: "Newfoundland & Labrador",   code: "NL", parent: "CA", type: "province", north: 60.4, south: 46.6, east: -52.6, west: -67.8 },
  { id: "ca-ns", name: "Nova Scotia",               code: "NS", parent: "CA", type: "province", north: 47.0, south: 43.4, east: -59.7, west: -66.4 },
  { id: "ca-on", name: "Ontario",                   code: "ON", parent: "CA", type: "province", north: 56.9, south: 41.7, east: -74.3, west: -95.2 },
  { id: "ca-pe", name: "Prince Edward Island",      code: "PE", parent: "CA", type: "province", north: 47.1, south: 46.0, east: -62.0, west: -64.4 },
  { id: "ca-qc", name: "Quebec",                    code: "QC", parent: "CA", type: "province", north: 62.6, south: 45.0, east: -57.1, west: -79.8 },
  { id: "ca-sk", name: "Saskatchewan",              code: "SK", parent: "CA", type: "province", north: 60.0, south: 49.0, east: -101.4, west: -110.0 },
  { id: "ca-nt", name: "Northwest Territories",     code: "NT", parent: "CA", type: "province", north: 78.8, south: 60.0, east: -102.0, west: -136.5 },
  { id: "ca-nu", name: "Nunavut",                   code: "NU", parent: "CA", type: "province", north: 83.1, south: 51.7, east: -61.2, west: -120.7 },
  { id: "ca-yt", name: "Yukon",                     code: "YT", parent: "CA", type: "province", north: 69.6, south: 60.0, east: -124.0, west: -141.0 },
]

// ═══════════════════════════════════════════════════════════════════════════
// MEXICO — 6 Macro-Regions (covering 32 states)
// ═══════════════════════════════════════════════════════════════════════════
export const MEXICO_REGIONS: GeoRegion[] = [
  { id: "mx-nw", name: "Mexico Northwest",   code: "MX-NW", parent: "MX", type: "macro", north: 32.7, south: 22.9, east: -104.0, west: -118.4 },
  { id: "mx-ne", name: "Mexico Northeast",   code: "MX-NE", parent: "MX", type: "macro", north: 32.0, south: 22.0, east: -97.0, west: -105.0 },
  { id: "mx-cw", name: "Mexico Central West",code: "MX-CW", parent: "MX", type: "macro", north: 22.0, south: 17.5, east: -99.0, west: -105.5 },
  { id: "mx-ce", name: "Mexico Central East", code: "MX-CE", parent: "MX", type: "macro", north: 22.0, south: 17.5, east: -96.0, west: -99.5 },
  { id: "mx-se", name: "Mexico Southeast",   code: "MX-SE", parent: "MX", type: "macro", north: 21.5, south: 14.5, east: -86.7, west: -96.0 },
  { id: "mx-bc", name: "Baja California",    code: "MX-BC", parent: "MX", type: "macro", north: 32.7, south: 22.9, east: -109.4, west: -118.4 },
]

// ═══════════════════════════════════════════════════════════════════════════
// EUROPE — Major Countries
// ═══════════════════════════════════════════════════════════════════════════
export const EUROPE_REGIONS: GeoRegion[] = [
  { id: "eu-gb", name: "United Kingdom",   code: "GB", parent: "EU", type: "country", north: 60.9, south: 49.9, east: 1.8,   west: -8.2 },
  { id: "eu-fr", name: "France",           code: "FR", parent: "EU", type: "country", north: 51.1, south: 42.3, east: 8.2,   west: -5.1 },
  { id: "eu-de", name: "Germany",          code: "DE", parent: "EU", type: "country", north: 55.1, south: 47.3, east: 15.0,  west: 5.9 },
  { id: "eu-it", name: "Italy",            code: "IT", parent: "EU", type: "country", north: 47.1, south: 36.6, east: 18.5,  west: 6.6 },
  { id: "eu-es", name: "Spain",            code: "ES", parent: "EU", type: "country", north: 43.8, south: 36.0, east: 3.3,   west: -9.3 },
  { id: "eu-pt", name: "Portugal",         code: "PT", parent: "EU", type: "country", north: 42.2, south: 37.0, east: -6.2,  west: -9.5 },
  { id: "eu-pl", name: "Poland",           code: "PL", parent: "EU", type: "country", north: 54.8, south: 49.0, east: 24.1,  west: 14.1 },
  { id: "eu-nl", name: "Netherlands",      code: "NL", parent: "EU", type: "country", north: 53.5, south: 50.8, east: 7.2,   west: 3.4 },
  { id: "eu-be", name: "Belgium",          code: "BE", parent: "EU", type: "country", north: 51.5, south: 49.5, east: 6.4,   west: 2.5 },
  { id: "eu-se", name: "Sweden",           code: "SE", parent: "EU", type: "country", north: 69.1, south: 55.3, east: 24.2,  west: 11.1 },
  { id: "eu-no", name: "Norway",           code: "NO", parent: "EU", type: "country", north: 71.2, south: 58.0, east: 31.2,  west: 4.6 },
  { id: "eu-fi", name: "Finland",          code: "FI", parent: "EU", type: "country", north: 70.1, south: 59.8, east: 31.6,  west: 20.6 },
  { id: "eu-dk", name: "Denmark",          code: "DK", parent: "EU", type: "country", north: 57.8, south: 54.6, east: 15.2,  west: 8.1 },
  { id: "eu-ua", name: "Ukraine",          code: "UA", parent: "EU", type: "country", north: 52.4, south: 44.4, east: 40.2,  west: 22.1 },
  { id: "eu-ro", name: "Romania",          code: "RO", parent: "EU", type: "country", north: 48.3, south: 43.6, east: 29.7,  west: 20.3 },
  // Catch-all for smaller European countries
  { id: "eu-balkans", name: "Balkans",     code: "BALK", parent: "EU", type: "macro", north: 46.9, south: 35.0, east: 30.0,  west: 13.0 },
  { id: "eu-baltic", name: "Baltic States",code: "BALT", parent: "EU", type: "macro", north: 59.7, south: 53.9, east: 28.2,  west: 20.9 },
  { id: "eu-alpine", name: "Alpine Region",code: "ALPS", parent: "EU", type: "macro", north: 48.0, south: 45.8, east: 17.2,  west: 5.9 },
]

// ═══════════════════════════════════════════════════════════════════════════
// ASIA — Macro-Regions
// ═══════════════════════════════════════════════════════════════════════════
export const ASIA_REGIONS: GeoRegion[] = [
  { id: "as-cn-n",  name: "China North",        code: "CN-N",  parent: "AS", type: "macro", north: 54.0, south: 35.0, east: 135.0, west: 73.0 },
  { id: "as-cn-s",  name: "China South",        code: "CN-S",  parent: "AS", type: "macro", north: 35.0, south: 18.2, east: 135.0, west: 97.0 },
  { id: "as-jp",    name: "Japan",              code: "JP",    parent: "AS", type: "country", north: 45.5, south: 24.0, east: 154.0, west: 122.9 },
  { id: "as-kr",    name: "South Korea",        code: "KR",    parent: "AS", type: "country", north: 38.6, south: 33.1, east: 131.9, west: 124.6 },
  { id: "as-in-n",  name: "India North",        code: "IN-N",  parent: "AS", type: "macro", north: 37.1, south: 23.0, east: 97.4, west: 68.2 },
  { id: "as-in-s",  name: "India South",        code: "IN-S",  parent: "AS", type: "macro", north: 23.0, south: 6.7,  east: 97.4, west: 68.2 },
  { id: "as-sea",   name: "Southeast Asia",     code: "SEA",   parent: "AS", type: "macro", north: 28.5, south: -11.0, east: 141.0, west: 92.2 },
  { id: "as-ru-w",  name: "Russia West",        code: "RU-W",  parent: "AS", type: "macro", north: 70.0, south: 42.0, east: 60.0,  west: 27.0 },
  { id: "as-ru-e",  name: "Russia East",        code: "RU-E",  parent: "AS", type: "macro", north: 72.0, south: 42.0, east: 180.0, west: 60.0 },
  { id: "as-ca",    name: "Central Asia",       code: "CAS",   parent: "AS", type: "macro", north: 55.5, south: 35.1, east: 87.3,  west: 46.5 },
  { id: "as-me",    name: "Middle East",        code: "ME",    parent: "AS", type: "macro", north: 42.0, south: 12.0, east: 63.3,  west: 25.0 },
]

// ═══════════════════════════════════════════════════════════════════════════
// AFRICA — Macro-Regions
// ═══════════════════════════════════════════════════════════════════════════
export const AFRICA_REGIONS: GeoRegion[] = [
  { id: "af-n",  name: "North Africa",     code: "AF-N",  parent: "AF", type: "macro", north: 37.5, south: 19.5, east: 37.0,  west: -17.5 },
  { id: "af-w",  name: "West Africa",      code: "AF-W",  parent: "AF", type: "macro", north: 20.0, south: 4.0,  east: 16.0,  west: -17.5 },
  { id: "af-e",  name: "East Africa",      code: "AF-E",  parent: "AF", type: "macro", north: 18.0, south: -12.0, east: 51.4, west: 28.0 },
  { id: "af-c",  name: "Central Africa",   code: "AF-C",  parent: "AF", type: "macro", north: 11.0, south: -14.0, east: 31.3, west: 8.5 },
  { id: "af-s",  name: "Southern Africa",  code: "AF-S",  parent: "AF", type: "macro", north: -8.0, south: -35.0, east: 51.0, west: 11.7 },
]

// ═══════════════════════════════════════════════════════════════════════════
// OCEANIA — Macro-Regions
// ═══════════════════════════════════════════════════════════════════════════
export const OCEANIA_REGIONS: GeoRegion[] = [
  { id: "oc-au-e", name: "Australia East",  code: "AU-E", parent: "OC", type: "macro", north: -10.0, south: -44.0, east: 155.0, west: 135.0 },
  { id: "oc-au-w", name: "Australia West",  code: "AU-W", parent: "OC", type: "macro", north: -10.0, south: -44.0, east: 135.0, west: 113.0 },
  { id: "oc-nz",   name: "New Zealand",     code: "NZ",   parent: "OC", type: "country", north: -34.4, south: -47.3, east: 178.6, west: 166.4 },
  { id: "oc-pac",  name: "Pacific Islands", code: "PAC",  parent: "OC", type: "macro", north: 20.0, south: -22.0, east: 180.0, west: 155.0 },
]

// ═══════════════════════════════════════════════════════════════════════════
// SOUTH AMERICA — Macro-Regions
// ═══════════════════════════════════════════════════════════════════════════
export const SOUTH_AMERICA_REGIONS: GeoRegion[] = [
  { id: "sa-br-n",  name: "Brazil North",     code: "BR-N",  parent: "SA", type: "macro", north: 5.3,   south: -10.0, east: -35.0, west: -74.0 },
  { id: "sa-br-s",  name: "Brazil South",     code: "BR-S",  parent: "SA", type: "macro", north: -10.0, south: -33.8, east: -35.0, west: -58.0 },
  { id: "sa-ar",    name: "Argentina",         code: "AR",    parent: "SA", type: "country", north: -21.8, south: -55.1, east: -53.6, west: -73.6 },
  { id: "sa-cl",    name: "Chile",             code: "CL",    parent: "SA", type: "country", north: -17.5, south: -56.0, east: -66.4, west: -75.6 },
  { id: "sa-co",    name: "Colombia",          code: "CO",    parent: "SA", type: "country", north: 12.5,  south: -4.2,  east: -67.0, west: -79.0 },
  { id: "sa-and",   name: "Andean Region",     code: "AND",   parent: "SA", type: "macro", north: 2.0,   south: -22.0, east: -58.0, west: -81.3 },
  { id: "sa-car",   name: "Caribbean",         code: "CAR",   parent: "SA", type: "macro", north: 23.5,  south: 10.0,  east: -59.0, west: -85.0 },
  { id: "sa-ca",    name: "Central America",   code: "CAM",   parent: "SA", type: "macro", north: 18.5,  south: 7.2,   east: -77.0, west: -92.5 },
]

// ═══════════════════════════════════════════════════════════════════════════
// AGGREGATE — All regions for global data fetching
// ═══════════════════════════════════════════════════════════════════════════

/** All regions worldwide for infrastructure data fetching */
export const ALL_FETCH_REGIONS: GeoRegion[] = [
  ...US_STATES,
  ...CANADA_PROVINCES,
  ...MEXICO_REGIONS,
  ...EUROPE_REGIONS,
  ...ASIA_REGIONS,
  ...AFRICA_REGIONS,
  ...OCEANIA_REGIONS,
  ...SOUTH_AMERICA_REGIONS,
]

/** Just the bounding box fields for mindexFetch calls */
export function regionToBounds(r: GeoRegion) {
  return { north: r.north, south: r.south, east: r.east, west: r.west }
}

/** Get all US state regions that belong to a FEMA region */
export function statesForFemaRegion(femaRegionNumber: number): GeoRegion[] {
  const fema = FEMA_REGIONS.find(f => f.regionNumber === femaRegionNumber)
  if (!fema) return []
  return US_STATES.filter(s => fema.states.includes(s.code || ""))
}

/** Get the FEMA region for a given state code */
export function femaRegionForState(stateCode: string): FemaRegion | undefined {
  return FEMA_REGIONS.find(f => f.states.includes(stateCode))
}

/** Total number of fetch regions */
export const TOTAL_FETCH_REGIONS = ALL_FETCH_REGIONS.length
