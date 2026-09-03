import type { Metadata } from "next"
import { FusariumBlueSightDashboard } from "@/components/fusarium/sensing/bluesight-dashboard"

export const metadata: Metadata = {
  title: "BlueSight | Fusarium",
  description: "Fusarium spectral and multi-sensor comparison surface.",
}

export default function FusariumBlueSightPage() {
  return <FusariumBlueSightDashboard />
}
