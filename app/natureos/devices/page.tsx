"use client"

import { MycoBrainDeviceManager } from "@/components/mycobrain/mycobrain-device-manager"
import { DevicePageShell } from "@/components/natureos/device-page-shell"
import { useSearchParams, useRouter } from "next/navigation"
import { Suspense, useEffect } from "react"
import { RefreshCw } from "lucide-react"

function isFieldRegistryId(value: string | null): boolean {
  if (!value) return false
  return value.startsWith("mycobrain-") && !value.startsWith("COM") && !value.startsWith("/dev")
}

function isLocalSerialPort(value: string | null): boolean {
  if (!value) return false
  return value.startsWith("COM") || value.startsWith("/dev/")
}

function DeviceManagerContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const deviceParam = searchParams.get("device")

  useEffect(() => {
    if (!deviceParam) {
      router.replace("/natureos/devices/network")
      return
    }
    if (isFieldRegistryId(deviceParam)) {
      router.replace(`/natureos/devices/${encodeURIComponent(deviceParam)}`)
    }
  }, [deviceParam, router])

  if (!deviceParam) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Opening device network…
      </div>
    )
  }

  if (isFieldRegistryId(deviceParam)) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Opening field device controls…
      </div>
    )
  }

  if (!isLocalSerialPort(deviceParam)) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Loading device manager…
      </div>
    )
  }

  return <MycoBrainDeviceManager initialPort={deviceParam} />
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
