import type { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Virtual Petri Dish | Mycosoft",
  description: "Redirects to the current NatureOS Virtual Petri Dish app.",
}

export default function PetriDishSimPage() {
  redirect("/natureos/virtual-petri-dish")
}
