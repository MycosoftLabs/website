import type { Metadata } from "next"
import { DocStubPage } from "@/components/docs/doc-stub-page"

export const metadata: Metadata = {
  title: "MYCA",
  description: "Mycosoft's primary multi-agent AI orchestrator — task automation law, agent roles, deployment patterns.",
}

export default function Page() {
  return (
    <DocStubPage
      title="MYCA"
      description="Mycosoft's primary multi-agent AI orchestrator — task automation law, agent roles, deployment patterns."
      section="AI Stack"
      sectionHref="/docs/ai"
      status="coming-soon"
      sources={[
        { label: "PDF", href: "/pdf/myca-architecture.pdf", kind: "pdf" },
        { label: "GitBook", href: "https://mycosoft.gitbook.io/myca", kind: "gitbook" },
      ]}
    />
  )
}
