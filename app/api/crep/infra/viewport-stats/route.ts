import { promises as fs } from "node:fs"
import path from "node:path"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Bbox = {
  west: number
  south: number
  east: number
  north: number
}

type PowerPlantSummary = {
  id: string
  name: string
  lat: number
  lng: number
  capacity_mw: number
  fuel_type: string
  status: string
  owner?: string
  source?: string
  country?: string
  state?: string
}

type DatacenterSummary = {
  id: string
  name: string
  lat: number
  lng: number
  operator?: string
  status?: string
  type?: string
  city?: string
  state?: string
  country?: string
  source?: string
}

type PlantStats = {
  totalPlants: number
  totalCapacityGW: number
  byFuelType: { fuel: string; count: number; capacityGW: number; color: string }[]
}

const FUEL_COLORS: Record<string, string> = {
  solar: "#f59e0b",
  wind: "#14b8a6",
  "offshore wind": "#3b82f6",
  hydro: "#38bdf8",
  geothermal: "#22c55e",
  biomass: "#eab308",
  storage: "#f43f5e",
  "pumped storage": "#a855f7",
  battery: "#f43f5e",
  nuclear: "#4ade80",
  gas: "#a855f7",
  "natural gas": "#a855f7",
  coal: "#9ca3af",
  oil: "#ef4444",
  petroleum: "#ef4444",
  waste: "#6b7280",
  other: "#6b7280",
  unknown: "#6b7280",
}

let powerPlantsPromise: Promise<PowerPlantSummary[]> | null = null
let datacentersPromise: Promise<DatacenterSummary[]> | null = null

