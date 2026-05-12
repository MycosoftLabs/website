import type { Metadata } from "next"
import { DocStubPage } from "@/components/docs/doc-stub-page"

export const metadata: Metadata = {
  title: "Lifecycle Sim",
  description: "Organism lifecycle modeling.",
}

export default function Page() {
  return (
    <DocStubPage
      title="Lifecycle Sim"
      description="Organism lifecycle modeling."
      section="Apps"
      sectionHref="/docs/apps"
      status="coming-soon"
      sources={[
        { label: "PDF", href: "/pdf/apps-lifecycle-sim.pdf", kind: "pdf" },
        { label: "GitBook", href: "https://mycosoft.gitbook.io/apps-lifecycle-sim", kind: "gitbook" },
      ]}
    />
  )
}
