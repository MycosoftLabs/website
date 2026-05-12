import type { Metadata } from "next"
import { DocStubPage } from "@/components/docs/doc-stub-page"

export const metadata: Metadata = {
  title: "ALARM",
  description: "Biological detection and early-warning sensor with TinyML inference on-device.",
}

export default function Page() {
  return (
    <DocStubPage
      title="ALARM"
      description="Biological detection and early-warning sensor with TinyML inference on-device."
      section="Devices"
      sectionHref="/docs/devices"
      status="coming-soon"
      sources={[
        { label: "PDF", href: "/pdf/devices-alarm.pdf", kind: "pdf" },
        { label: "GitBook", href: "https://mycosoft.gitbook.io/devices-alarm", kind: "gitbook" },
      ]}
    />
  )
}
