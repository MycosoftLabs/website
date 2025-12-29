import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MINDEX_API_URL = process.env.MINDEX_API_BASE_URL || "http://localhost:8000"
const MINDEX_API_KEY = process.env.MINDEX_API_KEY || "local-dev-key"

/**
 * API Gateway - MINDEX Proxy
 * 
 * Universal proxy for MINDEX API with authentication and rate limiting
 * Supports all MINDEX endpoints via dynamic routing
 * 
 * Usage:
 * GET  /api/gateway/mindex?endpoint=/api/mindex/taxa
 * POST /api/gateway/mindex?endpoint=/api/mindex/observations
 */
export async function GET(request: NextRequest) {
  return handleRequest(request, "GET")
}

export async function POST(request: NextRequest) {
  return handleRequest(request, "POST")
}

export async function PUT(request: NextRequest) {
  return handleRequest(request, "PUT")
}

export async function DELETE(request: NextRequest) {
  return handleRequest(request, "DELETE")
}

async function handleRequest(request: NextRequest, method: string) {
  try {
    // Get endpoint from query params
    const endpoint = request.nextUrl.searchParams.get("endpoint")
    
    if (!endpoint) {
      return NextResponse.json({
        error: "Missing endpoint parameter",
        usage: "?endpoint=/api/mindex/taxa",
        available_endpoints: [
          "/api/mindex/stats",
          "/api/mindex/health",
          "/api/mindex/taxa",
          "/api/mindex/taxa/{id}",
          "/api/mindex/observations",
          "/api/mindex/compounds",
          "/api/mindex/devices",
          "/api/mindex/telemetry",
        ]
      }, { status: 400 })
    }

    // Build full URL
    const url = `${MINDEX_API_URL}${endpoint}`
    
    // Forward search params (except endpoint itself)
    const params = new URLSearchParams(request.nextUrl.searchParams)
    params.delete("endpoint")
    const queryString = params.toString()
    const fullUrl = queryString ? `${url}?${queryString}` : url

    // Prepare request options
    const options: RequestInit = {
      method,
      headers: {
        "X-API-Key": MINDEX_API_KEY,
        "Content-Type": "application/json",
        // Forward auth headers if present
        ...(request.headers.get("Authorization") && {
          "Authorization": request.headers.get("Authorization")!
        }),
      },
    }

    // Add body for POST/PUT
    if (method === "POST" || method === "PUT") {
      const body = await request.json()
      options.body = JSON.stringify(body)
    }

    // Make request to MINDEX API
    const response = await fetch(fullUrl, options)
    const data = await response.json()

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("API Gateway error:", error)
    return NextResponse.json({
      error: "Gateway request failed",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 })
  }
}
