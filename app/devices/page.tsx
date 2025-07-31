import type { Metadata } from "next"
import { DeviceGrid } from "@/components/devices/device-grid"
import { DeviceFilters } from "@/components/devices/device-filters"

export const metadata: Metadata = {
  title: "Devices & Marketplace - Mycosoft",
  description: "Browse and purchase Mycosoft devices for fungal research",
}

export default function DevicesPage() {
  return (
    <div className="container py-6 md:py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Devices & Marketplace</h1>
          <p className="text-lg text-muted-foreground">Browse and connect with Mycosoft devices</p>
        </div>
      </div>
      <div className="mt-8 space-y-8">
        <DeviceFilters />
        <DeviceGrid />
      </div>
    </div>
  )
}
