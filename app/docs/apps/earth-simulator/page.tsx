import type { Metadata } from "next"
import { DocStubPage } from "@/components/docs/doc-stub-page"

export const metadata: Metadata = {
  title: "Earth Simulator",
  description: "Planetary-scale environmental modeling.",
}

export default function Page() {
  return (
    <DocStubPage
      title="Earth Simulator"
      description="Planetary-scale environmental modeling."
      section="Apps"
      sectionHref="/docs/apps"
      status="coming-soon"
      sources={[
        { label: "PDF", href: "/pdf/apps-earth-simulator.pdf", kind: "pdf" },
        { label: "GitBook", href: "https://mycosoft.gitbook.io/apps-earth-simulator", kind: "gitbook" },
      ]}
    />
  )
}
