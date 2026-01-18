/**
 * Scraper API Route
 * 
 * GET /api/scrapers - List all scrapers and their statuses
 * POST /api/scrapers - Run a specific scraper or control scheduler
 * 
 * Query params (GET):
 * - category: Filter by scraper category
 * 
 * Body params (POST):
 * - action: "run" | "start" | "stop" | "enable" | "disable"
 * - scraperId: ID of scraper (required for run/enable/disable)
 */

import { NextResponse } from "next/server"
import { getScraperScheduler, getScraperCache } from "@/lib/scrapers"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category")

  try {
    const scheduler = getScraperScheduler()
    const cache = getScraperCache()

    let scraperIds: string[]
    if (category) {
      scraperIds = scheduler.getByCategory(category as Parameters<typeof scheduler.getByCategory>[0])
    } else {
      scraperIds = Object.keys(scheduler.getAllStatuses())
    }

    const scrapers = scraperIds.map(id => {
      const status = scheduler.getStatus(id)
      const cachedData = cache.getLatest(id)
      
      return {
        id,
        ...status,
        hasCachedData: !!cachedData,
        cachedAt: cachedData?.timestamp,
        expiresAt: cachedData?.expiresAt,
      }
    })

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      count: scrapers.length,
      scrapers,
      cacheStats: cache.getStats(),
    })
  } catch (error) {
    console.error("[API] Scrapers error:", error)
    return NextResponse.json(
      { error: "Failed to fetch scraper status" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, scraperId } = body

    const scheduler = getScraperScheduler()

    switch (action) {
      case "run": {
        if (!scraperId) {
          return NextResponse.json(
            { error: "scraperId required for run action" },
            { status: 400 }
          )
        }

        const result = await scheduler.runNow(scraperId)
        return NextResponse.json({
          action: "run",
          scraperId,
          result,
        })
      }

      case "start": {
        scheduler.start()
        return NextResponse.json({
          action: "start",
          message: "Scheduler started",
          statuses: scheduler.getAllStatuses(),
        })
      }

      case "stop": {
        scheduler.stop()
        return NextResponse.json({
          action: "stop",
          message: "Scheduler stopped",
        })
      }

      case "enable": {
        if (!scraperId) {
          return NextResponse.json(
            { error: "scraperId required for enable action" },
            { status: 400 }
          )
        }

        scheduler.setEnabled(scraperId, true)
        return NextResponse.json({
          action: "enable",
          scraperId,
          status: scheduler.getStatus(scraperId),
        })
      }

      case "disable": {
        if (!scraperId) {
          return NextResponse.json(
            { error: "scraperId required for disable action" },
            { status: 400 }
          )
        }

        scheduler.setEnabled(scraperId, false)
        return NextResponse.json({
          action: "disable",
          scraperId,
          status: scheduler.getStatus(scraperId),
        })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("[API] Scrapers POST error:", error)
    return NextResponse.json(
      { error: "Failed to execute scraper action" },
      { status: 500 }
    )
  }
}
