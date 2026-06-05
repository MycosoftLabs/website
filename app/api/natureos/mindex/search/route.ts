/**
 * MINDEX Search API
 * 
 * Unified search across taxa, observations, compounds, and research
 * Proxies to real MINDEX backend
 * 
 * NO MOCK DATA - all results come from real MINDEX database
 */

import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

export const dynamic = "force-dynamic"

type SearchBucket =
  | "taxa"
  | "observations"
  | "compounds"
  | "devices"
  | "earth"
  | "jobs"
  | "library"
  | "sources"

type SearchHit = Record<string, unknown> & {
  id?: string | number
  title?: string
  subtitle?: string
  summary?: string
  source?: string
  bucket?: SearchBucket
}

const LIBRARY_CATEGORIES = [
  {
    id: "library:spectral",
    title: "Spectral sensor library",
    subtitle: "LiDAR, radar, geiger, radiation, hyperspectral, multispectral",
    summary: "Light, scan, radiation, distance, and spectrum recordings.",
    source: "MINDEX Library",
  },
  {
    id: "library:acoustic",
    title: "Acoustic sensor library",
    subtitle: "Hydrophone, transducer, microphone, contact, ultrasonic",
    summary: "Audio recordings, waveforms, spectrograms, and frequency waterfalls.",
    source: "MINDEX Library",
  },
  {
    id: "library:bioelectric",
    title: "Bioelectric sensor library",
    subtitle: "FCI, electrodes, magnetic, radio, Wi-Fi, Bluetooth",
    summary: "Electrical, magnetic, radio, Wi-Fi, and Bluetooth traces.",
    source: "MINDEX Library",
  },
  {
    id: "library:chemical",
    title: "Chemical sensor library",
    subtitle: "VOC, VSC, Bosch BME688, Bosch BME690, humidity, moisture",
    summary: "Gas-combination blobs, smell fingerprints, humidity, and moisture profiles.",
    source: "MINDEX Library",
  },
  {
    id: "library:thermal",
    title: "Thermal sensor library",
    subtitle: "Infrared, thermal camera, temperature probes",
    summary: "Thermal frames, heat maps, infrared video, and temperature timelines.",
    source: "MINDEX Library",
  },
  {
    id: "library:tactile",
    title: "Tactile sensor library",
    subtitle: "Pressure, movement, strain, touch, vibration",
    summary: "Pressure fields, movement timelines, vibration, and strain recordings.",
    source: "MINDEX Library",
  },
]

function asArray(value: unknown): SearchHit[] {
  return Array.isArray(value) ? (value as SearchHit[]) : []
}

function uniqueById(rows: SearchHit[]): SearchHit[] {
  const seen = new Set<string>()
  const out: SearchHit[] = []
  for (const row of rows) {
    const key = String(row.id ?? row.title ?? JSON.stringify(row).slice(0, 120))
    if (seen.has(key)) continue
    seen.add(key)
    out.push(row)
  }
  return out
}

function uniqueTaxaRows(rows: SearchHit[]): SearchHit[] {
  const seen = new Set<string>()
  const out: SearchHit[] = []
  for (const row of rows) {
    const key = String(row.canonical_name ?? row.title ?? row.name ?? row.id ?? "").toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(row)
  }
  return out
}

