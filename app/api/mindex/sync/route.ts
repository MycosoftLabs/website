import { type NextRequest, NextResponse } from "next/server"
import { mindexClient } from "@/lib/services/mindex-client"
import { mycaOrchestrator } from "@/lib/services/myca-orchestrator"

// Sync data from external sources to MINDEX via MYCA
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { species, sources } = body

    if (!species) {
      return NextResponse.json({ error: "Species name is required" }, { status: 400 })
    }

    // Connect to MINDEX
    await mindexClient.connect()

    if (!mindexClient.isConnected()) {
      return NextResponse.json({ error: "MINDEX connection failed" }, { status: 500 })
    }

    // Submit scraping task to MYCA
    const taskId = await mycaOrchestrator.scrapeSpecies(
      species,
      sources || ["inaturalist", "wikipedia", "fungidb", "mycobank"],
    )

    return NextResponse.json({
      success: true,
      taskId,
      message: "Sync task submitted to MYCA",
    })
  } catch (error: any) {
    console.error("[v0] MINDEX sync error:", error)
    return NextResponse.json({ error: error.message || "Sync failed" }, { status: 500 })
  }
}

// Get sync status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get("taskId")

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 })
    }

    const status = await mycaOrchestrator.getTaskStatus(taskId)

    return NextResponse.json(status)
  } catch (error: any) {
    console.error("[v0] Task status error:", error)
    return NextResponse.json({ error: error.message || "Failed to get task status" }, { status: 500 })
  }
}
