import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "FUSARIUM | Environmental Intelligence for Defense | Mycosoft",
  description:
    "FUSARIUM combines the Nature Learning Model, Earth Simulator, MINDEX, sensing applications, and air, water, and land droids to deliver operational environmental intelligence for defense and infrastructure.",
}

export default function FusariumLayout({ children }: { children: React.ReactNode }) {
  return children
}
