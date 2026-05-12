import type { Metadata } from "next"
import { NeuromorphicProvider } from "@/components/ui/neuromorphic"
import { ScienceStubLayout } from "@/components/science/stub-layout"

export const metadata: Metadata = {
  title: "Fungal Interface Lab | Mycosoft Science",
  description:
    "Electrode arrays, spike-train analysis, and stimulation programs over electrically active fungal substrates — measurable, not language.",
}

export default function FCISubPage() {
  return (
    <NeuromorphicProvider>
      <ScienceStubLayout
        eyebrow="Research Atlas · Sub-page"
        title="Fungal Interface Lab"
        description="Electrode arrays on mycelium-bearing substrates, stimulation protocols, and on-device firmware via mycobrain. The full lab page — wiring diagrams, probe galleries, and stimulus catalog — is in production."
        parentHref="/science#fci"
      />
    </NeuromorphicProvider>
  )
}
