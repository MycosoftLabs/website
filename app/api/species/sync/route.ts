import { type NextRequest, NextResponse } from "next/server"
import { syncSpeciesToDatabase } from "@/lib/services/database-sync"

export async function POST(request: NextRequest) {
  try {
    const { inaturalistId } = await request.json()

    if (!inaturalistId) {
      return NextResponse.json({ error: "iNaturalist ID is required" }, { status: 400 })
    }

    const speciesId = await syncSpeciesToDatabase(inaturalistId)

    if (!speciesId) {
      return NextResponse.json({ error: "Failed to sync species" }, { status: 500 })
    }

    return NextResponse.json({ success: true, speciesId })
  } catch (error) {
    console.error("Error in species sync API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
