import type { Metadata } from "next"
import { DevicesPortal } from "@/components/devices/devices-portal"

export const metadata: Metadata = {
  title: "Devices - Environmental Sensing Hardware | Mycosoft",
  description: "Defense-grade environmental sensing hardware for operational intelligence. MycoNode probes, SporeBase collectors, ALARM sensors, and Mushroom1 autonomous platforms.",
}

export default function DevicesPage() {
  return <DevicesPortal />
}
