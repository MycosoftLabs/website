import Link from "next/link"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Hyphae 1 | Devices",
  description: "Hyphae 1 device profile for fungal network interfacing.",
}

export default function HyphaeOnePage() {
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
          Hyphae 1
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-semibold">Hyphae 1</h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground">
          Hyphae 1 enables direct interfacing with fungal networks for bio-compute experimentation.
        </p>
      </section>

      <section className="container mx-auto px-4 pb-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">FCI integration</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Optimized for signal capture and Fungal Computer Interface workflows.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Precision sensing</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              High-resolution monitoring for low-noise biological signals.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Research telemetry</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Streams to NatureOS and MAS for experiments and analysis.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
