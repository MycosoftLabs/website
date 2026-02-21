import { NatureOSToolProvider } from "@/components/natureos/tool-context"
import { ToolViewport } from "@/components/natureos/tool-viewport"
import { PhysicsSimEmbed } from "@/components/natureos/tools/physics-sim-embed"

export default function NatureOSPhysicsSimPage() {
  return (
    <NatureOSToolProvider>
      <ToolViewport
        toolId="physics-sim"
        title="Physics Simulator"
        description="Physics-based modeling for NatureOS environments."
      >
        <PhysicsSimEmbed />
      </ToolViewport>
    </NatureOSToolProvider>
  )
}
