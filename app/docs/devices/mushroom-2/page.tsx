import type { Metadata } from "next"
import { DocStubPage } from "@/components/docs/doc-stub-page"

export const metadata: Metadata = {
  title: "Mushroom 2",
  description: "Next-gen consumer and professional variant of Mushroom 1.",
}

export default function Page() {
  return (
    <DocStubPage
      title="Mushroom 2"
      description="Next-gen consumer and professional variant of Mushroom 1."
      section="Devices"
      sectionHref="/docs/devices"
      status="coming-soon"
      sources={[
        { label: "PDF", href: "/pdf/devices-mushroom-2.pdf", kind: "pdf" },
        { label: "GitBook", href: "https://mycosoft.gitbook.io/devices-mushroom-2", kind: "gitbook" },
      ]}
    />
  )
}
