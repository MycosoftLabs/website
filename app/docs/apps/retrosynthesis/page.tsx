import type { Metadata } from "next"
import { DocStubPage } from "@/components/docs/doc-stub-page"

export const metadata: Metadata = {
  title: "Retrosynthesis",
  description: "Retrosynthetic route planning for target compounds.",
}

export default function Page() {
  return (
    <DocStubPage
      title="Retrosynthesis"
      description="Retrosynthetic route planning for target compounds."
      section="Apps"
      sectionHref="/docs/apps"
      status="coming-soon"
      sources={[
        { label: "PDF", href: "/pdf/apps-retrosynthesis.pdf", kind: "pdf" },
        { label: "GitBook", href: "https://mycosoft.gitbook.io/apps-retrosynthesis", kind: "gitbook" },
      ]}
    />
  )
}
