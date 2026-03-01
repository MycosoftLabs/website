import { Mushroom1Details } from "@/components/devices/mushroom1-details"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Mushroom 1 | Fungal Sensing Platform | Mycosoft",
  description: "Mushroom 1 flagship sensing platform bridging fungal networks with real-time telemetry and intelligence workflows.",
}

export default function MushroomOnePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Mushroom1Details />
    </div>
  )
}
