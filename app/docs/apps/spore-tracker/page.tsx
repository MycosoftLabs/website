import type { Metadata } from "next"
import { DocStubPage } from "@/components/docs/doc-stub-page"

export const metadata: Metadata = {
  title: "Spore Tracker",
  description: "Track spore release and dispersion in the field.",
}

export default function Page() {
  return (
    <DocStubPage
      title="Spore Tracker"
      description="Track spore release and dispersion in the field."
      section="Apps"
      sectionHref="/docs/apps"
      status="coming-soon"
      sources={[
        { label: "PDF", href: "/pdf/apps-spore-tracker.pdf", kind: "pdf" },
        { label: "GitBook", href: "https://mycosoft.gitbook.io/apps-spore-tracker", kind: "gitbook" },
      ]}
    />
  )
}
