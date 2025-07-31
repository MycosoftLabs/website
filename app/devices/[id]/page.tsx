"use client"

import { useEffect, useState } from "react"
import { notFound } from "next/navigation"
import { DeviceDetails } from "@/components/devices/device-details"
import { DEVICES } from "@/lib/devices"
import { Skeleton } from "@/components/ui/skeleton"

interface DevicePageProps {
  params: {
    id: string
  }
}

export default function DevicePage({ params }: DevicePageProps) {
  const [device, setDevice] = useState<(typeof DEVICES)[0] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    // Find the device by ID
    const foundDevice = DEVICES.find((d) => d.id === params.id)

    if (foundDevice) {
      setDevice(foundDevice)
    } else {
      setError(true)
    }

    setLoading(false)
  }, [params.id])

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

  return (
    <div className="min-h-screen flex flex-col">
      <DeviceDetails device={device} />
    </div>
  )
}
