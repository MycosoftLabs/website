/**
 * Space Weather API Route
 * 
 * GET /api/oei/space-weather - Fetch current space weather conditions from NOAA SWPC
 * 
 * Query params:
 * - type: "conditions" | "events" (default: conditions)
 */

import { NextResponse } from "next/server"
import { getSpaceWeatherClient } from "@/lib/oei/connectors"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type") || "conditions"

  try {
    const client = getSpaceWeatherClient()

    if (type === "events") {
      const events = await client.fetchEvents()
      return NextResponse.json({
        source: "swpc",
        timestamp: new Date().toISOString(),
        total: events.length,
        events,
      })
    }

    // Default: fetch conditions
    const conditions = await client.fetchConditions()

    return NextResponse.json({
      source: "swpc",
      timestamp: new Date().toISOString(),
      conditions,
      scales: {
        radio: {
          current: conditions.rScale,
          label: `R${conditions.rScale}`,
          description: conditions.rScale === 0 ? "None" : `R${conditions.rScale} Radio Blackout`,
        },
        solar: {
          current: conditions.sScale,
          label: `S${conditions.sScale}`,
          description: conditions.sScale === 0 ? "None" : `S${conditions.sScale} Solar Radiation Storm`,
        },
        geomagnetic: {
          current: conditions.gScale,
          label: `G${conditions.gScale}`,
          description: conditions.gScale === 0 ? "None" : `G${conditions.gScale} Geomagnetic Storm`,
        },
      },
      solarWind: {
        speed: conditions.solarWindSpeed,
        speedUnit: "km/s",
        density: conditions.solarWindDensity,
        densityUnit: "p/cm³",
      },
      magneticField: {
        bz: conditions.bz,
        bt: conditions.bt,
        unit: "nT",
        stormPotential: conditions.bz < -10 ? "High" : conditions.bz < -5 ? "Moderate" : "Low",
      },
    })
  } catch (error) {
    console.error("[API] Space weather error:", error)
    return NextResponse.json(
      { error: "Failed to fetch space weather data" },
      { status: 500 }
    )
  }
}
