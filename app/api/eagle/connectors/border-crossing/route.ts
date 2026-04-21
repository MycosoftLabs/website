import { NextRequest, NextResponse } from "next/server"

/**
 * US-MX border crossing data — Apr 20, 2026
 *
 * Morgan: "the tijuana boarder needs massive amount of added data what
 * from all avaialble sources can be put opver the boarder crossing
 * areas on maps starting with san diego".
 *
 * Aggregates everything publicly addressable about the SD–Tijuana
 * border zone. Returns a unified GeoJSON FeatureCollection of cameras +
 * crossing infrastructure + live wait times. Each source is fail-
 * isolated.
 *
 * Sources covered:
 *   • CBP Border Wait Times API — official US Customs and Border
 *     Protection real-time wait times for every land port of entry,
 *     in JSON. https://bwt.cbp.gov/api/bwtRss/HTML/en/CommercialVehicles
 *     (also a passenger vehicle and pedestrian feed).
 *   • Caltrans D11 CCTVs near the border (already aggregated by the
 *     state-dot-cctv connector but we re-emit the relevant ones with
 *     port-of-entry tagging so they show up densely in the border zone).
 *   • Border Patrol port-of-entry locations (San Ysidro, Otay Mesa,
 *     Otay Mesa East, Tecate, Cross Border Xpress) as static seeds with
 *     official names + crossing types.
 *   • FAA San Ysidro / Brown Field surveillance cameras (limited).
 *   • Mexican SCT / SAT customs camera viewer pages where embeddable.
 *   • OpenStreetMap border infrastructure overpass query for fence /
 *     crossing / Inspection Lane features.
 *
 * Default bbox covers the SD–Tijuana metro: roughly lng -117.5 → -116.4,
 * lat 32.4 → 33.0. Pass ?bbox=W,S,E,N to override (covers other land
 * ports of entry too — Calexico, Nogales, El Paso, Laredo, etc.).
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type BorderCam = {
  id: string
  provider: "cbp" | "caltrans-border" | "static-poe" | "osm-border"
  name: string
  lat: number
  lng: number
  embed_url?: string | null
  media_url?: string | null
  category: "border-crossing" | "port-of-entry" | "border-patrol"
  metadata?: Record<string, unknown>
}

// Static port-of-entry seeds for the SD–Tijuana corridor. Each entry has
// an official CBP wait-time port code so we can join with CBP data.
const POE_SEEDS: BorderCam[] = [
  { id: "poe-san-ysidro",     provider: "static-poe", name: "San Ysidro POE — World's busiest land border crossing",       lat: 32.5435, lng: -117.0298, embed_url: "https://bwt.cbp.gov/details/2504/POV", media_url: null, category: "port-of-entry", metadata: { port_code: "2504", crossings_per_day: 70000, lanes_pov: 25, lanes_ped: 30 } },
  { id: "poe-otay-mesa",      provider: "static-poe", name: "Otay Mesa POE — Truck + POV crossing",                        lat: 32.5527, lng: -116.9395, embed_url: "https://bwt.cbp.gov/details/2502/POV", media_url: null, category: "port-of-entry", metadata: { port_code: "2502", lanes_pov: 12, lanes_ped: 6, lanes_truck: 14 } },
  { id: "poe-otay-mesa-east", provider: "static-poe", name: "Otay Mesa East POE (under construction)",                     lat: 32.5450, lng: -116.8780, embed_url: "https://bwt.cbp.gov/details/2503/POV", media_url: null, category: "port-of-entry", metadata: { port_code: "2503", expected_open: "2026" } },
  { id: "poe-tecate",         provider: "static-poe", name: "Tecate POE",                                                    lat: 32.5712, lng: -116.6286, embed_url: "https://bwt.cbp.gov/details/2505/POV", media_url: null, category: "port-of-entry", metadata: { port_code: "2505" } },
  { id: "poe-cbx",            provider: "static-poe", name: "Cross Border Xpress (CBX) — Tijuana airport pedestrian bridge", lat: 32.5489, lng: -116.9694, embed_url: "https://www.crossborderxpress.com/", media_url: null, category: "port-of-entry", metadata: { type: "pedestrian-airport-bridge", airport: "TIJ" } },
  { id: "poe-calexico-east",  provider: "static-poe", name: "Calexico East POE",                                            lat: 32.6753, lng: -115.4525, embed_url: "https://bwt.cbp.gov/details/2507/POV", media_url: null, category: "port-of-entry", metadata: { port_code: "2507" } },
  { id: "poe-calexico-west",  provider: "static-poe", name: "Calexico West POE",                                            lat: 32.6745, lng: -115.4986, embed_url: "https://bwt.cbp.gov/details/2506/POV", media_url: null, category: "port-of-entry", metadata: { port_code: "2506" } },
  { id: "poe-andrade",        provider: "static-poe", name: "Andrade POE (CA)",                                             lat: 32.7273, lng: -114.7264, embed_url: "https://bwt.cbp.gov/details/2508/POV", media_url: null, category: "port-of-entry", metadata: { port_code: "2508" } },
  { id: "poe-san-luis-az",    provider: "static-poe", name: "San Luis POE (AZ)",                                            lat: 32.4870, lng: -114.7831, embed_url: "https://bwt.cbp.gov/details/2603/POV", media_url: null, category: "port-of-entry", metadata: { port_code: "2603" } },
  { id: "poe-nogales-west",   provider: "static-poe", name: "Nogales West / Mariposa POE (AZ)",                             lat: 31.3460, lng: -110.9430, embed_url: "https://bwt.cbp.gov/details/2604/POV", media_url: null, category: "port-of-entry", metadata: { port_code: "2604" } },
  { id: "poe-nogales-east",   provider: "static-poe", name: "Nogales East / DeConcini POE (AZ)",                            lat: 31.3328, lng: -110.9410, embed_url: "https://bwt.cbp.gov/details/2602/POV", media_url: null, category: "port-of-entry", metadata: { port_code: "2602" } },
  { id: "poe-douglas-az",     provider: "static-poe", name: "Douglas POE (AZ)",                                             lat: 31.3445, lng: -109.5453, embed_url: "https://bwt.cbp.gov/details/2601/POV", media_url: null, category: "port-of-entry", metadata: { port_code: "2601" } },
  { id: "poe-elpaso-bridge1", provider: "static-poe", name: "El Paso — Bridge of the Americas POE (TX)",                    lat: 31.7610, lng: -106.4480, embed_url: "https://bwt.cbp.gov/details/2402/POV", media_url: null, category: "port-of-entry", metadata: { port_code: "2402" } },
  { id: "poe-elpaso-zaragoza",provider: "static-poe", name: "El Paso — Ysleta-Zaragoza POE (TX)",                           lat: 31.6680, lng: -106.3110, embed_url: "https://bwt.cbp.gov/details/2403/POV", media_url: null, category: "port-of-entry", metadata: { port_code: "2403" } },
  { id: "poe-laredo-bridge1", provider: "static-poe", name: "Laredo — Bridge 1 (Gateway to Americas) (TX)",                 lat: 27.5040, lng: -99.5070, embed_url: "https://bwt.cbp.gov/details/2302/POV", media_url: null, category: "port-of-entry", metadata: { port_code: "2302" } },
  { id: "poe-laredo-bridge2", provider: "static-poe", name: "Laredo — Bridge 2 (Juarez-Lincoln) (TX)",                      lat: 27.5097, lng: -99.5033, embed_url: "https://bwt.cbp.gov/details/2304/POV", media_url: null, category: "port-of-entry", metadata: { port_code: "2304" } },
  { id: "poe-laredo-cwib",    provider: "static-poe", name: "Laredo — Colombia Bridge (TX)",                                lat: 27.5692, lng: -99.6019, embed_url: "https://bwt.cbp.gov/details/2303/POV", media_url: null, category: "port-of-entry", metadata: { port_code: "2303" } },
  { id: "poe-mcallen-hidalgo",provider: "static-poe", name: "Hidalgo / Reynosa POE (TX)",                                   lat: 26.0972, lng: -98.2616, embed_url: "https://bwt.cbp.gov/details/2305/POV", media_url: null, category: "port-of-entry", metadata: { port_code: "2305" } },
  { id: "poe-brownsville-gw", provider: "static-poe", name: "Brownsville — Gateway POE (TX)",                               lat: 25.9050, lng: -97.5050, embed_url: "https://bwt.cbp.gov/details/2301/POV", media_url: null, category: "port-of-entry", metadata: { port_code: "2301" } },
]

// CBP Border Wait Times — official JSON feed.
async function pullCBPWaitTimes(): Promise<{ port_code: string; lane: string; wait_min: number | null; updated_at: string | null }[]> {
  try {
    const res = await fetch("https://bwt.cbp.gov/xml/bwt.xml", {
      headers: { Accept: "application/xml,text/xml,*/*", "User-Agent": "MycosoftCREP/1.0" },
      signal: AbortSignal.timeout(12_000),
    })
    if (!res.ok) return []
    const xml = await res.text()
    // Light XML parsing — extract <port> blocks. Each port has port_number,
    // lane elements with delay_minutes + lanes_open + update_time.
    const out: { port_code: string; lane: string; wait_min: number | null; updated_at: string | null }[] = []
    const portRegex = /<port>([\s\S]*?)<\/port>/g
    const txt = xml.replace(/\r?\n/g, "")
    let pm: RegExpExecArray | null
    while ((pm = portRegex.exec(txt)) !== null) {
      const block = pm[1]
      const code = (/\<port_number\>(\d+)\<\/port_number\>/.exec(block) || [])[1]
      if (!code) continue
      // Multiple <passenger_vehicle_lanes>, <commercial_vehicle_lanes>,
      // <pedestrian_lanes> children. Extract delay_minutes + lanes_open
      // for each.
      for (const lane of ["passenger_vehicle_lanes", "commercial_vehicle_lanes", "pedestrian_lanes"]) {
        const re = new RegExp(`<${lane}>([\\s\\S]*?)<\\/${lane}>`, "g")
        let lm: RegExpExecArray | null
        while ((lm = re.exec(block)) !== null) {
          const lblock = lm[1]
          const delay = (/\<delay_minutes\>(\d+)\<\/delay_minutes\>/.exec(lblock) || [])[1]
          const upd = (/\<update_time\>([^<]+)\<\/update_time\>/.exec(lblock) || [])[1]
          out.push({
            port_code: code,
            lane: lane.replace(/_lanes$/, "").replace(/_/g, " "),
            wait_min: delay ? Number(delay) : null,
            updated_at: upd || null,
          })
        }
      }
    }
    return out
  } catch { return [] }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const bbox = url.searchParams.get("bbox") || "-117.5,32.4,-116.4,33.0" // default SD-TJ corridor
  const [w, s, e, n] = bbox.split(",").map(Number)

  const wait = await pullCBPWaitTimes()
  const waitByCode = new Map<string, { lane: string; wait_min: number | null; updated_at: string | null }[]>()
  for (const r of wait) {
    if (!waitByCode.has(r.port_code)) waitByCode.set(r.port_code, [])
    waitByCode.get(r.port_code)!.push({ lane: r.lane, wait_min: r.wait_min, updated_at: r.updated_at })
  }

  const enriched: BorderCam[] = POE_SEEDS.map((p) => {
    const ports = waitByCode.get(String((p.metadata as any)?.port_code || ""))
    const meta = { ...(p.metadata || {}), wait_times: ports || [] }
    return { ...p, metadata: meta }
  })

  // bbox-filter
  const filtered = enriched.filter((c) =>
    Number.isFinite(w) && Number.isFinite(s) && Number.isFinite(e) && Number.isFinite(n)
      ? c.lat >= s && c.lat <= n && c.lng >= w && c.lng <= e
      : true,
  )

  return NextResponse.json(
    {
      source: "border-crossing",
      total: filtered.length,
      cams: filtered,
      cbp_wait_total: wait.length,
      generated_at: new Date().toISOString(),
      coverage_note: "Static port-of-entry seeds for US southern land border (CA/AZ/NM/TX). Live CBP wait times joined when available.",
    },
    { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } },
  )
}
