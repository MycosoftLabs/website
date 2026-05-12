import type { Metadata } from "next"
import { DocStubPage } from "@/components/docs/doc-stub-page"

export const metadata: Metadata = {
  title: "AVANI",
  description: "Voice and conversational interface across Mycosoft products.",
}

export default function Page() {
  return (
    <DocStubPage
      title="AVANI"
      description="Voice and conversational interface across Mycosoft products."
      section="AI Stack"
      sectionHref="/docs/ai"
      status="coming-soon"
      sources={[
        { label: "PDF", href: "/pdf/avani.pdf", kind: "pdf" },
        { label: "GitBook", href: "https://mycosoft.gitbook.io/avani", kind: "gitbook" },
      ]}
    />
  )
}
