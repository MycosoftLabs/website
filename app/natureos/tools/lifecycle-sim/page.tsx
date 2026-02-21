import { NatureOSToolProvider } from "@/components/natureos/tool-context"
import { ToolViewport } from "@/components/natureos/tool-viewport"
import { LifecycleSimEmbed } from "@/components/natureos/tools/lifecycle-sim-embed"

export default function NatureOSLifecycleSimPage() {
  return (
    <NatureOSToolProvider>
      <ToolViewport
        toolId="lifecycle-sim"
        title="Lifecycle Simulator"
        description="Lifecycle modeling and stage forecasting."
      >
        <LifecycleSimEmbed />
      </ToolViewport>
    </NatureOSToolProvider>
  )
}
