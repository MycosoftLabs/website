import type { Metadata } from "next"
import { DocStubPage } from "@/components/docs/doc-stub-page"

export const metadata: Metadata = {
  title: "SporeBase",
  description: "Stationary lab and field base station for spore capture and analysis.",
}

export default function Page() {
  return (
    <DocStubPage
      title="SporeBase"
      description="Stationary lab and field base station for spore capture and analysis."
      section="Devices"
      sectionHref="/docs/devices"
      status="coming-soon"
      sources={[
        { label: "PDF", href: "/pdf/devices-sporebase.pdf", kind: "pdf" },
        { label: "GitBook", href: "https://mycosoft.gitbook.io/devices-sporebase", kind: "gitbook" },
      ]}
    />
  )
}
