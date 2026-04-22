/**
 * POST /api/admin/reset-outbound
 *
 * Recycles the undici global dispatcher so outbound fetch gets a fresh
 * connection pool without a Node process restart. Use when you notice
 * external API calls piling up "fetch failed" after many hours of dev
 * uptime.
 *
 * No auth — dev-only safety measure. In production, gate behind a
 * scheduled cron or middleware if needed.
 */

import { NextResponse } from "next/server"
import { resetOutboundDispatcher, getOutboundDispatcherStats } from "@/lib/net/robust-fetch"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST() {
  const before = getOutboundDispatcherStats()
  await resetOutboundDispatcher()
  const after = getOutboundDispatcherStats()
  return NextResponse.json({
    ok: true,
    before,
    after,
    resetAt: new Date().toISOString(),
  })
}

export async function GET() {
  return NextResponse.json({
    description:
      "POST this endpoint to recycle the outbound fetch dispatcher. " +
      "Use when external API calls start returning 'fetch failed' after " +
      "long Next.js dev uptime.",
    stats: getOutboundDispatcherStats(),
  })
}
