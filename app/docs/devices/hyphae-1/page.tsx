import type { Metadata } from "next"
import { DocStubPage } from "@/components/docs/doc-stub-page"

export const metadata: Metadata = {
  title: "Hyphae 1",
  description: "Distributed soil and substrate sensor network.",
}

export default function Page() {
  return (
    <DocStubPage
      title="Hyphae 1"
      description="Distributed soil and substrate sensor network."
      section="Devices"
      sectionHref="/docs/devices"
      status="coming-soon"
      sources={[
        { label: "PDF", href: "/pdf/devices-hyphae-1.pdf", kind: "pdf" },
        { label: "GitBook", href: "https://mycosoft.gitbook.io/devices-hyphae-1", kind: "gitbook" },
      ]}
    />
  )
}
