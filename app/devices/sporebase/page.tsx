import { SporeBaseDetails } from "@/components/devices/sporebase-details"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "SporeBase v4 | Bioaerosol Collection System | Mycosoft",
  description:
    "Time-indexed bioaerosol sampling with 15-60 minute segments, PCR-ready collection, solar power, and lab integration.",
  openGraph: {
    title: "SporeBase v4 | Bioaerosol Collection System | Mycosoft",
    description:
      "Time-indexed bioaerosol sampling with 15-60 minute segments, PCR-ready collection, solar power, and lab integration.",
  },
}

export default function SporeBasePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SporeBaseDetails />
    </div>
  )
}
