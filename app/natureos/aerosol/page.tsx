import type { Metadata } from "next"
import { AerosolDashboard } from "@/components/natureos/apps/aerosol/aerosol-dashboard"

export const metadata: Metadata = {
  title: "Aerosol | NatureOS",
  description:
    "Airborne layers: pollen, spores, dust, virus (pending), chemicals, radiation (pending) — wired to MINDEX/CREP BFF routes.",
}

export default function AerosolPage() {
  return (
    <div className="container mx-auto px-4 py-6 md:py-10 max-w-6xl space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">NatureOS App</p>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Aerosol</h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-3xl">
          Thin v1 dashboard: six layers with real upstream proxies under{" "}
          <code className="text-xs bg-muted px-1 rounded">/api/natureos/aerosol/*</code>. Virus and radiation remain
          documented empty states until feeds land (see MAS follow-up plan).
        </p>
      </header>
      <AerosolDashboard />
    </div>
  )
}
