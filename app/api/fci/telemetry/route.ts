/**
 * FCI Telemetry API Route
 * 
 * Proxies FCI telemetry submission to MINDEX API
 * 
 * POST /api/fci/telemetry - Submit bioelectric signal telemetry
 * GET /api/fci/telemetry?device_id=xxx - Get telemetry history
 */

import { NextRequest, NextResponse } from "next/server"

const MINDEX_API_URL = process.env.MINDEX_API_URL || "http://192.168.0.189:8000"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get("device_id")
    const limit = searchParams.get("limit") || "100"
    const hours = searchParams.get("hours") || "24"
    
    if (!deviceId) {
      return NextResponse.json(
        { error: "device_id query parameter is required" },
        { status: 400 }
      )
    }
    
    const params = new URLSearchParams({
      device_id: deviceId,
      limit,
      hours,
    })
    
    const response = await fetch(
      `${MINDEX_API_URL}/api/fci/readings?${params.toString()}`,
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
    console.error("FCI telemetry fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch FCI telemetry" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const response = await fetch(`${MINDEX_API_URL}/api/fci/telemetry`, {
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
    
    return NextResponse.json({ status: "received" }, { status: 201 })
  } catch (error) {
    console.error("FCI telemetry submission error:", error)
    return NextResponse.json(
      { error: "Failed to submit FCI telemetry" },
      { status: 500 }
    )
  }
}
