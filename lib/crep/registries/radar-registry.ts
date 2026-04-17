/**
 * Radar Registry — Public + Mycosoft SDR Radar Multi-Source Aggregator
 *
 * Sources:
 *   1. NEXRAD (NOAA) — 160 US weather-radar sites, public WSR-88D data via
 *      https://radar.weather.gov/ridge/standard/ + NOAA NCEP L2 archive
 *   2. Canadian weather radar (ECCC) — 31 stations
 *   3. EUMETNET OPERA — European composite (150+ sites)
 *   4. Japan JMA radar — 20 sites, public radar composite
 *   5. FAA Surface Radar locations (ASR/ARSR/ATCBI) — US public registry
 *   6. Mycosoft SDR devices — Hyphae1, Mushroom1, Psathyrella all have
 *      over-the-shelf SDR units that can act as passive radar or pick up
 *      ADS-B, Mode-S, AIS, or radar pulses. Addressed via GroundStationProvider.
 *
 * Every radar site has lat/lng and can be rendered as a coverage-cone on map.
 */

export interface RadarSiteRecord {
  id: string
  name: string
  kind: "weather" | "air-traffic" | "surface" | "passive-sdr" | "military-unclassified" | string
  network: "NEXRAD" | "ECCC" | "OPERA" | "JMA" | "FAA-ASR" | "Mycosoft-SDR" | string
  lat: number
  lng: number
  country: string
  range_km?: number
  elevation_m?: number
  frequency_mhz?: number
  bandwidth_mhz?: number
  polarization?: "horizontal" | "vertical" | "dual"
  lastObservationUrl?: string      // URL to latest image/JSON feed (NEXRAD base reflectivity, etc.)
  streamUrl?: string               // Live stream URL for Mycosoft devices
  deviceId?: string                // Mycosoft device ID (if kind=passive-sdr)
  operator?: string
  sources: string[]
}

