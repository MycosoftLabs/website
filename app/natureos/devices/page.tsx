"use client"

import { MycoBrainDeviceManager } from "@/components/mycobrain/mycobrain-device-manager"
import { DevicePageShell } from "@/components/natureos/device-page-shell"
import { isFieldRegistryId, isLocalSerialPort } from "@/lib/devices/firmware-compatibility"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function DeviceManagerContent() {
  const searchParams = useSearchParams()
  const deviceParam = searchParams.get("device")

  return (
    <MycoBrainDeviceManager
      initialPort={isLocalSerialPort(deviceParam) ? deviceParam! : undefined}
      initialDeviceId={isFieldRegistryId(deviceParam) ? deviceParam! : undefined}
    />
  )
}

export default function NatureOSDevicesPage() {
  return (
    <DevicePageShell
      heading="Device Manager"
      text="Monitor and control MycoBrain devices, Mushroom-1 / Hyphae-1 / SporeBase prototypes, and connected MQTT sensors in the Mycosoft network."
    >
      <Suspense fallback={<div className="text-center py-8">Loading device manager...</div>}>
        <DeviceManagerContent />
      </Suspense>
    </DevicePageShell>
  )
}
