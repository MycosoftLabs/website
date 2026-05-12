import type { Metadata } from "next"
import { DocStubPage } from "@/components/docs/doc-stub-page"

export const metadata: Metadata = {
  title: "Growth Analytics",
  description: "Cultivation and growth metrics over time.",
}

export default function Page() {
  return (
    <DocStubPage
      title="Growth Analytics"
      description="Cultivation and growth metrics over time."
      section="Apps"
      sectionHref="/docs/apps"
      status="coming-soon"
      sources={[
        { label: "PDF", href: "/pdf/apps-growth-analytics.pdf", kind: "pdf" },
        { label: "GitBook", href: "https://mycosoft.gitbook.io/apps-growth-analytics", kind: "gitbook" },
      ]}
    />
  )
}
