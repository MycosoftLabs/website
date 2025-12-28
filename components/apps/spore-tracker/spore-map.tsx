"use client"

import { Card } from "@/components/ui/card"
import { SporeTrackerMap } from "@/components/maps/spore-tracker-map"

interface SporeLocation {
  id: string
  name: string
  location: [number, number]
  sporeCount: number
  type: string
}

interface SporeMapProps {
  locations?: SporeLocation[]
  onLocationClick?: (locationId: string) => void
}

const defaultLocations: SporeLocation[] = [
  {
    id: "loc-1",
    name: "Pacific Northwest",
    location: [-122.3321, 47.6062],
    sporeCount: 1250,
    type: "Chanterelle",
  },
  {
    id: "loc-2",
    name: "Appalachian Trail",
    location: [-78.8784, 42.8864],
    sporeCount: 890,
    type: "Morel",
  },
  {
    id: "loc-3",
    name: "Great Smoky Mountains",
    location: [-83.5102, 35.5951],
    sporeCount: 2100,
    type: "Oyster",
  },
]

export function SporeMap({ locations = defaultLocations, onLocationClick }: SporeMapProps) {
  return (
    <Card className="w-full">
      <SporeTrackerMap className="w-full" />
    </Card>
  )
}
