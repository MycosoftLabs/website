/**
 * /api/crep/sdapcd/h2s/collect — Apr 22, 2026
 *
 * Morgan: "make a tool to take that data its updated every 5 min and
 * put it in mindex into the crep map and worldview api its vital".
 *
 * POST (or GET) here to run one cycle of the UCSD H₂S chart collector.
 * Fetches all 6 PNG charts, persists to var/cache/h2s-ucsd/, updates
 * the index. Safe to call on a schedule — each call is ~1.5 MB down
 * and 6 disk writes.
 *
 * Typical trigger: a server-side scheduler (Vercel cron / systemd /
 * MAS cron) hits POST this every 5 min; widget + worldview snapshot
 * read the cached result from /api/crep/sdapcd/h2s.
 */

import { NextResponse } from "next/server"
import { collectH2sCharts, staleChartIds } from "@/lib/crep/h2s-ucsd-collector"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * When `CRON_SECRET` is set: require `?key=`, `Authorization: Bearer`, or (on Vercel only) `x-vercel-cron`.
 * On self-hosted Next.js, `x-vercel-cron` is not trusted (spoofable) — use `?key=` in cron.
 */
function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  if (process.env.VERCEL === "1" && (req.headers.get("x-vercel-cron") === "1" || req.headers.get("x-vercel-cron") === "true")) {
    return true
  }
  const auth = req.headers.get("authorization")
  if (auth === `Bearer ${secret}`) return true
  const key = new URL(req.url).searchParams.get("key")
  if (key === secret) return true
  return false
}

async function runOnce(force: boolean) {
  if (!force) {
    const stale = staleChartIds()
    if (stale.length === 0) {
      return {
        ok: true,
        skipped: "all-fresh",
        stale: 0,
      }
    }
  }
  const result = await collectH2sCharts()
  return result
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }
  const force = new URL(req.url).searchParams.get("force") === "true"
  const result = await runOnce(force)
  return NextResponse.json(result)
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }
  const force = new URL(req.url).searchParams.get("force") === "true"
  const result = await runOnce(force)
  return NextResponse.json(result)
}
