import type { Metadata } from "next"
import { SporeMap } from "@/components/apps/spore-tracker/spore-map"

export const metadata: Metadata = {
  title: "Spore Tracker - Mycosoft",
  description: "Global spore distribution tracking with real-time wind and weather data",
}

export default function SporeTrackerPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <SporeMap />
    </div>
  )
}
