"use client"

import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"
import { MycoBrainDeviceManager } from "@/components/mycobrain/mycobrain-device-manager"

export default function NatureOSDevicesPage() {
  return (
    <DashboardShell>
      <DashboardHeader
        heading="Device Manager"
        text="Monitor and control your MycoBrain devices and connected sensors"
      />
      <MycoBrainDeviceManager />
    </DashboardShell>
  )
}
