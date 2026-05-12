import type { Metadata } from "next"
import { DocStubPage } from "@/components/docs/doc-stub-page"

export const metadata: Metadata = {
  title: "Petraeus",
  description: "High-power deployment platform for ruggedized outdoor use.",
}

export default function Page() {
  return (
    <DocStubPage
      title="Petraeus"
      description="High-power deployment platform for ruggedized outdoor use."
      section="Devices"
      sectionHref="/docs/devices"
      status="coming-soon"
      sources={[
        { label: "PDF", href: "/pdf/devices-petraeus.pdf", kind: "pdf" },
        { label: "GitBook", href: "https://mycosoft.gitbook.io/devices-petraeus", kind: "gitbook" },
      ]}
    />
  )
}
