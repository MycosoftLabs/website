import type { Metadata } from "next"
import { DocStubPage } from "@/components/docs/doc-stub-page"

export const metadata: Metadata = {
  title: "NatureOS Dashboard",
  description: "Operator dashboard for fleets, telemetry, and alerts.",
}

export default function Page() {
  return (
    <DocStubPage
      title="NatureOS Dashboard"
      description="Operator dashboard for fleets, telemetry, and alerts."
      section="Dashboards"
      sectionHref="/docs"
      status="coming-soon"
      sources={[
        { label: "PDF", href: "/pdf/dashboards-natureos.pdf", kind: "pdf" },
        { label: "GitBook", href: "https://mycosoft.gitbook.io/dashboards-natureos", kind: "gitbook" },
      ]}
    />
  )
}
