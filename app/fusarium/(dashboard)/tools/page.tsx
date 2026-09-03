import type { Metadata } from "next"
import { FusariumToolsHub } from "@/components/fusarium/tools-hub/tools-hub"

export const metadata: Metadata = {
  title: "Tools Hub | Fusarium",
  description: "Fusarium-local directory of mounted science, sensing, simulation, and analysis tools.",
}

export default function FusariumToolsHubPage() {
  return <FusariumToolsHub />
}
