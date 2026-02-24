"use client"

import Link from "next/link"
import { Cpu, ArrowRight } from "lucide-react"
import { MycoBrainDeviceManager } from "@/components/mycobrain/mycobrain-device-manager"
import { DevicePageShell } from "@/components/natureos/device-page-shell"

export default function NatureOSMycoBrainPage() {
  return (
    <DevicePageShell
      heading="MycoBrain Console"
      text="Monitor and control MycoBrain devices via MDP/MMP protocol. Real-time telemetry flows through Mycorrhizae."
    >
      <div className="space-y-6">
        <MycoBrainDeviceManager />
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Cpu className="h-4 w-4" />
            <span>
              Data flows: MycoBrain (MDP) → Gateway → Mycorrhizae → MINDEX / NatureOS
            </span>
            <Link
              href="/natureos/devices"
              className="ml-auto inline-flex items-center gap-1 text-primary hover:underline"
            >
              Device Registry
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </DevicePageShell>
  )
}
