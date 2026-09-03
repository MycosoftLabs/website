import type { Metadata } from "next"
import { FusariumPhysicsSimulatorMount } from "@/components/fusarium/twins/legacy-tools/legacy-tools-mount"

export const metadata: Metadata = {
  title: "Physics Simulator | Fusarium Tools",
  description: "Truth-labelled client-side physics simulation demonstration inside Fusarium.",
}

export default function FusariumPhysicsSimulatorPage() {
  return <FusariumPhysicsSimulatorMount />
}
