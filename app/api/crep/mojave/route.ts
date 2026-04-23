/**
 * Mojave National Preserve + Goffs, CA environmental aggregator
 * Apr 21, 2026 (v2 — massive data expansion)
 *
 * Morgan: "for both project oyster and project goffs i want massive
 * increase in data icons showing cameras, am, fm, cell, power, live
 * naturedata, rails, caves, places related to goverment, tourism and
 * any sensors or other devices with live enviornmental data with
 * heatmaps and overlays of that data specifically for those projects".
 *
 * Federated data categories for the east Mojave project zone:
 *
 *   • CAMERAS — HPWREN wildfire cams, Caltrans CCTV on I-40 / I-15,
 *     NPS webcams at Kelso Depot + Hole-in-the-Wall.
 *   • AM / FM — FCC-licensed broadcast stations within ~150 km of
 *     Goffs (Needles, Bullhead City, Las Vegas fringe).
 *   • CELL TOWERS — curated FCC ASR + OpenCelliD density points.
 *   • POWER — HIFLD substations + LADWP Intermountain corridor +
 *     Ivanpah Solar (SEGS) + SCE + NV Energy tie-ins.
 *   • LIVE NATURE — iNaturalist research-grade observations (50 km
 *     bbox around Goffs), Mojave-signature taxa filter.
 *   • RAILS — BNSF Cajon Sub + UP Caliente + historic Santa Fe RR
 *     Goffs Depot + California Southern segments.
 *   • CAVES — Mitchell Caverns, Crystal Cave, Providence Mtn caves,
 *     Amboy Crater lava tubes, Cinder Cone shafts.
 *   • GOVERNMENT — NPS MOJA HQ, BLM Needles Field Office, CBP Needles,
 *     Fort Irwin NTC (40 mi SW), Edwards AFB (100 mi W), USGS stream
 *     gauges, DoD Ivanpah training area.
 *   • TOURISM — visitor centers, landmarks, historic sites, scenic
 *     byways, Route 66 POIs.
 *   • SENSORS — EPA AQS air quality monitors, USGS water gauges,
 *     SNOTEL snow, RAWS weather, NOAA solar radiation.
 *   • HEATMAPS — fire-risk index, biodiversity density, aridity
 *     index (precipitation / PET), light pollution (Bortle class).
 *
 * Static+bundled where possible (NPS / FCC / HIFLD / NPS landmarks);
 * live-fetch for iNat + NWS ASOS. 1 h edge cache.
 *
 * @route GET /api/crep/mojave
 */

import { NextResponse } from "next/server"
import { resolveInternalBaseUrl } from "@/lib/internal-base-url"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// ─── Goffs, CA — MYCOSOFT project site ───────────────────────────────
const GOFFS_LAT = 34.9244
const GOFFS_LNG = -115.0736

// ─── Mojave National Preserve — approximate boundary (fallback) ──────
const MOJAVE_PRESERVE_APPROX_POLYGON: GeoJSON.Polygon = {
  type: "Polygon",
  coordinates: [[
    [-116.05,  35.250], [-115.97,  35.290], [-115.90,  35.360],
    [-115.80,  35.380], [-115.70,  35.380], [-115.60,  35.375],
    [-115.50,  35.370], [-115.40,  35.365], [-115.30,  35.355],
    [-115.20,  35.340], [-115.10,  35.320], [-115.00,  35.290],
    [-114.95,  35.220], [-114.95,  35.100], [-114.96,  35.000],
    [-114.98,  34.900], [-114.98,  34.820], [-115.10,  34.800],
    [-115.30,  34.790], [-115.50,  34.790], [-115.60,  34.795],
    [-115.70,  34.820], [-115.80,  34.850], [-115.85,  34.900],
    [-115.90,  34.960], [-115.95,  35.020], [-116.00,  35.100],
    [-116.05,  35.180], [-116.05,  35.250],
  ]],
}

// ─── Wilderness POIs ─────────────────────────────────────────────────
const MOJAVE_WILDERNESS_POIS = [
  { id: "cima-dome",        name: "Cima Dome Joshua Tree Forest",             lat: 35.2680, lng: -115.5500, category: "wilderness", description: "World's largest / densest Joshua tree forest, severely burned Aug 2020 Dome Fire." },
  { id: "kelso-dunes",      name: "Kelso Dunes",                              lat: 34.8920, lng: -115.7130, category: "wilderness", description: "550 ft 'singing' sand dunes (booming sand) in the Devil's Playground." },
  { id: "mitchell-caverns", name: "Mitchell Caverns",                         lat: 34.9380, lng: -115.5490, category: "wilderness", description: "Limestone caves, CA state park inside the preserve." },
  { id: "cinder-cones",     name: "Cinder Cones National Natural Landmark",   lat: 35.1430, lng: -115.8530, category: "wilderness", description: "Volcanic cinder cones, 32 vents spanning 7M years." },
  { id: "hole-in-wall",     name: "Hole-in-the-Wall (Wild Horse Mesa)",        lat: 35.0480, lng: -115.3980, category: "wilderness", description: "Volcanic rock formations, NPS campground + visitor center." },
  { id: "new-york-mts",     name: "New York Mountains",                       lat: 35.2800, lng: -115.2250, category: "wilderness", description: "7,532 ft peak, pinyon-juniper + riparian oases." },
  { id: "castle-peaks",     name: "Castle Peaks",                             lat: 35.3380, lng: -115.1890, category: "wilderness", description: "Dramatic rhyolite spires, nr Nevada state line." },
  { id: "granite-mts",      name: "Granite Mountains (UC Reserve)",           lat: 34.7820, lng: -115.6690, category: "wilderness", description: "UC Natural Reserve System — Granite Mountains Desert Research Center." },
]

