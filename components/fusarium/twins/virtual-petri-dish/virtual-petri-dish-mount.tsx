/**
 * Fusarium mount boundary for Virtual Petri Dish and retained simulator aliases.
 */
import VirtualPetriDishPage from "@/app/natureos/virtual-petri-dish/page"
import VirtualPetriDishV2Page from "@/app/natureos/virtual-petri-dish2/page"
import { FusariumTwinSurface } from "@/components/fusarium/twins/fusarium-twin-surface"
import type { ReactNode } from "react"
import styles from "./virtual-petri-dish-mount.module.css"

function FusariumPetriLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.surface} data-fusarium-petri-layout>
      {children}
    </div>
  )
}

export function FusariumVirtualPetriDishMount() {
  return (
    <FusariumTwinSurface>
      <FusariumPetriLayout>
        <VirtualPetriDishPage />
      </FusariumPetriLayout>
    </FusariumTwinSurface>
  )
}

export function FusariumVirtualPetriDishV2Mount() {
  return (
    <FusariumTwinSurface>
      <FusariumPetriLayout>
        <VirtualPetriDishV2Page />
      </FusariumPetriLayout>
    </FusariumTwinSurface>
  )
}
