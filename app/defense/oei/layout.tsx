import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Operational Environmental Intelligence - OEI | Mycosoft",
  description: "Learn about Operational Environmental Intelligence (OEI) - a new intelligence discipline giving voice to the operational environment through persistent sensing and AI analysis.",
}

export default function OEILayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