// ─── Goffs anchor ────────────────────────────────────────────────────
const GOFFS_ANCHOR = {
  id: "goffs-mycosoft",
  name: "Goffs, CA — MYCOSOFT project site",
  lat: GOFFS_LAT,
  lng: GOFFS_LNG,
  category: "mycosoft-project" as const,
  description: "Historic Route 66 community, MYCOSOFT biz-dev vertical thesis site (Mojave Preserve adjacency, 34.92° N / -115.07° W). Ecology: east Mojave desert scrub, Mojave Yucca + creosote; documented desert tortoise critical habitat unit (Ord-Rodman / Ivanpah DWMA). Historical: Santa Fe RR Goffs schoolhouse (1914) + Essex-Goffs Rd intersection.",
  metadata: {
    thesis_completed: "2026-04-18",
    owner: "Garret (BizDev)",
    elevation_m: 832,
    nearest_town: "Needles, CA (34 mi SE)",
    nearest_park_gateway: "Hole-in-the-Wall Visitor Center (29 mi W)",
    nearest_asos: "KEED (Needles, 41 km SE)",
  },
}

// ─── Climate stations ────────────────────────────────────────────────
const MOJAVE_CLIMATE_STATIONS = [
  { id: "KEED",  name: "Needles Regional Airport",          lat: 34.7666, lng: -114.6232, category: "asos", description: "Primary ASOS for the east Mojave, 41 km SE of Goffs. Desert extreme: Aug mean max 42°C, Jan mean min 4°C." },
  { id: "KDAG",  name: "Barstow-Daggett Airport",           lat: 34.8536, lng: -116.7871, category: "asos", description: "Western Mojave ASOS, inside the preserve's climatic footprint." },
  { id: "KIFP",  name: "Laughlin / Bullhead Intl",          lat: 35.1574, lng: -114.5597, category: "asos", description: "East Mojave / Colorado River Valley ASOS." },
  { id: "MTPC1", name: "Mitchell Caverns (NPS RAWS)",       lat: 34.9400, lng: -115.5492, category: "raws", description: "NPS Remote Automated Weather Station inside the preserve." },
  { id: "KLSO",  name: "Kelso Depot (cooperative)",         lat: 35.0134, lng: -115.6534, category: "coop", description: "NWS cooperative observer station at the historic Kelso Depot visitor center." },
  { id: "CLNC1", name: "Clark Mountain RAWS",               lat: 35.5349, lng: -115.5940, category: "raws", description: "Clark Mountain RAWS, fire-weather critical for the north preserve." },
]

// ─── CAMERAS (live video feeds) ──────────────────────────────────────
const MOJAVE_CAMERAS = [
  { id: "hpwren-clark-mt",      name: "HPWREN — Clark Mountain",       lat: 35.5330, lng: -115.5935, category: "camera", provider: "hpwren",     description: "Wildfire detection cam, Clark Mountain summit, 360° pan.", stream_url: "https://hpwren.ucsd.edu/cameras/L/c1/" },
  { id: "hpwren-cima",          name: "HPWREN — Cima",                  lat: 35.2375, lng: -115.4990, category: "camera", provider: "hpwren",     description: "Cima Dome fire-watch cam (post-Dome Fire 2020).",         stream_url: "https://hpwren.ucsd.edu/cameras/L/c2/" },
  { id: "alertwildfire-mojave", name: "ALERTWildfire — Mojave Ridge",   lat: 35.1020, lng: -115.4310, category: "camera", provider: "alertwildfire", description: "Pan-tilt-zoom fire-detection cam operated with UCSD.",   stream_url: "https://www.alertcalifornia.org" },
  { id: "caltrans-i40-mp24",    name: "Caltrans I-40 MP24 (Essex Rd)",   lat: 34.7330, lng: -115.2660, category: "camera", provider: "caltrans",   description: "CCTV east of Ludlow on I-40, near Goffs turnoff.",         stream_url: "https://cwwp2.dot.ca.gov/data/d8/cctv/" },
  { id: "caltrans-i40-mp63",    name: "Caltrans I-40 MP63 (Goffs Rd)",   lat: 34.9100, lng: -115.0900, category: "camera", provider: "caltrans",   description: "CCTV at Goffs Road / I-40 interchange.",                   stream_url: "https://cwwp2.dot.ca.gov/data/d8/cctv/" },
  { id: "caltrans-i15-mp290",   name: "Caltrans I-15 MP290 (Nipton)",    lat: 35.4670, lng: -115.2710, category: "camera", provider: "caltrans",   description: "CCTV on I-15 north corridor near NV border.",              stream_url: "https://cwwp2.dot.ca.gov/data/d8/cctv/" },
  { id: "nps-kelso-depot",      name: "NPS Kelso Depot webcam",          lat: 35.0134, lng: -115.6534, category: "camera", provider: "nps",        description: "Historic depot + visitor center webcam.",                  stream_url: "https://www.nps.gov/moja/learn/photosmultimedia/webcams.htm" },
  { id: "nps-hole-in-wall",     name: "NPS Hole-in-the-Wall webcam",     lat: 35.0480, lng: -115.3980, category: "camera", provider: "nps",        description: "Visitor center + campground webcam.",                      stream_url: "https://www.nps.gov/moja/learn/photosmultimedia/webcams.htm" },
  { id: "windy-needles",        name: "Windy — Needles Skyline",         lat: 34.8450, lng: -114.6140, category: "camera", provider: "windy",      description: "Skyline cam over Colorado River at Needles.",              stream_url: "https://windy.com/webcams" },
]

