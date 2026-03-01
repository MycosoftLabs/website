import Link from "next/link"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "ALARM | Devices",
  description: "ALARM device profile for incident signaling and response.",
}

export default function AlarmPage() {
  return (
    <main className="min-h-dvh bg-background">
      <section className="container mx-auto px-4 py-10 md:py-14">
        <Link
          href="/devices"
          className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-primary"
        >
          Back to Devices
        </Link>
        <p className="mt-4 text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">ALARM</p>
        <h1 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-semibold">ALARM</h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground">
          ALARM provides rapid incident signaling and escalation for mission-critical events.
        </p>
      </section>

      <section className="container mx-auto px-4 pb-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Rapid notification</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Immediate alerting for high-priority environmental or device anomalies.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Escalation routing</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Connects alerts to MAS agent workflows and response teams.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Operational context</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Ties incidents to mission data, telemetry, and response notes.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
