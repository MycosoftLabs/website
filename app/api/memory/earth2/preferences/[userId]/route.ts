/**
 * Earth2 Memory - Preferences API Route
 * February 5, 2026
 */

import { NextRequest, NextResponse } from "next/server"

const MAS_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const response = await fetch(
      `${MAS_URL}/api/earth2-memory/preferences/${params.userId}`,
      { headers: { "Content-Type": "application/json" } }
    )
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `MAS API error: ${response.status}` },
        { status: response.status }
      )
    }
    
    return NextResponse.json(await response.json())
  } catch (error) {
    console.error("Earth2 preferences API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 503 }
    )
  }
}