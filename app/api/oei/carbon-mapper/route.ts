/**
 * Carbon Mapper Emissions API Route
 * 
 * GET /api/oei/carbon-mapper - Fetch methane/CO2 emission plumes
 * 
 * Query params:
 * - lamin, lamax, lomin, lomax: Bounding box coordinates
 * - sector: Filter by sector (oil_gas, landfill, mining, etc.)
 * - gas_type: methane | co2
 * - min_rate: Minimum emission rate in kg/hr
 * - limit: Maximum results to return
 */

import { NextResponse } from "next/server"
import { getCarbonMapperClient } from "@/lib/oei/connectors"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  
  // Parse bounding box
  const lamin = searchParams.get("lamin")
  const lamax = searchParams.get("lamax")
  const lomin = searchParams.get("lomin")
  const lomax = searchParams.get("lomax")
  
  // Other params
  const sector = searchParams.get("sector")
  const gasType = searchParams.get("gas_type") as "methane" | "co2" | null
  const minRate = searchParams.get("min_rate")
  const limit = searchParams.get("limit")

  try {
    const client = getCarbonMapperClient()
    
    const query = {
      bounds: lamin && lamax && lomin && lomax
        ? {
            south: parseFloat(lamin),
            north: parseFloat(lamax),
            west: parseFloat(lomin),
            east: parseFloat(lomax),
          }
        : undefined,
      sector: sector ? sector.split(",") : undefined,
      gasType: gasType || undefined,
      minEmissionRate: minRate ? parseFloat(minRate) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    }

    const emissions = await client.fetchPlumes(query)

    return NextResponse.json({
      source: "carbon_mapper",
      timestamp: new Date().toISOString(),
      total: emissions.length,
      emissions,
    })
  } catch (error) {
    console.error("[API] Carbon Mapper error:", error)
    return NextResponse.json(
      { error: "Failed to fetch Carbon Mapper data" },
      { status: 500 }
    )
  }
}
