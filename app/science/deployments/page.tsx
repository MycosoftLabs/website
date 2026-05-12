import type { Metadata } from "next"
import { NeuromorphicProvider } from "@/components/ui/neuromorphic"
import { ScienceStubLayout } from "@/components/science/stub-layout"

export const metadata: Metadata = {
  title: "Earth Computer Deployments | Mycosoft Science",
  description:
    "Forest edge nodes today; subsea and orbital compute as named frontier hypotheses with prior art.",
}

export default function DeploymentsSubPage() {
  return (
    <NeuromorphicProvider>
      <ScienceStubLayout
        eyebrow="Research Atlas · Sub-page"
        title="Earth Computer Deployments"
        description="Forest-edge field trials, subsea compute hypothesis tracking (Project Natick), and orbital/lunar references (Axiom, Lonestar). Site-by-site detail pages are in production."
        parentHref="/science#deployments"
      />
    </NeuromorphicProvider>
  )
}
