/**
 * Fusarium mount boundary for Growth Analytics.
 * Remounts the immutable NatureOS growth-analytics page (ToolViewport + embed).
 */
import GrowthAnalyticsPage from "@/app/natureos/growth-analytics/page"
import { FusariumTwinSurface } from "@/components/fusarium/twins/fusarium-twin-surface"
import { GrowthEvidenceWorkbench } from "@/components/fusarium/twins/growth-analytics/growth-evidence-workbench"
import { GrowthAnalyticsTruthBoundary } from "@/components/fusarium/twins/growth-analytics/growth-analytics-truth-boundary"

export function FusariumGrowthAnalyticsMount() {
  return (
    <FusariumTwinSurface>
      <GrowthEvidenceWorkbench />
      <div className="min-w-0 max-w-full [&_[data-slot=tabs-list]]:max-w-full [&_[data-slot=tabs-list]]:justify-start [&_[data-slot=tabs-list]]:overflow-x-auto">
        <GrowthAnalyticsTruthBoundary><GrowthAnalyticsPage /></GrowthAnalyticsTruthBoundary>
      </div>
    </FusariumTwinSurface>
  )
}
