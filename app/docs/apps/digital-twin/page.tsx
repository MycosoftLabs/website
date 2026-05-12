import type { Metadata } from "next"
import { DocStubPage } from "@/components/docs/doc-stub-page"

export const metadata: Metadata = {
  title: "Digital Twin",
  description: "Live operational twin of a deployment site.",
}

export default function Page() {
  return (
    <DocStubPage
      title="Digital Twin"
      description="Live operational twin of a deployment site."
      section="Apps"
      sectionHref="/docs/apps"
      status="coming-soon"
      sources={[
        { label: "PDF", href: "/pdf/apps-digital-twin.pdf", kind: "pdf" },
        { label: "GitBook", href: "https://mycosoft.gitbook.io/apps-digital-twin", kind: "gitbook" },
      ]}
    />
  )
}
