import type { Metadata } from "next"
import { DocStubPage } from "@/components/docs/doc-stub-page"

export const metadata: Metadata = {
  title: "MycoTenna",
  description: "RF and spectrum sensing array for environmental signals.",
}

export default function Page() {
  return (
    <DocStubPage
      title="MycoTenna"
      description="RF and spectrum sensing array for environmental signals."
      section="Devices"
      sectionHref="/docs/devices"
      status="coming-soon"
      sources={[
        { label: "PDF", href: "/pdf/devices-mycotenna.pdf", kind: "pdf" },
        { label: "GitBook", href: "https://mycosoft.gitbook.io/devices-mycotenna", kind: "gitbook" },
      ]}
    />
  )
}
