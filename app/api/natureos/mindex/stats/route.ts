/**
 * MINDEX Stats API Route (BFF Proxy)
 * 
 * Fetches real statistics from MINDEX API
 * Returns taxa counts, observations, and ETL status
 * 
 * NO MOCK DATA - all data must come from real MINDEX backend
 */

import { NextResponse } from "next/server"
import { env } from "@/lib/env"

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
  data_source: "mindex" | "external_authority" | "cached" | "unavailable"
  mindex_available?: boolean
  mindex_has_counts?: boolean
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
    headers: {
      "Accept": "application/json",
      "User-Agent": "Mycosoft-NatureOS/1.0",
    },
  })
  if (!response.ok) {
    throw new Error(`${url}: HTTP ${response.status}`)
  }
  return response.json()
}

async function fetchAuthorityTotals(): Promise<Partial<MindexStats>> {
  const [taxa, observations, geoObservations, imageObservations] = await Promise.all([
    fetchJson("https://api.inaturalist.org/v1/taxa?rank=species&per_page=1"),
    fetchJson("https://api.inaturalist.org/v1/observations?per_page=1"),
    fetchJson("https://api.inaturalist.org/v1/observations?per_page=1&geo=true"),
    fetchJson("https://api.inaturalist.org/v1/observations?per_page=1&photos=true&geo=true"),
  ])

  return {
    total_taxa: Number(taxa.total_results || 0),
    total_observations: Number(observations.total_results || 0),
    observations_with_location: Number(geoObservations.total_results || 0),
    observations_with_images: Number(imageObservations.total_results || 0),
    taxa_with_observations: Number(taxa.total_results || 0),
    taxa_by_source: { inaturalist: Number(taxa.total_results || 0) },
    observations_by_source: { inaturalist: Number(observations.total_results || 0) },
    etl_status: "idle",
    data_source: "external_authority",
    mindex_available: false,
    mindex_has_counts: false,
  }
}

export async function GET() {
  const mindexUrl = env.mindexApiBaseUrl
  const apiKey = env.mindexApiKey || "local-dev-key"
  
  let stats: MindexStats = {
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
  }

  try {
    // Fetch from multiple MINDEX API endpoints in parallel
    const endpoints = [
      { path: "/api/mindex/stats", key: "main_stats" },
      { path: "/api/mindex/taxa?limit=1", key: "taxa_count" },
      { path: "/api/mindex/observations?limit=1", key: "obs_count" },
      { path: "/api/mindex/etl/status", key: "etl" },
    ]

    const responses = await Promise.allSettled(
      endpoints.map(async ({ path, key }) => {
        const response = await fetch(`${mindexUrl}${path}`, {
          headers: {
            "X-API-Key": apiKey,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(10000),
          cache: "no-store",
        })
        if (!response.ok) {
          throw new Error(`${key}: HTTP ${response.status}`)
        }
        return { key, data: await response.json() }
      })
    )

    let hasValidData = false
    let usedAuthorityFallback = false

    for (const result of responses) {
      if (result.status !== "fulfilled") continue

      const { key, data } = result.value
      hasValidData = true

      switch (key) {
        case "main_stats":
          stats = {
            ...stats,
            total_taxa: data.total_taxa ?? stats.total_taxa,
            total_observations: data.total_observations ?? stats.total_observations,
            total_external_ids: data.total_external_ids ?? stats.total_external_ids,
            observations_with_location: data.observations_with_location ?? stats.observations_with_location,
            observations_with_images: data.observations_with_images ?? stats.observations_with_images,
            taxa_with_observations: data.taxa_with_observations ?? stats.taxa_with_observations,
            taxa_by_source: data.taxa_by_source ?? stats.taxa_by_source,
            observations_by_source: data.observations_by_source ?? stats.observations_by_source,
            observation_date_range: data.observation_date_range ?? stats.observation_date_range,
            genome_records: data.genome_records ?? stats.genome_records,
            trait_records: data.trait_records ?? stats.trait_records,
            synonym_records: data.synonym_records ?? stats.synonym_records,
          }
          break

        case "taxa_count":
          if (data.total !== undefined) {
            stats.total_taxa = data.total
          }
          if (data.data && Array.isArray(data.data)) {
            // Aggregate by source if available
            const sources: Record<string, number> = {}
            data.data.forEach((t: { source?: string }) => {
              const source = t.source || "unknown"
              sources[source] = (sources[source] || 0) + 1
            })
            if (Object.keys(sources).length > 0 && Object.keys(stats.taxa_by_source).length === 0) {
              stats.taxa_by_source = sources
            }
          }
          break

        case "obs_count":
          if (data.total !== undefined) {
            stats.total_observations = data.total
          }
          break

        case "etl":
          stats.etl_status = data.status || data.etl_status || stats.etl_status
          break
      }
    }

    if (stats.total_taxa === 0 && stats.total_observations === 0) {
      try {
        stats = {
          ...stats,
          ...(await fetchAuthorityTotals()),
        }
        usedAuthorityFallback = true
      } catch (fallbackError) {
        console.error("Failed to fetch authority totals:", fallbackError)
      }
    }

    stats.mindex_available = hasValidData
    stats.mindex_has_counts = hasValidData && !usedAuthorityFallback && (stats.total_taxa > 0 || stats.total_observations > 0)
    stats.data_source = usedAuthorityFallback
      ? "external_authority"
      : hasValidData
        ? "mindex"
        : stats.total_taxa > 0 || stats.total_observations > 0
          ? "external_authority"
          : "unavailable"
    stats.last_updated = new Date().toISOString()

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Failed to fetch MINDEX stats:", error)
    
    // Return empty stats with error indicator - NO MOCK DATA
    return NextResponse.json({
      ...stats,
      data_source: "unavailable",
      error: error instanceof Error ? error.message : "MINDEX service unavailable",
      mindex_url: mindexUrl,
      troubleshooting: {
        check_host: "On the MINDEX VM: verify the mindex-api process/container and path to MINDEX_API_URL",
        check_api: `curl ${mindexUrl}/api/mindex/health`,
        restart: "On the MINDEX host: restart the mindex-api compose service or container",
      }
    }, { status: 503 })
  }
}
