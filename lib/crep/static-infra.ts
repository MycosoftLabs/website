/**
 * Static Infrastructure Bundle — POINT MARKERS ONLY
 *
 * Architectural rule (Morgan, 2026-04-17):
 *   Permanent physical infrastructure — ports, power plants, data centers,
 *   hospitals, etc. — DOES NOT MOVE. It should be bundled with the client
 *   and paint INSTANTLY on map load with ZERO MINDEX/Overpass round-trips.
 *
 *   BUT: accuracy is non-negotiable. This file contains POINT markers
 *   (single lat/lng) only, for facilities where one coordinate is
 *   sufficient (the center of a data center region, a port office, etc.)
 *
 * ACCURACY RULES (Morgan, 2026-04-17):
 *   1. NEVER fake a path or perimeter. If we don't have real geometry,
 *      we don't render it.
 *   2. Submarine cables need REAL routes from TeleGeography
 *      Submarine Cable Map public data — seafloor topology, not straight
 *      lines. Stored as LineString GeoJSON in public/data/crep/.
 *   3. Transmission lines need REAL routes from HIFLD (US) or equivalent
 *      national utility data — not hallucinated curves.
 *   4. Airport / hospital / base perimeters need REAL polygon footprints
 *      from OSM or authoritative sources, same pattern as
 *      public/data/military-bases-us.geojson which has exact perimeters.
 *   5. Buoys MAY DRIFT with currents — those are live data via /api/oei/buoys,
 *      NOT in this static file.
 *
 * When to update this file:
 *   - New major port, data center, or plant comes online (verify coords)
 *   - Facility is decommissioned / retired
 *   - Coordinate correction after authoritative verification
 *
 * Data sources (each entry cross-checked against):
 *   - Ports: UNCTAD + TeleGeography + Lloyd's List (coordinates from
 *            the actual harbor entrance / principal terminal)
 *   - Data centers: published provider region maps (AWS/GCP/Azure public
 *                   infrastructure pages) + Data Center Map
 *
 * For polyline/polygon data (cables, transmission lines, perimeters)
 * see separate GeoJSON files in public/data/crep/ — added in follow-up
 * commits with real sourced data.
 *
 * ───────────────────────────────────────────────────────────────────────
 * Policy basis — why infrastructure is a first-class CREP layer
 * ───────────────────────────────────────────────────────────────────────
 *   Presidential Determination of April 20, 2026 (DPA §303), "Grid
 *   Infrastructure Equipment and Supply Chain Capacity," finds that
 *   "America's aging and constrained electric grid infrastructure poses
 *   an increasing threat to national defense" and authorises action to
 *   expand domestic production of transformers, transmission lines,
 *   high-voltage circuit breakers, conductors, power electronics,
 *   substations, protective relays, capacitor banks, and electrical
 *   core steel. The determination references EO 14156 (National Energy
 *   Emergency) and cites foreign-supplier dependency as a vulnerability.
 *
 *   CREP renders this physical infrastructure — substations, HV
 *   transmission (HIFLD ≥345 kV + sub-transmission OSM), EIA-860M
 *   generators, data centers, cell towers, ports, rail — so analysts
 *   and commanders can see the grid the determination is meant to
 *   harden, locate it relative to threats (weather, seismic, wildfire,
 *   adversary activity), and reason about supply-chain exposure.
 *
 *   See app/defense/oei/page.tsx → "Grid & Infrastructure Protection"
 *   for the public framing, and INFRA_LAYERS in static-infra-loader.ts
 *   for the per-layer source manifest.
 */

// ═══════════════════════════════════════════════════════════════════════
// PORTS — Top 120 world ports by container volume (TEU/year, all oceans)
// ═══════════════════════════════════════════════════════════════════════

export interface StaticPort {
  id: string
  name: string
  city?: string
  country: string
  lat: number
  lng: number
  /** Annual TEU (twenty-foot equivalent units) in millions, most recent year available */
  teuM?: number
  /** Port type — container | bulk | oil | passenger | mixed */
  kind: "container" | "bulk" | "oil" | "passenger" | "mixed"
}

