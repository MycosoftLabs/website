import { FusariumVirtualPetriDishV2Mount } from "@/components/fusarium/twins/virtual-petri-dish/virtual-petri-dish-mount"

/**
 * Retained v2 simulator alias. Remounts /natureos/virtual-petri-dish2.
 */
export const dynamic = "force-dynamic"

export default function FusariumVirtualPetriDishV2Page() {
  return <FusariumVirtualPetriDishV2Mount />
}
