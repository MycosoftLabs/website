import { NatureOSToolProvider } from "@/components/natureos/tool-context"
import { ToolViewport } from "@/components/natureos/tool-viewport"
import { AlchemyLabEmbed } from "@/components/natureos/tools/alchemy-lab-embed"

export default function NatureOSAlchemyLabPage() {
  return (
    <NatureOSToolProvider>
      <ToolViewport
        toolId="alchemy-lab"
        title="Alchemy Lab"
        description="Compound exploration and synthesis workflows."
      >
        <AlchemyLabEmbed />
      </ToolViewport>
    </NatureOSToolProvider>
  )
}
