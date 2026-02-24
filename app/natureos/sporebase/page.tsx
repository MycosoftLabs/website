"use client"

import Link from "next/link"
import { Droplets, ArrowRight } from "lucide-react"
import { DevicePageShell } from "@/components/natureos/device-page-shell"

export default function NatureOSSporeBasePage() {
  return (
    <DevicePageShell
      heading="SporeBase Monitor"
      text="Spore capture and environmental sensing. Telemetry flows through Mycorrhizae protocol."
    >
      <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-8 text-center">
        <Droplets className="h-16 w-16 text-primary/50 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">SporeBase Integration</h3>
        <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
          SporeBase device telemetry will appear here when connected via the
          device gateway. Channel: device.{`{serial}`}.environment
        </p>
        <Link
          href="/natureos/devices"
          className="inline-flex items-center gap-2 text-primary hover:underline"
        >
          View Device Network
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </DevicePageShell>
  )
}
