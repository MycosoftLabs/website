import type { Metadata } from "next"
import { DocStubPage } from "@/components/docs/doc-stub-page"

export const metadata: Metadata = {
  title: "Physics Sim",
  description: "Underlying physics engine for environment modeling.",
}

export default function Page() {
  return (
    <DocStubPage
      title="Physics Sim"
      description="Underlying physics engine for environment modeling."
      section="Apps"
      sectionHref="/docs/apps"
      status="coming-soon"
      sources={[
        { label: "PDF", href: "/pdf/apps-physics-sim.pdf", kind: "pdf" },
        { label: "GitBook", href: "https://mycosoft.gitbook.io/apps-physics-sim", kind: "gitbook" },
      ]}
    />
  )
}
