/**
 * FCI Devices API Route
 * 
 * Proxies FCI device registration and listing to MINDEX API
 * 
 * GET /api/fci/devices - List all FCI devices
 * POST /api/fci/devices - Register a new FCI device
 */

import { NextRequest, NextResponse } from "next/server"

const MINDEX_API_URL = process.env.MINDEX_API_URL || "http://192.168.0.189:8000"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const probeType = searchParams.get("probe_type")
    
    // Build query string
    const params = new URLSearchParams()
    if (status) params.append("status", status)
    if (probeType) params.append("probe_type", probeType)
    
    const queryString = params.toString()
    const url = `${MINDEX_API_URL}/api/fci/devices${queryString ? `?${queryString}` : ""}`
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
    
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
    console.error("FCI devices fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch FCI devices" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const response = await fetch(`${MINDEX_API_URL}/api/fci/devices`, {
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
    console.error("FCI device registration error:", error)
    return NextResponse.json(
      { error: "Failed to register FCI device" },
      { status: 500 }
    )
  }
}
