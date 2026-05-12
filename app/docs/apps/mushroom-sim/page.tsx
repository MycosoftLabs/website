import type { Metadata } from "next"
import { DocStubPage } from "@/components/docs/doc-stub-page"

export const metadata: Metadata = {
  title: "Mushroom Sim",
  description: "Fungal growth simulation playground.",
}

export default function Page() {
  return (
    <DocStubPage
      title="Mushroom Sim"
      description="Fungal growth simulation playground."
      section="Apps"
      sectionHref="/docs/apps"
      status="coming-soon"
      sources={[
        { label: "PDF", href: "/pdf/apps-mushroom-sim.pdf", kind: "pdf" },
        { label: "GitBook", href: "https://mycosoft.gitbook.io/apps-mushroom-sim", kind: "gitbook" },
      ]}
    />
  )
}
