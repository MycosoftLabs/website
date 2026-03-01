import Link from "next/link"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Mushroom 1 | Devices",
  description: "Mushroom 1 device profile for fungal sensing and intelligence.",
}

export default function MushroomOnePage() {
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
          Mushroom 1
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-semibold">Mushroom 1</h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground">
          Mushroom 1 is a flagship sensing platform that bridges fungal networks with real-time
          telemetry and intelligence workflows.
        </p>
      </section>

      <section className="container mx-auto px-4 pb-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Sensor suite</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Multimodal sensing for environmental, biological, and electrical signals.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Edge intelligence</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              On-device inference and adaptive signal processing for rapid decisions.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Telemetry pipeline</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Streams to MAS and NatureOS for fleet monitoring and alerts.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
