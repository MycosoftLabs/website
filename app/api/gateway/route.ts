import { NextResponse } from "next/server"
import { verifyApiKey } from "@/lib/auth/api-keys"
import { trackApiUsage } from "@/lib/monitoring/telemetry"

export async function GET(request: Request) {
  try {
    // Verify API key for multi-agent access
    const apiKey = request.headers.get("x-api-key")
    const isValid = await verifyApiKey(apiKey)

    if (!isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Route to appropriate internal API
    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get("endpoint")
    const agentId = request.headers.get("x-agent-id") || "unknown"

    // Track this API request
    await trackApiUsage("gateway", agentId, { endpoint, method: "GET", params: Object.fromEntries(searchParams) })

    // Handle routing logic based on endpoint
    switch (endpoint) {
      case "species":
        const speciesResponse = await fetch(new URL(`/api/species?${searchParams.toString()}`, request.url).toString())
        const speciesData = await speciesResponse.json()
        return NextResponse.json(speciesData)

      case "compounds":
        const compoundsResponse = await fetch(
          new URL(`/api/compounds?${searchParams.toString()}`, request.url).toString(),
        )
        const compoundsData = await compoundsResponse.json()
        return NextResponse.json(compoundsData)

      case "search":
        const searchResponse = await fetch(new URL(`/api/search?${searchParams.toString()}`, request.url).toString())
        const searchData = await searchResponse.json()
        return NextResponse.json(searchData)

      default:
        return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 })
    }
  } catch (error) {
    console.error("API Gateway error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    // Verify API key for multi-agent access
    const apiKey = request.headers.get("x-api-key")
    const isValid = await verifyApiKey(apiKey)

    if (!isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Route to appropriate internal API
    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get("endpoint")
    const agentId = request.headers.get("x-agent-id") || "unknown"

    // Get request body
    const body = await request.json()

    // Track this API request
    await trackApiUsage("gateway", agentId, {
      endpoint,
      method: "POST",
      params: Object.fromEntries(searchParams),
      body,
    })

    // Handle routing logic based on endpoint
    switch (endpoint) {
      case "species":
        const speciesResponse = await fetch(new URL(`/api/species`, request.url).toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        const speciesData = await speciesResponse.json()
        return NextResponse.json(speciesData)

      case "compounds":
        const compoundsResponse = await fetch(new URL(`/api/compounds?action=search`, request.url).toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        const compoundsData = await compoundsResponse.json()
        return NextResponse.json(compoundsData)

      case "search":
        const searchResponse = await fetch(new URL(`/api/search`, request.url).toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        const searchData = await searchResponse.json()
        return NextResponse.json(searchData)

      default:
        return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 })
    }
  } catch (error) {
    console.error("API Gateway error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
      { status: 500 },
    )
  }
}
