import { Hyphae1Details } from "@/components/devices/hyphae1-details"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Hyphae 1 | Fungal Network Interface | Mycosoft",
  description: "Hyphae 1 device profile for fungal network interfacing. FCI integration with precision sensing and research telemetry.",
}

export default function HyphaeOnePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Hyphae1Details />
    </div>
  )
}