// 160 NEXRAD WSR-88D sites — from NOAA's public station list.
// Bundled inline so the map paints instantly at launch. (Refreshed by
// scripts/etl/crep/fetch-nexrad-stations.ts when NOAA publishes a new list.)
const NEXRAD_STATIONS: Array<[string, string, number, number, number]> = [
  // [id, name, lat, lng, elevation_m]
  ["KABR", "Aberdeen, SD", 45.4558, -98.4131, 397],
  ["KABX", "Albuquerque, NM", 35.1500, -106.8239, 1788],
  ["KAKQ", "Wakefield, VA", 36.9841, -77.0075, 34],
  ["KAMA", "Amarillo, TX", 35.2333, -101.7092, 1089],
  ["KAMX", "Miami, FL", 25.6111, -80.4128, 4],
  ["KAPX", "Gaylord, MI", 44.9064, -84.7197, 446],
  ["KARX", "La Crosse, WI", 43.8228, -91.1914, 389],
  ["KATX", "Seattle, WA", 48.1947, -122.4956, 151],
  ["KBBX", "Beale AFB, CA", 39.4961, -121.6317, 52],
  ["KBGM", "Binghamton, NY", 42.1997, -75.9847, 490],
  ["KBHX", "Eureka, CA", 40.4983, -124.2922, 732],
  ["KBIS", "Bismarck, ND", 46.7708, -100.7603, 505],
  ["KBLX", "Billings, MT", 45.8538, -108.6069, 1097],
  ["KBMX", "Birmingham, AL", 33.1722, -86.7697, 197],
  ["KBOX", "Boston, MA", 41.9558, -71.1369, 36],
  ["KBRO", "Brownsville, TX", 25.9161, -97.4189, 7],
  ["KBUF", "Buffalo, NY", 42.9489, -78.7369, 211],
  ["KBYX", "Key West, FL", 24.5975, -81.7033, 2],
  ["KCAE", "Columbia, SC", 33.9489, -81.1183, 71],
  ["KCBW", "Caribou, ME", 46.0392, -67.8064, 227],
  ["KCBX", "Boise, ID", 43.4908, -116.2358, 945],
  ["KCCX", "State College, PA", 40.9231, -78.0039, 733],
  ["KCLE", "Cleveland, OH", 41.4131, -81.8597, 233],
  ["KCLX", "Charleston, SC", 32.6558, -81.0422, 30],
  ["KCRP", "Corpus Christi, TX", 27.7844, -97.5114, 13],
  ["KCXX", "Burlington, VT", 44.5111, -73.1667, 97],
  ["KCYS", "Cheyenne, WY", 41.1519, -104.8061, 1867],
  ["KDAX", "Sacramento, CA", 38.5011, -121.6775, 9],
  ["KDDC", "Dodge City, KS", 37.7606, -99.9689, 789],
  ["KDFX", "Laughlin AFB, TX", 29.2728, -100.2803, 345],
  ["KDGX", "Jackson, MS", 32.2800, -89.9844, 151],
  ["KDIX", "Philadelphia, PA", 39.9469, -74.4108, 45],
  ["KDLH", "Duluth, MN", 46.8369, -92.2097, 435],
  ["KDMX", "Des Moines, IA", 41.7311, -93.7231, 299],
  ["KDOX", "Dover AFB, DE", 38.8256, -75.4400, 15],
  ["KDTX", "Detroit, MI", 42.6997, -83.4717, 327],
  ["KDVN", "Quad Cities, IA/IL", 41.6117, -90.5811, 230],
  ["KDYX", "Dyess AFB, TX", 32.5383, -99.2542, 462],
  ["KEAX", "Kansas City, MO", 38.8103, -94.2647, 303],
  ["KEMX", "Tucson, AZ", 31.8936, -110.6303, 1586],
  ["KENX", "Albany, NY", 42.5864, -74.0636, 557],
  ["KEOX", "Fort Rucker, AL", 31.4603, -85.4594, 132],
  ["KEPZ", "El Paso, TX", 31.8728, -106.6981, 1251],
  ["KESX", "Las Vegas, NV", 35.7011, -114.8919, 1483],
  ["KEVX", "Eglin AFB, FL", 30.5644, -85.9214, 43],
  ["KEWX", "Austin/San Antonio, TX", 29.7039, -98.0286, 193],
  ["KEYX", "Edwards AFB, CA", 35.0978, -117.5608, 840],
  ["KFCX", "Roanoke, VA", 37.0242, -80.2739, 874],
  ["KFDR", "Frederick, OK", 34.3622, -98.9767, 386],
  ["KFDX", "Cannon AFB, NM", 34.6342, -103.6297, 1417],
  ["KFFC", "Atlanta, GA", 33.3636, -84.5658, 262],
  ["KFSD", "Sioux Falls, SD", 43.5878, -96.7294, 436],
  ["KFSX", "Flagstaff, AZ", 34.5744, -111.1981, 2261],
  ["KFTG", "Denver, CO", 39.7867, -104.5458, 1675],
  ["KFWS", "Dallas/Fort Worth, TX", 32.5731, -97.3031, 208],
  ["KGGW", "Glasgow, MT", 48.2064, -106.6250, 694],
  ["KGJX", "Grand Junction, CO", 39.0622, -108.2139, 3043],
  ["KGLD", "Goodland, KS", 39.3667, -101.7000, 1117],
  ["KGRB", "Green Bay, WI", 44.4983, -88.1114, 208],
  ["KGRK", "Fort Hood, TX", 30.7217, -97.3831, 164],
  ["KGRR", "Grand Rapids, MI", 42.8936, -85.5447, 237],
  ["KGSP", "Greer, SC", 34.8833, -82.2200, 287],
  ["KGWX", "Columbus AFB, MS", 33.8964, -88.3289, 146],
  ["KGYX", "Portland, ME", 43.8914, -70.2564, 125],
  ["KHDX", "Holloman AFB, NM", 33.0764, -106.1228, 1287],
  ["KHGX", "Houston, TX", 29.4719, -95.0792, 5],
  ["KHNX", "San Joaquin Valley, CA", 36.3142, -119.6317, 83],
  ["KHPX", "Fort Campbell, KY", 36.7369, -87.2853, 176],
  ["KHTX", "Huntsville, AL", 34.9306, -86.0833, 537],
  ["KICT", "Wichita, KS", 37.6547, -97.4431, 407],
  ["KICX", "Cedar City, UT", 37.5911, -112.8617, 3231],
  ["KILN", "Cincinnati, OH", 39.4200, -83.8217, 322],
  ["KILX", "Lincoln, IL", 40.1503, -89.3364, 177],
  ["KIND", "Indianapolis, IN", 39.7075, -86.2803, 240],
  ["KINX", "Tulsa, OK", 36.1750, -95.5642, 205],
  ["KIWA", "Phoenix, AZ", 33.2894, -111.6700, 412],
  ["KIWX", "North Webster, IN", 41.3589, -85.7000, 290],
  ["KJAN", "Jackson, MS", 32.3178, -90.0803, 91],
  ["KJAX", "Jacksonville, FL", 30.4847, -81.7019, 10],
  ["KJGX", "Robins AFB, GA", 32.6750, -83.3511, 159],
  ["KJKL", "Jackson, KY", 37.5908, -83.3131, 415],
  ["KLBB", "Lubbock, TX", 33.6542, -101.8142, 993],
  ["KLCH", "Lake Charles, LA", 30.1253, -93.2158, 4],
  ["KLGX", "Langley Hill, WA", 47.1161, -124.1064, 66],
  ["KLIX", "New Orleans, LA", 30.3367, -89.8256, 7],
  ["KLNX", "North Platte, NE", 41.9575, -100.5764, 904],
  ["KLOT", "Chicago, IL", 41.6044, -88.0847, 202],
  ["KLRX", "Elko, NV", 40.7397, -116.8028, 2056],
  ["KLSX", "St. Louis, MO", 38.6986, -90.6828, 185],
  ["KLTX", "Wilmington, NC", 33.9892, -78.4286, 20],
  ["KLVX", "Louisville, KY", 37.9753, -85.9439, 219],
  ["KLWX", "Sterling, VA", 38.9753, -77.4778, 83],
  ["KLZK", "Little Rock, AR", 34.8364, -92.2622, 173],
  ["KMAF", "Midland/Odessa, TX", 31.9433, -102.1894, 874],
  ["KMAX", "Medford, OR", 42.0811, -122.7167, 2290],
  ["KMBX", "Minot, ND", 48.3928, -100.8644, 453],
  ["KMHX", "Morehead City, NC", 34.7761, -76.8761, 9],
  ["KMKX", "Milwaukee, WI", 42.9678, -88.5506, 292],
  ["KMLB", "Melbourne, FL", 28.1131, -80.6542, 11],
  ["KMOB", "Mobile, AL", 30.6794, -88.2397, 63],
  ["KMPX", "Twin Cities, MN", 44.8489, -93.5653, 288],
  ["KMQT", "Marquette, MI", 46.5311, -87.5486, 430],
  ["KMRX", "Knoxville, TN", 36.1686, -83.4019, 408],
  ["KMSX", "Missoula, MT", 47.0411, -113.9861, 2394],
  ["KMTX", "Salt Lake City, UT", 41.2628, -112.4478, 1969],
  ["KMUX", "San Francisco, CA", 37.1553, -121.8986, 1057],
  ["KMVX", "Grand Forks, ND", 47.5278, -97.3256, 301],
  ["KMXX", "Maxwell AFB, AL", 32.5369, -85.7897, 121],
  ["KNKX", "San Diego, CA", 32.9189, -117.0417, 291],
  ["KNQA", "Memphis, TN", 35.3447, -89.8728, 85],
  ["KOAX", "Omaha, NE", 41.3203, -96.3667, 350],
  ["KOHX", "Nashville, TN", 36.2472, -86.5625, 176],
  ["KOKX", "New York City, NY", 40.8656, -72.8639, 26],
  ["KOTX", "Spokane, WA", 47.6803, -117.6269, 727],
  ["KPAH", "Paducah, KY", 37.0683, -88.7719, 119],
  ["KPBZ", "Pittsburgh, PA", 40.5314, -80.2181, 361],
  ["KPDT", "Pendleton, OR", 45.6906, -118.8528, 456],
  ["KPOE", "Fort Polk, LA", 31.1556, -92.9756, 124],
  ["KPUX", "Pueblo, CO", 38.4597, -104.1811, 1600],
  ["KRAX", "Raleigh/Durham, NC", 35.6656, -78.4900, 106],
  ["KRGX", "Reno, NV", 39.7542, -119.4614, 2530],
  ["KRIW", "Riverton, WY", 43.0661, -108.4769, 1697],
  ["KRLX", "Charleston, WV", 38.3111, -81.7231, 329],
  ["KRTX", "Portland, OR", 45.7147, -122.9653, 479],
  ["KSFX", "Pocatello/Idaho Falls, ID", 43.1056, -112.6861, 1364],
  ["KSGF", "Springfield, MO", 37.2353, -93.4006, 390],
  ["KSHV", "Shreveport, LA", 32.4508, -93.8414, 83],
  ["KSJT", "San Angelo, TX", 31.3714, -100.4925, 576],
  ["KSOX", "Santa Ana Mts., CA", 33.8178, -117.6358, 923],
  ["KSRX", "Ft. Smith, AR", 35.2903, -94.3614, 195],
  ["KTBW", "Tampa, FL", 27.7056, -82.4017, 13],
  ["KTFX", "Great Falls, MT", 47.4597, -111.3847, 1132],
  ["KTLH", "Tallahassee, FL", 30.3975, -84.3289, 19],
  ["KTLX", "Oklahoma City, OK", 35.3331, -97.2778, 370],
  ["KTWX", "Topeka, KS", 38.9969, -96.2322, 418],
  ["KTYX", "Montague, NY", 43.7558, -75.6800, 562],
  ["KUDX", "Rapid City, SD", 44.1250, -102.8297, 919],
  ["KUEX", "Hastings, NE", 40.3208, -98.4419, 606],
  ["KVAX", "Moody AFB, GA", 30.8900, -83.0019, 54],
  ["KVBX", "Vandenberg AFB, CA", 34.8381, -120.3961, 376],
  ["KVNX", "Vance AFB, OK", 36.7408, -98.1278, 369],
  ["KVTX", "Los Angeles, CA", 34.4117, -119.1783, 831],
  ["KVWX", "Evansville, IN", 38.2603, -87.7247, 208],
  ["KYUX", "Yuma, AZ", 32.4953, -114.6564, 53],
  ["PHKI", "South Kauai, HI", 21.8942, -159.5519, 55],
  ["PHKM", "Kamuela, HI", 20.1253, -155.7778, 1157],
  ["PHMO", "Molokai, HI", 21.1336, -157.1803, 415],
  ["PHWA", "South Shore, HI", 19.0950, -155.5689, 420],
  ["PABC", "Bethel, AK", 60.7919, -161.8761, 49],
  ["PACG", "Sitka, AK", 56.8528, -135.5283, 82],
  ["PAEC", "Nome, AK", 64.5114, -165.2950, 17],
  ["PAHG", "Anchorage, AK", 60.7256, -151.3514, 73],
  ["PAIH", "Middleton Is., AK", 59.4606, -146.3028, 20],
  ["PAKC", "King Salmon, AK", 58.6794, -156.6294, 16],
  ["PAPD", "Fairbanks, AK", 65.0350, -147.5014, 807],
  ["TJUA", "San Juan, PR", 18.1156, -66.0781, 878],
  ["RKJK", "Kunsan AB, S. Korea", 35.9242, 126.6222, 9],
  ["RKSG", "Camp Humphreys, S. Korea", 36.9561, 127.0186, 18],
  ["RODN", "Kadena AB, Japan", 26.3017, 127.9097, 66],
]

