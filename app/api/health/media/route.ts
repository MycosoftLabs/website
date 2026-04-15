import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

export const dynamic = "force-dynamic"

interface AssetCheck {
  path: string
  minBytes: number
  tier: "critical" | "warning"
}

/** Paths under public/assets — must exist on NAS bind mount in production. */
const ASSET_CHECKS: AssetCheck[] = [
  // Critical — fallback videos that every page can use
  {
    path: path.join("mushroom1", "mushroom 1 walking.mp4"),
    minBytes: 10_000,
    tier: "critical",
  },
  {
    path: path.join("mushroom1", "waterfall 1.mp4"),
    minBytes: 10_000,
    tier: "critical",
  },
  // Warning — page-specific hero videos
  {
    path: path.join("homepage", "Mycosoft Background.mp4"),
    minBytes: 1024,
    tier: "warning",
  },
  {
    path: path.join("about us", "Mycosoft Commercial 1.mp4"),
    minBytes: 1024,
    tier: "warning",
  },
  {
    path: path.join("myconode", "myconode hero1.mp4"),
    minBytes: 1024,
    tier: "warning",
  },
  {
    path: path.join("sporebase", "sporebase1publish.mp4"),
    minBytes: 1024,
    tier: "warning",
  },
  {
    path: path.join("hyphae1", "hero.mp4"),
    minBytes: 1024,
    tier: "warning",
  },
  // Critical images — key product images
  {
    path: path.join("mushroom1", "Main A.jpg"),
    minBytes: 1024,
    tier: "warning",
  },
  {
    path: path.join("myconode", "myconode a.png"),
    minBytes: 1024,
    tier: "warning",
  },
]

async function statSafe(fullPath: string): Promise<{ size: number } | null> {
  try {
    const s = await fs.stat(fullPath)
    return { size: s.size }
  } catch {
    return null
  }
}

export async function GET() {
  const assetsRoot = path.join(process.cwd(), "public", "assets")
  const isProd = process.env.NODE_ENV === "production"

  const results: {
    path: string
    bytes: number | null
    ok: boolean
    tier: "critical" | "warning"
  }[] = []

  let criticalFailed = false
  let warningFailed = false

  for (const check of ASSET_CHECKS) {
    const full = path.join(assetsRoot, check.path)
    const st = await statSafe(full)
    const bytes = st?.size ?? null
    const ok = bytes !== null && bytes >= check.minBytes
    if (!ok && check.tier === "critical") criticalFailed = true
    if (!ok && check.tier === "warning") warningFailed = true
    results.push({ path: check.path.replace(/\\/g, "/"), bytes, ok, tier: check.tier })
  }

  const status =
    criticalFailed ? "unhealthy" : warningFailed ? "degraded" : "healthy"

  const body = {
    status,
    timestamp: new Date().toISOString(),
    assetsRoot: assetsRoot.replace(/\\/g, "/"),
    checks: results,
    message: criticalFailed
      ? "One or more critical NAS media files are missing or too small; hero/device videos may fail."
      : warningFailed
        ? "Homepage or secondary media may be missing; check for 0-byte files on NAS."
        : "NAS-mounted media files present with expected minimum sizes.",
  }

  if (criticalFailed && isProd) {
    return NextResponse.json(body, { status: 503 })
  }

  return NextResponse.json(body, { status: 200 })
}
