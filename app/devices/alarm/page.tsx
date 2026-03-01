import { AlarmDetails } from "@/components/devices/alarm-details"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "ALARM | Incident Signaling & Response | Mycosoft",
  description: "ALARM device profile for incident signaling, escalation routing, and mission-critical response.",
}

export default function AlarmPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <AlarmDetails />
    </div>
  )
}
