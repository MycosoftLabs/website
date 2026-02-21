import { NatureOSToolProvider } from "@/components/natureos/tool-context"
import { ToolViewport } from "@/components/natureos/tool-viewport"
import { MushroomSimEmbed } from "@/components/natureos/tools/mushroom-sim-embed"

export default function NatureOSMushroomSimPage() {
  return (
    <NatureOSToolProvider>
      <ToolViewport
        toolId="mushroom-sim"
        title="Mushroom Growth Simulator"
        description="Species-driven growth simulation with MINDEX context."
      >
        <MushroomSimEmbed />
      </ToolViewport>
    </NatureOSToolProvider>
  )
}
