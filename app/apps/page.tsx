import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Apps | Mycosoft",
  description: "Applications for simulation, analysis, and environmental intelligence.",
}

export default function AppsPage() {
  return (
    <main className="min-h-dvh bg-background">
      <section className="container mx-auto px-4 py-10 md:py-14">
        <p className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">Apps</p>
        <h1 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-semibold">Mycosoft Apps</h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground">
          Explore simulation, analytics, and intelligence applications built on NatureOS and MAS.
        </p>
      </section>

      <section className="container mx-auto px-4 pb-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Scientific simulation</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Interactive simulators for biology, mycelium growth, and compounds analysis.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Operational intelligence</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Dashboards and tools for tracking real-time environmental signals.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Field analytics</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Analytics tools powered by MINDEX, device telemetry, and MAS workflows.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
import type { Metadata } from "next"
import { AppsPortal } from "@/components/apps/apps-portal"

export const metadata: Metadata = {
  title: "Applications - Mycosoft",
  description: "Mission-critical applications for environmental intelligence, mycology research, and defense operations",
}

export default function AppsPage() {
  return <AppsPortal />
}
