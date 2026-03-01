import type { Metadata } from "next"
import { MushroomSimContent } from "@/components/apps/mushroom-sim-content"

export const metadata: Metadata = {
  title: "Mushroom Simulator | Apps",
  description: "Mushroom growth simulator for environmental intelligence and research.",
}

export default function MushroomSimPage() {
  return <MushroomSimContent variant="app" />
}