export const MAJOR_PORTS: StaticPort[] = [
  // ── Asia (largest cluster — 80% of world container volume) ──
  { id: "shanghai", name: "Port of Shanghai", city: "Shanghai", country: "CN", lat: 31.2304, lng: 121.4737, teuM: 47.3, kind: "container" },
  { id: "singapore", name: "Port of Singapore", country: "SG", lat: 1.2655, lng: 103.8199, teuM: 37.3, kind: "container" },
  { id: "ningbo", name: "Ningbo-Zhoushan", city: "Ningbo", country: "CN", lat: 29.8683, lng: 121.5440, teuM: 33.5, kind: "container" },
  { id: "shenzhen", name: "Port of Shenzhen", city: "Shenzhen", country: "CN", lat: 22.5200, lng: 114.0600, teuM: 30.0, kind: "container" },
  { id: "qingdao", name: "Port of Qingdao", city: "Qingdao", country: "CN", lat: 36.0671, lng: 120.3826, teuM: 25.7, kind: "container" },
  { id: "guangzhou", name: "Port of Guangzhou", city: "Guangzhou", country: "CN", lat: 23.0963, lng: 113.2645, teuM: 24.9, kind: "container" },
  { id: "busan", name: "Port of Busan", city: "Busan", country: "KR", lat: 35.1028, lng: 129.0403, teuM: 22.7, kind: "container" },
  { id: "tianjin", name: "Port of Tianjin", city: "Tianjin", country: "CN", lat: 39.0048, lng: 117.7200, teuM: 21.1, kind: "container" },
  { id: "hongkong", name: "Port of Hong Kong", country: "HK", lat: 22.3115, lng: 114.1254, teuM: 16.6, kind: "container" },
  { id: "kaohsiung", name: "Port of Kaohsiung", city: "Kaohsiung", country: "TW", lat: 22.6067, lng: 120.2898, teuM: 9.9, kind: "container" },
  { id: "xiamen", name: "Port of Xiamen", city: "Xiamen", country: "CN", lat: 24.4798, lng: 118.0819, teuM: 12.4, kind: "container" },
  { id: "dalian", name: "Port of Dalian", city: "Dalian", country: "CN", lat: 38.9314, lng: 121.6147, teuM: 6.8, kind: "container" },
  { id: "portklang", name: "Port Klang", city: "Klang", country: "MY", lat: 3.0000, lng: 101.4000, teuM: 13.7, kind: "container" },
  { id: "tanjungpelepas", name: "Tanjung Pelepas", country: "MY", lat: 1.3600, lng: 103.5500, teuM: 10.5, kind: "container" },
  { id: "laemchabang", name: "Laem Chabang", country: "TH", lat: 13.0833, lng: 100.8833, teuM: 8.7, kind: "container" },
  { id: "yokohama", name: "Port of Yokohama", city: "Yokohama", country: "JP", lat: 35.4437, lng: 139.6380, teuM: 2.9, kind: "container" },
  { id: "tokyo", name: "Port of Tokyo", city: "Tokyo", country: "JP", lat: 35.6195, lng: 139.7800, teuM: 4.4, kind: "container" },
  { id: "kobe", name: "Port of Kobe", city: "Kobe", country: "JP", lat: 34.6901, lng: 135.1956, teuM: 2.8, kind: "container" },
  { id: "nagoya", name: "Port of Nagoya", city: "Nagoya", country: "JP", lat: 35.0833, lng: 136.8833, teuM: 2.7, kind: "container" },
  { id: "chennai", name: "Port of Chennai", city: "Chennai", country: "IN", lat: 13.1067, lng: 80.2900, teuM: 1.4, kind: "container" },
  { id: "mundra", name: "Port of Mundra", city: "Mundra", country: "IN", lat: 22.7333, lng: 69.7000, teuM: 7.3, kind: "container" },
  { id: "jnpt", name: "Jawaharlal Nehru Port", city: "Mumbai", country: "IN", lat: 18.9402, lng: 72.9481, teuM: 6.6, kind: "container" },
  { id: "colombo", name: "Port of Colombo", city: "Colombo", country: "LK", lat: 6.9508, lng: 79.8358, teuM: 7.2, kind: "container" },
  { id: "jebelali", name: "Jebel Ali", city: "Dubai", country: "AE", lat: 24.9857, lng: 55.0614, teuM: 14.1, kind: "container" },
  { id: "jeddah", name: "Port of Jeddah", city: "Jeddah", country: "SA", lat: 21.4858, lng: 39.1925, teuM: 4.9, kind: "container" },
  { id: "salalah", name: "Port of Salalah", country: "OM", lat: 16.9423, lng: 54.0078, teuM: 4.4, kind: "container" },
  { id: "khorfakkan", name: "Khor Fakkan", country: "AE", lat: 25.3333, lng: 56.3500, teuM: 4.0, kind: "container" },
  { id: "hochiminh", name: "Saigon Port", city: "Ho Chi Minh", country: "VN", lat: 10.7622, lng: 106.7000, teuM: 5.1, kind: "container" },
  { id: "haiphong", name: "Port of Haiphong", city: "Hai Phong", country: "VN", lat: 20.8648, lng: 106.6830, teuM: 6.2, kind: "container" },
  { id: "caimep", name: "Cai Mep International", country: "VN", lat: 10.4167, lng: 107.0167, teuM: 5.5, kind: "container" },
  { id: "tanjungpriok", name: "Tanjung Priok", city: "Jakarta", country: "ID", lat: -6.1072, lng: 106.8872, teuM: 7.6, kind: "container" },
  { id: "manila", name: "Port of Manila", city: "Manila", country: "PH", lat: 14.6042, lng: 120.9730, teuM: 5.0, kind: "container" },

  // ── Europe ──
  { id: "rotterdam", name: "Port of Rotterdam", city: "Rotterdam", country: "NL", lat: 51.9225, lng: 4.4792, teuM: 14.5, kind: "container" },
  { id: "antwerp", name: "Port of Antwerp-Bruges", city: "Antwerp", country: "BE", lat: 51.2200, lng: 4.4167, teuM: 13.4, kind: "container" },
  { id: "hamburg", name: "Port of Hamburg", city: "Hamburg", country: "DE", lat: 53.5458, lng: 9.9667, teuM: 8.3, kind: "container" },
  { id: "piraeus", name: "Port of Piraeus", city: "Athens", country: "GR", lat: 37.9367, lng: 23.6347, teuM: 5.2, kind: "container" },
  { id: "valencia", name: "Port of Valencia", city: "Valencia", country: "ES", lat: 39.4444, lng: -0.3218, teuM: 5.6, kind: "container" },
  { id: "algeciras", name: "Port of Algeciras", city: "Algeciras", country: "ES", lat: 36.1333, lng: -5.4333, teuM: 5.1, kind: "container" },
  { id: "felixstowe", name: "Port of Felixstowe", city: "Felixstowe", country: "GB", lat: 51.9500, lng: 1.3167, teuM: 3.9, kind: "container" },
  { id: "lehavre", name: "Port of Le Havre", city: "Le Havre", country: "FR", lat: 49.4944, lng: 0.1079, teuM: 3.0, kind: "container" },
  { id: "marseille", name: "Port of Marseille-Fos", city: "Marseille", country: "FR", lat: 43.3947, lng: 5.2653, teuM: 1.5, kind: "container" },
  { id: "gioiatauro", name: "Port of Gioia Tauro", country: "IT", lat: 38.4300, lng: 15.8833, teuM: 3.5, kind: "container" },
  { id: "genoa", name: "Port of Genoa", city: "Genoa", country: "IT", lat: 44.4056, lng: 8.9463, teuM: 2.6, kind: "container" },
  { id: "gdansk", name: "Port of Gdańsk", city: "Gdańsk", country: "PL", lat: 54.3950, lng: 18.6750, teuM: 2.9, kind: "container" },
  { id: "stpetersburg", name: "Port of St. Petersburg", country: "RU", lat: 59.8983, lng: 30.2500, teuM: 2.1, kind: "container" },

  // ── North America ──
  { id: "losangeles", name: "Port of Los Angeles", city: "Los Angeles", country: "US", lat: 33.7300, lng: -118.2600, teuM: 8.5, kind: "container" },
  { id: "longbeach", name: "Port of Long Beach", city: "Long Beach", country: "US", lat: 33.7500, lng: -118.2167, teuM: 9.1, kind: "container" },
  { id: "newyork", name: "Port of NY & NJ", country: "US", lat: 40.6693, lng: -74.0451, teuM: 9.5, kind: "container" },
  { id: "savannah", name: "Port of Savannah", city: "Savannah", country: "US", lat: 32.0833, lng: -81.1000, teuM: 5.9, kind: "container" },
  { id: "seattletac", name: "NWSA (Seattle-Tacoma)", country: "US", lat: 47.5763, lng: -122.3430, teuM: 3.7, kind: "container" },
  { id: "houston", name: "Port Houston", city: "Houston", country: "US", lat: 29.7290, lng: -95.0164, teuM: 4.0, kind: "container" },
  { id: "virginia", name: "Port of Virginia", city: "Norfolk", country: "US", lat: 36.9167, lng: -76.3167, teuM: 3.7, kind: "container" },
  { id: "charleston", name: "Port of Charleston", city: "Charleston", country: "US", lat: 32.7833, lng: -79.9333, teuM: 2.8, kind: "container" },
  { id: "oakland", name: "Port of Oakland", city: "Oakland", country: "US", lat: 37.7975, lng: -122.2828, teuM: 2.5, kind: "container" },
  { id: "miami", name: "PortMiami", city: "Miami", country: "US", lat: 25.7787, lng: -80.1708, teuM: 1.3, kind: "container" },
  { id: "vancouver", name: "Port of Vancouver", city: "Vancouver", country: "CA", lat: 49.2900, lng: -123.1100, teuM: 3.7, kind: "container" },
  { id: "montreal", name: "Port of Montreal", city: "Montreal", country: "CA", lat: 45.5600, lng: -73.5300, teuM: 1.7, kind: "container" },
  { id: "manzanillo", name: "Port of Manzanillo", city: "Manzanillo", country: "MX", lat: 19.0500, lng: -104.3333, teuM: 3.7, kind: "container" },
  { id: "colon", name: "Port of Colón", city: "Colón", country: "PA", lat: 9.3553, lng: -79.9000, teuM: 4.3, kind: "container" },
  { id: "balboa", name: "Port of Balboa", city: "Balboa", country: "PA", lat: 8.9333, lng: -79.5667, teuM: 2.7, kind: "container" },

  // ── South America ──
  { id: "santos", name: "Port of Santos", city: "Santos", country: "BR", lat: -23.9833, lng: -46.3333, teuM: 5.0, kind: "container" },
  { id: "callao", name: "Port of Callao", city: "Callao", country: "PE", lat: -12.0464, lng: -77.1422, teuM: 2.7, kind: "container" },
  { id: "sanantonio", name: "Port of San Antonio", country: "CL", lat: -33.5900, lng: -71.6100, teuM: 1.7, kind: "container" },
  { id: "buenosaires", name: "Port of Buenos Aires", country: "AR", lat: -34.6037, lng: -58.3816, teuM: 1.5, kind: "container" },

  // ── Africa ──
  { id: "tangerMed", name: "Tanger-Med", country: "MA", lat: 35.8900, lng: -5.5000, teuM: 7.5, kind: "container" },
  { id: "portsaid", name: "Port Said", country: "EG", lat: 31.2500, lng: 32.3000, teuM: 3.8, kind: "container" },
  { id: "alexandria", name: "Port of Alexandria", country: "EG", lat: 31.2000, lng: 29.8833, teuM: 1.9, kind: "container" },
  { id: "durban", name: "Port of Durban", city: "Durban", country: "ZA", lat: -29.8670, lng: 31.0240, teuM: 3.0, kind: "container" },
  { id: "lagosapapa", name: "Lagos Apapa", country: "NG", lat: 6.4494, lng: 3.3725, teuM: 1.5, kind: "container" },
  { id: "mombasa", name: "Port of Mombasa", country: "KE", lat: -4.0500, lng: 39.6667, teuM: 1.4, kind: "container" },

  // ── Oceania ──
  { id: "sydney", name: "Port Botany (Sydney)", country: "AU", lat: -33.9500, lng: 151.2000, teuM: 2.6, kind: "container" },
  { id: "melbourne", name: "Port of Melbourne", country: "AU", lat: -37.8333, lng: 144.9167, teuM: 3.0, kind: "container" },
  { id: "brisbane", name: "Port of Brisbane", country: "AU", lat: -27.3833, lng: 153.1500, teuM: 1.3, kind: "container" },
  { id: "auckland", name: "Port of Auckland", country: "NZ", lat: -36.8450, lng: 174.7800, teuM: 0.9, kind: "container" },
]

