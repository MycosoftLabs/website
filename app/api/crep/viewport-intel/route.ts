import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

type Bounds = { north: number; south: number; east: number; west: number }

type CivicOfficial = {
  name: string
  office: string
  party?: string
  phones?: string[]
  emails?: string[]
  urls?: string[]
  address?: string
}

type ViewportFacility = {
  id: string
  name: string
  type: string
  lat: number
  lng: number
  agency?: string
  phone?: string
  email?: string
  website?: string
  source: string
}

function finiteNumber(value: string | null, fallback: number) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function parseBounds(req: NextRequest): Bounds {
  const q = req.nextUrl.searchParams
  const north = finiteNumber(q.get("north"), 0)
  const south = finiteNumber(q.get("south"), 0)
  const east = finiteNumber(q.get("east"), 0)
  const west = finiteNumber(q.get("west"), 0)
  return {
    north: Math.max(north, south),
    south: Math.min(north, south),
    east,
    west,
  }
}

function bboxArea(bounds: Bounds) {
  const latSpan = Math.max(0.001, Math.abs(bounds.north - bounds.south))
  const lngSpan = Math.max(0.001, bounds.east >= bounds.west ? bounds.east - bounds.west : 360 - bounds.west + bounds.east)
  return latSpan * lngSpan
}

function center(bounds: Bounds) {
  const lat = (bounds.north + bounds.south) / 2
  let lng = (bounds.east + bounds.west) / 2
  if (bounds.west > bounds.east) lng = ((bounds.east + 360 + bounds.west) / 2) % 360
  if (lng > 180) lng -= 360
  return { lat, lng }
}

async function reversePlace(bounds: Bounds) {
  const c = center(bounds)
  const url = new URL("https://nominatim.openstreetmap.org/reverse")
  url.searchParams.set("format", "jsonv2")
  url.searchParams.set("addressdetails", "1")
  url.searchParams.set("lat", String(c.lat))
  url.searchParams.set("lon", String(c.lng))
  url.searchParams.set("zoom", bboxArea(bounds) > 70 ? "4" : bboxArea(bounds) > 10 ? "6" : bboxArea(bounds) > 1 ? "10" : "14")
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mycosoft-Earth-Simulator/1.0 (ops@mycosoft.com)",
      "Accept": "application/json",
    },
    signal: AbortSignal.timeout(8_000),
    next: { revalidate: 900 },
  })
  if (!res.ok) return null
  const json = await res.json()
  const a = json?.address || {}
  return {
    displayName: json?.display_name || "",
    country: a.country,
    countryCode: a.country_code?.toUpperCase?.(),
    state: a.state || a.region,
    county: a.county,
    city: a.city || a.town || a.village || a.municipality || a.hamlet,
    suburb: a.suburb || a.neighbourhood,
    postcode: a.postcode,
    lat: c.lat,
    lng: c.lng,
  }
}

async function civicOfficials(place: Awaited<ReturnType<typeof reversePlace>>): Promise<{ officials: CivicOfficial[]; status: string }> {
  const key = process.env.GOOGLE_CIVIC_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_CIVIC_API_KEY
  if (!key || !place) return { officials: [], status: "missing_google_civic_api_key" }
  const address = [place.city, place.county, place.state, place.country].filter(Boolean).join(", ")
  if (!address) return { officials: [], status: "no_address" }
  const url = new URL("https://www.googleapis.com/civicinfo/v2/representatives")
  url.searchParams.set("key", key)
  url.searchParams.set("address", address)
  url.searchParams.set("includeOffices", "true")
  const res = await fetch(url, { signal: AbortSignal.timeout(8_000), next: { revalidate: 3600 } })
  if (!res.ok) return { officials: [], status: `google_civic_${res.status}` }
  const json = await res.json()
  const officials = Array.isArray(json?.officials) ? json.officials : []
  const offices = Array.isArray(json?.offices) ? json.offices : []
  const out: CivicOfficial[] = []
  for (const office of offices) {
    const indices = Array.isArray(office.officialIndices) ? office.officialIndices : []
    for (const index of indices) {
      const official = officials[index]
      if (!official?.name) continue
      const lines = Array.isArray(official.address?.[0]?.line1)
        ? official.address[0].line1
        : [official.address?.[0]?.line1, official.address?.[0]?.city, official.address?.[0]?.state, official.address?.[0]?.zip].filter(Boolean)
      out.push({
        name: official.name,
        office: office.name || "Official",
        party: official.party,
        phones: official.phones,
        emails: official.emails,
        urls: official.urls,
        address: lines.join(", "),
      })
    }
  }
  return { officials: out.slice(0, 20), status: "live" }
}

function tagsToFacility(element: any): ViewportFacility | null {
  const tags = element?.tags || {}
  const lat = Number(element.lat ?? element.center?.lat)
  const lng = Number(element.lon ?? element.center?.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const type =
    tags.military ||
    tags.government ||
    tags.office ||
    tags.amenity ||
    tags.power ||
    tags.man_made ||
    tags.building ||
    "facility"
  return {
    id: `osm-${element.type}-${element.id}`,
    name: tags.name || tags.official_name || tags.operator || tags.brand || String(type).replace(/_/g, " "),
    type: String(type).replace(/_/g, " "),
    lat,
    lng,
    agency: tags.operator || tags.agency || tags.owner,
    phone: tags.phone || tags["contact:phone"],
    email: tags.email || tags["contact:email"],
    website: tags.website || tags["contact:website"] || tags.url,
    source: "OpenStreetMap",
  }
}

async function viewportFacilities(bounds: Bounds, zoom: number): Promise<{ facilities: ViewportFacility[]; status: string }> {
  if (bboxArea(bounds) > 18 && zoom < 7) return { facilities: [], status: "bbox_too_large" }
  const query = `
    [out:json][timeout:15];
    (
      node["office"="government"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      way["office"="government"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      node["amenity"~"townhall|courthouse|police|fire_station|hospital"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      way["amenity"~"townhall|courthouse|police|fire_station|hospital"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      node["military"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      way["military"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      node["power"~"plant|substation"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      way["power"~"plant|substation"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      node["telecom"="data_center"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      way["telecom"="data_center"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
    );
    out center tags 100;
  `
  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ]
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "User-Agent": "Mycosoft-Earth-Simulator/1.0 (ops@mycosoft.com)",
        },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(18_000),
        next: { revalidate: 900 },
      })
      if (!res.ok) continue
      const json = await res.json()
      const facilities = (Array.isArray(json?.elements) ? json.elements : [])
        .map(tagsToFacility)
        .filter(Boolean)
        .slice(0, 100) as ViewportFacility[]
      return { facilities, status: "live" }
    } catch {
      continue
    }
  }
  return { facilities: [], status: "overpass_unavailable" }
}

export async function GET(req: NextRequest) {
  const bounds = parseBounds(req)
  const zoom = finiteNumber(req.nextUrl.searchParams.get("zoom"), 4)
  try {
    const place = await reversePlace(bounds)
    const [civic, facilities] = await Promise.all([
      civicOfficials(place),
      viewportFacilities(bounds, zoom),
    ])
    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      lod: zoom < 5 ? "country" : zoom < 8 ? "state" : zoom < 11 ? "county" : zoom < 14 ? "city" : "facility",
      bounds,
      center: center(bounds),
      place,
      civic,
      facilities,
    })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: (error as Error)?.message || "viewport_intel_failed",
      generatedAt: new Date().toISOString(),
      bounds,
      center: center(bounds),
    }, { status: 200 })
  }
}
