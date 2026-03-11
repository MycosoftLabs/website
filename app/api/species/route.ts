import { NextResponse } from "next/server"
import { find, findOne } from "@/lib/mongodb"

// SECURITY: Escape regex special characters to prevent ReDoS and NoSQL injection
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const MAX_RESULTS = 100;

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
        const safeName = escapeRegex(name)
        filter.$or = [
          { commonName: { $regex: safeName, $options: "i" } },
          { scientificName: { $regex: safeName, $options: "i" } },
        ]
      }

      const type = searchParams.get("type")
      if (type) {
        filter.type = type
      }

      const limit = Math.min(Number(searchParams.get("limit")) || MAX_RESULTS, MAX_RESULTS)
      const species = await find("species", filter, { limit })
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
        const safeQuery = escapeRegex(query || '')
        const results = await find("species", {
          $or: [
            { commonName: { $regex: safeQuery, $options: "i" } },
            { scientificName: { $regex: safeQuery, $options: "i" } },
            { description: { $regex: safeQuery, $options: "i" } },
          ],
        }, { limit: MAX_RESULTS })
        return NextResponse.json(results)

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Species API error:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}
