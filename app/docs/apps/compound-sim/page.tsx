import type { Metadata } from "next"
import { DocStubPage } from "@/components/docs/doc-stub-page"

export const metadata: Metadata = {
  title: "Compound Sim",
  description: "Molecular simulation surface.",
}

export default function Page() {
  return (
    <DocStubPage
      title="Compound Sim"
      description="Molecular simulation surface."
      section="Apps"
      sectionHref="/docs/apps"
      status="coming-soon"
      sources={[
        { label: "PDF", href: "/pdf/apps-compound-sim.pdf", kind: "pdf" },
        { label: "GitBook", href: "https://mycosoft.gitbook.io/apps-compound-sim", kind: "gitbook" },
      ]}
    />
  )
}
