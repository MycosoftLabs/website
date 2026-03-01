import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Devices | Mycosoft",
  description: "Device portfolio for Mycosoft sensing, compute, and intelligence systems.",
}

export default function DevicesPage() {
  return (
    <main className="min-h-dvh bg-background">
      <section className="container mx-auto px-4 py-10 md:py-14">
        <p className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">Devices</p>
        <h1 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-semibold">Device Portfolio</h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground">
          Explore the Mycosoft device ecosystem for sensing, biological compute, and
          environmental intelligence.
        </p>
      </section>

      <section className="container mx-auto px-4 pb-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">MycoBrain systems</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Edge intelligence devices for fungal computing and adaptive sensing.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Deployment hardware</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Ruggedized hardware designed for field operations and biosecurity.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Telemetry integration</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Streams device telemetry to MAS and NatureOS for live intelligence.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
import type { Metadata } from "next"
import { DevicesPortal } from "@/components/devices/devices-portal"

export const metadata: Metadata = {
  title: "Devices - Environmental Sensing Hardware | Mycosoft",
  description: "Defense-grade environmental sensing hardware for operational intelligence. MycoNode probes, SporeBase collectors, ALARM sensors, and Mushroom1 autonomous platforms.",
}

export default function DevicesPage() {
  return <DevicesPortal />
}
