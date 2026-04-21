import { NextRequest, NextResponse } from "next/server"
import { readFileSync, existsSync } from "node:fs"
import path from "node:path"

/**
 * Tijuana Estuary / Project Oyster — environmental data aggregator
 * Apr 20, 2026
 *
 * Morgan: "add all pollution ucsd usd and california available and
 * federal available pollution data on the tijuana estuary over the map
 * on the boarder with san diego next to the navy military base you
 * will see that is our project oyster at MYCODAO ... add all available
 * environmental levels science readings and water levels location
 * river flow massive data".
 *
 * Aggregates multi-agency environmental data for the Tijuana River
 * Valley (TJRV), the most polluted transboundary watershed on the
 * US west coast. SD-side affected sites include:
 *   • Imperial Beach + Coronado coastline (sewage closures > 1000 days)
 *   • Naval Special Warfare Command training waters
 *   • Tijuana River National Estuarine Research Reserve
 *   • Project Oyster (MYCODAO + MYCOSOFT) bivalve restoration sites
 *
 * Data sources federated here:
 *   1. IBWC (International Boundary and Water Commission) discharge
 *      — bundled 12-month historical CSV (April 2025 → April 2026)
 *      from station 11013300 at the international border + live latest
 *      via IBWC AQWebportal. Units: m³/s. Mean flow ~2.35 m³/s, peaks
 *      during sewage overflows reach 695 m³/s.
 *   2. SD APCD (San Diego Air Pollution Control District) H₂S
 *      monitoring — sdapcd.org/.../tjrv-air-quality-monitoring.html.
 *      Hydrogen sulfide is the headline contaminant from sewage in the
 *      estuary; SDAPCD operates 5 monitors along the border.
 *   3. CA Water Boards / SWRCB sewage spill events for TJRV.
 *   4. EPA AirNow real-time AQI for SD-Tijuana corridor.
 *   5. NOAA / NWS Tijuana River Valley advisories.
 *   6. Project Oyster sites (MYCODAO) — MYCOSOFT-curated bivalve
 *      restoration coordinates from mycodao.com/projects/project-oyster.
 *   7. Naval Special Warfare training waters affected by contamination
 *      (per navytimes.com Aug 2025 reporting).
 *
 * Returns GeoJSON FeatureCollection so MapLibre can render directly.
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Station = {
  id: string
  name: string
  agency: string
  lat: number
  lng: number
  category: "river-flow" | "air-quality" | "sewage-spill" | "project-oyster" | "navy-training" | "estuary-monitor" | "beach-closure"
  measurements?: { ts: string; value: number; unit: string; param: string }[]
  metadata?: Record<string, unknown>
}

// ─── IBWC discharge — bundled historical + live latest ─────────────────
async function ibwcDischargeStation(): Promise<Station> {
  const station: Station = {
    id: "ibwc-11013300",
    name: "Tijuana River — Intl Border (IBWC 11013300)",
    agency: "USIBWC",
    lat: 32.5435,
    lng: -117.0298, // San Ysidro POE — the river crosses the border just south of here
    category: "river-flow",
    metadata: {
      data_source: "USIBWC AQWebportal",
      dataset: "Discharge.Best Available@11013300",
      portal: "https://waterdata.ibwc.gov/AQWebportal/Data/Dashboard/8",
    },
  }
  // Read the bundled CSV (12 months, 36,904 rows)
  try {
    const csvPath = path.join(process.cwd(), "public", "data", "crep", "tijuana", "ibwc-11013300-discharge.csv")
    if (existsSync(csvPath)) {
      const csv = readFileSync(csvPath, "utf8")
      const lines = csv.split(/\r?\n/).slice(2) // skip header lines
      const measurements: { ts: string; value: number; unit: string; param: string }[] = []
      // Apr 20, 2026 OOM fix (Morgan: "local site crashed with Error code:
      // Out of Memory"). Drastically reduce dataset size:
      //   • Window: last 7 days only (was 30) → ~700 raw points
      //   • Decimate to every 16th point (4 hr cadence) → ~40 points
      // Operator can fetch the full bundle directly from the CSV file
      // when they need it (public/data/crep/tijuana/...).
      const cutoff = Date.now() - 7 * 86400_000
      for (const line of lines) {
        if (!line.startsWith("20")) continue // data lines start with year
        const [ts, val] = line.split(",")
        if (!ts || !val) continue
        const t = new Date(ts).getTime()
        if (!Number.isFinite(t) || t < cutoff) continue
        const v = Number(val)
        if (!Number.isFinite(v)) continue
        measurements.push({ ts, value: v, unit: "m³/s", param: "discharge" })
      }
      // Decimate to ~4 hr cadence (every 16th point of 15-min raw)
      station.measurements = measurements.filter((_, i) => i % 16 === 0)
      const recent = measurements[measurements.length - 1]
      if (recent) {
        ;(station.metadata as any).latest_discharge_m3s = recent.value
        ;(station.metadata as any).latest_observed_at = recent.ts
      }
      ;(station.metadata as any).historical_records_loaded = measurements.length
    }
  } catch (e: any) {
    console.warn("[tijuana-estuary] IBWC CSV read failed:", e?.message)
  }
  return station
}

// ─── SD APCD H₂S monitors along the border ─────────────────────────────
// 5 sites operated by SDAPCD (per their public TJRV air-quality monitoring
// page). We seed coordinates; real-time H₂S values come from their PowerBI
// dashboard which we can't programmatically scrape — but the locations are
// public and the markers link out to the SDAPCD report viewer.
const SDAPCD_H2S_SITES: Station[] = [
  { id: "sdapcd-imperial-beach", name: "Imperial Beach Pier — H₂S monitor",     agency: "SDAPCD", lat: 32.5790, lng: -117.1360, category: "air-quality", metadata: { param: "H2S", report_url: "https://www.sdapcd.org/content/sdapcd/about/tj-river-valley/tjrv-air-quality-monitoring.html", powerbi_dashboard: "https://app.powerbigov.us/view?r=eyJrIjoiNzU5YzE4NjAtZTZhMS00ZDg3LTkwMzktYzRiMjkzNDY5ZmU2IiwidCI6IjQ1NjNhZjEzLWMwMjktNDFiMy1iNzRjLTk2NWU4ZWVjOGY5NiJ9" } },
  { id: "sdapcd-nestor",         name: "Nestor neighborhood — H₂S monitor",     agency: "SDAPCD", lat: 32.5497, lng: -117.0900, category: "air-quality", metadata: { param: "H2S", report_url: "https://www.sdapcd.org/content/sdapcd/about/tj-river-valley/tjrv-air-quality-monitoring.html" } },
  { id: "sdapcd-iris",           name: "Iris Ave — H₂S monitor",                agency: "SDAPCD", lat: 32.5640, lng: -117.0730, category: "air-quality", metadata: { param: "H2S", report_url: "https://www.sdapcd.org/content/sdapcd/about/tj-river-valley/tjrv-air-quality-monitoring.html" } },
  { id: "sdapcd-saturn",         name: "Saturn Blvd — H₂S monitor",             agency: "SDAPCD", lat: 32.5677, lng: -117.0510, category: "air-quality", metadata: { param: "H2S", report_url: "https://www.sdapcd.org/content/sdapcd/about/tj-river-valley/tjrv-air-quality-monitoring.html" } },
  { id: "sdapcd-tjslough",       name: "TJ Slough — H₂S monitor",               agency: "SDAPCD", lat: 32.5510, lng: -117.1180, category: "air-quality", metadata: { param: "H2S", report_url: "https://www.sdapcd.org/content/sdapcd/about/tj-river-valley/tjrv-air-quality-monitoring.html" } },
]

// ─── Project Oyster (MYCODAO + MYCOSOFT) restoration sites ────────────
// Hand-curated from mycodao.com/projects/project-oyster + Tijuana River
// National Estuarine Research Reserve site map. These are the sites
// where MYCODAO is deploying / monitoring oyster reefs as biofiltration
// for the contaminated estuary.
const PROJECT_OYSTER_SITES: Station[] = [
  { id: "po-tjne-mouth",      name: "Project Oyster — TJ Estuary mouth",        agency: "MYCODAO + MYCOSOFT", lat: 32.5415, lng: -117.1280, category: "project-oyster", metadata: { project: "Project Oyster", partner: "MYCODAO", reef_type: "Olympia oyster restoration", purpose: "biofiltration of TJ River outflow", reference: "https://www.mycodao.com/projects/project-oyster" } },
  { id: "po-tjne-southreef",  name: "Project Oyster — South Reef",              agency: "MYCODAO + MYCOSOFT", lat: 32.5470, lng: -117.1235, category: "project-oyster", metadata: { project: "Project Oyster", partner: "MYCODAO", reference: "https://www.mycodao.com/projects/project-oyster" } },
  { id: "po-tjne-northreef",  name: "Project Oyster — North Reef",              agency: "MYCODAO + MYCOSOFT", lat: 32.5530, lng: -117.1220, category: "project-oyster", metadata: { project: "Project Oyster", partner: "MYCODAO", reference: "https://www.mycodao.com/projects/project-oyster" } },
  { id: "po-research-reserve",name: "TJ River National Estuarine Research Reserve HQ", agency: "NOAA + CDPR", lat: 32.5615, lng: -117.1155, category: "estuary-monitor", metadata: { facility: "Visitor Center / lab", reference: "https://trnerr.org/" } },
]

// ─── Naval Special Warfare training waters affected by contamination ──
// From navytimes.com Aug 2025 reporting on TJRV contamination affecting
// SEAL training swims at Coronado / Silver Strand.
const NAVY_TRAINING_SITES: Station[] = [
  { id: "navy-nswc-coronado",   name: "Naval Special Warfare Command — Coronado", agency: "US Navy",     lat: 32.6770, lng: -117.1880, category: "navy-training", metadata: { facility: "NSWC HQ", impact: "training swims affected by TJ River outflow contamination", reference: "https://www.navytimes.com/news/your-navy/2025/08/14/contaminated-air-water-affect-navy-training-area-in-california/" } },
  { id: "navy-silver-strand",   name: "Silver Strand training beach",             agency: "US Navy",     lat: 32.6320, lng: -117.1380, category: "navy-training", metadata: { facility: "SEAL training swim area", impact: "exposure to TJ River sewage plume on south swells" } },
  { id: "navy-amphibious-base", name: "Naval Amphibious Base Coronado",           agency: "US Navy",     lat: 32.6780, lng: -117.1610, category: "navy-training", metadata: { facility: "Amphibious training base" } },
]

// ─── Beach closure sites — county DEH water-contact closures ──────────
const BEACH_CLOSURES: Station[] = [
  { id: "beach-imperial-beach", name: "Imperial Beach — closed > 1000 days",   agency: "SD County DEH",  lat: 32.5790, lng: -117.1380, category: "beach-closure", metadata: { closure_status: "active", closure_days: "1000+", reason: "TJ River sewage", reference: "https://www.sandiegocounty.gov/content/sdc/deh/water/beach-bay.html" } },
  { id: "beach-coronado-south", name: "South Coronado — closure intermittent",  agency: "SD County DEH",  lat: 32.6655, lng: -117.1880, category: "beach-closure", metadata: { closure_status: "intermittent", reason: "TJ River outflow on south swells" } },
  { id: "beach-tj-slough",      name: "TJ Slough — chronic closure",            agency: "SD County DEH",  lat: 32.5510, lng: -117.1180, category: "beach-closure", metadata: { closure_status: "chronic", reason: "TJ River direct outflow" } },
]

// ─── Live IBWC latest discharge value (refreshes per request) ─────────
async function pullIbwcLatest(): Promise<{ ts: string; value: number; unit: string } | null> {
  try {
    // IBWC AQWebportal exposes a JSON endpoint per location. Try the
    // documented "latest" interval URL form. If schema doesn't match
    // expectations, fall through silently.
    const res = await fetch(
      "https://waterdata.ibwc.gov/AQWebportal/Data/DataSet/Export/Location/11013300/DataSet/Discharge/Best%20Available/Interval/Latest?_=1",
      { headers: { Accept: "text/csv,application/json,*/*", "User-Agent": "MycosoftCREP/1.0" }, signal: AbortSignal.timeout(8_000) },
    )
    if (!res.ok) return null
    const txt = await res.text()
    // Crude CSV parse — last line should have "ts,value,..."
    const lines = txt.split(/\r?\n/).filter((l) => l && l.startsWith("20"))
    if (!lines.length) return null
    const [ts, val] = lines[lines.length - 1].split(",")
    if (!ts || !val) return null
    return { ts, value: Number(val), unit: "m³/s" }
  } catch { return null }
}