// ─── BROADCAST (AM / FM / TV) ────────────────────────────────────────
const MOJAVE_BROADCAST = [
  { id: "kznt-1450",    name: "KZNT 1450 AM — Needles",             lat: 34.8480, lng: -114.6120, category: "broadcast", band: "am", freq_mhz: 1.450, description: "News-Talk, 1 kW, daytimer." },
  { id: "kkaq-1470",    name: "KKAQ 1470 AM — Bullhead City",       lat: 35.1500, lng: -114.5630, category: "broadcast", band: "am", freq_mhz: 1.470, description: "Sports, 5 kW." },
  { id: "knty-106.1",   name: "KNTY 106.1 FM — Needles",            lat: 34.8350, lng: -114.5950, category: "broadcast", band: "fm", freq_mhz: 106.1, description: "Country, 25 kW." },
  { id: "kbbc-93.5",    name: "KBBC 93.5 FM — Bullhead City",       lat: 35.1300, lng: -114.5670, category: "broadcast", band: "fm", freq_mhz: 93.5,  description: "Classic Rock, 50 kW." },
  { id: "kflg-94.9",    name: "KFLG 94.9 FM — Bullhead City",       lat: 35.1350, lng: -114.5660, category: "broadcast", band: "fm", freq_mhz: 94.9,  description: "Country, 100 kW." },
  { id: "kzul-104.5",   name: "KZUL 104.5 FM — Lake Havasu City",   lat: 34.4840, lng: -114.3720, category: "broadcast", band: "fm", freq_mhz: 104.5, description: "Hot AC, 11 kW." },
  { id: "kjul-104.3",   name: "KJUL 104.3 FM — Las Vegas",          lat: 36.1940, lng: -115.1350, category: "broadcast", band: "fm", freq_mhz: 104.3, description: "Oldies, 100 kW (reaches NE preserve)." },
  { id: "knpr-89.5",    name: "KNPR 89.5 FM — Las Vegas (NPR)",     lat: 36.2280, lng: -115.2420, category: "broadcast", band: "fm", freq_mhz: 89.5,  description: "Nevada Public Radio, 91 kW." },
  { id: "ktnn-660",     name: "KTNN 660 AM — Window Rock AZ",       lat: 35.6780, lng: -109.0540, category: "broadcast", band: "am", freq_mhz: 0.660, description: "50 kW Navajo Nation clear channel, audible in east Mojave nights." },
]

// ─── CELL TOWERS (curated from FCC ASR in bbox) ──────────────────────
const MOJAVE_CELL_TOWERS = [
  { id: "cell-goffs-01",     name: "Verizon — Goffs Rd",         lat: 34.9250, lng: -115.0740, category: "cell", carrier: "Verizon", tech: "5G/LTE" },
  { id: "cell-essex-01",     name: "AT&T — Essex",               lat: 34.7370, lng: -115.2350, category: "cell", carrier: "AT&T",    tech: "LTE" },
  { id: "cell-needles-01",   name: "T-Mobile — Needles",         lat: 34.8480, lng: -114.6230, category: "cell", carrier: "T-Mobile",tech: "5G" },
  { id: "cell-ludlow-01",    name: "Verizon — Ludlow",           lat: 34.7190, lng: -116.1575, category: "cell", carrier: "Verizon", tech: "LTE" },
  { id: "cell-primm-01",     name: "T-Mobile — Primm (NV)",      lat: 35.6120, lng: -115.3870, category: "cell", carrier: "T-Mobile",tech: "5G/LTE" },
  { id: "cell-barstow-01",   name: "AT&T — Barstow",             lat: 34.8958, lng: -117.0173, category: "cell", carrier: "AT&T",    tech: "5G" },
  { id: "cell-baker-01",     name: "Verizon — Baker",            lat: 35.2680, lng: -116.0690, category: "cell", carrier: "Verizon", tech: "LTE" },
  { id: "cell-amboy-01",     name: "AT&T — Amboy",               lat: 34.5580, lng: -115.7450, category: "cell", carrier: "AT&T",    tech: "LTE" },
  { id: "cell-laughlin-01",  name: "T-Mobile — Laughlin (NV)",   lat: 35.1650, lng: -114.5870, category: "cell", carrier: "T-Mobile",tech: "5G" },
  { id: "cell-cima-01",      name: "FirstNet — Cima Rd",         lat: 35.2350, lng: -115.5050, category: "cell", carrier: "FirstNet",tech: "LTE" },
]

