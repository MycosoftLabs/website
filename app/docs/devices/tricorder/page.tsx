import type { Metadata } from "next"
import { DocStubPage } from "@/components/docs/doc-stub-page"

export const metadata: Metadata = {
  title: "Tricorder",
  description: "Handheld multi-sensor unit for field surveys.",
}

export default function Page() {
  return (
    <DocStubPage
      title="Tricorder"
      description="Handheld multi-sensor unit for field surveys."
      section="Devices"
      sectionHref="/docs/devices"
      status="coming-soon"
      sources={[
        { label: "PDF", href: "/pdf/devices-tricorder.pdf", kind: "pdf" },
        { label: "GitBook", href: "https://mycosoft.gitbook.io/devices-tricorder", kind: "gitbook" },
      ]}
    />
  )
}
