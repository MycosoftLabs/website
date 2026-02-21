import { NatureOSToolProvider } from "@/components/natureos/tool-context"
import { ToolViewport } from "@/components/natureos/tool-viewport"
import { CompoundSimEmbed } from "@/components/natureos/tools/compound-sim-embed"

export default function NatureOSCompoundSimPage() {
  return (
    <NatureOSToolProvider>
      <ToolViewport
        toolId="compound-sim"
        title="Compound Simulator"
        description="Compound analysis, ChemSpider enrichment, and MINDEX-backed simulations."
      >
        <CompoundSimEmbed />
      </ToolViewport>
    </NatureOSToolProvider>
  )
}
