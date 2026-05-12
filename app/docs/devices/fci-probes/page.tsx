import type { Metadata } from "next"
import { DocStubPage } from "@/components/docs/doc-stub-page"

export const metadata: Metadata = {
  title: "FCI Probes",
  description: "Fungal Computing Interface probes (research grade). Electrically active substrates, not language-capable systems.",
}

export default function Page() {
  return (
    <DocStubPage
      title="FCI Probes"
      description="Fungal Computing Interface probes (research grade). Electrically active substrates, not language-capable systems."
      section="Devices"
      sectionHref="/docs/devices"
      status="frontier"
      sources={[
        { label: "PDF", href: "/pdf/devices-fci-probes.pdf", kind: "pdf" },
        { label: "GitBook", href: "https://mycosoft.gitbook.io/devices-fci-probes", kind: "gitbook" },
      ]}
    />
  )
}