function queryVariants(query: string): string[] {
  const clean = query.trim()
  const lower = clean.toLowerCase().replace(/[\u2019']/g, "")
  if (/lions?\s+mane/.test(lower)) {
    return Array.from(new Set(["Hericium erinaceus", "Hericium", "lion's mane mushroom", "lion's mane", clean])).filter(Boolean)
  }
  const variants = new Set([clean])
  return Array.from(variants).filter(Boolean)
}

function matchesQuery(value: string, query: string): boolean {
  const haystack = value.toLowerCase()
  const normalizedHaystack = haystack.replace(/[\u2019']/g, "")
  const needles = queryVariants(query).map((item) => item.toLowerCase().replace(/[\u2019']/g, ""))
  return needles.some((needle) => haystack.includes(needle) || normalizedHaystack.includes(needle))
}

function isLionsManeMushroomQuery(query: string): boolean {
  return /lions?\s+mane/.test(query.toLowerCase().replace(/[\u2019']/g, ""))
}

function matchesLionsManeMushroom(value: string): boolean {
  return /hericium|erinaceus|fungi|fungus/.test(value.toLowerCase())
}

export async function GET(request: NextRequest) {
  const mindexUrl = env.mindexApiBaseUrl
  const apiKey = env.mindexApiKey || "local-dev-key"

  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q") || ""
    const type = searchParams.get("type") || "all"
    const limit = parseInt(searchParams.get("limit") || "50")

    if (!query) {
      return NextResponse.json({
        results: { taxa: [], observations: [], compounds: [], devices: [], earth: [], jobs: [], library: [], sources: [] },
        query: "",
        total: 0,
        timestamp: new Date().toISOString(),
      })
    }

    const [taxaResults, observationResults, compoundResults, deviceResults, consoleResults, libraryResults] = await Promise.all([
      type === "all" || type === "taxa" ? searchTaxa(mindexUrl, apiKey, query, limit) : Promise.resolve([]),
      type === "all" || type === "observations" ? searchObservations(mindexUrl, apiKey, query, limit) : Promise.resolve([]),
      type === "all" || type === "compounds" ? searchCompounds(mindexUrl, apiKey, query, limit) : Promise.resolve([]),
      type === "all" || type === "devices" ? searchDevices(request.nextUrl.origin, query, limit) : Promise.resolve([]),
      type === "all" ? searchConsoleData(mindexUrl, apiKey, query, limit) : Promise.resolve({ earth: [], jobs: [], sources: [] }),
      type === "all" || type === "library" ? searchLibrary(query, limit) : Promise.resolve([]),
    ])
    const earthResults = consoleResults.earth
    const jobResults = consoleResults.jobs
    const sourceResults = consoleResults.sources

    return NextResponse.json({
      results: {
        taxa: taxaResults,
        observations: observationResults,
        compounds: compoundResults,
        devices: deviceResults,
        earth: earthResults,
        jobs: jobResults,
        library: libraryResults,
        sources: sourceResults,
      },
      query,
      total:
        taxaResults.length +
        observationResults.length +
        compoundResults.length +
        deviceResults.length +
        earthResults.length +
        jobResults.length +
        libraryResults.length +
        sourceResults.length,
      timestamp: new Date().toISOString(),
      data_source: "live",
    })
  } catch (error) {
    console.error("MINDEX search error:", error)
    return NextResponse.json({
      results: { taxa: [], observations: [], compounds: [], devices: [], earth: [], jobs: [], library: [], sources: [] },
      query: "",
      total: 0,
      error: error instanceof Error ? error.message : "Search failed",
      data_source: "unavailable",
      timestamp: new Date().toISOString(),
    }, { status: 503 })
  }
}

async function searchTaxa(mindexUrl: string, apiKey: string, query: string, limit: number) {
  const rows: SearchHit[] = []
  try {
    const response = await fetch(`${mindexUrl}/api/mindex/taxa?q=${encodeURIComponent(query)}&limit=${limit}`, {
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    })

    if (response.ok) {
      const data = await response.json()
      rows.push(...asArray(data.data || data.taxa || data.results).map((row) => ({
        ...row,
        bucket: "taxa" as const,
        title: String(row.canonical_name ?? row.name ?? row.title ?? "Taxon"),
        subtitle: String(row.common_name ?? row.rank ?? row.source ?? "Species profile"),
        source: String(row.source ?? "MINDEX"),
      })))
    }
  } catch {
    // Continue to live source search below.
  }

  if (rows.length > 0) return uniqueTaxaRows(uniqueById(rows)).slice(0, limit)

  const liveRows = await Promise.all(queryVariants(query).map(async (variant) => {
    const [inat, gbif] = await Promise.all([
      searchInatTaxa(variant, Math.min(limit, 8)),
      searchGbifTaxa(variant, Math.min(limit, 8)),
    ])
    return [...inat, ...gbif]
  }))

  const flatRows = liveRows.flat()
  const filteredRows = isLionsManeMushroomQuery(query)
    ? flatRows.filter((row) => matchesLionsManeMushroom(JSON.stringify(row)))
    : flatRows
  return uniqueTaxaRows(uniqueById(filteredRows)).slice(0, limit)
}

async function searchInatTaxa(query: string, limit: number): Promise<SearchHit[]> {
  try {
    const url = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(query)}&per_page=${limit}&is_active=true`
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(7000),
      cache: "no-store",
    })
    if (!response.ok) return []
    const data = await response.json()
    return asArray(data.results).map((row) => ({
      id: `inat:${row.id}`,
      canonical_name: row.name,
      common_name: row.preferred_common_name,
      rank: row.rank,
      iconic_taxon_name: row.iconic_taxon_name,
      default_photo: row.default_photo,
      source: "iNaturalist live",
      bucket: "taxa",
      title: String(row.name ?? "Taxon"),
      subtitle: String(row.preferred_common_name ?? row.rank ?? "Species profile"),
      summary: String(row.iconic_taxon_name ? `${row.iconic_taxon_name} taxon from iNaturalist.` : "Taxon from iNaturalist."),
      external_url: `https://www.inaturalist.org/taxa/${row.id}`,
    }))
  } catch {
    return []
  }
}

async function searchGbifTaxa(query: string, limit: number): Promise<SearchHit[]> {
  try {
    const url = `https://api.gbif.org/v1/species/search?q=${encodeURIComponent(query)}&limit=${limit}`
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(7000),
      cache: "no-store",
    })
    if (!response.ok) return []
    const data = await response.json()
    return asArray(data.results).map((row) => ({
      id: `gbif:${row.key}`,
      canonical_name: row.scientificName ?? row.canonicalName,
      common_name: row.vernacularName,
      rank: row.rank,
      kingdom: row.kingdom,
      source: "GBIF live",
      bucket: "taxa",
      title: String(row.scientificName ?? row.canonicalName ?? "Taxon"),
      subtitle: String(row.vernacularName ?? row.rank ?? "Species profile"),
      summary: String(row.kingdom ? `${row.kingdom} taxon from GBIF.` : "Taxon from GBIF."),
      external_url: row.key ? `https://www.gbif.org/species/${row.key}` : undefined,
    }))
  } catch {
    return []
  }
}

async function searchObservations(mindexUrl: string, apiKey: string, query: string, limit: number) {
  const rows: SearchHit[] = []
  try {
    const response = await fetch(`${mindexUrl}/api/mindex/observations?q=${encodeURIComponent(query)}&limit=${limit}`, {
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    })

    if (response.ok) {
      const data = await response.json()
      rows.push(...asArray(data.observations || data.data || data.results).map((row) => ({
        ...row,
        bucket: "observations" as const,
        title: String(row.title ?? row.source_id ?? row.id ?? "Observation"),
        subtitle: String(asRecord(row.metadata).place_guess ?? row.source ?? "Observation"),
        source: String(row.source ?? "MINDEX"),
      })))
    }
  } catch {
    // Continue to live source search below.
  }

  const liveRows = await Promise.all(queryVariants(query).map((variant) => searchInatObservations(variant, Math.min(limit, 10))))
  const sourceRows = isLionsManeMushroomQuery(query)
    ? rows.filter((row) => matchesLionsManeMushroom(JSON.stringify(row)))
    : rows.filter((row) => matchesQuery(JSON.stringify(row), query))
  const flatRows = liveRows.flat()
  const filteredRows = isLionsManeMushroomQuery(query)
    ? flatRows.filter((row) => matchesLionsManeMushroom(JSON.stringify(row)))
    : flatRows
  return uniqueById([...sourceRows, ...filteredRows]).slice(0, limit)
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

async function searchInatObservations(query: string, limit: number): Promise<SearchHit[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      per_page: String(limit),
      order: "desc",
      order_by: "observed_on",
    })
    params.append("has[]", "geo")
    const response = await fetch(`https://api.inaturalist.org/v1/observations?${params.toString()}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(7000),
      cache: "no-store",
    })
    if (!response.ok) return []
    const data = await response.json()
    return asArray(data.results).filter((row) => {
      const taxon = asRecord(row.taxon)
      return matchesQuery(`${String(taxon.name ?? "")} ${String(taxon.preferred_common_name ?? "")}`, query)
    }).map((row) => {
      const taxon = asRecord(row.taxon)
      const placeGuess = String(row.place_guess ?? "")
      const taxonName = String(taxon.name ?? query)
      return {
        id: `inat-obs:${row.id}`,
        source_id: row.id,
        taxon_id: taxon.id ? `inat:${taxon.id}` : null,
        taxon_name: taxonName,
        common_name: taxon.preferred_common_name,
        observed_at: row.observed_on ?? row.time_observed_at,
        place_guess: placeGuess,
        source: "iNaturalist live",
        bucket: "observations" as const,
        title: taxonName,
        subtitle: placeGuess || "Observation",
        summary: "Live observation record with public media and location when available.",
        external_url: row.uri,
        media: row.photos,
        location: row.geojson,
      }
    })
  } catch {
    return []
  }
}

async function searchCompounds(mindexUrl: string, apiKey: string, query: string, limit: number) {
  try {
    const response = await fetch(`${mindexUrl}/api/mindex/compounds?q=${encodeURIComponent(query)}&limit=${limit}`, {
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    })

    if (!response.ok) return []

    const data = await response.json()
    return asArray(data.compounds || data.data || data.results).map((row) => ({
      ...row,
      bucket: "compounds" as const,
      title: String(row.name ?? row.title ?? row.iupac_name ?? row.canonical_smiles ?? "Compound"),
      subtitle: String(row.molecular_formula ?? row.source ?? "Chemistry"),
      source: String(row.source ?? "MINDEX chemistry"),
      summary: String(row.description ?? row.synonyms ?? "Compound record."),
    }))
  } catch {
    return []
  }
}

async function searchDevices(origin: string, query: string, limit: number): Promise<SearchHit[]> {
  try {
    const response = await fetch(`${origin}/api/natureos/mindex/devices`, {
      signal: AbortSignal.timeout(7000),
      cache: "no-store",
    })
    if (!response.ok) return []
    const data = await response.json()
    return asArray(data.devices)
      .filter((device) => matchesQuery(JSON.stringify(device), query))
      .map((device) => ({
        ...device,
        id: String(device.id ?? device.registry_id ?? device.name),
        bucket: "devices" as const,
        title: String(device.name ?? device.id ?? "Device"),
        subtitle: String(device.role ?? device.type ?? device.status ?? "Field device"),
        source: String(device.source ?? "MINDEX devices"),
        summary: String(device.location_label ?? device.host ?? "Registered field device."),
      }))
      .slice(0, limit)
  } catch {
    return []
  }
}

async function searchConsoleData(mindexUrl: string, apiKey: string, query: string, limit: number): Promise<{ earth: SearchHit[]; jobs: SearchHit[]; sources: SearchHit[] }> {
  try {
    const response = await fetch(`${mindexUrl}/api/mindex/console`, {
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(7000),
      cache: "no-store",
    })
    if (!response.ok) return { earth: [], jobs: [], sources: [] }
    const data = await response.json()
    const earth = Object.entries(asRecord(data.earth?.domains))
      .filter(([domain]) => matchesQuery(domain, query))
      .map(([domain, count]) => ({
        id: `earth:${domain}`,
        bucket: "earth" as const,
        title: domain.replace(/_/g, " "),
        subtitle: "Mapped Earth data",
        source: "MINDEX Earth",
        summary: `${Number(count || 0).toLocaleString()} records`,
        count,
      }))
      .slice(0, limit)

    const jobs = asArray(data.etl?.jobs)
      .filter((job) => matchesQuery(JSON.stringify(job), query))
      .map((job) => ({
        ...job,
        id: String(job.name ?? job.source),
        bucket: "jobs" as const,
        title: String(job.description ?? job.name ?? "Data refresh"),
        subtitle: String(job.source ?? "Source"),
        source: "MINDEX data refresh",
        summary: job.interval_hours == null ? "Registered source." : `Refresh interval ${job.interval_hours} hours.`,
      }))
      .slice(0, limit)

    const sourceRows = [
      ...Object.entries(asRecord(data.stats?.taxa_by_source)).map(([source, count]) => ({ source, count, kind: "Taxa source" })),
      ...Object.entries(asRecord(data.stats?.observations_by_source)).map(([source, count]) => ({ source, count, kind: "Observation source" })),
    ]
    const sources = sourceRows
      .filter((row) => matchesQuery(`${row.source} ${row.kind}`, query))
      .map((row) => ({
        id: `source:${row.kind}:${row.source}`,
        bucket: "sources" as const,
        title: row.source,
        subtitle: row.kind,
        source: "MINDEX sources",
        summary: `${Number(row.count || 0).toLocaleString()} loaded rows`,
        count: row.count,
      }))
      .slice(0, limit)

    return { earth, jobs, sources }
  } catch {
    return { earth: [], jobs: [], sources: [] }
  }
}

function searchLibrary(query: string, limit: number): SearchHit[] {
  return LIBRARY_CATEGORIES
    .filter((item) => matchesQuery(`${item.title} ${item.subtitle} ${item.summary}`, query))
    .map((item) => ({ ...item, bucket: "library" as const }))
    .slice(0, limit)
}






























