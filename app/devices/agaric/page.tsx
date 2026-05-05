import { AgaricDetails } from "@/components/devices/agaric-details"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Agaric | Flying Sensor Hub | Mycosoft",
  description:
    "Agaric is Mycosoft's flying sensor hub with autonomous flight, MAVLink control, LoRa mesh, satellite options, and Mini, Standard, and Heavy-Lift variants.",
}

export default function AgaricPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <AgaricDetails />
    </div>
  )
}
