import { NatureOSToolProvider } from "@/components/natureos/tool-context"
import { ToolViewport } from "@/components/natureos/tool-viewport"
import { EarthSimulatorEmbed } from "@/components/natureos/tools/earth-simulator-embed"

export default function NatureOSEarthSimulatorPage() {
  return (
    <NatureOSToolProvider>
      <ToolViewport
        toolId="earth-simulator"
        title="Earth Simulator"
        description="Earth-2 visualization and environmental forecasting workspace."
      >
        <EarthSimulatorEmbed />
      </ToolViewport>
    </NatureOSToolProvider>
  )
}
