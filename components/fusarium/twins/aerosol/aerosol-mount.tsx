import type { Metadata } from "next"
import { CrepResourceHints } from "@/components/crep/crep-resource-hints"
import { AerosolMapWorkbench } from "@/components/fusarium/aerosol/aerosol-map-workbench"
import { FusariumTwinSurface } from "@/components/fusarium/twins/fusarium-twin-surface"

/**
 * Fusarium-only operational rebuild of Aerosol.
 *
 * The byte-identical NatureOS page remains available at /natureos/aerosol.
 * Fusarium intentionally replaces the thin card dashboard at this mount
 * boundary with a map-first, evidence-gated workbench.
 */
export function FusariumAerosolMount() {
  return (
    <FusariumTwinSurface>
      <CrepResourceHints />
      <AerosolMapWorkbench />
    </FusariumTwinSurface>
  )
}

export const aerosolFusariumMetadata: Metadata = {
  title: "Aerosol | Fusarium",
  description:
    "Fusarium atmospheric intelligence map for provenance-bearing spores, SporeBase, particulate, fire, smoke, wind, and air-quality evidence.",
}
