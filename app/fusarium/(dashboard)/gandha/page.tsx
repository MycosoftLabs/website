import type { Metadata } from "next"
import { GandhaDashboard } from "@/components/fusarium/sensing/gandha-dashboard"

export const metadata: Metadata = {
  title: "GANDHA | Fusarium",
  description: "VOC and gas signature dataset, labeling, provenance, training, and inference workspace.",
}

export default function FusariumGandhaPage() {
  return <GandhaDashboard />
}
