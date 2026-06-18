import { NextResponse } from "next/server"

import { getFungalAtlasStatus } from "@/lib/crep/fungal-atlas"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"

export const dynamic = "force-dynamic"

async function getMindexHealth() {
  const base = resolveMindexServerBaseUrl()
  try {
    const res = await fetch(`${base}/api/mindex/health`, {
      headers: { "Accept": "application/json", "X-API-Key": process.env.MINDEX_API_KEY || "" },
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    })
    if (!res.ok) return { status: "unavailable", url: base, httpStatus: res.status }
    return { status: "available", url: base, data: await res.json() }
  } catch (error) {
    return { status: "unavailable", url: base, error: String(error) }
  }
}

export async function GET() {
  const [atlas, mindex] = await Promise.all([getFungalAtlasStatus(), getMindexHealth()])
  return NextResponse.json({
    ...atlas,
    mindex,
    mindexFirst: true,
    ingestion: {
      sourceEnv: "FUNGAL_ATLAS_SOURCE_DIR",
      sampleMetadataEnv: "FUNGAL_ATLAS_SAMPLE_METADATA",
      cli: "node scripts/mindex/import-fungal-atlas.mjs --dry-run",
      route: "/api/mindex/ingest/fungal-atlas",
    },
    timestamp: new Date().toISOString(),
  })
}
