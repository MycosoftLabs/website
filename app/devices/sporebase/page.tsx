import Link from "next/link"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "SporeBase | Devices",
  description: "SporeBase device profile for spore tracking and field intelligence.",
}

export default function SporeBasePage() {
  return (
    <main className="min-h-dvh bg-background">
      <section className="container mx-auto px-4 py-10 md:py-14">
        <Link
          href="/devices"
          className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-primary"
        >
          Back to Devices
        </Link>
        <p className="mt-4 text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">
          SporeBase
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-semibold">SporeBase</h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground">
          SporeBase provides high-sensitivity detection and tracking for airborne and soil spores.
        </p>
      </section>

      <section className="container mx-auto px-4 pb-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Spore detection</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Continuous sampling with automated classification and anomaly flags.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Field-ready design</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Ruggedized deployment profile for long-term environmental monitoring.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Data integration</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Streams into MAS intelligence pipelines and NatureOS dashboards.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
import { SporeBaseDetails } from "@/components/devices/sporebase-details"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "SporeBase v4 | Bioaerosol Collection System | Mycosoft",
  description:
    "Time-indexed bioaerosol sampling with 15-60 minute segments, PCR-ready collection, solar power, and lab integration.",
  openGraph: {
    title: "SporeBase v4 | Bioaerosol Collection System | Mycosoft",
    description:
      "Time-indexed bioaerosol sampling with 15-60 minute segments, PCR-ready collection, solar power, and lab integration.",
  },
}

export default function SporeBasePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SporeBaseDetails />
    </div>
  )
}
