import type { ViewportPlaceLike } from "@/lib/crep/viewport-place"

export type CivicFacilityHint = {
  id: string
  name: string
  type: string
  lat: number
  lng: number
  agency?: string
  phone?: string
  email?: string
  website?: string
  address?: string
  description?: string
  priority?: number
  source: "civic-facility-hint"
  countryCode: string
  city: string
}

type BoundsLike = {
  north: number
  south: number
  east: number
  west: number
}

const CIVIC_FACILITY_HINTS: CivicFacilityHint[] = [
  { id: "civic:us:new-york:city-hall", name: "New York City Hall", type: "city hall", lat: 40.7128, lng: -74.0060, agency: "City of New York", website: "https://www.nyc.gov/", source: "civic-facility-hint", countryCode: "US", city: "New York" },
  { id: "civic:us:san-diego:city-admin", name: "San Diego City Administration Building", type: "city hall", lat: 32.7169, lng: -117.1628, agency: "City of San Diego", website: "https://www.sandiego.gov/", source: "civic-facility-hint", countryCode: "US", city: "San Diego" },
  {
    id: "civic:us:chula-vista:city-hall",
    name: "Chula Vista City Hall",
    type: "city hall",
    lat: 32.6413011,
    lng: -117.0850214,
    agency: "City of Chula Vista",
    phone: "+1 619-691-5044",
    website: "https://www.chulavistaca.gov/departments/mayor-council",
    address: "276 Fourth Avenue, Chula Vista, CA 91910",
    description: "Mayor, City Council, and municipal administration civic anchor.",
    priority: 1,
    source: "civic-facility-hint",
    countryCode: "US",
    city: "Chula Vista",
  },
  {
    id: "civic:us:chula-vista:police-headquarters",
    name: "Chula Vista Police Department Headquarters",
    type: "police",
    lat: 32.639926,
    lng: -117.0831827,
    agency: "Chula Vista Police Department",
    phone: "+1 619-691-5151",
    website: "https://www.chulavistaca.gov/police/",
    address: "315 Fourth Avenue, Chula Vista, CA 91910",
    description: "Primary municipal public-safety headquarters.",
    priority: 2,
    source: "civic-facility-hint",
    countryCode: "US",
    city: "Chula Vista",
  },
  {
    id: "civic:us:chula-vista:civic-center-library",
    name: "Civic Center Branch Library",
    type: "library",
    lat: 32.6409998,
    lng: -117.0832098,
    agency: "Chula Vista Public Library",
    phone: "+1 619-691-5069",
    website: "https://www.chulavistaca.gov/departments/library/locations-hours",
    address: "365 F Street, Chula Vista, CA 91910",
    description: "Public library branch inside the Chula Vista Civic Center campus.",
    priority: 3,
    source: "civic-facility-hint",
    countryCode: "US",
    city: "Chula Vista",
  },
  { id: "civic:ca:toronto:city-hall", name: "Toronto City Hall", type: "city hall", lat: 43.6534, lng: -79.3841, agency: "City of Toronto", website: "https://www.toronto.ca/", source: "civic-facility-hint", countryCode: "CA", city: "Toronto" },
  { id: "civic:ca:vancouver:city-hall", name: "Vancouver City Hall", type: "city hall", lat: 49.2609, lng: -123.1139, agency: "City of Vancouver", website: "https://vancouver.ca/", source: "civic-facility-hint", countryCode: "CA", city: "Vancouver" },
  { id: "civic:mx:mexico-city:national-palace", name: "National Palace", type: "federal government complex", lat: 19.4326, lng: -99.1312, agency: "Government of Mexico", website: "https://www.gob.mx/", source: "civic-facility-hint", countryCode: "MX", city: "Mexico City" },
  { id: "civic:mx:guadalajara:city-hall", name: "Guadalajara City Hall", type: "city hall", lat: 20.6767, lng: -103.3474, agency: "Government of Guadalajara", website: "https://guadalajara.gob.mx/", source: "civic-facility-hint", countryCode: "MX", city: "Guadalajara" },
  { id: "civic:gb:london:city-hall", name: "London City Hall", type: "city hall", lat: 51.5076, lng: 0.0169, agency: "Greater London Authority", website: "https://www.london.gov.uk/", source: "civic-facility-hint", countryCode: "GB", city: "London" },
  { id: "civic:gb:manchester:town-hall", name: "Manchester Town Hall", type: "town hall", lat: 53.4808, lng: -2.2430, agency: "Manchester City Council", website: "https://www.manchester.gov.uk/", source: "civic-facility-hint", countryCode: "GB", city: "Manchester" },
  { id: "civic:fr:paris:hotel-de-ville", name: "Hotel de Ville", type: "city hall", lat: 48.8566, lng: 2.3522, agency: "City of Paris", website: "https://www.paris.fr/", source: "civic-facility-hint", countryCode: "FR", city: "Paris" },
  { id: "civic:de:berlin:rotes-rathaus", name: "Rotes Rathaus", type: "city hall", lat: 52.5186, lng: 13.4083, agency: "Berlin Senate Chancellery", website: "https://www.berlin.de/rbmskzl/en/", source: "civic-facility-hint", countryCode: "DE", city: "Berlin" },
  { id: "civic:it:rome:palazzo-senatorio", name: "Palazzo Senatorio", type: "city hall", lat: 41.8933, lng: 12.4828, agency: "Roma Capitale", website: "https://www.comune.roma.it/", source: "civic-facility-hint", countryCode: "IT", city: "Rome" },
  { id: "civic:es:madrid:city-hall", name: "Palacio de Cibeles", type: "city hall", lat: 40.4190, lng: -3.6920, agency: "Madrid City Council", website: "https://www.madrid.es/", source: "civic-facility-hint", countryCode: "ES", city: "Madrid" },
  { id: "civic:be:brussels:town-hall", name: "Brussels Town Hall", type: "city hall", lat: 50.8467, lng: 4.3525, agency: "City of Brussels", website: "https://www.brussels.be/", source: "civic-facility-hint", countryCode: "BE", city: "Brussels" },
  { id: "civic:nl:amsterdam:city-hall", name: "Amsterdam City Hall", type: "city hall", lat: 52.3670, lng: 4.9003, agency: "City of Amsterdam", website: "https://www.amsterdam.nl/en/", source: "civic-facility-hint", countryCode: "NL", city: "Amsterdam" },
  { id: "civic:cn:beijing:municipal-government", name: "Beijing Municipal Government", type: "municipal government", lat: 39.9042, lng: 116.4074, agency: "Beijing Municipal People's Government", website: "https://www.beijing.gov.cn/", source: "civic-facility-hint", countryCode: "CN", city: "Beijing" },
  { id: "civic:cn:shanghai:municipal-government", name: "Shanghai Municipal Government", type: "municipal government", lat: 31.2304, lng: 121.4737, agency: "Shanghai Municipal People's Government", website: "https://www.shanghai.gov.cn/", source: "civic-facility-hint", countryCode: "CN", city: "Shanghai" },
  { id: "civic:jp:tokyo:metropolitan-government", name: "Tokyo Metropolitan Government Building", type: "metropolitan government", lat: 35.6896, lng: 139.6921, agency: "Tokyo Metropolitan Government", website: "https://www.metro.tokyo.lg.jp/english/", source: "civic-facility-hint", countryCode: "JP", city: "Tokyo" },
  { id: "civic:jp:osaka:city-hall", name: "Osaka City Hall", type: "city hall", lat: 34.6937, lng: 135.5022, agency: "City of Osaka", website: "https://www.city.osaka.lg.jp/contents/wdu020/enjoy/en/", source: "civic-facility-hint", countryCode: "JP", city: "Osaka" },
  { id: "civic:in:new-delhi:ndmc", name: "New Delhi Municipal Council", type: "municipal government", lat: 28.6289, lng: 77.2195, agency: "New Delhi Municipal Council", website: "https://www.ndmc.gov.in/", source: "civic-facility-hint", countryCode: "IN", city: "New Delhi" },
  { id: "civic:in:mumbai:mcgm", name: "Brihanmumbai Municipal Corporation", type: "municipal corporation", lat: 18.9402, lng: 72.8347, agency: "Municipal Corporation of Greater Mumbai", website: "https://portal.mcgm.gov.in/", source: "civic-facility-hint", countryCode: "IN", city: "Mumbai" },
  { id: "civic:au:sydney:town-hall", name: "Sydney Town Hall", type: "town hall", lat: -33.8731, lng: 151.2065, agency: "City of Sydney", website: "https://www.cityofsydney.nsw.gov.au/", source: "civic-facility-hint", countryCode: "AU", city: "Sydney" },
  { id: "civic:au:melbourne:town-hall", name: "Melbourne Town Hall", type: "town hall", lat: -37.8150, lng: 144.9668, agency: "City of Melbourne", website: "https://www.melbourne.vic.gov.au/", source: "civic-facility-hint", countryCode: "AU", city: "Melbourne" },
  { id: "civic:br:brasilia:planalto", name: "Palacio do Planalto", type: "presidential palace", lat: -15.7997, lng: -47.8645, agency: "Presidency of Brazil", website: "https://www.gov.br/planalto/", source: "civic-facility-hint", countryCode: "BR", city: "Brasilia" },
  { id: "civic:br:sao-paulo:city-hall", name: "Sao Paulo City Hall", type: "city hall", lat: -23.5505, lng: -46.6333, agency: "City of Sao Paulo", website: "https://www.prefeitura.sp.gov.br/", source: "civic-facility-hint", countryCode: "BR", city: "Sao Paulo" },
  { id: "civic:za:johannesburg:city-hall", name: "Johannesburg City Hall", type: "city hall", lat: -26.2043, lng: 28.0456, agency: "City of Johannesburg", website: "https://www.joburg.org.za/", source: "civic-facility-hint", countryCode: "ZA", city: "Johannesburg" },
  { id: "civic:za:cape-town:civic-centre", name: "Cape Town Civic Centre", type: "civic centre", lat: -33.9180, lng: 18.4241, agency: "City of Cape Town", website: "https://www.capetown.gov.za/", source: "civic-facility-hint", countryCode: "ZA", city: "Cape Town" },
  { id: "civic:ng:lagos:state-secretariat", name: "Lagos State Secretariat", type: "state government complex", lat: 6.6173, lng: 3.3570, agency: "Lagos State Government", website: "https://lagosstate.gov.ng/", source: "civic-facility-hint", countryCode: "NG", city: "Lagos" },
  { id: "civic:eg:cairo:governorate", name: "Cairo Governorate", type: "governorate government", lat: 30.0444, lng: 31.2357, agency: "Cairo Governorate", website: "https://www.cairo.gov.eg/", source: "civic-facility-hint", countryCode: "EG", city: "Cairo" },
  { id: "civic:tr:istanbul:ibb", name: "Istanbul Metropolitan Municipality", type: "metropolitan municipality", lat: 41.0138, lng: 28.9550, agency: "Istanbul Metropolitan Municipality", website: "https://www.ibb.istanbul/", source: "civic-facility-hint", countryCode: "TR", city: "Istanbul" },
  { id: "civic:kr:seoul:city-hall", name: "Seoul City Hall", type: "city hall", lat: 37.5663, lng: 126.9780, agency: "Seoul Metropolitan Government", website: "https://english.seoul.go.kr/", source: "civic-facility-hint", countryCode: "KR", city: "Seoul" },
]

function normalize(value?: string | null): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ")
}

function pointInBounds(lat: number, lng: number, bounds: BoundsLike): boolean {
  return lat <= bounds.north && lat >= bounds.south && lng >= bounds.west && lng <= bounds.east
}

export function resolveCivicFacilityHintsForViewport(input: {
  place?: ViewportPlaceLike | null
  bounds: BoundsLike
  limit?: number
}): CivicFacilityHint[] {
  const countryCode = normalize(input.place?.countryCode).toUpperCase()
  const hasLocality = Boolean(input.place?.city || input.place?.suburb || input.place?.county || input.place?.state)
  const placeText = normalize(
    [input.place?.city, input.place?.suburb, input.place?.county, input.place?.state, input.place?.displayName]
      .filter(Boolean)
      .join(" "),
  )
  return CIVIC_FACILITY_HINTS
    .filter((facility) => {
      if (!pointInBounds(facility.lat, facility.lng, input.bounds)) return false
      if (countryCode && facility.countryCode !== countryCode) return false
      const city = normalize(facility.city)
      return !hasLocality || !placeText || placeText.includes(city) || city.includes(placeText)
    })
    .sort((a, b) => (a.priority ?? 50) - (b.priority ?? 50))
    .slice(0, input.limit ?? 8)
}
