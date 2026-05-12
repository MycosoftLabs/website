import type { Metadata } from "next"
import { NeuromorphicProvider } from "@/components/ui/neuromorphic"
import { ScienceStubLayout } from "@/components/science/stub-layout"

export const metadata: Metadata = {
  title: "Materials & Biotech | Mycosoft Science",
  description:
    "Mycelium-based composites and bio-derived materials. What evidence supports, and what the honest limits still are.",
}

export default function MaterialsSubPage() {
  return (
    <NeuromorphicProvider>
      <ScienceStubLayout
        eyebrow="Research Atlas · Sub-page"
        title="Materials & Biotech"
        description="Species selection, growth substrates, mechanical and acoustic benchmarks, hydrophilicity treatments, and standardization gaps. The full materials sub-page is in production."
        parentHref="/science#materials"
      />
    </NeuromorphicProvider>
  )
}
