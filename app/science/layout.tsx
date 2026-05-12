import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Science & Research | Mycosoft",
  description:
    "A living research atlas: mycology, signal intelligence, and distributed environmental compute for the Earth computer.",
}

export default function ScienceLayout({ children }: { children: ReactNode }) {
  return children
}