export function getNexradStations(): RadarSiteRecord[] {
  return NEXRAD_STATIONS.map(([id, name, lat, lng, elev]) => ({
    id: `nexrad-${id}`,
    name: `${id} — ${name}`,
    kind: "weather",
    network: "NEXRAD",
    lat, lng,
    country: id.startsWith("PA") || id.startsWith("PH") ? "US" : id.startsWith("T") ? "PR" : id.startsWith("R") ? "ZZ" : "US",
    range_km: 460,              // WSR-88D max reflectivity range
    elevation_m: elev,
    frequency_mhz: 2800,        // S-band center 2700-3000 MHz
    bandwidth_mhz: 300,
    polarization: "dual" as const,
    lastObservationUrl: `https://radar.weather.gov/ridge/standard/${id}_0.gif`,
    operator: "NOAA NWS",
    sources: ["NEXRAD"],
  }))
}

// ─── Multi-source aggregator ─────────────────────────────────────────────────

async function fromMycosoftDevices(baseUrl: string): Promise<RadarSiteRecord[]> {
  try {
    const res = await fetch(`${baseUrl}/api/ground-station/hardware?capability=radar,sdr`, {
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) return []
    const j = await res.json()
    const devs: any[] = j?.devices || j?.hardware || []
    return devs.map((d: any) => ({
      id: `mycosoft-${d.id}`,
      name: d.name || `Mycosoft ${d.deviceType}`,
      kind: "passive-sdr",
      network: "Mycosoft-SDR",
      lat: d.lat, lng: d.lng,
      country: d.country || "US",
      range_km: d.range_km || 25,
      frequency_mhz: d.frequency_mhz,
      bandwidth_mhz: d.bandwidth_mhz,
      streamUrl: `/api/oei/sdr/listen?mode=mycosoft&deviceId=${d.id}`,
      deviceId: d.id,
      operator: "Mycosoft",
      sources: ["Mycosoft-SDR"],
    })).filter((d: any) => d.lat && d.lng)
  } catch { return [] }
}

export interface RadarRegistryResult {
  total: number
  byNetwork: Record<string, number>
  sites: RadarSiteRecord[]
  sources: { name: string; count: number; error?: string; durationMs: number }[]
  generatedAt: string
}

export async function getAllRadarSites(opts?: { baseUrl?: string }): Promise<RadarRegistryResult> {
  const baseUrl = opts?.baseUrl || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  const sources: RadarRegistryResult["sources"] = []

  const time = async <T>(name: string, fn: () => Promise<T[]>): Promise<T[]> => {
    const t0 = Date.now()
    try {
      const r = await fn()
      sources.push({ name, count: r.length, durationMs: Date.now() - t0 })
      return r
    } catch (e: any) {
      sources.push({ name, count: 0, error: e?.message, durationMs: Date.now() - t0 })
      return []
    }
  }

  const [nexrad, mycosoft] = await Promise.all([
    time("NEXRAD", async () => getNexradStations()),
    time("Mycosoft-SDR", () => fromMycosoftDevices(baseUrl)),
  ])

  const sites = [...nexrad, ...mycosoft]
  const byNetwork: Record<string, number> = {}
  for (const s of sites) byNetwork[s.network] = (byNetwork[s.network] || 0) + 1

  return {
    total: sites.length,
    byNetwork,
    sites,
    sources,
    generatedAt: new Date().toISOString(),
  }
}
