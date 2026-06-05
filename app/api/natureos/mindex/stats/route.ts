/**
 * MINDEX Stats API Route (BFF Proxy)
 *
 * Fetches real statistics from MINDEX API only — no external authority fallback.
 */

import { NextResponse } from "next/server"
import { env } from "@/lib/env"
import { fetchMindexWithAuthRetry } from "@/lib/mindex-bff-auth"

export const dynamic = "force-dynamic"

interface MindexStats {
  total_taxa: number
  total_observations: number
  total_external_ids: number
  observations_with_location: number
  observations_with_images: number
  taxa_with_observations: number
  taxa_by_source: Record<string, number>
  observations_by_source: Record<string, number>
  observation_date_range: { earliest: string | null; latest: string | null }
  etl_status: "running" | "idle" | "error" | "unknown"
  genome_records: number
  trait_records: number
  synonym_records: number
  last_updated: string
  data_source: "mindex" | "unavailable"
  mindex_available?: boolean
  mindex_has_counts?: boolean
}

export async function GET() {
  const mindexUrl = env.mindexApiBaseUrl.replace(/\/$/, "")

  const empty: MindexStats = {
    total_taxa: 0,
    total_observations: 0,
    total_external_ids: 0,
    observations_with_location: 0,
    observations_with_images: 0,
    taxa_with_observations: 0,
    taxa_by_source: {},
    observations_by_source: {},
    observation_date_range: { earliest: null, latest: null },
    etl_status: "unknown",
    genome_records: 0,
    trait_records: 0,
    synonym_records: 0,
    last_updated: new Date().toISOString(),
    data_source: "unavailable",
    mindex_available: false,
    mindex_has_counts: false,
  }

  try {
    const [statsRes, etlRes] = await Promise.all([
      fetchMindexWithAuthRetry(`${mindexUrl}/api/mindex/stats`, {
        cache: "no-store",
        signal: AbortSignal.timeout(3_500),
      }),
      fetchMindexWithAuthRetry(`${mindexUrl}/api/mindex/etl-status`, {
        cache: "no-store",
        signal: AbortSignal.timeout(3_500),
      }),
    ])

    if (!statsRes.ok) {
      return NextResponse.json(
        {
          ...empty,
          error: `MINDEX stats HTTP ${statsRes.status}`,
          troubleshooting: {
            check_api: `curl ${mindexUrl}/api/mindex/stats`,
            check_token: "MINDEX_INTERNAL_TOKEN or MINDEX_API_KEY in .env.local",
          },
        },
        { status: statsRes.status >= 500 ? 503 : statsRes.status },
      )
    }

    const data = await statsRes.json()
    let etlStatus: MindexStats["etl_status"] = "unknown"
    if (etlRes.ok) {
      const etl = await etlRes.json()
      const raw = etl.status || etl.etl_status
      if (raw === "running" || raw === "idle") etlStatus = raw
    }

    const stats: MindexStats = {
      total_taxa: Number(data.total_taxa ?? 0),
      total_observations: Number(data.total_observations ?? 0),
      total_external_ids: Number(data.total_external_ids ?? 0),
      observations_with_location: Number(data.observations_with_location ?? 0),
      observations_with_images: Number(data.observations_with_images ?? 0),
      taxa_with_observations: Number(data.taxa_with_observations ?? 0),
      taxa_by_source: data.taxa_by_source ?? {},
      observations_by_source: data.observations_by_source ?? {},
      observation_date_range: data.observation_date_range ?? { earliest: null, latest: null },
      etl_status: (data.etl_status as MindexStats["etl_status"]) || etlStatus,
      genome_records: Number(data.genome_records ?? 0),
      trait_records: Number(data.trait_records ?? 0),
      synonym_records: Number(data.synonym_records ?? 0),
      last_updated: new Date().toISOString(),
      data_source: "mindex",
      mindex_available: true,
      mindex_has_counts: (Number(data.total_taxa ?? 0) > 0) || (Number(data.total_observations ?? 0) > 0),
    }

    return NextResponse.json(stats)
  } catch (error) {
    return NextResponse.json(
      {
        ...empty,
        error: error instanceof Error ? error.message : "MINDEX service unavailable",
        mindex_url: mindexUrl,
      },
      { status: 503 },
    )
  }
}
