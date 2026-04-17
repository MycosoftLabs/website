/**
 * MINDEX Sync-All — cron-triggered unified pull + MINDEX ingest.
 *
 * Pulls every CREP source (aircraft, vessels, satellites, orbital debris,
 * ports, power plants, transmission lines, cell towers, radio, radar,
 * nature observations, air quality, events, sun-earth earthspots) and
 * POSTs everything to MINDEX so the PostGIS registry is complete.
 *
 * Run: POST to /api/etl/mindex-sync with x-cron-token header.
 * Returns: per-sink counts + grand totals.
 *
 * Scheduling: call every 5 min from a cron worker or GitHub Actions.
 */

import { NextRequest, NextResponse } from "next/server"
import { syncAllToMindex } from "@/lib/crep/mindex-sync-all"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
// Upstream pulls can take a while at 20k+ records each × ~20 sinks.
// We cap the serverless handler at 5 minutes.
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-cron-token") ?? ""
  const expected = process.env.ETL_CRON_TOKEN ?? ""
  if (expected && token !== expected) {
    return NextResponse.json({ error: "Invalid cron token" }, { status: 401 })
  }

  const url = new URL(req.url)
  const baseUrl = `${url.protocol}//${url.host}`
  const result = await syncAllToMindex(baseUrl)
  return NextResponse.json({
    ok: true,
    baseUrl,
    ...result,
    ranAt: new Date().toISOString(),
  }, { headers: { "Cache-Control": "no-store" } })
}

export async function GET(req: NextRequest) {
  // Allow GET with the same token for one-shot manual runs from a browser
  // while authenticated (dev-only convenience).
  return POST(req)
}
