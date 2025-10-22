import { NextResponse } from "next/server"
import { getFungiDetails, searchFungi } from "@/lib/services/inaturalist"

// API route for scraping and caching iNaturalist data

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")
    const query = searchParams.get("q")
    const id = searchParams.get("id")

    if (action === "search" && query) {
      const results = await searchFungi(query)
      return NextResponse.json({
        results: results.results || [],
        source: "iNaturalist",
        cached: false,
      })
    }

    if (action === "details" && id) {
      const details = await getFungiDetails(id)
      return NextResponse.json({
        data: details,
        source: "iNaturalist",
        cached: false,
      })
    }

    return NextResponse.json({ error: "Invalid action or missing parameters" }, { status: 400 })
  } catch (error) {
    console.error("iNaturalist scrape error:", error)
    return NextResponse.json({ error: "Failed to fetch iNaturalist data" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { speciesIds } = body

    if (!Array.isArray(speciesIds)) {
      return NextResponse.json({ error: "speciesIds must be an array" }, { status: 400 })
    }

    // Batch fetch species data
    const results = await Promise.allSettled(speciesIds.map((id) => getFungiDetails(id)))

    const successfulResults = results
      .filter((result) => result.status === "fulfilled")
      .map((result: any) => result.value)

    return NextResponse.json({
      results: successfulResults,
      total: speciesIds.length,
      successful: successfulResults.length,
      source: "iNaturalist",
    })
  } catch (error) {
    console.error("Batch scrape error:", error)
    return NextResponse.json({ error: "Failed to batch fetch species data" }, { status: 500 })
  }
}
