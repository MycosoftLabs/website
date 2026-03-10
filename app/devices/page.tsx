import type { Metadata } from "next"
import { DevicesPortal } from "@/components/devices/devices-portal"

export const metadata: Metadata = {
  title: "Devices - Environmental Sensing Hardware | Mycosoft",
  description: "Sensing hardware that feeds MYCA and AVANI—MycoNode probes, SporeBase collectors, ALARM sensors, and Mushroom1 platforms for environmental intelligence.",
}

export default function DevicesPage() {
  return <DevicesPortal />
}
