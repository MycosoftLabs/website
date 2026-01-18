/**
 * Space Weather Scraper API Route
 * 
 * GET /api/scrapers/space-weather - Get scraped space weather data from spaceweather.com
 * POST /api/scrapers/space-weather - Trigger immediate scrape
 * 
 * This supplements the NOAA SWPC API with additional context, news, and imagery
 * scraped from spaceweather.com
 */

import { NextResponse } from "next/server"
import { getScraperScheduler, getScraperCache, type SpaceWeatherScrapedData } from "@/lib/scrapers"

const SCRAPER_ID = "spaceweather-com"

export async function GET() {
  try {
    const cache = getScraperCache()
    const scheduler = getScraperScheduler()

    // Try to get cached data first
    let data = cache.getLatest<SpaceWeatherScrapedData>(SCRAPER_ID)

    // If no cached data, run scraper
    if (!data) {
      console.log("[API] No cached space weather data, running scraper...")
      const result = await scheduler.runNow(SCRAPER_ID)
      
      if (result.success && result.data) {
        data = result.data as typeof data
      } else {
        return NextResponse.json({
          source: "spaceweather.com",
          status: "unavailable",
          error: result.error || "Scraper failed",
          fallback: getDefaultData(),
        })
      }
    }

    return NextResponse.json({
      source: "spaceweather.com",
      status: "live",
      timestamp: data.timestamp,
      expiresAt: data.expiresAt,
      metadata: data.metadata,
      data: data.data,
    })
  } catch (error) {
    console.error("[API] Space weather scraper error:", error)
    return NextResponse.json({
      source: "spaceweather.com",
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
      fallback: getDefaultData(),
    })
  }
}

export async function POST() {
  try {
    const scheduler = getScraperScheduler()
    const result = await scheduler.runNow(SCRAPER_ID)

    return NextResponse.json({
      action: "scrape",
      scraperId: SCRAPER_ID,
      success: result.success,
      error: result.error,
      data: result.data,
    })
  } catch (error) {
    console.error("[API] Space weather scrape trigger error:", error)
    return NextResponse.json(
      { error: "Failed to trigger scrape" },
      { status: 500 }
    )
  }
}

function getDefaultData(): SpaceWeatherScrapedData {
  return {
    solarActivity: {
      flareClass: "B-class",
      flareRegion: "Quiet",
      flareTime: "N/A",
      xrayFlux: "B-class",
    },
    solarWind: {
      speed: "~400 km/s",
      density: "~5 p/cm³",
      temperature: "~100,000 K",
    },
    geomagneticActivity: {
      kpIndex: "1-2",
      kpForecast: ["1-2", "1-2", "1-2"],
      stormLevel: "Quiet",
    },
    coronalHoles: {
      count: 0,
      positions: [],
    },
    cme: {
      active: false,
    },
    auroraForecast: {
      visibility: "Low",
      regions: ["Polar regions only"],
    },
    sunImages: {},
  }
}
