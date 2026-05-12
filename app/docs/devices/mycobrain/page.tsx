import type { Metadata } from "next"
import { DocStubPage } from "@/components/docs/doc-stub-page"

export const metadata: Metadata = {
  title: "MycoBrain",
  description: "Edge compute appliance running MYCA workloads on-device.",
}

export default function Page() {
  return (
    <DocStubPage
      title="MycoBrain"
      description="Edge compute appliance running MYCA workloads on-device."
      section="Devices"
      sectionHref="/docs/devices"
      status="coming-soon"
      sources={[
        { label: "PDF", href: "/pdf/devices-mycobrain.pdf", kind: "pdf" },
        { label: "GitBook", href: "https://mycosoft.gitbook.io/devices-mycobrain", kind: "gitbook" },
      ]}
    />
  )
}
