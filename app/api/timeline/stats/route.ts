import { NextResponse } from "next/server"

/**
 * Timeline Cache Stats - February 6, 2026
 */

const MAS_URL = process.env.MAS_ORCHESTRATOR_URL || "http://192.168.0.188:8001"

export async function GET() {
  try {
    const response = await fetch(`${MAS_URL}/timeline/stats`, {
      headers: {
        "Content-Type": "application/json",
      },
      next: { revalidate: 30 },
    })
    
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch stats" },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("[Timeline Stats] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch stats", details: String(error) },
      { status: 500 }
    )
  }
}