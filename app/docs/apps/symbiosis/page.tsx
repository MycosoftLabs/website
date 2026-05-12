import type { Metadata } from "next"
import { DocStubPage } from "@/components/docs/doc-stub-page"

export const metadata: Metadata = {
  title: "Symbiosis",
  description: "Multi-organism symbiosis modeling.",
}

export default function Page() {
  return (
    <DocStubPage
      title="Symbiosis"
      description="Multi-organism symbiosis modeling."
      section="Apps"
      sectionHref="/docs/apps"
      status="coming-soon"
      sources={[
        { label: "PDF", href: "/pdf/apps-symbiosis.pdf", kind: "pdf" },
        { label: "GitBook", href: "https://mycosoft.gitbook.io/apps-symbiosis", kind: "gitbook" },
      ]}
    />
  )
}
