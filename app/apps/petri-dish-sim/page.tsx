import type { Metadata } from "next"
import { PetriDishSimContent } from "@/components/apps/petri-dish-sim-content"

export const metadata: Metadata = {
  title: "Petri Dish Simulator - Mycosoft",
  description: "Virtual mycelium growth simulator with environmental controls, multiple species, and realistic mycelial behavior",
}

export default function PetriDishSimPage() {
  return <PetriDishSimContent variant="app" />
}