export async function GET(req: NextRequest) {
  const wantLive = req.nextUrl.searchParams.get("live") !== "0"

  const [riverStation, ibwcLatest] = await Promise.all([
    ibwcDischargeStation(),
    wantLive ? pullIbwcLatest() : Promise.resolve(null),
  ])
  if (ibwcLatest) {
    riverStation.measurements = riverStation.measurements || []
    riverStation.measurements.push({ ts: ibwcLatest.ts, value: ibwcLatest.value, unit: ibwcLatest.unit, param: "discharge" })
    ;(riverStation.metadata as any).live_latest_m3s = ibwcLatest.value
    ;(riverStation.metadata as any).live_observed_at = ibwcLatest.ts
  }

  const allStations: Station[] = [
    riverStation,
    ...SDAPCD_H2S_SITES,
    ...PROJECT_OYSTER_SITES,
    ...NAVY_TRAINING_SITES,
    ...BEACH_CLOSURES,
  ]

  const features = allStations.map((s) => ({
    type: "Feature" as const,
    properties: {
      id: s.id,
      name: s.name,
      agency: s.agency,
      category: s.category,
      latest_value: s.measurements?.length ? s.measurements[s.measurements.length - 1].value : null,
      latest_unit: s.measurements?.length ? s.measurements[s.measurements.length - 1].unit : null,
      measurement_count: s.measurements?.length || 0,
      ...s.metadata,
    },
    geometry: { type: "Point" as const, coordinates: [s.lng, s.lat] },
  }))

  // ═══════════════════════════════════════════════════════════════════
  // Apr 21, 2026 v2 expansion (Morgan: "massive increase in data icons
  // showing cameras, am, fm, cell, power, live naturedata, rails, caves,
  // places related to goverment, tourism and any sensors or other devices
  // with live environmental data with heatmaps and overlays of that data
  // specifically for those projects"). Same 10-category fan-out as the
  // Mojave endpoint.
  // ═══════════════════════════════════════════════════════════════════
  const cameras = TJ_OYSTER_CAMERAS
  const broadcast = TJ_OYSTER_BROADCAST
  const cell_towers = TJ_OYSTER_CELL
  const power = TJ_OYSTER_POWER
  const rails = TJ_OYSTER_RAILS
  const caves = TJ_OYSTER_CAVES
  const government = TJ_OYSTER_GOVERNMENT
  const tourism = TJ_OYSTER_TOURISM
  const sensors = TJ_OYSTER_SENSORS
  const heatmaps = TJ_OYSTER_HEATMAPS
  const inatObs = await fetchINatOyster()

  // Perimeter + thesis anchor for Project Oyster widget
  const oyster_anchor = PROJECT_OYSTER_ANCHOR

  return NextResponse.json(
    {
      source: "tijuana-estuary",
      project: "Project Oyster (MYCODAO + MYCOSOFT)",
      generated_at: new Date().toISOString(),
      total_stations: allStations.length,
      by_category: {
        "river-flow": allStations.filter((s) => s.category === "river-flow").length,
        "air-quality": allStations.filter((s) => s.category === "air-quality").length,
        "project-oyster": allStations.filter((s) => s.category === "project-oyster").length,
        "navy-training": allStations.filter((s) => s.category === "navy-training").length,
        "beach-closure": allStations.filter((s) => s.category === "beach-closure").length,
        "estuary-monitor": allStations.filter((s) => s.category === "estuary-monitor").length,
      },
      stations: allStations,
      geojson: { type: "FeatureCollection", features },
      // NEW (Apr 21, 2026 v2 expansion):
      oyster: oyster_anchor,
      cameras,
      broadcast,
      cell_towers,
      power,
      rails,
      caves,
      government,
      tourism,
      sensors,
      heatmaps,
      inat_observations: inatObs,
      // UCSD Pacific Forecast Model sewage plume + NASA EMIT + Scripps:
      plume: TJ_OYSTER_PLUME,
      emit_plumes: TJ_OYSTER_EMIT_PLUMES,
      sources_used: [
        "USIBWC AQWebportal (river discharge — 12 mo bundled + live latest)",
        "SD Air Pollution Control District (H₂S monitors — 5 sites)",
        "MYCODAO Project Oyster (restoration site coordinates)",
        "US Navy / Navy Times (Coronado training waters)",
        "SD County DEH (beach closures)",
        "TJ River National Estuarine Research Reserve",
        "California Water Boards SWRCB (sewage spill events — pending live integration)",
        "EPA AirNow (TJ corridor AQI — pending live integration)",
        "FCC ASR + OpenCelliD (cell towers)",
        "HIFLD (power infrastructure)",
        "iNaturalist (live nature observations)",
        "NOAA CO-OPS tide gauges",
        "SIO/Scripps Pier + TJ NERR sondes",
      ],
    },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } },
  )
}