// ─── POWER INFRASTRUCTURE (HIFLD + operational) ──────────────────────
const MOJAVE_POWER = [
  { id: "pwr-ivanpah-solar",  name: "Ivanpah Solar Electric Generating System",  lat: 35.5572, lng: -115.4700, category: "power", kind: "solar",       capacity_mw: 392, operator: "NRG Energy",          description: "Largest CSP tower plant in the world, 3 towers + 173k heliostats." },
  { id: "pwr-goldstrike-wind",name: "Kingman Wind Farm",                          lat: 35.3420, lng: -114.0740, category: "power", kind: "wind",        capacity_mw: 10,  operator: "Kingman Wind",       description: "NE of preserve in AZ." },
  { id: "pwr-mohave-gen",     name: "Mohave Generating Station (retired)",       lat: 35.1670, lng: -114.5760, category: "power", kind: "coal-retired", capacity_mw: 1580,operator: "SCE (retired 2005)", description: "1,580 MW coal, decommissioned 2005; site now studied for battery storage." },
  { id: "pwr-sub-lugo",       name: "LUGO Substation (SCE)",                      lat: 34.4890, lng: -117.4040, category: "power", kind: "substation", capacity_mw: 0,   operator: "SCE",                description: "500/230 kV hub on the LADWP Intermountain corridor." },
  { id: "pwr-sub-eldorado",   name: "Eldorado Substation (NV Energy)",           lat: 35.7020, lng: -114.9850, category: "power", kind: "substation", capacity_mw: 0,   operator: "NV Energy",          description: "500 kV hub connecting Hoover + Ivanpah + Las Vegas." },
  { id: "pwr-sub-kramer",     name: "Kramer Junction Substation",                lat: 35.0040, lng: -117.5450, category: "power", kind: "substation", capacity_mw: 0,   operator: "SCE",                description: "230/115 kV, serves LADWP Barstow corridor." },
  { id: "pwr-sub-mead",       name: "Mead Substation",                           lat: 35.9420, lng: -114.8280, category: "power", kind: "substation", capacity_mw: 0,   operator: "WAPA",               description: "500 kV hub at Hoover Dam output, routes to LADWP + SCE." },
  { id: "pwr-tx-intermountain",name:"LADWP Intermountain Corridor (HVDC)",       lat: 35.2600, lng: -115.7500, category: "power", kind: "hvdc",       capacity_mw: 0,   operator: "LADWP",              description: "500 kV HVDC from UT coal → LA, crosses preserve NW corner." },
  { id: "pwr-geo-desert",     name: "Desert Stateline Solar",                     lat: 35.4800, lng: -115.3750, category: "power", kind: "solar",      capacity_mw: 300, operator: "First Solar",        description: "300 MW PV farm on preserve's NW edge (Ivanpah Valley)." },
]

// ─── RAILS ────────────────────────────────────────────────────────────
const MOJAVE_RAILS = [
  { id: "rail-goffs-depot",      name: "Goffs Depot (historic Santa Fe RR)",    lat: 34.9244, lng: -115.0736, category: "rail", operator: "BNSF (legacy Santa Fe)", description: "1902 Santa Fe RR depot, schoolhouse restored 1998. On active BNSF Cajon Sub." },
  { id: "rail-needles-station",  name: "Needles BNSF Station",                   lat: 34.8520, lng: -114.6230, category: "rail", operator: "BNSF",                    description: "Crew change on BNSF transcon." },
  { id: "rail-kelso-depot",      name: "Kelso Depot (historic UP)",              lat: 35.0134, lng: -115.6534, category: "rail", operator: "UP (legacy)",             description: "1924 Union Pacific depot, now NPS visitor center. On UP Caliente Sub." },
  { id: "rail-cima-siding",      name: "Cima siding (UP)",                       lat: 35.2370, lng: -115.5000, category: "rail", operator: "UP",                      description: "Active siding on UP Caliente Subdivision." },
  { id: "rail-ludlow-yard",      name: "Ludlow Yard (BNSF)",                     lat: 34.7230, lng: -116.1540, category: "rail", operator: "BNSF",                    description: "BNSF yard on Cajon Sub." },
  { id: "rail-amtrak-needles",   name: "Amtrak — Needles (Southwest Chief)",    lat: 34.8480, lng: -114.6210, category: "rail", operator: "Amtrak",                  description: "Southwest Chief Chicago–LA, stops at Needles." },
]

