import type { Metadata } from "next"
import { DocStubPage } from "@/components/docs/doc-stub-page"

export const metadata: Metadata = {
  title: "Fusarium Dashboard",
  description: "Research dashboard for biosignal analysis and lab work.",
}

export default function Page() {
  return (
    <DocStubPage
      title="Fusarium Dashboard"
      description="Research dashboard for biosignal analysis and lab work."
      section="Dashboards"
      sectionHref="/docs"
      status="coming-soon"
      sources={[
        { label: "PDF", href: "/pdf/dashboards-fusarium.pdf", kind: "pdf" },
        { label: "GitBook", href: "https://mycosoft.gitbook.io/dashboards-fusarium", kind: "gitbook" },
      ]}
    />
  )
}
