/**
 * MycoBrain Devices API Route - Feb 18, 2026
 * Fetches devices from the MycoBrain service
 * Results cached for 60 seconds to prevent overwhelming the dev server
 */

import { NextResponse } from "next/server"

const MYCOBRAIN_SERVICE_URL = process.env.MYCOBRAIN_SERVICE_URL || "http://localhost:8003"

// In-memory cache
interface CacheEntry {
  data: unknown
  timestamp: number
  expiresAt: number
}

let deviceCache: CacheEntry | null = null
const CACHE_TTL_MS = 60_000 // 60 seconds cache

export async function GET(request: Request) {
  const url = new URL(request.url)
  const forceRefresh = url.searchParams.get("refresh") === "true"
  const now = Date.now()
  
  // Check cache first
  if (!forceRefresh && deviceCache && now < deviceCache.expiresAt) {
    console.log(`[MycoBrain] Cache HIT (${Math.round((deviceCache.expiresAt - now) / 1000)}s remaining)`)
    return NextResponse.json(deviceCache.data)
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const res = await fetch(`${MYCOBRAIN_SERVICE_URL}/devices`, {
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
      console.log("[MycoBrain] Service returned error, using graceful fallback");
      const fallbackData = { 
        devices: [], 
        count: 0, 
        available: false,
        message: "MycoBrain service unavailable",
        cached: false,
      }
      return NextResponse.json(fallbackData)
    }

    const data = await res.json()
    
    const devices = data.devices || []
    const responseData = { 
      devices, 
      count: data.count || devices.length,
      available: true,
      cached: false,
    }
    
    // Store in cache
    deviceCache = {
      data: { ...responseData, cached: true },
      timestamp: now,
      expiresAt: now + CACHE_TTL_MS,
    }
    console.log(`[MycoBrain] Cache SET (TTL: ${CACHE_TTL_MS / 1000}s)`)

    return NextResponse.json(responseData)
  } catch (error) {
    console.log("[MycoBrain] Service not reachable, using graceful fallback");
    return NextResponse.json({
      devices: [],
      count: 0,
      available: false,
      cached: false,
      message: error instanceof Error && error.name === "AbortError" 
        ? "MycoBrain service timeout" 
        : "MycoBrain service not running"
    })
  }
}
