import type { Metadata } from "next"
import { FciDashboard } from "@/components/fusarium/fci/fci-dashboard"

export const metadata: Metadata = {
  title: "FCI Device Interface | Fusarium",
  description: "Evidence-gated Fungal Computer Interface device context and Fungi Compute handoff.",
}

export default function FusariumFciPage() {
  return <FciDashboard />
}
