import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Defense | Mycosoft",
  description: "Defense intelligence platforms for environmental security and bio-risk monitoring.",
}

export default function DefensePage() {
  return (
    <main className="min-h-dvh bg-background">
      <section className="container mx-auto px-4 py-10 md:py-14">
        <p className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">Defense</p>
        <h1 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-semibold">Defense Intelligence</h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground">
          Mycosoft defense systems unify real-time environmental perception, anomaly detection,
          and response workflows across land, air, and maritime domains.
        </p>
      </section>

      <section className="container mx-auto px-4 pb-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Operational awareness</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Continuous sensing and fusion of multi-source telemetry with regional context.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Threat intelligence</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Automated detection of biological, chemical, and ecological risk signals.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Response workflows</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Playbooks and escalation paths coordinated through MAS agents and alerts.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
import type { Metadata } from "next"
import { DefensePortalV2 } from "@/components/defense/defense-portal-v2"

export const metadata: Metadata = {
  title: "Defense - Operational Environmental Intelligence | Mycosoft",
  description: "Mycosoft Defense: Operational Environmental Intelligence (OEI) for the Department of Defense. Persistent environmental sensing, biological intelligence, and infrastructure protection.",
}

export default function DefensePage() {
  return <DefensePortalV2 />
}


