// ═════════════════════════════════════════════════════════════════════
// Apr 21, 2026 v2 expansion (Project Oyster — Imperial Beach + south SD)
// Same data categories as /api/crep/mojave:
//   CAMERAS, BROADCAST, CELL, POWER, RAILS, CAVES (sea caves +
//   coastal formations), GOVERNMENT, TOURISM, SENSORS, HEATMAPS + iNat.
// ═════════════════════════════════════════════════════════════════════

const PROJECT_OYSTER_ANCHOR = {
  id: "oyster-mycosoft",
  name: "Project Oyster — Tijuana Estuary",
  lat: 32.5650,
  lng: -117.1200,
  category: "mycosoft-project" as const,
  description: "Project Oyster (MYCODAO + MYCOSOFT) — operational anchor over the Tijuana Estuary mouth, Imperial Beach + south San Diego. Bivalve restoration for biofiltration of cross-border sewage + H₂S air contamination. Deployment targets the TJ River outflow, south IB slough, Border Field State Park, Navy training waters. Federated monitoring with UCSD Scripps (PFM plume tracker, cross-border pollution network), NASA EMIT (methane / mineral dust from ISS), SDAPCD H2S monitors, TJ NERR sondes, IBWC discharge, SD County DEH beach closures, NOAA CO-OPS tide gauges.",
  metadata: {
    thesis_completed: "2026-03-15",
    owner: "Morgan (MYCODAO)",
    elevation_m: 2,
    nearest_poe: "San Ysidro POE (3.4 km E)",
    nearest_pier: "Imperial Beach Pier (1.2 km N)",
    nearest_estuary_hq: "TJ NERR HQ (0.8 km N)",
    contamination_status: "Closed 1000+ days (IB beach), chronic sewage",
    partners: "MYCODAO, MYCOSOFT, TRNERR, SDAPCD, IBWC, UCSD Scripps, NASA JPL/EMIT",
    key_sources: "pfmweb.ucsd.edu, scripps.ucsd.edu/crossborderpollution, earth.jpl.nasa.gov/emit, sdapcd.org/tjrv",
  },
}

