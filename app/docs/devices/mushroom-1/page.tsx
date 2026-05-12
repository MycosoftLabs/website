import type { Metadata } from "next"
import { DocStubPage } from "@/components/docs/doc-stub-page"

export const metadata: Metadata = {
  title: "Mushroom 1",
  description: "Edge biosignal collector.",
}

export default function Page() {
  return (
    <DocStubPage
      title="Mushroom 1"
      description="Edge biosignal collector."
      section="Devices"
      sectionHref="/docs/devices"
      status="coming-soon"
      sources={[
        { label: "PDF", href: "/pdf/devices-mushroom-1.pdf", kind: "pdf" },
        { label: "GitBook", href: "https://mycosoft.gitbook.io/devices-mushroom-1", kind: "gitbook" },
      ]}
    />
  )
}
