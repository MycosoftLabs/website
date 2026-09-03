import type { Metadata } from "next"
import { FusariumDigitalTwinMount } from "@/components/fusarium/twins/legacy-tools/legacy-tools-mount"

export const metadata: Metadata = {
  title: "Digital Twin | Fusarium Tools",
  description: "Passive, truth-labelled digital-twin read seam inside the Fusarium boundary.",
}

export default function FusariumDigitalTwinPage() {
  return <FusariumDigitalTwinMount />
}
