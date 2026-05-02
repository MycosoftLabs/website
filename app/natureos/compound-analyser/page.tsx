import { NatureOSToolProvider } from "@/components/natureos/tool-context"
import { ToolViewport } from "@/components/natureos/tool-viewport"
import { CompoundSimEmbed } from "@/components/natureos/tools/compound-sim-embed"

export default function NatureOSCompoundSimPage() {
  return (
    <NatureOSToolProvider>
      <ToolViewport
        toolId="compound-sim"
        title="Compound Analyser (chemputer)"
        description="Chemistry computer: compound analysis, enrichment, and MINDEX-backed reaction context."
      >
        <CompoundSimEmbed />
      </ToolViewport>
    </NatureOSToolProvider>
  )
}
