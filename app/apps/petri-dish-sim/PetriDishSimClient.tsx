"use client"

import dynamic from "next/dynamic"

const PetriDishSimContent = dynamic(
  () => import("@/components/apps/petri-dish-sim-content").then((m) => ({ default: m.PetriDishSimContent })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[60vh] w-full items-center justify-center text-sm text-muted-foreground">
        Loading simulator...
      </div>
    ),
  }
)

export function PetriDishSimClient() {
  return <PetriDishSimContent variant="app" />
}
