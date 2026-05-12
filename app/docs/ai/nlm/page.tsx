import type { Metadata } from "next"
import { DocStubPage } from "@/components/docs/doc-stub-page"

export const metadata: Metadata = {
  title: "NLM",
  description: "Natural Language for Mycology — research model trained on mycological literature and biosignal data.",
}

export default function Page() {
  return (
    <DocStubPage
      title="NLM"
      description="Natural Language for Mycology — research model trained on mycological literature and biosignal data."
      section="AI Stack"
      sectionHref="/docs/ai"
      status="frontier"
      sources={[
        { label: "PDF", href: "/pdf/nlm.pdf", kind: "pdf" },
        { label: "GitBook", href: "https://mycosoft.gitbook.io/nlm", kind: "gitbook" },
      ]}
    />
  )
}
