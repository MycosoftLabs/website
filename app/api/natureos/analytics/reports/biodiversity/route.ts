/**
 * Biodiversity Report API
 *
 * Returns a biodiversity analytics report from MINDEX.
 * NO MOCK DATA - all data from real MINDEX backend.
 */

import { NextResponse } from "next/server"
import { env } from "@/lib/env"

export const dynamic = "force-dynamic"

export async function GET() {
  const mindexUrl = env.mindexApiBaseUrl
  const apiKey = env.mindexApiKey || "local-dev-key"

  const report = {
    reportType: "biodiversity",
    generatedAt: new Date().toISOString(),
    summary: {
      speciesCount: 0,
      observationCount: 0,
      phylaCount: 0,
    } as Record<string, unknown>,
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
      report.summary.speciesCount =
        stats.total_taxa ?? stats.taxa_with_observations ?? 0
      report.summary.observationCount =
        stats.total_observations ?? stats.observations_with_location ?? 0
    }

    if (taxaRes.status === "fulfilled" && taxaRes.value.ok) {
      const taxaData = await taxaRes.value.json()
      const taxa = taxaData.data ?? taxaData.taxa ?? taxaData.results ?? []
      const phyla = new Set<string>()
      for (const t of taxa) {
        phyla.add(t.phylum ?? t.Phylum ?? t.taxon_phylum ?? "Unknown")
      }
      report.summary.phylaCount = phyla.size
    }
  } catch (error) {
    console.error("Biodiversity report fetch error:", error)
  }

  return NextResponse.json(report)
}
