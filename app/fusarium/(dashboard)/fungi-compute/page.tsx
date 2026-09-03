import { Suspense } from "react"
import { FusariumFungiComputeDashboard } from "@/components/fusarium/twins/fungi-compute/truthful-dashboard"

/**
 * Fusarium applies its evidence boundary here. The NatureOS payload remains
 * untouched and continues to mount at /natureos/fungi-compute.
 */
export default function FusariumFungiComputePage() {
  return (
    <div className="h-screen w-full overflow-hidden">
      <Suspense fallback={<div className="flex h-full items-center justify-center text-cyan-400">Loading Fungi Compute…</div>}>
        <FusariumFungiComputeDashboard />
      </Suspense>
    </div>
  )
}
