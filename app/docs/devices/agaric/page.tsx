import type { Metadata } from "next"
import { DocStubPage } from "@/components/docs/doc-stub-page"

export const metadata: Metadata = {
  title: "Agaric",
  description: "Compact field probe with audio and bioelectric sensing.",
}

export default function Page() {
  return (
    <DocStubPage
      title="Agaric"
      description="Compact field probe with audio and bioelectric sensing."
      section="Devices"
      sectionHref="/docs/devices"
      status="coming-soon"
      sources={[
        { label: "PDF", href: "/pdf/devices-agaric.pdf", kind: "pdf" },
        { label: "GitBook", href: "https://mycosoft.gitbook.io/devices-agaric", kind: "gitbook" },
      ]}
    />
  )
}
