/**
 * Fusarium mount boundary for Biology Simulator.
 * Keeps the immutable NatureOS payload available while presenting Fusarium's
 * first real, bounded simulator rather than the source roadmap landing page.
 */
import { BiologySimulationWorkbench } from "@/components/fusarium/twins/biology-simulator/biology-simulation-workbench"
import { FusariumTwinSurface } from "@/components/fusarium/twins/fusarium-twin-surface"

export function FusariumBiologySimulatorMount() {
  return (
    <FusariumTwinSurface>
      <BiologySimulationWorkbench />
    </FusariumTwinSurface>
  )
}

export { metadata as biologySimulatorNatureosMetadata } from "@/app/natureos/biology-simulator/page"
