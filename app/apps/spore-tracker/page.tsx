import Link from "next/link"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Spore Tracker | Apps",
  description: "Track spore activity across regions with live intelligence streams.",
}

export default function SporeTrackerPage() {
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
          Spore Tracker
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-semibold">Spore Tracker</h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground">
          Monitor spore activity, dispersion trends, and regional alerts in real time.
        </p>
      </section>

      <section className="container mx-auto px-4 pb-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Live detection</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Integrate sensor feeds and spore detection telemetry.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Dispersion modeling</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Map spore movement using environmental context and simulation inputs.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Alerting workflows</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Route high-risk detections to response teams and dashboards.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
import type { Metadata } from "next"
import { SporeTrackerApp } from "@/components/apps/spore-tracker/spore-tracker-app"

export const metadata: Metadata = {
  title: "Spore Tracker - Mycosoft",
  description: "Global spore distribution tracking with real-time wind and weather data",
}

export default function SporeTrackerPage() {
  return <SporeTrackerApp />
}
