import type { Metadata } from "next"
import { FusariumSineDashboard } from "@/components/fusarium/sensing/sine-dashboard"

export const metadata: Metadata = {
  title: "SINE | Fusarium",
  description: "Fusarium acoustic evidence, analysis, and library workspace.",
}

export default function FusariumSinePage() {
  return <FusariumSineDashboard />
}
