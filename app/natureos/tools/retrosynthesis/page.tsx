import { NatureOSToolProvider } from "@/components/natureos/tool-context"
import { ToolViewport } from "@/components/natureos/tool-viewport"
import { RetrosynthesisEmbed } from "@/components/natureos/tools/retrosynthesis-embed"

export default function NatureOSRetrosynthesisPage() {
  return (
    <NatureOSToolProvider>
      <ToolViewport
        toolId="retrosynthesis"
        title="Retrosynthesis"
        description="Pathway design for target compounds with MINDEX context."
      >
        <RetrosynthesisEmbed />
      </ToolViewport>
    </NatureOSToolProvider>
  )
}