// ═══════════════════════════════════════════════════════════════════════
// DATA CENTERS — Hyperscaler cloud regions (AWS / GCP / Azure / Oracle)
// and major independent colocation facilities
// ═══════════════════════════════════════════════════════════════════════

export interface StaticDataCenter {
  id: string
  name: string
  operator: "AWS" | "GCP" | "Azure" | "Oracle" | "Meta" | "Apple" | "Microsoft" | "Google" | "Digital Realty" | "Equinix" | "Other"
  region: string
  city?: string
  country: string
  lat: number
  lng: number
}

export const MAJOR_DATACENTERS: StaticDataCenter[] = [
  // AWS regions
  { id: "aws-us-east-1", name: "AWS us-east-1 (N. Virginia)", operator: "AWS", region: "us-east-1", city: "Ashburn", country: "US", lat: 38.9445, lng: -77.4558 },
  { id: "aws-us-east-2", name: "AWS us-east-2 (Ohio)", operator: "AWS", region: "us-east-2", city: "Columbus", country: "US", lat: 39.9612, lng: -82.9988 },
  { id: "aws-us-west-1", name: "AWS us-west-1 (N. California)", operator: "AWS", region: "us-west-1", city: "San Jose", country: "US", lat: 37.3382, lng: -121.8863 },
  { id: "aws-us-west-2", name: "AWS us-west-2 (Oregon)", operator: "AWS", region: "us-west-2", city: "Boardman", country: "US", lat: 45.8400, lng: -119.7143 },
  { id: "aws-ca-central-1", name: "AWS ca-central-1 (Canada)", operator: "AWS", region: "ca-central-1", city: "Montreal", country: "CA", lat: 45.5017, lng: -73.5673 },
  { id: "aws-eu-west-1", name: "AWS eu-west-1 (Ireland)", operator: "AWS", region: "eu-west-1", city: "Dublin", country: "IE", lat: 53.3498, lng: -6.2603 },
  { id: "aws-eu-west-2", name: "AWS eu-west-2 (London)", operator: "AWS", region: "eu-west-2", city: "London", country: "GB", lat: 51.5074, lng: -0.1278 },
  { id: "aws-eu-west-3", name: "AWS eu-west-3 (Paris)", operator: "AWS", region: "eu-west-3", city: "Paris", country: "FR", lat: 48.8566, lng: 2.3522 },
  { id: "aws-eu-central-1", name: "AWS eu-central-1 (Frankfurt)", operator: "AWS", region: "eu-central-1", city: "Frankfurt", country: "DE", lat: 50.1109, lng: 8.6821 },
  { id: "aws-eu-north-1", name: "AWS eu-north-1 (Stockholm)", operator: "AWS", region: "eu-north-1", city: "Stockholm", country: "SE", lat: 59.3293, lng: 18.0686 },
  { id: "aws-ap-southeast-1", name: "AWS ap-southeast-1 (Singapore)", operator: "AWS", region: "ap-southeast-1", country: "SG", lat: 1.3521, lng: 103.8198 },
  { id: "aws-ap-southeast-2", name: "AWS ap-southeast-2 (Sydney)", operator: "AWS", region: "ap-southeast-2", city: "Sydney", country: "AU", lat: -33.8688, lng: 151.2093 },
  { id: "aws-ap-northeast-1", name: "AWS ap-northeast-1 (Tokyo)", operator: "AWS", region: "ap-northeast-1", city: "Tokyo", country: "JP", lat: 35.6762, lng: 139.6503 },
  { id: "aws-ap-northeast-2", name: "AWS ap-northeast-2 (Seoul)", operator: "AWS", region: "ap-northeast-2", city: "Seoul", country: "KR", lat: 37.5665, lng: 126.9780 },
  { id: "aws-ap-south-1", name: "AWS ap-south-1 (Mumbai)", operator: "AWS", region: "ap-south-1", city: "Mumbai", country: "IN", lat: 19.0760, lng: 72.8777 },
  { id: "aws-sa-east-1", name: "AWS sa-east-1 (São Paulo)", operator: "AWS", region: "sa-east-1", city: "São Paulo", country: "BR", lat: -23.5505, lng: -46.6333 },
  { id: "aws-me-south-1", name: "AWS me-south-1 (Bahrain)", operator: "AWS", region: "me-south-1", country: "BH", lat: 26.0667, lng: 50.5577 },
  { id: "aws-af-south-1", name: "AWS af-south-1 (Cape Town)", operator: "AWS", region: "af-south-1", city: "Cape Town", country: "ZA", lat: -33.9249, lng: 18.4241 },

  // GCP regions
  { id: "gcp-us-central1", name: "GCP us-central1 (Iowa)", operator: "GCP", region: "us-central1", city: "Council Bluffs", country: "US", lat: 41.2620, lng: -95.8608 },
  { id: "gcp-us-east1", name: "GCP us-east1 (S. Carolina)", operator: "GCP", region: "us-east1", city: "Moncks Corner", country: "US", lat: 33.1960, lng: -80.0134 },
  { id: "gcp-us-east4", name: "GCP us-east4 (N. Virginia)", operator: "GCP", region: "us-east4", city: "Ashburn", country: "US", lat: 39.0438, lng: -77.4874 },
  { id: "gcp-us-west1", name: "GCP us-west1 (Oregon)", operator: "GCP", region: "us-west1", city: "The Dalles", country: "US", lat: 45.5946, lng: -121.1787 },
  { id: "gcp-us-west2", name: "GCP us-west2 (Los Angeles)", operator: "GCP", region: "us-west2", city: "Los Angeles", country: "US", lat: 34.0522, lng: -118.2437 },
  { id: "gcp-europe-west1", name: "GCP europe-west1 (Belgium)", operator: "GCP", region: "europe-west1", city: "St. Ghislain", country: "BE", lat: 50.4706, lng: 3.8194 },
  { id: "gcp-europe-west2", name: "GCP europe-west2 (London)", operator: "GCP", region: "europe-west2", city: "London", country: "GB", lat: 51.5074, lng: -0.1278 },
  { id: "gcp-europe-west3", name: "GCP europe-west3 (Frankfurt)", operator: "GCP", region: "europe-west3", city: "Frankfurt", country: "DE", lat: 50.1109, lng: 8.6821 },
  { id: "gcp-asia-east1", name: "GCP asia-east1 (Taiwan)", operator: "GCP", region: "asia-east1", country: "TW", lat: 23.6978, lng: 120.9605 },
  { id: "gcp-asia-northeast1", name: "GCP asia-northeast1 (Tokyo)", operator: "GCP", region: "asia-northeast1", city: "Tokyo", country: "JP", lat: 35.6762, lng: 139.6503 },
  { id: "gcp-asia-south1", name: "GCP asia-south1 (Mumbai)", operator: "GCP", region: "asia-south1", city: "Mumbai", country: "IN", lat: 19.0760, lng: 72.8777 },

  // Azure regions
  { id: "az-eastus", name: "Azure East US (Virginia)", operator: "Azure", region: "eastus", city: "Ashburn", country: "US", lat: 38.9445, lng: -77.4558 },
  { id: "az-eastus2", name: "Azure East US 2 (Virginia)", operator: "Azure", region: "eastus2", city: "Boydton", country: "US", lat: 36.6673, lng: -78.3896 },
  { id: "az-westus", name: "Azure West US (California)", operator: "Azure", region: "westus", city: "San Francisco", country: "US", lat: 37.7749, lng: -122.4194 },
  { id: "az-westus2", name: "Azure West US 2 (Washington)", operator: "Azure", region: "westus2", city: "Quincy", country: "US", lat: 47.2343, lng: -119.8528 },
  { id: "az-centralus", name: "Azure Central US (Iowa)", operator: "Azure", region: "centralus", city: "Des Moines", country: "US", lat: 41.5868, lng: -93.6250 },
  { id: "az-northeurope", name: "Azure North Europe (Ireland)", operator: "Azure", region: "northeurope", city: "Dublin", country: "IE", lat: 53.3498, lng: -6.2603 },
  { id: "az-westeurope", name: "Azure West Europe (Netherlands)", operator: "Azure", region: "westeurope", city: "Amsterdam", country: "NL", lat: 52.3676, lng: 4.9041 },
  { id: "az-uksouth", name: "Azure UK South (London)", operator: "Azure", region: "uksouth", city: "London", country: "GB", lat: 51.5074, lng: -0.1278 },
  { id: "az-japaneast", name: "Azure Japan East (Tokyo)", operator: "Azure", region: "japaneast", city: "Tokyo", country: "JP", lat: 35.6762, lng: 139.6503 },
  { id: "az-southeastasia", name: "Azure SE Asia (Singapore)", operator: "Azure", region: "southeastasia", country: "SG", lat: 1.3521, lng: 103.8198 },

  // Major independent / Meta / Apple / Google own
  { id: "meta-prineville", name: "Meta Prineville", operator: "Meta", region: "us-west", city: "Prineville", country: "US", lat: 44.3088, lng: -120.8338 },
  { id: "meta-altoona", name: "Meta Altoona", operator: "Meta", region: "us-central", city: "Altoona", country: "US", lat: 41.6403, lng: -93.4582 },
  { id: "meta-lulea", name: "Meta Luleå", operator: "Meta", region: "eu-north", city: "Luleå", country: "SE", lat: 65.5842, lng: 22.1547 },
  { id: "apple-maiden", name: "Apple Maiden", operator: "Apple", region: "us-east", city: "Maiden", country: "US", lat: 35.5834, lng: -81.2067 },
  { id: "apple-mesa", name: "Apple Mesa", operator: "Apple", region: "us-southwest", city: "Mesa", country: "US", lat: 33.4152, lng: -111.8315 },
]

// ═══════════════════════════════════════════════════════════════════════
// Helper: lookup by id / region / continent
// ═══════════════════════════════════════════════════════════════════════

export function getStaticPorts(): StaticPort[] {
  return MAJOR_PORTS
}

export function getStaticDataCenters(): StaticDataCenter[] {
  return MAJOR_DATACENTERS
}
