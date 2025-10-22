import { NextResponse } from "next/server"
import { getAllSpecies, searchSpecies, filterSpeciesByCharacteristic } from "@/lib/services/ancestry-service"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("query")
  const filter = searchParams.get("filter")

  try {
    let species

    if (query) {
      species = await searchSpecies(query)
    } else if (filter && filter !== "All") {
      species = await filterSpeciesByCharacteristic(filter)
    } else {
      species = await getAllSpecies()
    }

    return NextResponse.json({ species })
  } catch (error) {
    console.error("Error in ancestry API route:", error)
    return NextResponse.json({ error: "Failed to fetch species data" }, { status: 500 })
  }
}
