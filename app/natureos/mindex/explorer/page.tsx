import Link from "next/link"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "MINDEX Explorer | NatureOS",
  description: "Species explorer powered by MINDEX intelligence services.",
}

export default function MindexExplorerPage() {
  return (
    <main className="min-h-dvh bg-background">
      <section className="container mx-auto px-4 py-10 md:py-14">
        <Link
          href="/natureos"
          className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-primary"
        >
          Back to NatureOS
        </Link>
        <p className="mt-4 text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">
          MINDEX Explorer
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-semibold">Species Explorer</h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground">
          Browse and analyze global species intelligence with curated taxonomic data,
          genetics, and observation telemetry.
        </p>
      </section>

      <section className="container mx-auto px-4 pb-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Taxonomy intelligence</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Explore classification trees and lineage relationships backed by MINDEX.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Observation context</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Combine field data, imagery, and habitat metadata for richer context.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Research workflows</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Feed species intelligence into labs, simulations, and applied models.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
import type { Metadata } from "next"
import { MindexExplorerClient } from "./explorer-client"

export const metadata: Metadata = {
  title: "MINDEX Explorer - Data Visualization Hub",
  description:
    "Interactive data explorer for fungal species, genome browsing, circular plots, and spatial visualization powered by MINDEX",
}

interface SpeciesRecord {
  id: string
  scientific_name: string
  common_name?: string
  kingdom?: string
  phylum?: string
  observation_count?: number
}

async function fetchSpecies(): Promise<SpeciesRecord[]> {
  const mindexUrl = process.env.MINDEX_API_URL
  if (!mindexUrl) return []

  try {
    const res = await fetch(`${mindexUrl}/api/species?limit=50`, {
      next: { revalidate: 300 },
    })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : data.species ?? data.results ?? []
  } catch {
    return []
  }
}

export default async function MINDEXExplorerPage() {
  const species = await fetchSpecies()

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">MINDEX Data Explorer</h1>
          <p className="text-muted-foreground mt-2">
            Interactive species list, genome browser, circular plots, and spatial
            visualization — all backed by the MINDEX knowledge graph
          </p>
        </div>

        {/* Client‑side tabbed explorer */}
        <MindexExplorerClient initialSpecies={species} />

        {/* Info cards */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-muted/30 rounded-lg">
            <h3 className="font-semibold mb-2">Data Sources</h3>
            <p className="text-sm text-muted-foreground">
              Aggregated from iNaturalist research-grade observations and GBIF
              occurrence records via MINDEX ETL pipelines
            </p>
          </div>
          <div className="p-4 bg-muted/30 rounded-lg">
            <h3 className="font-semibold mb-2">Visualization</h3>
            <p className="text-sm text-muted-foreground">
              Genome tracks (Gosling.js), linear genome view (JBrowse2), circular
              plots (pyCirclize), and spatial data (Vitessce)
            </p>
          </div>
          <div className="p-4 bg-muted/30 rounded-lg">
            <h3 className="font-semibold mb-2">Integration</h3>
            <p className="text-sm text-muted-foreground">
              Connected to MINDEX database on 192.168.0.189 and MAS orchestrator
              for real-time agent data enrichment
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
