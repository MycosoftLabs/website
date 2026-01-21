"use client"

import { use, useEffect, useState } from "react"
import { notFound } from "next/navigation"
import { DeviceDetails } from "@/components/devices/device-details"
import { Mushroom1Details } from "@/components/devices/mushroom1-details"
import { SporeBaseDetails } from "@/components/devices/sporebase-details"
import { Hyphae1Details } from "@/components/devices/hyphae1-details"
import { MycoNodeDetails } from "@/components/devices/myconode-details"
import { AlarmDetails } from "@/components/devices/alarm-details"
import { DEVICES } from "@/lib/devices"
import { Skeleton } from "@/components/ui/skeleton"

interface DevicePageProps {
  params: Promise<{
    id: string
  }>
}

export default function DevicePage({ params }: DevicePageProps) {
  const { id } = use(params)
  const [device, setDevice] = useState<(typeof DEVICES)[0] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    // Find the device by ID
    const foundDevice = DEVICES.find((d) => d.id === id)

    if (foundDevice) {
      setDevice(foundDevice)
    } else {
      setError(true)
    }

    setLoading(false)
  }, [id])

  // Show loading state
  if (loading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-12 w-1/3 mb-4" />
        <Skeleton className="h-6 w-2/3 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Skeleton className="aspect-square h-[400px]" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-12 w-1/3" />
          </div>
        </div>
      </div>
    )
  }

  // Show 404 if device not found
  if (error || !device) {
    return notFound()
  }

  // Use specialized detail pages for each device
  switch (id) {
    case "mushroom-1":
      return (
        <div className="min-h-screen flex flex-col">
          <Mushroom1Details />
        </div>
      )
    case "sporebase":
      return (
        <div className="min-h-screen flex flex-col">
          <SporeBaseDetails />
        </div>
      )
    case "hyphae-1":
      return (
        <div className="min-h-screen flex flex-col">
          <Hyphae1Details />
        </div>
      )
    case "myconode":
      return (
        <div className="min-h-screen flex flex-col">
          <MycoNodeDetails />
        </div>
      )
    case "alarm":
      return (
        <div className="min-h-screen flex flex-col">
          <AlarmDetails />
        </div>
      )
    default:
      return (
        <div className="min-h-screen flex flex-col">
          <DeviceDetails device={device} />
        </div>
      )
  }
}
