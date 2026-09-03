import type { Metadata } from "next"
import { FusariumBiologySimulatorMount } from "@/components/fusarium/twins/biology-simulator/biology-simulator-mount"

/**
 * /fusarium/biology-simulator — explicit remount of /natureos/biology-simulator.
 */
export const metadata: Metadata = {
  title: "Biology Simulator | Fusarium",
  description: "Fusarium-local deterministic biology scenario workbench with explicit provenance boundaries.",
}

export default function FusariumBiologySimulatorPage() {
  return <FusariumBiologySimulatorMount />
}
