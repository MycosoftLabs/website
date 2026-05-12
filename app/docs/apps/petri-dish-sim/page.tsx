import type { Metadata } from "next"
import { DocStubPage } from "@/components/docs/doc-stub-page"

export const metadata: Metadata = {
  title: "Petri Dish Sim",
  description: "Lab-bench virtual experiment surface.",
}

export default function Page() {
  return (
    <DocStubPage
      title="Petri Dish Sim"
      description="Lab-bench virtual experiment surface."
      section="Apps"
      sectionHref="/docs/apps"
      status="coming-soon"
      sources={[
        { label: "PDF", href: "/pdf/apps-petri-dish-sim.pdf", kind: "pdf" },
        { label: "GitBook", href: "https://mycosoft.gitbook.io/apps-petri-dish-sim", kind: "gitbook" },
      ]}
    />
  )
}
