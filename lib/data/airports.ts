/**
 * Major World Airports Database
 * IATA code to coordinates mapping for trajectory rendering
 */

export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
}

// Major airports worldwide with coordinates
export const AIRPORTS: Record<string, Airport> = {
  // North America - USA
  ATL: { code: "ATL", name: "Hartsfield-Jackson Atlanta International", city: "Atlanta", country: "USA", lat: 33.6407, lng: -84.4277 },
  LAX: { code: "LAX", name: "Los Angeles International", city: "Los Angeles", country: "USA", lat: 33.9416, lng: -118.4085 },
  ORD: { code: "ORD", name: "O'Hare International", city: "Chicago", country: "USA", lat: 41.9742, lng: -87.9073 },
  DFW: { code: "DFW", name: "Dallas/Fort Worth International", city: "Dallas", country: "USA", lat: 32.8998, lng: -97.0403 },
  DEN: { code: "DEN", name: "Denver International", city: "Denver", country: "USA", lat: 39.8561, lng: -104.6737 },
  JFK: { code: "JFK", name: "John F. Kennedy International", city: "New York", country: "USA", lat: 40.6413, lng: -73.7781 },
  SFO: { code: "SFO", name: "San Francisco International", city: "San Francisco", country: "USA", lat: 37.6213, lng: -122.3790 },
  SEA: { code: "SEA", name: "Seattle-Tacoma International", city: "Seattle", country: "USA", lat: 47.4502, lng: -122.3088 },
  LAS: { code: "LAS", name: "Harry Reid International", city: "Las Vegas", country: "USA", lat: 36.0840, lng: -115.1537 },
  MCO: { code: "MCO", name: "Orlando International", city: "Orlando", country: "USA", lat: 28.4312, lng: -81.3081 },
  CLT: { code: "CLT", name: "Charlotte Douglas International", city: "Charlotte", country: "USA", lat: 35.2140, lng: -80.9431 },
  PHX: { code: "PHX", name: "Phoenix Sky Harbor International", city: "Phoenix", country: "USA", lat: 33.4373, lng: -112.0078 },
  MIA: { code: "MIA", name: "Miami International", city: "Miami", country: "USA", lat: 25.7959, lng: -80.2870 },
  IAH: { code: "IAH", name: "George Bush Intercontinental", city: "Houston", country: "USA", lat: 29.9902, lng: -95.3368 },
  BOS: { code: "BOS", name: "Boston Logan International", city: "Boston", country: "USA", lat: 42.3656, lng: -71.0096 },
  MSP: { code: "MSP", name: "Minneapolis-Saint Paul International", city: "Minneapolis", country: "USA", lat: 44.8848, lng: -93.2223 },
  DTW: { code: "DTW", name: "Detroit Metropolitan Wayne County", city: "Detroit", country: "USA", lat: 42.2162, lng: -83.3554 },
  EWR: { code: "EWR", name: "Newark Liberty International", city: "Newark", country: "USA", lat: 40.6895, lng: -74.1745 },
  PHL: { code: "PHL", name: "Philadelphia International", city: "Philadelphia", country: "USA", lat: 39.8729, lng: -75.2437 },
  SAN: { code: "SAN", name: "San Diego International", city: "San Diego", country: "USA", lat: 32.7338, lng: -117.1933 },
  TEB: { code: "TEB", name: "Teterboro Airport", city: "Teterboro", country: "USA", lat: 40.8500, lng: -74.0613 },
  VNY: { code: "VNY", name: "Van Nuys Airport", city: "Los Angeles", country: "USA", lat: 34.2097, lng: -118.4897 },
  MEM: { code: "MEM", name: "Memphis International", city: "Memphis", country: "USA", lat: 35.0421, lng: -89.9792 },
  MCI: { code: "MCI", name: "Kansas City International", city: "Kansas City", country: "USA", lat: 39.2976, lng: -94.7139 },
  
  // North America - Canada
  YYZ: { code: "YYZ", name: "Toronto Pearson International", city: "Toronto", country: "Canada", lat: 43.6777, lng: -79.6248 },
  YVR: { code: "YVR", name: "Vancouver International", city: "Vancouver", country: "Canada", lat: 49.1947, lng: -123.1792 },
  YUL: { code: "YUL", name: "Montréal-Pierre Elliott Trudeau International", city: "Montreal", country: "Canada", lat: 45.4657, lng: -73.7455 },
  YYC: { code: "YYC", name: "Calgary International", city: "Calgary", country: "Canada", lat: 51.1215, lng: -114.0076 },
  
  // Europe
  LHR: { code: "LHR", name: "London Heathrow", city: "London", country: "UK", lat: 51.4700, lng: -0.4543 },
  CDG: { code: "CDG", name: "Paris Charles de Gaulle", city: "Paris", country: "France", lat: 49.0097, lng: 2.5479 },
  FRA: { code: "FRA", name: "Frankfurt Airport", city: "Frankfurt", country: "Germany", lat: 50.0379, lng: 8.5622 },
  AMS: { code: "AMS", name: "Amsterdam Schiphol", city: "Amsterdam", country: "Netherlands", lat: 52.3105, lng: 4.7683 },
  MAD: { code: "MAD", name: "Madrid Barajas", city: "Madrid", country: "Spain", lat: 40.4983, lng: -3.5676 },
  BCN: { code: "BCN", name: "Barcelona El Prat", city: "Barcelona", country: "Spain", lat: 41.2974, lng: 2.0833 },
  FCO: { code: "FCO", name: "Rome Fiumicino", city: "Rome", country: "Italy", lat: 41.8003, lng: 12.2389 },
  MUC: { code: "MUC", name: "Munich Airport", city: "Munich", country: "Germany", lat: 48.3537, lng: 11.7750 },
  ZRH: { code: "ZRH", name: "Zurich Airport", city: "Zurich", country: "Switzerland", lat: 47.4582, lng: 8.5555 },
  VIE: { code: "VIE", name: "Vienna International", city: "Vienna", country: "Austria", lat: 48.1103, lng: 16.5697 },
  DUB: { code: "DUB", name: "Dublin Airport", city: "Dublin", country: "Ireland", lat: 53.4264, lng: -6.2499 },
  LGW: { code: "LGW", name: "London Gatwick", city: "London", country: "UK", lat: 51.1537, lng: -0.1821 },
  STN: { code: "STN", name: "London Stansted", city: "London", country: "UK", lat: 51.8860, lng: 0.2389 },
  
  // Asia
  HND: { code: "HND", name: "Tokyo Haneda", city: "Tokyo", country: "Japan", lat: 35.5494, lng: 139.7798 },
  NRT: { code: "NRT", name: "Tokyo Narita", city: "Tokyo", country: "Japan", lat: 35.7720, lng: 140.3929 },
  PEK: { code: "PEK", name: "Beijing Capital International", city: "Beijing", country: "China", lat: 40.0799, lng: 116.6031 },
  PVG: { code: "PVG", name: "Shanghai Pudong International", city: "Shanghai", country: "China", lat: 31.1443, lng: 121.8083 },
  HKG: { code: "HKG", name: "Hong Kong International", city: "Hong Kong", country: "China", lat: 22.3080, lng: 113.9185 },
  SIN: { code: "SIN", name: "Singapore Changi", city: "Singapore", country: "Singapore", lat: 1.3644, lng: 103.9915 },
  ICN: { code: "ICN", name: "Seoul Incheon International", city: "Seoul", country: "South Korea", lat: 37.4602, lng: 126.4407 },
  BKK: { code: "BKK", name: "Bangkok Suvarnabhumi", city: "Bangkok", country: "Thailand", lat: 13.6900, lng: 100.7501 },
  DEL: { code: "DEL", name: "Delhi Indira Gandhi International", city: "Delhi", country: "India", lat: 28.5562, lng: 77.1000 },
  BOM: { code: "BOM", name: "Mumbai Chhatrapati Shivaji", city: "Mumbai", country: "India", lat: 19.0896, lng: 72.8656 },
  CGK: { code: "CGK", name: "Jakarta Soekarno-Hatta", city: "Jakarta", country: "Indonesia", lat: -6.1256, lng: 106.6559 },
  KUL: { code: "KUL", name: "Kuala Lumpur International", city: "Kuala Lumpur", country: "Malaysia", lat: 2.7456, lng: 101.7099 },
  
  // Russia
  SVO: { code: "SVO", name: "Moscow Sheremetyevo", city: "Moscow", country: "Russia", lat: 55.9726, lng: 37.4146 },
  LED: { code: "LED", name: "Saint Petersburg Pulkovo", city: "Saint Petersburg", country: "Russia", lat: 59.8003, lng: 30.2625 },
  
  // Middle East
  DXB: { code: "DXB", name: "Dubai International", city: "Dubai", country: "UAE", lat: 25.2532, lng: 55.3657 },
  DOH: { code: "DOH", name: "Hamad International", city: "Doha", country: "Qatar", lat: 25.2731, lng: 51.6081 },
  AUH: { code: "AUH", name: "Abu Dhabi International", city: "Abu Dhabi", country: "UAE", lat: 24.4330, lng: 54.6511 },
  TLV: { code: "TLV", name: "Ben Gurion Airport", city: "Tel Aviv", country: "Israel", lat: 32.0055, lng: 34.8854 },
  BAH: { code: "BAH", name: "Bahrain International", city: "Manama", country: "Bahrain", lat: 26.2708, lng: 50.6336 },
  
  // Australia & Oceania
  SYD: { code: "SYD", name: "Sydney Kingsford Smith", city: "Sydney", country: "Australia", lat: -33.9399, lng: 151.1753 },
  MEL: { code: "MEL", name: "Melbourne Tullamarine", city: "Melbourne", country: "Australia", lat: -37.6733, lng: 144.8433 },
  BNE: { code: "BNE", name: "Brisbane Airport", city: "Brisbane", country: "Australia", lat: -27.3942, lng: 153.1218 },
  AKL: { code: "AKL", name: "Auckland Airport", city: "Auckland", country: "New Zealand", lat: -37.0082, lng: 174.7917 },
  PER: { code: "PER", name: "Perth Airport", city: "Perth", country: "Australia", lat: -31.9385, lng: 115.9672 },
  
  // South America
  GRU: { code: "GRU", name: "São Paulo Guarulhos", city: "São Paulo", country: "Brazil", lat: -23.4356, lng: -46.4731 },
  EZE: { code: "EZE", name: "Buenos Aires Ezeiza", city: "Buenos Aires", country: "Argentina", lat: -34.8222, lng: -58.5358 },
  BOG: { code: "BOG", name: "Bogotá El Dorado", city: "Bogotá", country: "Colombia", lat: 4.7016, lng: -74.1469 },
  SCL: { code: "SCL", name: "Santiago Arturo Merino Benítez", city: "Santiago", country: "Chile", lat: -33.3930, lng: -70.7858 },
  LIM: { code: "LIM", name: "Lima Jorge Chávez", city: "Lima", country: "Peru", lat: -12.0219, lng: -77.1143 },
  
  // Africa
  JNB: { code: "JNB", name: "Johannesburg O.R. Tambo", city: "Johannesburg", country: "South Africa", lat: -26.1367, lng: 28.2411 },
  CPT: { code: "CPT", name: "Cape Town International", city: "Cape Town", country: "South Africa", lat: -33.9649, lng: 18.6017 },
  CAI: { code: "CAI", name: "Cairo International", city: "Cairo", country: "Egypt", lat: 30.1219, lng: 31.4056 },
  NBO: { code: "NBO", name: "Nairobi Jomo Kenyatta", city: "Nairobi", country: "Kenya", lat: -1.3192, lng: 36.9278 },
  ADD: { code: "ADD", name: "Addis Ababa Bole", city: "Addis Ababa", country: "Ethiopia", lat: 8.9779, lng: 38.7993 },
  
  // Mexico & Central America
  MEX: { code: "MEX", name: "Mexico City International", city: "Mexico City", country: "Mexico", lat: 19.4363, lng: -99.0721 },
  CUN: { code: "CUN", name: "Cancún International", city: "Cancún", country: "Mexico", lat: 21.0365, lng: -86.8771 },
  GDL: { code: "GDL", name: "Guadalajara International", city: "Guadalajara", country: "Mexico", lat: 20.5218, lng: -103.3111 },
  PTY: { code: "PTY", name: "Panama City Tocumen", city: "Panama City", country: "Panama", lat: 9.0714, lng: -79.3835 },
};

/**
 * Get airport by IATA code
 */
export function getAirport(code: string): Airport | undefined {
  if (!code) return undefined;
  return AIRPORTS[code.toUpperCase()];
}

/**
 * Check if an airport code exists in our database
 */
export function hasAirport(code: string): boolean {
  if (!code) return false;
  return code.toUpperCase() in AIRPORTS;
}
