import type { Metadata } from "next"
import { DevicesPortal } from "@/components/devices/devices-portal"

export const metadata: Metadata = {
  title: "Devices | Droids | Mycosoft",
  description:
    "We build droids, or robots with sensors, built to live outside continuously — each device shares the same MycoBrain core, so the fleet scales manufacturing, adds new sensors, and ships new devices without reinventing the nervous system.",
}

export default function DevicesPage() {
  return <DevicesPortal />
}
