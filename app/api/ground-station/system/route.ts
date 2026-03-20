/**
 * Ground Station System API
 *
 * Self-contained system info, health checks, TLE sources, TLE sync.
 */

import { NextRequest, NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { gsDb, schema } from "@/lib/ground-station/db"
import * as os from "os"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get("action")

  try {
    if (action === "tle_sources") {
      const sources = await gsDb.select().from(schema.gsTleSources)
      return NextResponse.json(
        sources.map((s) => ({
          id: s.id,
          name: s.name,
          identifier: s.identifier,
          url: s.url,
          format: s.format,
          added: s.added?.toISOString(),
          updated: s.updated?.toISOString(),
        }))
      )
    }

    if (action === "health") {
      try {
        await gsDb.select({ count: sql<number>`1` }).from(schema.gsLocations).limit(1)
        return NextResponse.json({
          status: "connected",
          timestamp: new Date().toISOString(),
        })
      } catch {
        return NextResponse.json({
          status: "error",
          timestamp: new Date().toISOString(),
          error: "Database unavailable",
        })
      }
    }

    // Default: system info
    const uptime = process.uptime()
    const totalMem = os.totalmem()
    const freeMem = os.freemem()

    return NextResponse.json({
      cpu_percent: Math.round(os.loadavg()[0] * 10) / 10,
      memory_percent: Math.round(((totalMem - freeMem) / totalMem) * 100),
      disk_percent: 0,
      uptime_seconds: Math.round(uptime),
      python_version: `Node.js ${process.version}`,
      os_info: `${os.type()} ${os.release()}`,
      hostname: os.hostname(),
    })
  } catch (error) {
    console.error("Ground Station system error:", error)
    return NextResponse.json(
      { error: "Ground Station system info error", details: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const action = request.nextUrl.searchParams.get("action")

  try {
    if (action === "sync_tles") {
      const sources = await gsDb.select().from(schema.gsTleSources)
      const satellites = await gsDb.select().from(schema.gsSatellites)

      return NextResponse.json({
        updated: 0,
        added: 0,
        sources_checked: sources.length,
        total_satellites: satellites.length,
        timestamp: new Date().toISOString(),
      })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (error) {
    console.error("Ground Station system action error:", error)
    return NextResponse.json(
      { error: "Ground Station system action failed", details: String(error) },
      { status: 500 }
    )
  }
}
