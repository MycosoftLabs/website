/**
 * Fungi Compute - Biological Computing Visualization Platform
 * 
 * The flagship NatureOS app for FCI signal visualization, SDR filtering,
 * pattern recognition, and real-time correlation with environmental data.
 */

import { Metadata } from "next"
import { FungiComputeDashboard } from "@/components/fungi-compute/dashboard"
import { RequiresTablet } from "@/components/ui/responsive-display"

export const metadata: Metadata = {
  title: "Fungi Compute | NatureOS",
  description: "Biological computing visualization platform - real-time mycelium signal analysis, pattern recognition, and environmental correlation",
}

export default function FungiComputePage() {
  return (
    <RequiresTablet
      appName="Fungi Compute"
      reason="This biological computing visualization platform uses oscilloscopes, spectrum analyzers, and real-time 3D signal processing that require a tablet or desktop."
    >
      <FungiComputeDashboard />
    </RequiresTablet>
  )
}
