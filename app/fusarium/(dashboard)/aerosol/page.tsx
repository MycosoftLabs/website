import {
  aerosolFusariumMetadata,
  FusariumAerosolMount,
} from "@/components/fusarium/twins/aerosol/aerosol-mount"

/**
 * /fusarium/aerosol — Fusarium-local map-first Aerosol operations surface.
 * Wins over (dashboard)/[slug] without changing the NatureOS source route.
 */
export const metadata = aerosolFusariumMetadata

export default function FusariumAerosolPage() {
  return <FusariumAerosolMount />
}