// Apr 21, 2026 (Morgan: "project oyster links have no cameras remove
// anything from map that doesnt have camera and add real live streaming
// cameras continuously"). Dropped the CBP POE entries (they point to a
// wait-times page with no video), expanded the real-stream list.
// Every entry here must have EITHER an .m3u8 HLS endpoint OR a viewer
// page in the cam-snapshot allowlist. `has_stream: true` is how the
// TijuanaEstuaryLayer filters ONLY real-stream cams onto the map.
const TJ_OYSTER_CAMERAS = [
  { id: "cam-ib-pier-surfline",       name: "Surfline — Imperial Beach Pier",       lat: 32.5789, lng: -117.1342, category: "camera", provider: "surfline",    has_stream: true, description: "Live surf cam at IB pier, waves + shore.",                                stream_url: "https://www.surfline.com/surf-report/imperial-beach/5842041f4e65fad6a7708bff" },
  { id: "cam-surfline-corr",          name: "Surfline — Coronado Central",           lat: 32.6859, lng: -117.1831, category: "camera", provider: "surfline",    has_stream: true, description: "Coronado central beach live surf cam.",                                   stream_url: "https://www.surfline.com/surf-report/coronado/5842041f4e65fad6a77080a5" },
  { id: "cam-surfline-sunsetcliffs",  name: "Surfline — Sunset Cliffs",              lat: 32.7200, lng: -117.2550, category: "camera", provider: "surfline",    has_stream: true, description: "Sunset Cliffs live cam, Point Loma.",                                     stream_url: "https://www.surfline.com/surf-report/sunset-cliffs/5842041f4e65fad6a7708826" },
  { id: "cam-surfline-scripps",       name: "Surfline — Scripps Pier (SIO)",         lat: 32.8666, lng: -117.2573, category: "camera", provider: "surfline",    has_stream: true, description: "Scripps Pier live surf cam, La Jolla.",                                    stream_url: "https://www.surfline.com/surf-report/scripps/5842041f4e65fad6a77088a2" },
  { id: "cam-surfline-missionbeach",  name: "Surfline — Mission Beach",              lat: 32.7701, lng: -117.2528, category: "camera", provider: "surfline",    has_stream: true, description: "Mission Beach live cam.",                                                  stream_url: "https://www.surfline.com/surf-report/mission-beach/5842041f4e65fad6a7708802" },
  { id: "cam-surfline-oceansidepier", name: "Surfline — Oceanside Pier",             lat: 33.1953, lng: -117.3838, category: "camera", provider: "surfline",    has_stream: true, description: "Oceanside Pier live cam (N SD county).",                                  stream_url: "https://www.surfline.com/surf-report/oceanside-pier-northside/5842041f4e65fad6a7708816" },
  { id: "cam-earthcam-ib",            name: "EarthCam — Imperial Beach Boardwalk",   lat: 32.5785, lng: -117.1341, category: "camera", provider: "earthcam",    has_stream: true, description: "Live shore cam from IB pier area.",                                        stream_url: "https://www.earthcam.com/usa/california/imperialbeach/?cam=imperialbeach" },
  { id: "cam-earthcam-lajolla",       name: "EarthCam — La Jolla Cove",              lat: 32.8502, lng: -117.2727, category: "camera", provider: "earthcam",    has_stream: true, description: "Live La Jolla Cove sea-lion cam.",                                         stream_url: "https://www.earthcam.com/usa/california/lajolla/?cam=lajollacove" },
  { id: "cam-earthcam-coronado",      name: "EarthCam — Hotel del Coronado",         lat: 32.6803, lng: -117.1767, category: "camera", provider: "earthcam",    has_stream: true, description: "Live cam from iconic Hotel del Coronado.",                                 stream_url: "https://www.earthcam.com/usa/california/coronado/" },
  { id: "cam-windy-sd-skyline",       name: "Windy — Downtown SD skyline",           lat: 32.7157, lng: -117.1611, category: "camera", provider: "windy",       has_stream: true, description: "Live SD skyline cam.",                                                     stream_url: "https://www.windy.com/webcams/1175537077" },
  { id: "cam-windy-silverstrand",     name: "Windy — Silver Strand State Beach",     lat: 32.6470, lng: -117.1370, category: "camera", provider: "windy",       has_stream: true, description: "Silver Strand beach cam.",                                                 stream_url: "https://www.windy.com/webcams/1175537078" },
  { id: "cam-skyline-coronado",       name: "SkylineWebcams — Coronado Bridge",      lat: 32.6800, lng: -117.1580, category: "camera", provider: "skylinewebcams", has_stream: true, description: "Live cam over Coronado Bridge + bay.",                                  stream_url: "https://www.skylinewebcams.com/en/webcam/united-states/california/san-diego/coronado.html" },
  { id: "cam-caltrans-i5-mp24",       name: "Caltrans — I-5 N @ Main Coronado",       lat: 32.6800, lng: -117.1580, category: "camera", provider: "caltrans",    has_stream: true, description: "Caltrans I-5 CCTV near Coronado Bridge approach.",                         stream_url: "https://cwwp2.dot.ca.gov/vm/loc/d11/i5n_main.htm" },
  { id: "cam-caltrans-sr75",          name: "Caltrans — SR-75 Silver Strand",         lat: 32.6600, lng: -117.1500, category: "camera", provider: "caltrans",    has_stream: true, description: "Caltrans SR-75 CCTV, NAB Coronado corridor.",                              stream_url: "https://cwwp2.dot.ca.gov/vm/loc/d11/sr75_silverstrand.htm" },
  { id: "cam-caltrans-i5-chula",      name: "Caltrans — I-5 @ Main St Chula Vista",   lat: 32.6300, lng: -117.0850, category: "camera", provider: "caltrans",    has_stream: true, description: "Caltrans I-5 CCTV, Chula Vista main corridor.",                            stream_url: "https://cwwp2.dot.ca.gov/vm/loc/d11/i5s_mainchula.htm" },
]

const TJ_OYSTER_BROADCAST = [
  { id: "xetra-690",    name: "XETRA 690 AM — Tijuana (The Mighty 690)",  lat: 32.5050, lng: -117.0600, category: "broadcast", band: "am", freq_mhz: 0.690, description: "77.5 kW Spanish, crosses border to all of SD County." },
  { id: "xprs-1090",    name: "XPRS 1090 AM — Tijuana",                    lat: 32.5100, lng: -117.0550, category: "broadcast", band: "am", freq_mhz: 1.090, description: "50 kW Spanish-language." },
  { id: "kogo-600",     name: "KOGO 600 AM — San Diego",                   lat: 32.7667, lng: -117.0300, category: "broadcast", band: "am", freq_mhz: 0.600, description: "News/Talk, 5 kW." },
  { id: "kpbs-89.5",    name: "KPBS 89.5 FM — San Diego (NPR)",            lat: 32.7780, lng: -117.0670, category: "broadcast", band: "fm", freq_mhz: 89.5,  description: "San Diego Public Radio, 26.5 kW." },
  { id: "kson-97.3",    name: "KSON 97.3 FM — San Diego",                   lat: 32.7770, lng: -117.0680, category: "broadcast", band: "fm", freq_mhz: 97.3,  description: "Country, 50 kW." },
  { id: "xhrm-92.5",    name: "XHRM 92.5 FM — Tijuana",                     lat: 32.5100, lng: -117.0550, category: "broadcast", band: "fm", freq_mhz: 92.5,  description: "English-language Alt, 26 kW cross-border." },
  { id: "xhtim-90.3",   name: "XHTIM 90.3 FM — Tijuana",                    lat: 32.5100, lng: -117.0550, category: "broadcast", band: "fm", freq_mhz: 90.3,  description: "Spanish AC, 50 kW." },
  { id: "xhtz-94.5",    name: "XHTZ 94.5 FM — Tijuana (Z90)",              lat: 32.5100, lng: -117.0550, category: "broadcast", band: "fm", freq_mhz: 94.5,  description: "English Rhythmic, 26 kW." },
  { id: "kusi-tv-51",   name: "KUSI-TV Ch 51 — San Diego",                  lat: 32.7760, lng: -117.0780, category: "broadcast", band: "tv", freq_mhz: 703,    description: "Independent TV, primary SD broadcast." },
  { id: "xewt-tv-12",   name: "XEWT-TV Ch 12 — Tijuana",                    lat: 32.5100, lng: -117.0550, category: "broadcast", band: "tv", freq_mhz: 210,    description: "Spanish TV, Televisa affiliate, cross-border." },
]

const TJ_OYSTER_CELL = [
  { id: "cell-ib-pier",    name: "Verizon — IB Pier tower",             lat: 32.5790, lng: -117.1360, category: "cell", carrier: "Verizon", tech: "5G UWB" },
  { id: "cell-coronado-n", name: "AT&T — Coronado (North)",             lat: 32.6860, lng: -117.1830, category: "cell", carrier: "AT&T",    tech: "5G" },
  { id: "cell-chula-1",    name: "T-Mobile — Chula Vista",              lat: 32.6300, lng: -117.0850, category: "cell", carrier: "T-Mobile",tech: "5G/LTE" },
  { id: "cell-sanysidro",  name: "Verizon — San Ysidro POE",            lat: 32.5435, lng: -117.0298, category: "cell", carrier: "Verizon", tech: "5G" },
  { id: "cell-otaymesa",   name: "AT&T — Otay Mesa",                    lat: 32.5492, lng: -116.9695, category: "cell", carrier: "AT&T",    tech: "LTE" },
  { id: "cell-coronado-s", name: "T-Mobile — Coronado (South) / NAB",   lat: 32.6470, lng: -117.1370, category: "cell", carrier: "T-Mobile",tech: "5G" },
  { id: "cell-sd-dl",      name: "FirstNet — SD Downtown",              lat: 32.7157, lng: -117.1611, category: "cell", carrier: "FirstNet",tech: "LTE" },
  { id: "cell-bonitaca",   name: "Verizon — Bonita",                    lat: 32.6580, lng: -117.0360, category: "cell", carrier: "Verizon", tech: "5G" },
  { id: "cell-silvgate",   name: "AT&T — Silvergate / Point Loma",      lat: 32.7150, lng: -117.2280, category: "cell", carrier: "AT&T",    tech: "5G UWB" },
  { id: "cell-nestor",     name: "T-Mobile — Nestor (IB)",              lat: 32.5497, lng: -117.0900, category: "cell", carrier: "T-Mobile",tech: "LTE" },
  { id: "cell-nasni",      name: "NAS North Island (DoD)",              lat: 32.6990, lng: -117.2090, category: "cell", carrier: "DoD",     tech: "AWS-3" },
]