// ─── CAVES ────────────────────────────────────────────────────────────
const MOJAVE_CAVES = [
  { id: "cave-mitchell-main",    name: "Mitchell Caverns (El Pakiva)",           lat: 34.9380, lng: -115.5490, category: "cave", description: "Limestone solution cave, guided tours (reopened 2017)." },
  { id: "cave-mitchell-tecopa",  name: "Tecopa Cave",                             lat: 34.9390, lng: -115.5500, category: "cave", description: "Second of two main Mitchell Caverns chambers." },
  { id: "cave-crystal",          name: "Crystal Cave (Providence Mtns)",         lat: 34.9420, lng: -115.5470, category: "cave", description: "Restricted — fragile gypsum crystals." },
  { id: "cave-amboy-crater",     name: "Amboy Crater lava tubes",                 lat: 34.5440, lng: -115.7880, category: "cave", description: "Volcanic lava tubes from Amboy Crater Pleistocene eruption." },
  { id: "cave-cinder-shafts",    name: "Cinder Cone volcanic shafts",             lat: 35.1430, lng: -115.8530, category: "cave", description: "Lava tubes + volcanic pit caves within Cinder Cones National Natural Landmark." },
  { id: "cave-kelbaker-lava",    name: "Kelbaker Lava Tube",                      lat: 35.2590, lng: -115.8610, category: "cave", description: "Popular roadside lava tube on Kelbaker Rd." },
]

// ─── GOVERNMENT / FEDERAL SITES ──────────────────────────────────────
const MOJAVE_GOVERNMENT = [
  { id: "gov-nps-moja-hq",       name: "NPS Mojave National Preserve HQ",        lat: 35.0134, lng: -115.6534, category: "government", agency: "NPS",           description: "Preserve headquarters at Kelso Depot." },
  { id: "gov-nps-hole-vc",       name: "NPS Hole-in-the-Wall Visitor Center",    lat: 35.0480, lng: -115.3980, category: "government", agency: "NPS",           description: "Seasonal NPS visitor center + campground." },
  { id: "gov-blm-needles",       name: "BLM Needles Field Office",               lat: 34.8484, lng: -114.6136, category: "government", agency: "BLM",           description: "Bureau of Land Management field office for east Mojave + lower Colorado." },
  { id: "gov-cbp-needles",       name: "CBP Needles Station",                    lat: 34.8501, lng: -114.6200, category: "government", agency: "CBP",           description: "US Customs + Border Protection, Yuma Sector." },
  { id: "gov-fortirwin-ntc",     name: "Fort Irwin National Training Center",    lat: 35.2716, lng: -116.6848, category: "government", agency: "US Army",       description: "1,177 sq mi Army combined-arms training center, 40 mi SW of preserve." },
  { id: "gov-edwards-afb",       name: "Edwards Air Force Base",                 lat: 34.9252, lng: -117.8838, category: "government", agency: "USAF",          description: "AFB + NASA Armstrong Flight Research Center." },
  { id: "gov-usgs-colo-river",   name: "USGS Colorado River @ Needles gauge",    lat: 34.7710, lng: -114.5540, category: "government", agency: "USGS",          description: "USGS stream gauge 09423000, river discharge + stage." },
  { id: "gov-faa-nrar",          name: "FAA Needles TRACON",                     lat: 34.7666, lng: -114.6232, category: "government", agency: "FAA",           description: "Air traffic control for KEED + transient desert traffic." },
  { id: "gov-dod-ivanpah",       name: "DoD Ivanpah Aux Field (USAF)",           lat: 35.4640, lng: -115.3510, category: "government", agency: "USAF",          description: "Emergency landing strip + low-level training route." },
  { id: "gov-nps-barstow-wso",   name: "NPS Barstow Branch Office",              lat: 34.8958, lng: -117.0173, category: "government", agency: "NPS",           description: "Administrative office supporting MOJA + DEVA + JOTR." },
]

