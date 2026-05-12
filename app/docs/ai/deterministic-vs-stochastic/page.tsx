import type { Metadata } from "next"
import { DocStubPage } from "@/components/docs/doc-stub-page"

export const metadata: Metadata = {
  title: "Deterministic vs Stochastic AI",
  description: "When to use rule-based pipelines, LLMs, or hybrids; reliability tradeoffs in field deployments.",
}

export default function Page() {
  return (
    <DocStubPage
      title="Deterministic vs Stochastic AI"
      description="When to use rule-based pipelines, LLMs, or hybrids; reliability tradeoffs in field deployments."
      section="AI Stack"
      sectionHref="/docs/ai"
      status="coming-soon"
      sources={[
        { label: "PDF", href: "/pdf/deterministic-vs-stochastic.pdf", kind: "pdf" },
        { label: "GitBook", href: "https://mycosoft.gitbook.io/deterministic-vs-stochastic", kind: "gitbook" },
      ]}
    />
  )
}
