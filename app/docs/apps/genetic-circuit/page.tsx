import type { Metadata } from "next"
import { DocStubPage } from "@/components/docs/doc-stub-page"

export const metadata: Metadata = {
  title: "Genetic Circuit",
  description: "Synthetic-biology circuit design.",
}

export default function Page() {
  return (
    <DocStubPage
      title="Genetic Circuit"
      description="Synthetic-biology circuit design."
      section="Apps"
      sectionHref="/docs/apps"
      status="coming-soon"
      sources={[
        { label: "PDF", href: "/pdf/apps-genetic-circuit.pdf", kind: "pdf" },
        { label: "GitBook", href: "https://mycosoft.gitbook.io/apps-genetic-circuit", kind: "gitbook" },
      ]}
    />
  )
}
