import { NatureOSToolProvider } from "@/components/natureos/tool-context"
import { ToolViewport } from "@/components/natureos/tool-viewport"
import { DigitalTwinEmbed } from "@/components/natureos/tools/digital-twin-embed"

export default function NatureOSDigitalTwinPage() {
  return (
    <NatureOSToolProvider>
      <ToolViewport
        toolId="digital-twin"
        title="Digital Twin"
        description="Real-time device synchronization powered by MycoBrain telemetry."
      >
        <DigitalTwinEmbed />
      </ToolViewport>
    </NatureOSToolProvider>
  )
}
