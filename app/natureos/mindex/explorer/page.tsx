import type { Metadata } from "next"
import { SpeciesExplorerLazy } from "@/components/mindex/lazy-viewers"

export const metadata: Metadata = {
  title: "MINDEX Explorer - Spatial Species Visualization",
  description: "Interactive spatial data visualization for fungal species observations powered by Vitessce",
}

export default function MINDEXExplorerPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">MINDEX Species Explorer</h1>
          <p className="text-muted-foreground mt-2">
            Interactive spatial visualization of fungal species observations from iNaturalist and GBIF data
          </p>
        </div>
        
        <SpeciesExplorerLazy className="border" />
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-muted/30 rounded-lg">
            <h3 className="font-semibold mb-2">Data Sources</h3>
            <p className="text-sm text-muted-foreground">
              Aggregated from iNaturalist research-grade observations and GBIF occurrence records
            </p>
          </div>
          <div className="p-4 bg-muted/30 rounded-lg">
            <h3 className="font-semibold mb-2">Visualization</h3>
            <p className="text-sm text-muted-foreground">
              Powered by Vitessce for multi-modal biological data visualization
            </p>
          </div>
          <div className="p-4 bg-muted/30 rounded-lg">
            <h3 className="font-semibold mb-2">Integration</h3>
            <p className="text-sm text-muted-foreground">
              Connected to MINDEX database with cryptographic integrity verification
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
