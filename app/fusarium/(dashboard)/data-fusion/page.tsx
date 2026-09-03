import { Suspense } from "react"
import { DataFusionDashboard } from "@/components/fusarium/data-fusion/data-fusion-dashboard"

export const dynamic = "force-dynamic"

function DataFusionRouteLoading() {
  return (
    <div className="fx-page" role="status" aria-live="polite">
      <header className="fx-page-head">
        <h1>Data Fusion</h1>
        <p className="fx-lede">
          Loading source truth, lineage, coverage, and review capabilities. Missing values will
          remain unknown rather than becoming zero.
        </p>
      </header>
      <p className="fx-notice">Checking the versioned Fusarium provider boundary…</p>
    </div>
  )
}

export default function FusariumDataFusionPage() {
  return (
    <Suspense fallback={<DataFusionRouteLoading />}>
      <DataFusionDashboard />
    </Suspense>
  )
}

