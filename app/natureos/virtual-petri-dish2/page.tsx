export const dynamic = "force-dynamic"

import { NatureOSToolProvider } from "@/components/natureos/tool-context"
import { ToolViewport } from "@/components/natureos/tool-viewport"
import { PetriDishV2Embed } from "@/components/natureos/tools/petri-dish-v2-embed"

export default function NatureOSPetriDishV2Page() {
  return (
    <NatureOSToolProvider>
      <ToolViewport
        toolId="petri-dish-sim-v2"
        title="Virtual Petri Dish v2"
        description="MINDEX biological interaction sandbox with organism-first growth visualization."
      >
        <PetriDishV2Embed />
      </ToolViewport>
    </NatureOSToolProvider>
  )
}
