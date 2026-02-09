/**
 * Earth2 Memory - Forecasts API Route
 * February 5, 2026
 */

import { NextRequest, NextResponse } from "next/server"

const MAS_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { searchParams } = new URL(request.url)
  const limit = searchParams.get("limit") || "10"
  const model = searchParams.get("model")
  
  try {
    let url = `${MAS_URL}/api/earth2-memory/forecasts/${params.userId}?limit=${limit}`
    if (model) url += `&model=${model}`
    
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    })
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `MAS API error: ${response.status}` },
        { status: response.status }
      )
    }
    
    return NextResponse.json(await response.json())
  } catch (error) {
    console.error("Earth2 forecasts API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch forecasts" },
      { status: 503 }
    )
  }
}