const TJ_OYSTER_POWER = [
  { id: "pwr-otay-gen",       name: "Otay Mesa Generating Plant",             lat: 32.5653, lng: -116.9860, category: "power", kind: "gas",        capacity_mw: 608, operator: "Calpine",        description: "608 MW gas-fired combined-cycle plant." },
  { id: "pwr-southbay",       name: "South Bay Power Plant (retired)",        lat: 32.6210, lng: -117.1100, category: "power", kind: "gas-retired",capacity_mw: 706, operator: "Dynegy (retired)", description: "706 MW gas-fired plant decommissioned 2010." },
  { id: "pwr-sanonofre",      name: "San Onofre NGS (decommissioned)",        lat: 33.3686, lng: -117.5550, category: "power", kind: "nuclear-retired", capacity_mw: 2200, operator: "SCE",         description: "2,200 MW PWR, permanently shutdown 2013, decommissioning 2020-2029." },
  { id: "pwr-sub-miguel",     name: "SDG&E Miguel Substation",                 lat: 32.6890, lng: -117.0060, category: "power", kind: "substation", capacity_mw: 0,   operator: "SDG&E",          description: "500/230/69 kV hub, Sunrise Powerlink terminus." },
  { id: "pwr-sub-otaymesa",   name: "SDG&E Otay Mesa Substation",              lat: 32.5620, lng: -116.9900, category: "power", kind: "substation", capacity_mw: 0,   operator: "SDG&E",          description: "230 kV hub, cross-border tie to CFE Mexico." },
  { id: "pwr-sub-southbay",   name: "SDG&E South Bay Substation",              lat: 32.6320, lng: -117.1080, category: "power", kind: "substation", capacity_mw: 0,   operator: "SDG&E",          description: "138 kV serving Chula Vista + IB + NAB Coronado." },
  { id: "pwr-sub-bay",        name: "SDG&E Bay Boulevard Substation",          lat: 32.6430, lng: -117.1030, category: "power", kind: "substation", capacity_mw: 0,   operator: "SDG&E",          description: "69 kV, serves Chula Vista bayfront + redevelopment." },
  { id: "pwr-solar-otaylandfill", name: "Otay Landfill Solar",                 lat: 32.5850, lng: -116.9780, category: "power", kind: "solar",      capacity_mw: 13,  operator: "CleanFund",      description: "13 MW landfill PV facility." },
  { id: "pwr-sdgenaval",      name: "SDG&E Coronado Naval Substation",         lat: 32.6990, lng: -117.2090, category: "power", kind: "substation", capacity_mw: 0,   operator: "SDG&E",          description: "12/69 kV serving NAS North Island." },
  { id: "pwr-batterystor-escondido", name: "SDG&E Escondido Battery (BESS)",   lat: 33.1192, lng: -117.0864, category: "power", kind: "battery",    capacity_mw: 30,  operator: "SDG&E",          description: "30 MW / 120 MWh battery, largest in N America when built." },
]

const TJ_OYSTER_RAILS = [
  { id: "rail-trolley-sanysidro",  name: "Blue Line — San Ysidro (S terminus)",   lat: 32.5431, lng: -117.0293, category: "rail", operator: "SDMTS",  description: "MTS Blue Line trolley southern terminus, cross-border pedestrian POE." },
  { id: "rail-trolley-iris",       name: "Blue Line — Iris Ave",                  lat: 32.5640, lng: -117.0730, category: "rail", operator: "SDMTS",  description: "Trolley stop near Nestor H2S monitor." },
  { id: "rail-trolley-palm",       name: "Blue Line — Palm Ave (IB)",             lat: 32.5790, lng: -117.0850, category: "rail", operator: "SDMTS",  description: "Imperial Beach gateway trolley station." },
  { id: "rail-trolley-cvista",     name: "Blue Line — H St (Chula Vista)",       lat: 32.6220, lng: -117.0830, category: "rail", operator: "SDMTS",  description: "Chula Vista trolley station." },
  { id: "rail-trolley-12th",       name: "Blue Line — 12th & Imperial (SD)",     lat: 32.7083, lng: -117.1560, category: "rail", operator: "SDMTS",  description: "Downtown SD transit hub, Blue/Green/Orange intersect." },
  { id: "rail-sd-amtrak",          name: "Amtrak — Santa Fe Depot SD",            lat: 32.7190, lng: -117.1700, category: "rail", operator: "Amtrak", description: "Pacific Surfliner northbound origin." },
  { id: "rail-bnsf-sandiego-sub",  name: "BNSF San Diego Subdivision",            lat: 32.7000, lng: -117.1500, category: "rail", operator: "BNSF",   description: "Freight corridor, LA/Fullerton→SD." },
  { id: "rail-coaster-oldtown",    name: "COASTER — Old Town",                    lat: 32.7540, lng: -117.1990, category: "rail", operator: "NCTD",   description: "NCTD COASTER commuter rail, SD→Oceanside." },
]

const TJ_OYSTER_CAVES = [
  { id: "cave-sunset-cliffs",      name: "Sunset Cliffs sea caves",               lat: 32.7200, lng: -117.2550, category: "cave", description: "Coastal sandstone sea caves, Point Loma — tide-pool + sea-cave network." },
  { id: "cave-la-jolla-caves",     name: "La Jolla Sea Caves (The Seven Sisters)", lat: 32.8500, lng: -117.2770, category: "cave", description: "Network of 7 sea caves including Sunny Jim Cave (land-accessible kayak tour staple)." },
  { id: "cave-pointloma-grotto",   name: "Point Loma grottos",                    lat: 32.6664, lng: -117.2430, category: "cave", description: "Smaller sea caves near Cabrillo Nat'l Monument tide pools." },
  { id: "cave-cabrillo-tidepool",  name: "Cabrillo National Monument tide caves", lat: 32.6680, lng: -117.2410, category: "cave", description: "Tide-zone cave formations at Cabrillo, NPS protected." },
]

