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
