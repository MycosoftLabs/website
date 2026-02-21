import { NatureOSToolProvider } from "@/components/natureos/tool-context"
import { ToolViewport } from "@/components/natureos/tool-viewport"
import { SymbiosisEmbed } from "@/components/natureos/tools/symbiosis-embed"

export default function NatureOSSymbiosisPage() {
  return (
    <NatureOSToolProvider>
      <ToolViewport
        toolId="symbiosis"
        title="Symbiosis Network"
        description="Mycorrhizal network analysis and connectivity insights."
      >
        <SymbiosisEmbed />
      </ToolViewport>
    </NatureOSToolProvider>
  )
}
