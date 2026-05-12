import type { Metadata } from "next"
import { DocStubPage } from "@/components/docs/doc-stub-page"

export const metadata: Metadata = {
  title: "Alchemy Lab",
  description: "Compound design and reaction planning.",
}

export default function Page() {
  return (
    <DocStubPage
      title="Alchemy Lab"
      description="Compound design and reaction planning."
      section="Apps"
      sectionHref="/docs/apps"
      status="coming-soon"
      sources={[
        { label: "PDF", href: "/pdf/apps-alchemy-lab.pdf", kind: "pdf" },
        { label: "GitBook", href: "https://mycosoft.gitbook.io/apps-alchemy-lab", kind: "gitbook" },
      ]}
    />
  )
}
