import Link from "next/link"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "MycoNode | Devices",
  description: "MycoNode device profile for distributed sensing and compute.",
}

export default function MycoNodePage() {
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
          MycoNode
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-semibold">MycoNode</h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground">
          MycoNode delivers modular sensing and compute for scalable field deployments.
        </p>
      </section>

      <section className="container mx-auto px-4 pb-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Modular architecture</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Configurable payloads for mission-specific sensing and analytics.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Edge compute</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Local inference and compression for low-latency operations.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Secure telemetry</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Authenticated streaming into MAS and NatureOS device services.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