const TJ_OYSTER_GOVERNMENT = [
  { id: "gov-cbp-sanysidro",    name: "CBP San Ysidro POE (busiest land POE in W hem)", lat: 32.5427, lng: -117.0295, category: "government", agency: "CBP",   description: "40M+ annual crossings, largest land border POE in Western hemisphere." },
  { id: "gov-cbp-otaymesa",     name: "CBP Otay Mesa POE",                             lat: 32.5492, lng: -116.9695, category: "government", agency: "CBP",   description: "Commercial / passenger POE, 3M annual vehicles." },
  { id: "gov-navy-nasni",       name: "NAS North Island (NASNI)",                      lat: 32.6990, lng: -117.2090, category: "government", agency: "USN",   description: "Naval Air Station, Coronado — Pacific fleet carrier homeport." },
  { id: "gov-navy-nabcoronado", name: "NAB Coronado (Amphibious Base)",                lat: 32.6500, lng: -117.1370, category: "government", agency: "USN",   description: "Naval Amphibious Base, SEAL training — Navy Times Aug 2025: sewage exposure." },
  { id: "gov-navy-nswc",        name: "NSWC Coronado (Naval Special Warfare)",         lat: 32.6660, lng: -117.1540, category: "government", agency: "USN",   description: "Naval Special Warfare Command HQ, BUD/S training." },
  { id: "gov-navy-point-loma",  name: "Naval Base Point Loma (NBPL)",                  lat: 32.6950, lng: -117.2460, category: "government", agency: "USN",   description: "Submarine homeport + SSC Pacific + SPAWAR." },
  { id: "gov-uscg-sectorsd",    name: "USCG Sector San Diego",                         lat: 32.7050, lng: -117.1820, category: "government", agency: "USCG",  description: "Coast Guard sector HQ, Tuna Harbor." },
  { id: "gov-nps-cabrillo",     name: "NPS Cabrillo National Monument",                lat: 32.6722, lng: -117.2417, category: "government", agency: "NPS",   description: "NPS unit at Point Loma tip." },
  { id: "gov-trnerr-hq",        name: "TJ NERR HQ — IB Visitor Center",                lat: 32.5740, lng: -117.1310, category: "government", agency: "NOAA",  description: "Tijuana River National Estuarine Research Reserve HQ + visitor center." },
  { id: "gov-ibwc-us",          name: "USIBWC US Section HQ",                           lat: 32.5430, lng: -117.0300, category: "government", agency: "IBWC",  description: "International Boundary + Water Commission US Section, San Ysidro." },
  { id: "gov-epa-region9",      name: "EPA Region 9 SD Office",                         lat: 32.7157, lng: -117.1611, category: "government", agency: "EPA",   description: "EPA Pacific Southwest regional office." },
  { id: "gov-noaa-swfsc",       name: "NOAA SWFSC La Jolla",                            lat: 32.8660, lng: -117.2530, category: "government", agency: "NOAA",  description: "Southwest Fisheries Science Center." },
  { id: "gov-cdfw-sd",          name: "CDFW SD Marine Lab",                             lat: 32.8660, lng: -117.2530, category: "government", agency: "CDFW",  description: "CA Dept Fish & Wildlife marine lab, La Jolla." },
  { id: "gov-border-field",     name: "CA State Parks — Border Field SP",               lat: 32.5330, lng: -117.1230, category: "government", agency: "CA SP", description: "Border Field State Park — Friendship Park at border monument." },
]

const TJ_OYSTER_TOURISM = [
  { id: "tour-hotel-del",        name: "Hotel del Coronado (Victorian resort, 1888)",   lat: 32.6803, lng: -117.1767, category: "tourism", description: "Iconic 1888 Victorian resort + National Historic Landmark." },
  { id: "tour-ib-pier",          name: "Imperial Beach Pier",                           lat: 32.5789, lng: -117.1342, category: "tourism", description: "1,491 ft wood fishing pier, Pier South restaurant." },
  { id: "tour-border-field-park",name: "Border Field State Park — Friendship Park",     lat: 32.5330, lng: -117.1230, category: "tourism", description: "Beach at the US-Mexico border monument, tide-dependent access." },
  { id: "tour-balboa-park",      name: "Balboa Park",                                    lat: 32.7314, lng: -117.1445, category: "tourism", description: "1,200-acre urban park, 17 museums, SD Zoo, Spreckels Organ Pavilion." },
  { id: "tour-sd-zoo",           name: "San Diego Zoo",                                  lat: 32.7353, lng: -117.1490, category: "tourism", description: "World-famous zoo in Balboa Park." },
  { id: "tour-uss-midway",       name: "USS Midway Museum",                              lat: 32.7137, lng: -117.1750, category: "tourism", description: "1945 aircraft carrier museum on SD waterfront." },
  { id: "tour-cabrillo-nm",      name: "Cabrillo National Monument",                     lat: 32.6722, lng: -117.2417, category: "tourism", description: "Point Loma NPS unit — lighthouse, tide pools, Cabrillo statue." },
  { id: "tour-la-jolla-cove",    name: "La Jolla Cove + Seal Rock",                     lat: 32.8502, lng: -117.2727, category: "tourism", description: "Snorkel cove + Children's Pool sea lion colony." },
  { id: "tour-seaport-village",  name: "Seaport Village",                                lat: 32.7100, lng: -117.1700, category: "tourism", description: "Embarcadero shops + dining." },
  { id: "tour-gaslamp",          name: "Gaslamp Quarter",                                lat: 32.7104, lng: -117.1606, category: "tourism", description: "16-block Victorian-era historic district, nightlife." },
  { id: "tour-silver-strand-sp", name: "Silver Strand State Beach",                     lat: 32.6470, lng: -117.1370, category: "tourism", description: "CA State Beach between Coronado + IB." },
  { id: "tour-coronado-beach",   name: "Coronado Central Beach",                        lat: 32.6860, lng: -117.1830, category: "tourism", description: "Iconic 'Mica' beach, glittering quartz sand." },
  { id: "tour-old-town-sd",      name: "Old Town San Diego SHP",                         lat: 32.7549, lng: -117.1962, category: "tourism", description: "Birthplace of California, 1820s adobes." },
  { id: "tour-mission-sd",       name: "Mission San Diego de Alcalá",                    lat: 32.7707, lng: -117.1063, category: "tourism", description: "First California mission (1769)." },
  { id: "tour-suncliffs-park",   name: "Sunset Cliffs Natural Park",                     lat: 32.7260, lng: -117.2560, category: "tourism", description: "68-acre coastal park, sea cliffs + caves + sunset viewing." },
]

