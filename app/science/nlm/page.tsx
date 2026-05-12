import type { Metadata } from "next"
import { NeuromorphicProvider } from "@/components/ui/neuromorphic"
import { ScienceStubLayout } from "@/components/science/stub-layout"

export const metadata: Metadata = {
  title: "Nature Learning Models | Mycosoft Science",
  description:
    "Signals first, language second. NLM foundation models over acoustic, atmospheric, geospatial, and bioelectric streams.",
}

export default function NLMSubPage() {
  return (
    <NeuromorphicProvider>
      <ScienceStubLayout
        eyebrow="Research Atlas · Sub-page"
        title="Nature Learning Models"
        description="Subsystem-by-subsystem documentation, training-source manifests, evaluation suites, and AVANI-governed release notes. The full NLM sub-page is in production."
        parentHref="/science#nlm"
      />
    </NeuromorphicProvider>
  )
}
