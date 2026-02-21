import { NatureOSToolProvider } from "@/components/natureos/tool-context"
import { ToolViewport } from "@/components/natureos/tool-viewport"
import { GrowthAnalyticsEmbed } from "@/components/natureos/tools/growth-analytics-embed"

export default function NatureOSGrowthAnalyticsPage() {
  return (
    <NatureOSToolProvider>
      <ToolViewport
        toolId="growth-analytics"
        title="Growth Analytics"
        description="Growth forecasting, yield estimation, and environmental scoring."
      >
        <GrowthAnalyticsEmbed />
      </ToolViewport>
    </NatureOSToolProvider>
  )
}
