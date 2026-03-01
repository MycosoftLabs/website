import Link from "next/link"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Petri Dish Simulator | Apps",
  description: "Petri dish simulation for fungal growth and experimental workflows.",
}

export default function PetriDishSimPage() {
  return (
    <main className="min-h-dvh bg-background">
      <section className="container mx-auto px-4 py-10 md:py-14">
        <Link
          href="/apps"
          className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-primary"
        >
          Back to Apps
        </Link>
        <p className="mt-4 text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">
          Petri Dish Simulator
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-semibold">
          Petri Dish Simulator
        </h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground">
          Simulate fungal growth, treatment response, and experimental protocols with
          live data integration.
        </p>
      </section>

      <section className="container mx-auto px-4 pb-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Growth modeling</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Visualize colony expansion and environmental conditions over time.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Experiment workflows</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Configure protocols, inputs, and outputs for lab-ready scenarios.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Data integration</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Connect simulations to MINDEX and MAS for historical context and analysis.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
import type { Metadata } from "next"
import { PetriDishSimClient } from "./PetriDishSimClient"

export const metadata: Metadata = {
  title: "Petri Dish Simulator - Mycosoft",
  description: "Virtual mycelium growth simulator with environmental controls, multiple species, and realistic mycelial behavior",
}

export default function PetriDishSimPage() {
  return <PetriDishSimClient />
}
