import type { Metadata } from "next"
import { DirtNetPage } from "@/components/dirtnet/dirtnet-page"

export const metadata: Metadata = {
  title: "DirtNet | Mycosoft",
  description:
    "DirtNet is Mycosoft's decentralized edge network for MycoBrain devices, MDP, Mycorrhizae Protocol, MycoSpeak, LoRa, LoRaWAN, and Meshtastic — with Earth Simulator at the center of the device mesh.",
}

export default function DirtNetRoutePage() {
  return <DirtNetPage />
}
