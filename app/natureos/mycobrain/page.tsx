"use client"

import Link from "next/link"
import { Cpu, ArrowRight } from "lucide-react"
import { MycoBrainDeviceManager } from "@/components/mycobrain/mycobrain-device-manager"
import { DevicePageShell } from "@/components/natureos/device-page-shell"
import { isFieldRegistryId, isLocalSerialPort } from "@/lib/devices/firmware-compatibility"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function MycoBrainConsoleContent() {
  const searchParams = useSearchParams()
  const deviceParam = searchParams.get("device")

  return (
    <MycoBrainDeviceManager
      initialPort={isLocalSerialPort(deviceParam) ? deviceParam! : undefined}
      initialDeviceId={isFieldRegistryId(deviceParam) ? deviceParam! : undefined}
    />
  )
}

export default function NatureOSMycoBrainPage() {
  return (
    <DevicePageShell
      heading="MycoBrain Console"
      text="Monitor and control MycoBrain devices via MDP/MMP protocol — USB serial and field MQTT agents."
    >
      <div className="space-y-6">
        <Suspense fallback={<div className="text-center py-8">Loading console…</div>}>
          <MycoBrainConsoleContent />
        </Suspense>
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
          <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 shrink-0" />
              <span>
                Data flows: MycoBrain (MDP) → Gateway / Jetson agent → MAS registry → NatureOS
              </span>
            </div>
            <Link
              href="/natureos/devices/registry"
              className="inline-flex min-h-[44px] items-center gap-1 text-primary hover:underline sm:ml-auto"
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
