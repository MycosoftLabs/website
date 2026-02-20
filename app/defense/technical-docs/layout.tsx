import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Technical Documentation - OEI | Mycosoft",
  description: "Access comprehensive technical documentation for Mycosoft's OEI platform including hardware specs, API references, integration guides, and protocol specifications.",
}

export default function TechnicalDocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
