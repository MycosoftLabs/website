export const dynamic = "force-dynamic"

import { NatureOSToolProvider } from "@/components/natureos/tool-context"
import { ToolViewport } from "@/components/natureos/tool-viewport"
import { PetriDishEmbed } from "@/components/natureos/tools/petri-dish-embed"

export default function NatureOSPetriDishPage() {
  return (
    <NatureOSToolProvider>
      <ToolViewport
        toolId="petri-dish-sim"
        title="Virtual Petri Dish"
        description="Virtual culture growth with validation against MINDEX datasets."
      >
        <PetriDishEmbed />
      </ToolViewport>
    </NatureOSToolProvider>
  )
}
