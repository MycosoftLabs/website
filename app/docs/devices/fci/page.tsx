import type { Metadata } from "next"
import { DocStubPage } from "@/components/docs/doc-stub-page"

export const metadata: Metadata = {
  title: "FCI",
  description:
    "Fungal Computing Interface — multi-year research program building the hardware that, together with the FCI Firmware, enables fungal compute.",
}

export default function Page() {
  return (
    <DocStubPage
      title="FCI"
      description="Fungal Computing Interface — multi-year research program building the hardware that, together with the FCI Firmware, enables fungal compute."
      section="Devices"
      sectionHref="/docs/devices"
      status="frontier"
      sources={[
        { label: "PDF", href: "/pdf/devices-fci.pdf", kind: "pdf" },
        { label: "GitBook", href: "https://mycosoft.gitbook.io/devices-fci", kind: "gitbook" },
      ]}
    />
  )
}
