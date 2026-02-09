/**
 * Earth2 Memory API Route - February 5, 2026
 * 
 * Proxies requests to the MAS backend for Earth2 memory operations.
 */

import { NextRequest, NextResponse } from "next/server"

const MAS_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const path = searchParams.get("path") || ""
  
  try {
    const response = await fetch(`${MAS_URL}/api/earth2-memory${path}`, {
      headers: {
        "Content-Type": "application/json",
      },
    })
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `MAS API error: ${response.status}` },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Earth2 memory API error:", error)
    return NextResponse.json(
      { error: "Failed to connect to MAS API" },
      { status: 503 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const path = body.path || ""
    
    const response = await fetch(`${MAS_URL}/api/earth2-memory${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body.data || body),
    })
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `MAS API error: ${response.status}` },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Earth2 memory API error:", error)
    return NextResponse.json(
      { error: "Failed to connect to MAS API" },
      { status: 503 }
    )
  }
}