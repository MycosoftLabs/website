import type { Metadata } from "next"
import { MindexExplorerClient } from "./explorer-client"

export const metadata: Metadata = {
  title: "MINDEX Explorer - Data Visualization Hub",
  description:
    "Interactive data explorer for species, genome browsing, circular plots, and spatial visualization powered by MINDEX.",
}

export const dynamic = "force-dynamic"
export const revalidate = 0

interface SpeciesRecord {
  id: string
  scientific_name: string
  common_name?: string
  kingdom?: string
  phylum?: string
  observation_count?: number
}

async function fetchSpecies(): Promise<SpeciesRecord[]> {
  const { resolveMindexServerBaseUrl } = await import("@/lib/mindex-base-url")
  const { fetchMindexWithAuthRetry } = await import("@/lib/mindex-bff-auth")
  const mindexUrl = resolveMindexServerBaseUrl()
  if (!mindexUrl) return []

  try {
    const res = await fetchMindexWithAuthRetry(`${mindexUrl.replace(/\/$/, "")}/api/mindex/taxa?limit=50`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    })
    if (!res.ok) return []
    const data = await res.json()
    const rows = Array.isArray(data?.data) ? data.data : []
    return rows.map((t: Record<string, unknown>) => ({
      id: String(t.id ?? ""),
      scientific_name: String(t.canonical_name ?? t.scientific_name ?? ""),
      common_name: t.common_name ? String(t.common_name) : undefined,
      kingdom: t.kingdom ? String(t.kingdom) : undefined,
      phylum: t.phylum ? String(t.phylum) : undefined,
      observation_count: typeof t.observation_count === "number" ? t.observation_count : undefined,
    }))
  } catch {
    return []
  }
}

export default async function MINDEXExplorerPage() {
  const species = await fetchSpecies()

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">MINDEX Data Explorer</h1>
          <p className="mt-2 text-muted-foreground">
            Interactive species list, genome browser, circular plots, and spatial visualization for the MINDEX knowledge graph.
          </p>
        </div>

        <MindexExplorerClient initialSpecies={species} />

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-muted/30 p-4">
            <h3 className="mb-2 font-semibold">Data Sources</h3>
            <p className="text-sm text-muted-foreground">
              Aggregated from iNaturalist research-grade observations, GBIF occurrence records, and other MINDEX sources.
            </p>
          </div>
          <div className="rounded-lg bg-muted/30 p-4">
            <h3 className="mb-2 font-semibold">Visualization</h3>
            <p className="text-sm text-muted-foreground">
              Genome tracks, linear genome views, circular plots, and spatial data viewers for species records.
            </p>
          </div>
          <div className="rounded-lg bg-muted/30 p-4">
            <h3 className="mb-2 font-semibold">Integration</h3>
            <p className="text-sm text-muted-foreground">
              Connected to MINDEX knowledge services and MYCA analysis for real-time data enrichment.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
