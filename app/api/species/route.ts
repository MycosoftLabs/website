import { NextResponse } from "next/server"
import { find, findOne } from "@/lib/mongodb"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (id) {
      // Get a single species by ID
      const species = await findOne("species", { id })

      if (!species) {
        return NextResponse.json({ error: "Species not found" }, { status: 404 })
      }

      return NextResponse.json(species)
    } else {
      // Get all species with optional filtering
      const filter: Record<string, any> = {}

      // Add any search filters from query params
      const name = searchParams.get("name")
      if (name) {
        filter.$or = [
          { commonName: { $regex: name, $options: "i" } },
          { scientificName: { $regex: name, $options: "i" } },
        ]
      }

      const type = searchParams.get("type")
      if (type) {
        filter.type = type
      }

      const species = await find("species", filter)
      return NextResponse.json(species)
    }
  } catch (error) {
    console.error("Species API error:", error)
    return NextResponse.json({ error: "Failed to fetch species data" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")

    if (!action) {
      return NextResponse.json({ error: "Action parameter is required" }, { status: 400 })
    }

    switch (action) {
      case "search":
        const { query } = await request.json()
        const results = await find("species", {
          $or: [
            { commonName: { $regex: query, $options: "i" } },
            { scientificName: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } },
          ],
        })
        return NextResponse.json(results)

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Species API error:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}