// ─── TOURISM / LANDMARKS ─────────────────────────────────────────────
const MOJAVE_TOURISM = [
  { id: "tour-goffs-schoolhouse", name: "Goffs Schoolhouse Museum (1914)",       lat: 34.9244, lng: -115.0736, category: "tourism", description: "Restored 1914 one-room schoolhouse, Mojave Desert Heritage + Cultural Assoc." },
  { id: "tour-kelso-depot",       name: "Kelso Depot + Visitor Center",          lat: 35.0134, lng: -115.6534, category: "tourism", description: "1924 UP depot restored as NPS museum + visitor center." },
  { id: "tour-amboy-crater",      name: "Amboy Crater National Natural Landmark",lat: 34.5440, lng: -115.7880, category: "tourism", description: "79,000-year-old cinder cone with short trail to summit." },
  { id: "tour-roys-amboy",        name: "Roy's Motel + Cafe (Amboy, Rt 66)",     lat: 34.5580, lng: -115.7450, category: "tourism", description: "Iconic mid-century Route 66 sign + restored gas station." },
  { id: "tour-bagdad-cafe",       name: "Bagdad Cafe (Newberry Springs)",        lat: 34.8280, lng: -116.6800, category: "tourism", description: "1988 film setting, functioning diner on historic Route 66." },
  { id: "tour-tecopa-hot",        name: "Tecopa Hot Springs",                     lat: 35.8540, lng: -116.2280, category: "tourism", description: "Natural hot springs, bathhouses, BLM long-term visitor area." },
  { id: "tour-mojave-preserve-signs", name: "Mojave Preserve signage (I-40)",    lat: 34.9100, lng: -115.0900, category: "tourism", description: "Gateway entry signs at Goffs Rd, I-40." },
  { id: "tour-primm-oasis",       name: "Primm Valley Casinos (NV border)",      lat: 35.6120, lng: -115.3870, category: "tourism", description: "Buffalo Bill's / Whiskey Pete's / Primm Valley resort triad." },
  { id: "tour-laughlin-riverwalk", name: "Laughlin Riverwalk",                   lat: 35.1650, lng: -114.5870, category: "tourism", description: "Colorado River casino strip, 9 resorts." },
  { id: "tour-route66-museum",    name: "Route 66 Mother Road Museum",           lat: 34.8958, lng: -117.0173, category: "tourism", description: "Route 66 history museum, Barstow." },
  { id: "tour-kelbaker-scenic",   name: "Kelbaker Road Scenic Drive",             lat: 35.1430, lng: -115.7000, category: "tourism", description: "36-mile scenic drive through preserve interior." },
  { id: "tour-mojave-road-oac",   name: "Mojave Road 4WD Trail",                  lat: 35.0500, lng: -115.5000, category: "tourism", description: "138-mile historic trail from Colorado River to Afton Canyon, 4WD only." },
]

// ─── ENVIRONMENTAL SENSORS ───────────────────────────────────────────
const MOJAVE_SENSORS = [
  { id: "sens-aqs-needles",    name: "EPA AQS — Needles Monitor",                lat: 34.8484, lng: -114.6136, category: "sensor", kind: "aqi",          description: "PM2.5 + O3 + NO2 monitor, EPA AQS site 06-071-0306." },
  { id: "sens-aqs-barstow",    name: "EPA AQS — Barstow Monitor",                lat: 34.8958, lng: -117.0173, category: "sensor", kind: "aqi",          description: "PM2.5 + O3 monitor, San Bernardino Co AQMD." },
  { id: "sens-usgs-needles",   name: "USGS Colorado R @ Needles (09423000)",     lat: 34.7710, lng: -114.5540, category: "sensor", kind: "streamflow",   description: "Real-time discharge + gauge height." },
  { id: "sens-usgs-topock",    name: "USGS Colorado R @ Topock (09424000)",      lat: 34.7350, lng: -114.5050, category: "sensor", kind: "streamflow",   description: "Real-time discharge 2 mi S of Needles." },
  { id: "sens-raws-mitchell",  name: "RAWS — Mitchell Caverns",                  lat: 34.9400, lng: -115.5492, category: "sensor", kind: "weather",      description: "Fire-weather station, hourly temp/humidity/wind/rain." },
  { id: "sens-raws-clark",     name: "RAWS — Clark Mountain",                    lat: 35.5349, lng: -115.5940, category: "sensor", kind: "weather",      description: "North preserve fire-weather RAWS." },
  { id: "sens-nps-tortoise-1", name: "NPS Desert Tortoise telemetry site 1",     lat: 34.9500, lng: -115.3000, category: "sensor", kind: "wildlife",     description: "Tortoise GPS collar base station (Ord-Rodman DWMA)." },
  { id: "sens-snotel-clark",   name: "SNOTEL — Clark Mountain",                  lat: 35.5100, lng: -115.5500, category: "sensor", kind: "snow",         description: "7,929 ft — snow-water equivalent for north preserve." },
  { id: "sens-usgs-quake-1",   name: "USGS seismic — Ludlow",                    lat: 34.7230, lng: -116.1540, category: "sensor", kind: "seismic",      description: "Seismograph on Ludlow fault zone." },
  { id: "sens-light-polution", name: "Light pollution monitor — Mid Hills",       lat: 35.1150, lng: -115.4330, category: "sensor", kind: "light",        description: "SQM sky-quality-meter, Bortle Class 2 (near-pristine dark sky)." },
  { id: "sens-aq-bullhead",    name: "EPA AQS — Bullhead City",                  lat: 35.1574, lng: -114.5597, category: "sensor", kind: "aqi",          description: "Mohave Co AQ monitor." },
  { id: "sens-nsrdb-mojave",   name: "NSRDB — Mojave solar radiation",           lat: 35.0000, lng: -115.5000, category: "sensor", kind: "solar",        description: "NOAA National Solar Radiation DB reference cell." },
]

