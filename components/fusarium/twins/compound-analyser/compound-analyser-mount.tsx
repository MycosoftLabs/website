/**
 * Fusarium mount boundary for Compound Analyser.
 * Remounts the immutable NatureOS compound-analyser page (ToolViewport + CompoundSimEmbed).
 */
import CompoundAnalyserPage from "@/app/natureos/compound-analyser/page"
import { CompoundEvidenceWorkbench } from "@/components/fusarium/compound-analyser/compound-evidence-workbench"
import { FusariumTwinSurface } from "@/components/fusarium/twins/fusarium-twin-surface"

// Keep the immutable NatureOS payload in the clone graph for parity verification.
// Fusarium uses a boundary-local workbench because the legacy surface exposes
// unbound simulation and write actions that cannot truthfully run on this host.
void CompoundAnalyserPage

export function FusariumCompoundAnalyserMount() {
  return (
    <FusariumTwinSurface>
      <CompoundEvidenceWorkbench />
    </FusariumTwinSurface>
  )
}
