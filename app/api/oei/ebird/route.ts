/**
 * eBird Bird Observations API Route
 * 
 * GET /api/oei/ebird - Fetch bird observations from eBird
 */

import { NextRequest, NextResponse } from "next/server"
import { getEBirdClient } from "@/lib/oei/connectors"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Required: latitude and longitude
    const lat = searchParams.get("lat")
    const lng = searchParams.get("lng")
    
    if (!lat || !lng) {
      return NextResponse.json(
        {
          success: false,
          error: "lat and lng parameters are required",
          entities: [],
        },
        { status: 400 }
      )
    }

    const options: {
      dist?: number
      back?: number
      hotspot?: boolean
      includeProvisional?: boolean
      maxResults?: number
    } = {}
    
    if (searchParams.get("dist")) options.dist = parseInt(searchParams.get("dist")!)
    if (searchParams.get("back")) options.back = parseInt(searchParams.get("back")!)
    if (searchParams.get("hotspot")) options.hotspot = searchParams.get("hotspot") === "true"
    if (searchParams.get("includeProvisional")) options.includeProvisional = searchParams.get("includeProvisional") === "true"
    if (searchParams.get("maxResults")) options.maxResults = parseInt(searchParams.get("maxResults")!)

    const client = getEBirdClient()
    const entities = await client.getRecentNearby(parseFloat(lat), parseFloat(lng), options)

    return NextResponse.json({
      success: true,
      count: entities.length,
      source: "ebird",
      hasApiKey: client.hasApiKey(),
      entities,
    })
  } catch (error) {
    console.error("[API] eBird error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        entities: [],
      },
      { status: 500 }
    )
  }
}
