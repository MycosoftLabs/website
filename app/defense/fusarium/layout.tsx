import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Fusarium - Defense System | Mycosoft",
  description: "Fusarium is Mycosoft's integrated defense system combining CREP dashboard, specialized devices, and AI-driven environmental intelligence for military applications.",
}

export default function FusariumLayout({ children }: { children: React.ReactNode }) {
  return children
}
