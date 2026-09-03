/**
 * Dedicated Fusarium boundaries for three Tools Hub routes. Physics preserves
 * its NatureOS payload, Digital Twin uses a hardened local workspace, and
 * Retrosynthesis withholds its inherited payload pending a safe replacement.
 */
import NatureOSPhysicsSimPage from "@/app/natureos/tools/physics-sim/page"
import { FusariumTwinSurface } from "@/components/fusarium/twins/fusarium-twin-surface"
import { FusariumDigitalTwinWorkspace } from "./fusarium-digital-twin-workspace"
import { FusariumLegacyToolTruthBoundary } from "./legacy-tool-truth-boundary"
import physicsStyles from "./physics-sim-mount.module.css"

export function FusariumRetrosynthesisMount() {
  return (
    <FusariumTwinSurface>
      <FusariumLegacyToolTruthBoundary toolId="retrosynthesis">
        <div className="mx-auto max-w-4xl p-6 sm:p-8" data-fusarium-retrosynthesis-locked>
          <div className="rounded-2xl border border-amber-300/25 bg-black/35 p-6 text-zinc-200 shadow-2xl backdrop-blur-xl">
            <h2 className="text-xl font-black text-amber-100">Workspace unavailable</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              The inherited demonstration contains unreviewed synthesis and cultivation details. Fusarium withholds that payload until an approved, evidence-bounded chemistry workflow replaces it.
            </p>
          </div>
        </div>
      </FusariumLegacyToolTruthBoundary>
    </FusariumTwinSurface>
  )
}

export function FusariumDigitalTwinMount() {
  return (
    <FusariumTwinSurface>
      <FusariumLegacyToolTruthBoundary toolId="digital-twin">
        <FusariumDigitalTwinWorkspace />
      </FusariumLegacyToolTruthBoundary>
    </FusariumTwinSurface>
  )
}

export function FusariumPhysicsSimulatorMount() {
  return (
    <FusariumTwinSurface>
      <FusariumLegacyToolTruthBoundary toolId="physics-sim">
        <div
          className={physicsStyles.physicsMount}
          data-fusarium-physics-narrow-boundary
        >
          <NatureOSPhysicsSimPage />
        </div>
      </FusariumLegacyToolTruthBoundary>
    </FusariumTwinSurface>
  )
}