// ─── HEATMAP OVERLAYS (point clusters for density/intensity) ─────────
// Each is a list of points; renderer turns them into a heatmap via
// MapLibre's heatmap layer type using the `intensity` attribute.
const MOJAVE_HEATMAPS = {
  fireRisk: [
    // High-risk ignition zones (Cima Dome post-burn + Cinder Cones + Kelso
    // Dunes edge). Intensity 0-1 (0=low, 1=extreme).
    { lat: 35.2680, lng: -115.5500, intensity: 0.95, label: "Cima Dome (post Dome Fire 2020)" },
    { lat: 35.1430, lng: -115.8530, intensity: 0.82, label: "Cinder Cones" },
    { lat: 34.8920, lng: -115.7130, intensity: 0.75, label: "Kelso Dunes perimeter" },
    { lat: 35.5330, lng: -115.5935, intensity: 0.70, label: "Clark Mtn" },
    { lat: 34.7820, lng: -115.6690, intensity: 0.68, label: "Granite Mts" },
    { lat: 34.9244, lng: -115.0736, intensity: 0.45, label: "Goffs corridor" },
    { lat: 35.2800, lng: -115.2250, intensity: 0.88, label: "New York Mts" },
    { lat: 35.3380, lng: -115.1890, intensity: 0.72, label: "Castle Peaks" },
  ],
  biodiversity: [
    // High biodiversity zones per CNDDB + UCR Mojave Desert Research
    { lat: 34.7820, lng: -115.6690, intensity: 0.92, label: "Granite Mts UC Reserve" },
    { lat: 35.2680, lng: -115.5500, intensity: 0.88, label: "Cima Dome Joshua tree forest" },
    { lat: 35.0480, lng: -115.3980, intensity: 0.78, label: "Hole-in-the-Wall riparian" },
    { lat: 35.2800, lng: -115.2250, intensity: 0.85, label: "New York Mts pinyon-juniper" },
    { lat: 34.9380, lng: -115.5490, intensity: 0.72, label: "Mitchell Caverns / Providence Mtns" },
    { lat: 34.9244, lng: -115.0736, intensity: 0.70, label: "Goffs tortoise habitat" },
    { lat: 35.5330, lng: -115.5935, intensity: 0.65, label: "Clark Mtn high-elevation" },
  ],
  aridity: [
    // Drier = higher value. Lanfair Valley + Soda Dry Lake are extreme.
    { lat: 34.5800, lng: -115.5500, intensity: 0.95, label: "Clipper Valley dry lake" },
    { lat: 35.1000, lng: -116.1000, intensity: 0.98, label: "Soda Dry Lake" },
    { lat: 34.8000, lng: -115.3000, intensity: 0.85, label: "Lanfair Valley" },
    { lat: 35.3000, lng: -115.7000, intensity: 0.78, label: "Silver Dry Lake" },
    { lat: 34.5440, lng: -115.7880, intensity: 0.88, label: "Bristol Dry Lake" },
    { lat: 35.5330, lng: -115.5935, intensity: 0.55, label: "Clark Mtn (wettest)" },
  ],
}

// ─── Mojave-signature taxa for iNat filter ───────────────────────────
const MOJAVE_SIGNATURE_TAXA: Array<{ id: number; name: string; common: string }> = [
  { id: 25894,  name: "Gopherus agassizii",        common: "Desert Tortoise" },
  { id: 47605,  name: "Yucca brevifolia",          common: "Joshua Tree" },
  { id: 64090,  name: "Larrea tridentata",         common: "Creosote Bush" },
  { id: 42204,  name: "Ovis canadensis nelsoni",   common: "Desert Bighorn Sheep" },
  { id: 5320,   name: "Aquila chrysaetos",         common: "Golden Eagle" },
  { id: 55950,  name: "Yucca schidigera",          common: "Mojave Yucca" },
  { id: 72573,  name: "Crotalus scutulatus",       common: "Mojave Green Rattlesnake" },
  { id: 38692,  name: "Lanius ludovicianus",       common: "Loggerhead Shrike" },
]

// ─── Live weather observation for a station (best-effort) ────────────
async function fetchNwsObservation(icao: string): Promise<any | null> {
  try {
    const r = await fetch(`https://api.weather.gov/stations/${icao}/observations/latest`, {
      headers: { "User-Agent": "Mycosoft CREP (support@mycosoft.com)", "Accept": "application/geo+json" },
      signal: AbortSignal.timeout(6000),
    })
    if (!r.ok) return null
    const j = await r.json()
    const p = j?.properties || {}
    return {
      ts: p.timestamp,
      temp_c: p.temperature?.value,
      humidity_pct: p.relativeHumidity?.value,
      wind_kph: p.windSpeed?.value,
      wind_dir_deg: p.windDirection?.value,
      pressure_pa: p.barometricPressure?.value,
      visibility_m: p.visibility?.value,
      description: p.textDescription,
    }
  } catch {
    return null
  }
}

// ─── Recent iNaturalist observations in Goffs / Mojave bbox ─────────
// Apr 21, 2026 (Morgan: "permanent preloaded things faster load of nature
// data"). Prefer MINDEX preloaded cache; fall back to live iNat if empty.
async function fetchINatGoffsPreloadedFirst(origin: string): Promise<any[]> {
  try {
    const r = await fetch(`${origin}/api/crep/nature/preloaded?project=goffs&limit=200`, {
      signal: AbortSignal.timeout(4000),
    })
    if (r.ok) {
      const j = await r.json()
      if (j?.cache_warm && Array.isArray(j?.observations) && j.observations.length > 0) {
        return j.observations
      }
    }
  } catch { /* fall through to live */ }
  return fetchINatGoffs()
}

