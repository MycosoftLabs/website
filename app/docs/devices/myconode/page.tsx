import type { Metadata } from "next"
import { DocStubPage } from "@/components/docs/doc-stub-page"

export const metadata: Metadata = {
  title: "MycoNode",
  description: "Mesh networking node for fungal-data telemetry.",
}

export default function Page() {
  return (
    <DocStubPage
      title="MycoNode"
      description="Mesh networking node for fungal-data telemetry."
      section="Devices"
      sectionHref="/docs/devices"
      status="coming-soon"
      sources={[
        { label: "PDF", href: "/pdf/devices-myconode.pdf", kind: "pdf" },
        { label: "GitBook", href: "https://mycosoft.gitbook.io/devices-myconode", kind: "gitbook" },
      ]}
    />
  )
}
