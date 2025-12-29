"use client"

import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"
import { MycoBrainDeviceManager } from "@/components/mycobrain/mycobrain-device-manager"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function DeviceManagerContent() {
  const searchParams = useSearchParams()
  const devicePort = searchParams.get("device")
  
  return <MycoBrainDeviceManager initialPort={devicePort || undefined} />
}

export default function NatureOSDevicesPage() {
  return (
    <DashboardShell>
      <DashboardHeader
        heading="Device Manager"
        text="Monitor and control your MycoBrain devices and connected sensors"
      />
      <Suspense fallback={<div className="text-center py-8">Loading device manager...</div>}>
        <DeviceManagerContent />
      </Suspense>
    </DashboardShell>
  )
}
