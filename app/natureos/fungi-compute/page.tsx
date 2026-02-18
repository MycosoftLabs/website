/**
 * Fungi Compute - Biological Computing Visualization Platform
 *
 * Phone    : "Requires tablet/desktop" message — oscilloscopes + WebGL can't
 *             run usefully on a 375px screen.
 * Tablet+  : Full FungiComputeDashboard with oscilloscope, spectrum analyzer,
 *             signal fingerprint, SDR filter, etc.
 */

import { Metadata } from "next"
import { AppOnly } from "@/components/ui/responsive"
import { FungiComputeDashboard } from "@/components/fungi-compute/dashboard"

export const metadata: Metadata = {
  title: "Fungi Compute | NatureOS",
  description: "Biological computing visualization platform - real-time mycelium signal analysis, pattern recognition, and environmental correlation",
}

export default function FungiComputePage() {
  return (
    <AppOnly
      title="Fungi Compute"
      description="Real-time oscilloscope, spectrum analyzer, and bioelectric signal visualizations require a tablet or desktop screen for accurate data display."
      href="/natureos"
    >
      <FungiComputeDashboard />
    </AppOnly>
  )
}
