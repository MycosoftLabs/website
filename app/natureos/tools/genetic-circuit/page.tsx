import { NatureOSToolProvider } from "@/components/natureos/tool-context"
import { ToolViewport } from "@/components/natureos/tool-viewport"
import { GeneticCircuitEmbed } from "@/components/natureos/tools/genetic-circuit-embed"

export default function NatureOSGeneticCircuitPage() {
  return (
    <NatureOSToolProvider>
      <ToolViewport
        toolId="genetic-circuit"
        title="Genetic Circuit"
        description="Circuit design, expression modeling, and metabolic flux visualization."
      >
        <GeneticCircuitEmbed />
      </ToolViewport>
    </NatureOSToolProvider>
  )
}
