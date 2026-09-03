import type { Metadata } from "next"
import { MechanicalDashboard } from "@/components/fusarium/sensing/mechanical-dashboard"

export const metadata: Metadata = {
  title: "Tactus — Mechanical | Fusarium",
  description: "Tactus — Mechanical: fail-closed myCobot readiness, passive self-check, tactile evidence, proprioception, and gated Flex motion-control workspace.",
}

export default function FusariumMechanicalPage() {
  return <MechanicalDashboard />
}
