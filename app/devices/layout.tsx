import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Devices - Mycosoft",
  description: "Explore Mycosoft's innovative fungal intelligence devices",
}

export default function DevicesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="min-h-screen flex flex-col">{children}</div>
}
