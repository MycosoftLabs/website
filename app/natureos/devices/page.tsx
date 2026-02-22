"use client"

import { MycoBrainDeviceManager } from "@/components/mycobrain/mycobrain-device-manager"
import { DevicePageShell } from "@/components/natureos/device-page-shell"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function DeviceManagerContent() {
  const searchParams = useSearchParams()
  const devicePort = searchParams.get("device")
  
  return <MycoBrainDeviceManager initialPort={devicePort || undefined} />
}

export default function NatureOSDevicesPage() {
  return (
    <DevicePageShell
      heading="Device Manager"
      text="Monitor and control your MycoBrain devices and connected sensors."
    >
      <Suspense fallback={<div className="text-center py-8">Loading device manager...</div>}>
        <DeviceManagerContent />
      </Suspense>
    </DevicePageShell>
  )
}