function readGeojsonFeatures(fileName: string): Promise<any[]> {
  const filePath = path.join(process.cwd(), "public", "data", "crep", fileName)
  return fs.readFile(filePath, "utf8").then((raw) => {
    const json = JSON.parse(raw)
    return Array.isArray(json?.features) ? json.features : []
  })
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

function cleanString(value: unknown, fallback = ""): string {
  if (typeof value !== "string") return fallback
  const trimmed = value.trim()
  return trimmed || fallback
}

function normalizeFuel(value: unknown): string {
  const raw = cleanString(value, "Other")
  const key = raw.toLowerCase()
  if (key.includes("natural gas")) return "Natural Gas"
  if (key.includes("gas")) return "Gas"
  if (key.includes("solar")) return "Solar"
  if (key.includes("offshore wind")) return "Offshore Wind"
  if (key.includes("wind")) return "Wind"
  if (key.includes("hydro")) return "Hydro"
  if (key.includes("pumped")) return "Pumped Storage"
  if (key.includes("nuclear")) return "Nuclear"
  if (key.includes("coal")) return "Coal"
  if (key.includes("oil") || key.includes("petroleum")) return "Oil"
  if (key.includes("storage") || key.includes("battery")) return "Storage"
  if (key.includes("geo")) return "Geothermal"
  if (key.includes("bio")) return "Biomass"
  if (key.includes("waste")) return "Waste"
  return raw
}

function titleCaseFuel(fuel: string): string {
  return fuel
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ")
}

function fuelColor(fuel: string): string {
  return FUEL_COLORS[fuel.toLowerCase()] ?? FUEL_COLORS.other
}

function parseBbox(raw: string | null): Bbox {
  if (!raw) {
    return { west: -180, south: -90, east: 180, north: 90 }
  }
  const [west, south, east, north] = raw.split(",").map(Number)
  if (![west, south, east, north].every(Number.isFinite)) {
    return { west: -180, south: -90, east: 180, north: 90 }
  }
  return {
    west: Math.max(-180, Math.min(180, west)),
    south: Math.max(-90, Math.min(90, Math.min(south, north))),
    east: Math.max(-180, Math.min(180, east)),
    north: Math.max(-90, Math.min(90, Math.max(south, north))),
  }
}

function pointInBbox(lat: number, lng: number, bbox: Bbox): boolean {
  if (lat < bbox.south || lat > bbox.north) return false
  if (bbox.west <= bbox.east) return lng >= bbox.west && lng <= bbox.east
  return lng >= bbox.west || lng <= bbox.east
}

function loadPowerPlants(): Promise<PowerPlantSummary[]> {
  if (!powerPlantsPromise) {
    powerPlantsPromise = readGeojsonFeatures("power-plants-global.geojson").then((features) =>
      features
        .map((feature): PowerPlantSummary | null => {
          const props = feature?.properties ?? {}
          const [lngRaw, latRaw] = feature?.geometry?.coordinates ?? []
          const lat = toFiniteNumber(latRaw, Number.NaN)
          const lng = toFiniteNumber(lngRaw, Number.NaN)
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
          const name = cleanString(props.name, "Power Plant")
          const fuel = normalizeFuel(props.fuel ?? props.primary_fuel ?? props.technology)
          return {
            id: cleanString(props.id, `${name}-${lat.toFixed(4)}-${lng.toFixed(4)}`),
            name,
            lat,
            lng,
            capacity_mw: Math.max(0, toFiniteNumber(props.capacity_mw ?? props.capacity, 0)),
            fuel_type: fuel,
            status: cleanString(props.status, "Operating"),
            owner: cleanString(props.owner ?? props.operator, ""),
            source: cleanString(props.source, "WRI"),
            country: cleanString(props.country_long ?? props.country, ""),
            state: cleanString(props.state, ""),
          } satisfies PowerPlantSummary
        })
        .filter((plant): plant is PowerPlantSummary => Boolean(plant)),
    )
  }
  return powerPlantsPromise
}

function loadDatacenters(): Promise<DatacenterSummary[]> {
  if (!datacentersPromise) {
    datacentersPromise = readGeojsonFeatures("data-centers-global.geojson").then((features) =>
      features
        .map((feature): DatacenterSummary | null => {
          const props = feature?.properties ?? {}
          const [lngRaw, latRaw] = feature?.geometry?.coordinates ?? []
          const lat = toFiniteNumber(latRaw, Number.NaN)
          const lng = toFiniteNumber(lngRaw, Number.NaN)
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
          const name = cleanString(props.n ?? props.name, "Data Center")
          return {
            id: cleanString(props.id, `${name}-${lat.toFixed(4)}-${lng.toFixed(4)}`),
            name,
            lat,
            lng,
            operator: cleanString(props.op ?? props.operator, ""),
            status: cleanString(props.status, "operational"),
            type: cleanString(props.type, "data_center"),
            city: cleanString(props.city, ""),
            state: cleanString(props.state, ""),
            country: cleanString(props.country, ""),
            source: cleanString(props.src ?? props.source, "global-static"),
          } satisfies DatacenterSummary
        })
        .filter((dc): dc is DatacenterSummary => Boolean(dc)),
    )
  }
  return datacentersPromise
}

function computePlantStats(plants: PowerPlantSummary[]): PlantStats {
  const byFuel = new Map<string, { count: number; capacityMW: number }>()
  let totalCapacityMW = 0
  for (const plant of plants) {
    const fuel = normalizeFuel(plant.fuel_type)
    const entry = byFuel.get(fuel) ?? { count: 0, capacityMW: 0 }
    entry.count += 1
    entry.capacityMW += plant.capacity_mw
    totalCapacityMW += plant.capacity_mw
    byFuel.set(fuel, entry)
  }
  return {
    totalPlants: plants.length,
    totalCapacityGW: +(totalCapacityMW / 1000).toFixed(1),
    byFuelType: Array.from(byFuel.entries())
      .map(([fuel, entry]) => ({
        fuel: titleCaseFuel(fuel),
        count: entry.count,
        capacityGW: +(entry.capacityMW / 1000).toFixed(1),
        color: fuelColor(fuel),
      }))
      .sort((a, b) => b.capacityGW - a.capacityGW),
  }
}

function samplePlantsForClient(plants: PowerPlantSummary[], limit: number): PowerPlantSummary[] {
  if (plants.length <= limit) return plants
  return plants
    .slice()
    .sort((a, b) => b.capacity_mw - a.capacity_mw)
    .slice(0, limit)
}

function sampleDatacentersForClient(datacenters: DatacenterSummary[], limit: number): DatacenterSummary[] {
  if (datacenters.length <= limit) return datacenters
  return datacenters.slice(0, limit)
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const bbox = parseBbox(url.searchParams.get("bbox"))
  const plantLimit = Math.max(100, Math.min(15000, Number(url.searchParams.get("plantLimit") || 8000)))
  const datacenterLimit = Math.max(50, Math.min(5000, Number(url.searchParams.get("datacenterLimit") || 2000)))

  try {
    const [allPlants, allDatacenters] = await Promise.all([loadPowerPlants(), loadDatacenters()])
    const plantsInViewport = allPlants.filter((plant) => pointInBbox(plant.lat, plant.lng, bbox))
    const datacentersInViewport = allDatacenters.filter((dc) => pointInBbox(dc.lat, dc.lng, bbox))
    const plantStats = computePlantStats(plantsInViewport)

    return NextResponse.json(
      {
        ok: true,
        bbox,
        counts: {
          plants: plantsInViewport.length,
          datacenters: datacentersInViewport.length,
        },
        plantStats,
        plants: samplePlantsForClient(plantsInViewport, plantLimit),
        datacenters: sampleDatacentersForClient(datacentersInViewport, datacenterLimit),
        sampled: {
          plants: plantsInViewport.length > plantLimit,
          datacenters: datacentersInViewport.length > datacenterLimit,
        },
        generatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
        },
      },
    )
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "viewport infra stats failed",
      },
      { status: 500 },
    )
  }
}