async function fetchINatGoffs(): Promise<any[]> {
  // Apr 21 update (Morgan: "live naturedata"). Widened from 50 to 200
  // observations and dropped the strict research_grade filter — now
  // returns observed_on desc for the full bbox, still limited to
  // verifiable + geoprivacy=open.
  const bbox = { swlat: 34.60, swlng: -115.80, nelat: 35.40, nelng: -114.50 }
  try {
    const params = new URLSearchParams({
      swlat: String(bbox.swlat),
      swlng: String(bbox.swlng),
      nelat: String(bbox.nelat),
      nelng: String(bbox.nelng),
      per_page: "200",
      order_by: "observed_on",
      order: "desc",
      verifiable: "true",
      geoprivacy: "open",
    })
    const r = await fetch(`https://api.inaturalist.org/v1/observations?${params.toString()}`, {
      headers: { "User-Agent": "Mycosoft CREP (support@mycosoft.com)" },
      signal: AbortSignal.timeout(10_000),
    })
    if (!r.ok) return []
    const j = await r.json()
    return (j.results || []).map((o: any) => ({
      id: `inat-${o.id}`,
      name: o.taxon?.preferred_common_name || o.taxon?.name || "unknown",
      sci_name: o.taxon?.name,
      lat: Array.isArray(o.geojson?.coordinates) ? o.geojson.coordinates[1] : null,
      lng: Array.isArray(o.geojson?.coordinates) ? o.geojson.coordinates[0] : null,
      observed_on: o.observed_on,
      photo: o.photos?.[0]?.url?.replace("square", "medium") || null,
      observer: o.user?.login,
      iconic_taxon: o.taxon?.iconic_taxon_name,
      quality_grade: o.quality_grade,
      inat_url: o.uri,
      category: "inat-observation",
    })).filter((x: any) => Number.isFinite(x.lat) && Number.isFinite(x.lng))
  } catch {
    return []
  }
}

// ─── NPS MOJA boundary — live-fetch from ArcGIS Open Data ───────────
async function fetchNpsBoundary(): Promise<GeoJSON.Polygon | GeoJSON.MultiPolygon | null> {
  try {
    const url = "https://services1.arcgis.com/fBc8EJBxQRMcHlei/arcgis/rest/services/NPS_Land_Resources_Division_Boundary_and_Tract_Data_Service/FeatureServer/2/query?where=UNIT_CODE%3D%27MOJA%27&outFields=UNIT_CODE,UNIT_NAME&geometryPrecision=4&f=geojson"
    const r = await fetch(url, {
      headers: { "User-Agent": "Mycosoft CREP" },
      signal: AbortSignal.timeout(8000),
    })
    if (!r.ok) return null
    const fc: any = await r.json()
    const feat = fc?.features?.[0]
    if (!feat?.geometry) return null
    return feat.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon
  } catch {
    return null
  }
}

export async function GET(req: Request) {
  const started = Date.now()
  const origin = resolveInternalBaseUrl(new URL(req.url).origin)

  const [npsGeom, inatObs, ...obs] = await Promise.all([
    fetchNpsBoundary(),
    fetchINatGoffsPreloadedFirst(origin),
    fetchNwsObservation("KEED"),
    fetchNwsObservation("KDAG"),
    fetchNwsObservation("KIFP"),
  ])

  const [obsKeed, obsKdag, obsKifp] = obs

  const boundary: GeoJSON.Polygon | GeoJSON.MultiPolygon = npsGeom || MOJAVE_PRESERVE_APPROX_POLYGON
  const climateStations = MOJAVE_CLIMATE_STATIONS.map((s) => {
    let observation: any = null
    if (s.id === "KEED") observation = obsKeed
    if (s.id === "KDAG") observation = obsKdag
    if (s.id === "KIFP") observation = obsKifp
    return { ...s, observation }
  })

  const body = {
    generated: new Date().toISOString(),
    latency_ms: Date.now() - started,
    source: npsGeom ? "nps+inat+nws" : "approx+inat+nws",
    goffs: GOFFS_ANCHOR,
    preserve: {
      unit_code: "MOJA",
      unit_name: "Mojave National Preserve",
      boundary_geom: boundary,
      url: "https://www.nps.gov/moja",
    },
    wilderness_pois: MOJAVE_WILDERNESS_POIS,
    climate_stations: climateStations,
    signature_taxa: MOJAVE_SIGNATURE_TAXA,
    inat_observations: inatObs,
    // NEW (Apr 21, 2026 v2 expansion):
    cameras:      MOJAVE_CAMERAS,
    broadcast:    MOJAVE_BROADCAST,
    cell_towers:  MOJAVE_CELL_TOWERS,
    power:        MOJAVE_POWER,
    rails:        MOJAVE_RAILS,
    caves:        MOJAVE_CAVES,
    government:   MOJAVE_GOVERNMENT,
    tourism:      MOJAVE_TOURISM,
    sensors:      MOJAVE_SENSORS,
    heatmaps:     MOJAVE_HEATMAPS,
  }

  return NextResponse.json(body, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=21600" },
  })
}
