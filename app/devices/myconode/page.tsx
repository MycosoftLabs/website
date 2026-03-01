import { MycoNodeDetails } from "@/components/devices/myconode-details"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "MycoNode | Distributed Sensing & Compute | Mycosoft",
  description: "MycoNode device profile for distributed sensing and compute. Modular architecture with edge compute and secure telemetry.",
}

export default function MycoNodePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <MycoNodeDetails />
    </div>
  )
}
