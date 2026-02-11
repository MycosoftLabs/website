/**
 * FCI Patterns API Route
 * 
 * Proxies FCI pattern detection and GFST library to MINDEX API
 * 
 * GET /api/fci/patterns - Get detected patterns
 * POST /api/fci/patterns - Record a detected pattern
 */

import { NextRequest, NextResponse } from "next/server"

const MINDEX_API_URL = process.env.MINDEX_API_URL || "http://192.168.0.189:8000"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get("device_id")
    const patternName = searchParams.get("pattern_name")
    const category = searchParams.get("category")
    const minConfidence = searchParams.get("min_confidence")
    const hours = searchParams.get("hours") || "24"
    const limit = searchParams.get("limit") || "100"
    
    const params = new URLSearchParams({ hours, limit })
    if (deviceId) params.append("device_id", deviceId)
    if (patternName) params.append("pattern_name", patternName)
    if (category) params.append("category", category)
    if (minConfidence) params.append("min_confidence", minConfidence)
    
    const response = await fetch(
      `${MINDEX_API_URL}/api/fci/patterns?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
    
    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json(
        { error: `MINDEX API error: ${error}` },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("FCI patterns fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch FCI patterns" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const response = await fetch(`${MINDEX_API_URL}/api/fci/patterns`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })
    
    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json(
        { error: `MINDEX API error: ${error}` },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("FCI pattern recording error:", error)
    return NextResponse.json(
      { error: "Failed to record FCI pattern" },
      { status: 500 }
    )
  }
}
