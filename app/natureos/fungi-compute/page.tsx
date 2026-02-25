/**
 * Fungi Compute - NatureOS App Page
 *
 * Biological computing visualization and FCI signal analysis.
 * Route: /natureos/fungi-compute
 */

import { FungiComputeDashboard } from "@/components/fungi-compute"
import { Suspense } from "react"

function FungiComputePage() {
  return (
    <div className="h-screen w-full overflow-hidden">
      <Suspense fallback={<div className="flex h-full items-center justify-center text-cyan-400">Loading Fungi Compute…</div>}>
        <FungiComputeDashboard />
      </Suspense>
    </div>
  )
}

export default FungiComputePage
