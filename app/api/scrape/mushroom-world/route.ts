import { NextResponse } from "next/server"
import { scrapeMushroomWorldNamelist, batchFetchMushroomWorldDetails } from "@/lib/services/mushroom-world-scraper"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action") || "list"
    const limit = Number(searchParams.get("limit")) || 100

    if (action === "list") {
      // Just get the list of species
      const species = await scrapeMushroomWorldNamelist()
      return NextResponse.json({
        species: species.slice(0, limit),
        total: species.length,
        message: `Found ${species.length} species from mushroom.world`,
      })
    } else if (action === "details") {
      // Get list and fetch details
      const species = await scrapeMushroomWorldNamelist()
      const limitedSpecies = species.slice(0, limit)
      const details = await batchFetchMushroomWorldDetails(limitedSpecies, 5, 1000)

      return NextResponse.json({
        species: details,
        total: details.length,
        message: `Fetched details for ${details.length} species`,
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Mushroom.world scraping error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to scrape mushroom.world",
      },
      { status: 500 },
    )
  }
}
