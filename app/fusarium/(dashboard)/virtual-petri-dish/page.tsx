import { FusariumVirtualPetriDishMount } from "@/components/fusarium/twins/virtual-petri-dish/virtual-petri-dish-mount"

/**
 * /fusarium/virtual-petri-dish — explicit remount of /natureos/virtual-petri-dish.
 */
export const dynamic = "force-dynamic"

export default function FusariumVirtualPetriDishPage() {
  return <FusariumVirtualPetriDishMount />
}
