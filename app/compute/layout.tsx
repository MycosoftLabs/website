import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Compute | Mycosoft",
  description: "Live compute fleet — GPUs, VMs, services, and infrastructure snapshot from MAS",
}

export default function ComputeLayout({ children }: { children: React.ReactNode }) {
  return children
}
