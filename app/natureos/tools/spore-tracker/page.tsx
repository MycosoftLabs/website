import { NatureOSToolProvider } from "@/components/natureos/tool-context"
import { ToolViewport } from "@/components/natureos/tool-viewport"
import { SporeTrackerEmbed } from "@/components/natureos/tools/spore-tracker-embed"

export default function NatureOSSporeTrackerPage() {
  return (
    <NatureOSToolProvider>
      <ToolViewport
        toolId="spore-tracker"
        title="Spore Tracker"
        description="Spore dispersal monitoring with real-time observations."
      >
        <SporeTrackerEmbed />
      </ToolViewport>
    </NatureOSToolProvider>
  )
}
