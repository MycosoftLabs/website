import { NatureOSToolProvider } from "@/components/natureos/tool-context"
import { ToolViewport } from "@/components/natureos/tool-viewport"
import { PetriDishEmbed } from "@/components/natureos/tools/petri-dish-embed"

export default function NatureOSPetriDishPage() {
  return (
    <NatureOSToolProvider>
      <ToolViewport
        toolId="petri-dish-sim"
        title="Petri Dish Simulator"
        description="Virtual mycelium growth with validation against MINDEX datasets."
      >
        <PetriDishEmbed />
      </ToolViewport>
    </NatureOSToolProvider>
  )
}
