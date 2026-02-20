/**
 * Biodiversity Analytics API
 *
 * Returns species counts and observation metrics from MINDEX.
 * NO MOCK DATA - all data from real MINDEX backend.
 */

import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

export const dynamic = "force-dynamic"

interface BiodiversityMetrics {
  speciesCount: number
  observationCount: number
  speciesByPhylum: Record<string, number>
}

async function fetchBiodiversityMetrics(): Promise<BiodiversityMetrics> {
  const mindexUrl = env.mindexApiBaseUrl
  const apiKey = env.mindexApiKey || "local-dev-key"

  const result: BiodiversityMetrics = {
    speciesCount: 0,
    observationCount: 0,
    speciesByPhylum: {},
  }

  try {
    const [statsRes, taxaRes] = await Promise.allSettled([
      fetch(`${mindexUrl}/api/mindex/stats`, {
        headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(8000),
      }),
      fetch(`${mindexUrl}/api/mindex/taxa?limit=500`, {
        headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(8000),
      }),
    ])

    if (statsRes.status === "fulfilled" && statsRes.value.ok) {
      const stats = await statsRes.value.json()
      result.speciesCount = stats.total_taxa ?? stats.taxa_with_observations ?? 0
      result.observationCount =
        stats.total_observations ?? stats.observations_with_location ?? 0
    }

    if (taxaRes.status === "fulfilled" && taxaRes.value.ok) {
      const taxaData = await taxaRes.value.json()
      const taxa = taxaData.data ?? taxaData.taxa ?? taxaData.results ?? []
      const phyla: Record<string, number> = {}
      for (const t of taxa) {
        const phylum =
          t.phylum ?? t.Phylum ?? t.taxon_phylum ?? "Unknown"
        phyla[phylum] = (phyla[phylum] ?? 0) + 1
      }
      result.speciesByPhylum = phyla
    }
  } catch (error) {
    console.error("Biodiversity fetch error:", error)
  }

  return result
}

export async function GET(_request: NextRequest) {
  const metrics = await fetchBiodiversityMetrics()
  return NextResponse.json(metrics)
}
