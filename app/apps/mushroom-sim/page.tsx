import Link from "next/link"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Mushroom Simulator | Apps",
  description: "Mushroom growth simulator for environmental intelligence and research.",
}

export default function MushroomSimPage() {
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
          Mushroom Simulator
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-semibold">
          Mushroom Simulator
        </h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground">
          Model mushroom growth cycles, substrate interactions, and environmental responses.
        </p>
      </section>

      <section className="container mx-auto px-4 pb-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Lifecycle modeling</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Simulate growth phases and environmental stress factors.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Scenario planning</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Compare interventions, cultivation strategies, and outcomes.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Research integration</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Connect simulations to MINDEX species data and lab telemetry.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
import { MushroomSimContent } from "@/components/apps/mushroom-sim-content"

export default function MushroomSimPage() {
  return <MushroomSimContent variant="app" />
}
