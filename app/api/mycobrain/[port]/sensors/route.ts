import { NextRequest, NextResponse } from "next/server"

const MYCOBRAIN_SERVICE_URL = process.env.MYCOBRAIN_SERVICE_URL || "http://localhost:8765"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ port: string }> }
) {
  const { port } = await params
  
  try {
    const response = await fetch(
      `${MYCOBRAIN_SERVICE_URL}/devices/${encodeURIComponent(port)}/sensors`,
      { signal: AbortSignal.timeout(5000) }
    )
    
    if (response.ok) {
      const data = await response.json()
      return NextResponse.json(data)
    }
    
    throw new Error("Failed to get sensor data")
  } catch (error) {
    // Return mock sensor data for development
    return NextResponse.json({
      port,
      sensors: {
        bme688_1: {
          temperature: 23.5 + Math.random() * 2 - 1,
          humidity: 45.2 + Math.random() * 5 - 2.5,
          pressure: 1013.25 + Math.random() * 2 - 1,
          gas_resistance: 50000 + Math.random() * 5000 - 2500,
          iaq: Math.floor(85 + Math.random() * 10 - 5),
          iaq_accuracy: 3,
        },
        bme688_2: {
          temperature: 24.1 + Math.random() * 2 - 1,
          humidity: 44.8 + Math.random() * 5 - 2.5,
          pressure: 1013.20 + Math.random() * 2 - 1,
          gas_resistance: 48500 + Math.random() * 5000 - 2500,
          iaq: Math.floor(82 + Math.random() * 10 - 5),
          iaq_accuracy: 3,
        },
        last_update: new Date().toISOString(),
      },
      source: "mock",
      timestamp: new Date().toISOString(),
    })
  }
}