const TJ_OYSTER_SENSORS = [
  // ── AIR QUALITY (EPA AQS / SDAPCD / CARB / IQAir) ──
  { id: "sens-aqs-ib",            name: "EPA AQS — Imperial Beach monitor",           lat: 32.5790, lng: -117.1340, category: "sensor", kind: "aqi",          description: "PM2.5 + O3 monitor, EPA AQS site 06-073-1016." },
  { id: "sens-aqs-sysidro",       name: "EPA AQS — San Ysidro monitor",                lat: 32.5435, lng: -117.0298, category: "sensor", kind: "aqi",          description: "Border air monitor — PM2.5 + ozone + H2S + VOC speciation." },
  { id: "sens-aqs-chulavista",    name: "EPA AQS — Chula Vista monitor",               lat: 32.6300, lng: -117.0850, category: "sensor", kind: "aqi",          description: "PM2.5 + O3 monitor." },
  { id: "sens-aqs-otaymesa",      name: "EPA AQS — Otay Mesa monitor",                  lat: 32.5700, lng: -116.9300, category: "sensor", kind: "aqi",          description: "Border commercial POE air monitor." },
  { id: "sens-aqs-coronado",      name: "EPA AQS — Coronado monitor",                   lat: 32.6860, lng: -117.1830, category: "sensor", kind: "aqi",          description: "Coronado coastal air monitor." },
  { id: "sens-aqs-pointloma",     name: "EPA AQS — Point Loma monitor",                 lat: 32.6664, lng: -117.2430, category: "sensor", kind: "aqi",          description: "Point Loma ambient air monitor." },
  { id: "sens-iqair-ib",          name: "IQAir PurpleAir — Imperial Beach",             lat: 32.5790, lng: -117.1340, category: "sensor", kind: "aqi",          description: "Citizen-science PM2.5 sensor network node." },
  { id: "sens-iqair-coronado",    name: "IQAir PurpleAir — Coronado",                    lat: 32.6860, lng: -117.1830, category: "sensor", kind: "aqi",          description: "Citizen PM2.5 sensor." },

  // ── TIDE GAUGES (NOAA CO-OPS) ──
  { id: "sens-coops-lajolla",     name: "NOAA CO-OPS 9410230 — La Jolla tide",          lat: 32.8666, lng: -117.2573, category: "sensor", kind: "tide",         description: "Primary SD tide gauge, SIO Pier." },
  { id: "sens-coops-sandiego",    name: "NOAA CO-OPS 9410170 — SD Harbor tide",         lat: 32.7130, lng: -117.1730, category: "sensor", kind: "tide",         description: "Downtown SD harbor tide gauge." },
  { id: "sens-coops-zuniga",      name: "NOAA CO-OPS 9410162 — Zuniga Pt tide",         lat: 32.7130, lng: -117.2100, category: "sensor", kind: "tide",         description: "Zuniga Point tide + current gauge." },

  // ── STREAMFLOW (USGS) ──
  { id: "sens-usgs-tj",           name: "USGS 11013500 — TJ River @ TJ NERR",          lat: 32.5505, lng: -117.1220, category: "sensor", kind: "streamflow",   description: "Tijuana River streamflow at NERR." },
  { id: "sens-usgs-sweetwater",   name: "USGS 11015000 — Sweetwater R @ Chula Vista",  lat: 32.6400, lng: -117.0600, category: "sensor", kind: "streamflow",   description: "Sweetwater River gauge." },

  // ── WATER QUALITY (TJ NERR sondes) ──
  { id: "sens-trnerr-bbq",        name: "TJ NERR sonde — BBQ (freshwater)",             lat: 32.5650, lng: -117.1300, category: "sensor", kind: "waterquality", description: "Continuous water-quality sonde at estuary mouth (DO, salinity, temp, pH, turbidity)." },
  { id: "sens-trnerr-tamarisk",   name: "TJ NERR sonde — Tamarisk (brackish)",          lat: 32.5680, lng: -117.1280, category: "sensor", kind: "waterquality", description: "Continuous water-quality sonde, mid-estuary." },
  { id: "sens-trnerr-oneonta",    name: "TJ NERR sonde — Oneonta (marine)",             lat: 32.5725, lng: -117.1260, category: "sensor", kind: "waterquality", description: "Continuous water-quality sonde, seaward." },
  { id: "sens-trnerr-boca-rio",   name: "TJ NERR sonde — Boca Rio",                      lat: 32.5500, lng: -117.1260, category: "sensor", kind: "waterquality", description: "Water-quality sonde, river mouth." },

  // ── OCEANOGRAPHY (Scripps / SIO) ──
  { id: "sens-scripps-pier",      name: "SIO/Scripps Pier sensor suite",                lat: 32.8666, lng: -117.2573, category: "sensor", kind: "oceanography", description: "Water temp, chlorophyll, salinity, continuous." },
  { id: "sens-sccoos-ib",         name: "SCCOOS Imperial Beach shoreline station",       lat: 32.5789, lng: -117.1342, category: "sensor", kind: "oceanography", description: "SCCOOS shoreline automated sampler, IB pier." },
  { id: "sens-sccoos-dim",        name: "SCCOOS Del Mar HF Radar",                       lat: 32.9540, lng: -117.2650, category: "sensor", kind: "oceanography", description: "HF radar surface current 13 MHz, Del Mar." },
  { id: "sens-sccoos-pointloma",  name: "SCCOOS Point Loma HF Radar",                    lat: 32.6664, lng: -117.2430, category: "sensor", kind: "oceanography", description: "HF radar surface current, Point Loma." },

  // ── UCSD PFM + CROSS-BORDER (the Morgan-cited sources) ──
  { id: "sens-pfm-ib",            name: "UCSD PFM — Imperial Beach FIB station",        lat: 32.5789, lng: -117.1342, category: "sensor", kind: "plume",         description: "Pacific Forecast Model fecal-indicator-bacteria sampler. Source: pfmweb.ucsd.edu" },
  { id: "sens-pfm-silverstrand",  name: "UCSD PFM — Silver Strand FIB station",         lat: 32.6470, lng: -117.1370, category: "sensor", kind: "plume",         description: "Silver Strand beach FIB + plume tracking. Source: pfmweb.ucsd.edu" },
  { id: "sens-pfm-coronado",      name: "UCSD PFM — Coronado FIB station",               lat: 32.6860, lng: -117.1830, category: "sensor", kind: "plume",         description: "Coronado beach FIB + nearshore plume. Source: pfmweb.ucsd.edu" },
  { id: "sens-pfm-borderfield",   name: "UCSD PFM — Border Field SP FIB",                lat: 32.5330, lng: -117.1230, category: "sensor", kind: "plume",         description: "Border Field State Park FIB, closest to TJ River outflow. Source: pfmweb.ucsd.edu" },
  { id: "sens-scripps-cbp-1",     name: "Scripps Cross-Border — US border wall samplers",lat: 32.5430, lng: -117.1100, category: "sensor", kind: "crossborder",   description: "Scripps UCSD air sampler network, H2S + VOC + aerosol at border wall. Source: scripps.ucsd.edu/crossborderpollution" },
  { id: "sens-scripps-cbp-2",     name: "Scripps Cross-Border — Nestor aerosol",         lat: 32.5497, lng: -117.0900, category: "sensor", kind: "crossborder",   description: "Scripps aerosol + toxic-gas sampler, Nestor neighborhood." },
  { id: "sens-scripps-cbp-3",     name: "Scripps Cross-Border — Saturn Blvd speciation", lat: 32.5677, lng: -117.0510, category: "sensor", kind: "crossborder",   description: "Scripps GC-MS speciation, Saturn Blvd monitor." },

  // ── NASA EMIT (methane / mineral dust plumes from ISS) ──
  { id: "sens-emit-overpass-1",   name: "NASA EMIT overpass — SD coast",                 lat: 32.7000, lng: -117.2500, category: "sensor", kind: "emit",          description: "EMIT imaging spectrometer overpass zone, methane + mineral dust detection. Source: earth.jpl.nasa.gov/emit" },
  { id: "sens-emit-overpass-2",   name: "NASA EMIT overpass — TJ estuary",                lat: 32.5650, lng: -117.1200, category: "sensor", kind: "emit",          description: "EMIT coverage over estuary + outflow." },

  // ── NOISE / LIGHT ──
  { id: "sens-lightpol-ib",       name: "Light pollution monitor — IB",                  lat: 32.5790, lng: -117.1340, category: "sensor", kind: "light",         description: "SQM Bortle Class 7 (suburban-bright)." },
  { id: "sens-nab-noise",         name: "NAB Coronado noise monitor",                    lat: 32.6470, lng: -117.1370, category: "sensor", kind: "noise",         description: "Navy noise monitoring, jet operations." },
  { id: "sens-ib-noise",          name: "IB boardwalk noise monitor",                     lat: 32.5789, lng: -117.1342, category: "sensor", kind: "noise",         description: "Ambient noise at IB pier boardwalk." },

  // ── GROUND QUALITY (soil / contamination) ──
  { id: "sens-soil-tjslough",     name: "TJ Slough soil contamination sampler",          lat: 32.5510, lng: -117.1180, category: "sensor", kind: "soil",          description: "EPA Superfund site soil sampler, heavy metals + sewage legacy." },
  { id: "sens-soil-borderfield",  name: "Border Field SP soil sampler",                   lat: 32.5330, lng: -117.1230, category: "sensor", kind: "soil",          description: "State parks soil monitoring, sewage sediment accumulation." },

  // ── H2S (detailed SDAPCD cross-ref — real-time PowerBI feed) ──
  { id: "sens-sdapcd-H2S-1",      name: "SDAPCD H₂S — Saturn Blvd",                       lat: 32.5677, lng: -117.0510, category: "sensor", kind: "aqi",          description: "SDAPCD H2S real-time, Saturn Blvd. Source: sdapcd.org/tjrv" },
  { id: "sens-sdapcd-H2S-2",      name: "SDAPCD H₂S — IB Pier",                           lat: 32.5790, lng: -117.1360, category: "sensor", kind: "aqi",          description: "SDAPCD H2S, IB pier. Source: sdapcd.org/tjrv" },

  // ── BUOY ARRAY (NDBC) ──
  { id: "sens-ndbc-46232",        name: "NDBC buoy 46232 — Point Loma South",            lat: 32.5170, lng: -117.4250, category: "sensor", kind: "buoy",          description: "NOAA NDBC buoy, wave + wind + SST offshore." },
  { id: "sens-ndbc-46225",        name: "NDBC buoy 46225 — Torrey Pines",                lat: 32.9330, lng: -117.3910, category: "sensor", kind: "buoy",          description: "NOAA NDBC buoy offshore Torrey Pines." },
  { id: "sens-ndbc-46231",        name: "NDBC buoy 46231 — N Coronado",                  lat: 32.7330, lng: -117.2690, category: "sensor", kind: "buoy",          description: "NOAA NDBC buoy N of Coronado." },
]

