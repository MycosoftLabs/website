import type { Metadata } from "next"
import { PetriDishSimClient } from "./PetriDishSimClient"

export const metadata: Metadata = {
  title: "Petri Dish Simulator | Mycosoft",
  description: "Virtual mycelium growth simulator with environmental controls, multiple species, and realistic mycelial behavior",
}

export default function PetriDishSimPage() {
  return <PetriDishSimClient />
}
