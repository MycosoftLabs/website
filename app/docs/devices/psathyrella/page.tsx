import type { Metadata } from "next"
import { DocStubPage } from "@/components/docs/doc-stub-page"

export const metadata: Metadata = {
  title: "Psathyrella",
  description: "Subsurface and aquatic probe variant.",
}

export default function Page() {
  return (
    <DocStubPage
      title="Psathyrella"
      description="Subsurface and aquatic probe variant."
      section="Devices"
      sectionHref="/docs/devices"
      status="coming-soon"
      sources={[
        { label: "PDF", href: "/pdf/devices-psathyrella.pdf", kind: "pdf" },
        { label: "GitBook", href: "https://mycosoft.gitbook.io/devices-psathyrella", kind: "gitbook" },
      ]}
    />
  )
}