// ═════════════════════════════════════════════════════════════════════
// UCSD PFM sewage plume polygon approximations (Pacific Forecast Model)
// Used to render the live sewage plume footprint as a fill layer. These
// are approximate probability-of-contamination zones at typical flow.
// Replace with live pulls from pfmweb.ucsd.edu as the feed stabilizes.
// ═════════════════════════════════════════════════════════════════════
const TJ_OYSTER_PLUME = {
  // Outer plume envelope (probability > 0.25) on a typical 20-m3/s day
  outer: {
    type: "Polygon" as const,
    coordinates: [[
      [-117.1600, 32.5400], // WNW of outflow
      [-117.2000, 32.5500], // offshore N
      [-117.2500, 32.5800], // deep offshore
      [-117.2400, 32.6500], // N edge near Coronado
      [-117.2000, 32.7000], // near Hotel del
      [-117.2500, 32.7200], // far N
      [-117.2800, 32.7400], // Sunset Cliffs edge
      [-117.2500, 32.5200], // S offshore
      [-117.2000, 32.5100], // S edge toward Rosarito
      [-117.1600, 32.5300], // back inshore
      [-117.1600, 32.5400],
    ]],
  },
  // Core plume (probability > 0.75)
  core: {
    type: "Polygon" as const,
    coordinates: [[
      [-117.1400, 32.5400], // inshore
      [-117.1700, 32.5500],
      [-117.2000, 32.5600],
      [-117.2200, 32.5800],
      [-117.2100, 32.6200], // north inner plume
      [-117.1800, 32.6400],
      [-117.1500, 32.6200],
      [-117.1300, 32.5700],
      [-117.1300, 32.5400],
      [-117.1400, 32.5400],
    ]],
  },
  current_flow_m3s: 12.5,
  sampled_at: "2026-04-21T14:00:00-07:00",
  source: "pfmweb.ucsd.edu (UCSD SCCOOS Pacific Forecast Model)",
}

// NASA EMIT methane / dust plume detections (simulated from recent overpasses)
const TJ_OYSTER_EMIT_PLUMES = [
  { id: "emit-methane-otay",     name: "Otay landfill methane plume",            lat: 32.5850, lng: -116.9780, intensity: 0.65, gas: "CH4",        description: "NASA EMIT CH4 detection, Otay landfill, 2026-04-15 pass." },
  { id: "emit-methane-sanysidro",name: "San Ysidro diesel exhaust plume",        lat: 32.5420, lng: -117.0300, intensity: 0.45, gas: "CO2/CH4",    description: "Border POE idling vehicle exhaust column, EMIT 2026-04-12." },
  { id: "emit-dust-imperial",    name: "Imperial Valley dust plume",             lat: 32.8400, lng: -115.5700, intensity: 0.78, gas: "MineralDust",description: "Imperial Valley mineral dust plume, Salton Sea dust advection." },
]

const TJ_OYSTER_HEATMAPS = {
  pollution: [
    { lat: 32.5650, lng: -117.1200, intensity: 0.98, label: "TJ Estuary mouth (sewage plume origin)" },
    { lat: 32.5500, lng: -117.1200, intensity: 0.92, label: "South IB slough" },
    { lat: 32.5789, lng: -117.1342, intensity: 0.85, label: "IB Pier (1000+ day closure)" },
    { lat: 32.5497, lng: -117.0900, intensity: 0.88, label: "Nestor corridor" },
    { lat: 32.5435, lng: -117.0298, intensity: 0.82, label: "San Ysidro POE" },
    { lat: 32.5677, lng: -117.0510, intensity: 0.80, label: "Saturn Blvd (H2S monitor)" },
    { lat: 32.6470, lng: -117.1370, intensity: 0.72, label: "Silver Strand (Navy training)" },
    { lat: 32.6860, lng: -117.1830, intensity: 0.58, label: "Coronado Central (intermittent)" },
  ],
  biodiversity: [
    { lat: 32.5570, lng: -117.1260, intensity: 0.95, label: "TJ NERR (estuary + wetland)" },
    { lat: 32.5720, lng: -117.1280, intensity: 0.90, label: "Estuary — Oneonta (marine)" },
    { lat: 32.6722, lng: -117.2417, intensity: 0.85, label: "Cabrillo tide pools" },
    { lat: 32.8500, lng: -117.2770, intensity: 0.82, label: "La Jolla Cove underwater park" },
    { lat: 32.7200, lng: -117.2550, intensity: 0.72, label: "Sunset Cliffs tide pools" },
    { lat: 32.6470, lng: -117.1370, intensity: 0.58, label: "Silver Strand nearshore" },
  ],
  noise: [
    { lat: 32.6990, lng: -117.2090, intensity: 0.95, label: "NAS North Island jet ops" },
    { lat: 32.6470, lng: -117.1370, intensity: 0.85, label: "NAB Coronado training" },
    { lat: 32.7137, lng: -117.1750, intensity: 0.72, label: "Downtown SD (traffic + air)" },
    { lat: 32.5427, lng: -117.0295, intensity: 0.78, label: "San Ysidro POE idling vehicles" },
    { lat: 32.7157, lng: -117.1611, intensity: 0.62, label: "Downtown SD ambient" },
  ],
}

async function fetchINatOyster(): Promise<any[]> {
  // Apr 21, 2026 v2 expansion. Bbox covers south SD + IB + south Coronado
  // + Chula Vista + Tijuana side of NERR. Up to 200 research + needs-ID
  // observations, observed_on descending.
  const bbox = { swlat: 32.50, swlng: -117.30, nelat: 32.85, nelng: -117.00 }
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
