import { NextRequest, NextResponse } from "next/server"

/**
 * Timeline API Proxy - February 6, 2026
 * 
 * Proxies timeline requests to MAS backend.
 * Provides query and batch endpoints.
 */

const MAS_URL = process.env.MAS_ORCHESTRATOR_URL || "http://192.168.0.188:8001"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const queryString = searchParams.toString()
    
    const response = await fetch(`${MAS_URL}/timeline/range?${queryString}`, {
      headers: {
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 }, // No cache for timeline data
    })
    
    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json(
        { error: `MAS error: ${response.status}`, details: error },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    })
  } catch (error) {
    console.error("[Timeline API] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch timeline data", details: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Check if this is a batch request
    if (body.queries && Array.isArray(body.queries)) {
      const response = await fetch(`${MAS_URL}/timeline/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })
      
      if (!response.ok) {
        const error = await response.text()
        return NextResponse.json(
          { error: `MAS error: ${response.status}`, details: error },
          { status: response.status }
        )
      }
      
      const data = await response.json()
      return NextResponse.json(data)
    }
    
    // Otherwise it is an ingest request
    if (body.entries && Array.isArray(body.entries)) {
      const response = await fetch(`${MAS_URL}/timeline/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })
      
      if (!response.ok) {
        const error = await response.text()
        return NextResponse.json(
          { error: `MAS error: ${response.status}`, details: error },
          { status: response.status }
        )
      }
      
      const data = await response.json()
      return NextResponse.json(data)
    }
    
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    )
  } catch (error) {
    console.error("[Timeline API] POST Error:", error)
    return NextResponse.json(
      { error: "Failed to process request", details: String(error) },
      { status: 500 }
    )
  }
}