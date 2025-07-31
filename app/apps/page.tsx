import type { Metadata } from "next"
import { AppDirectory } from "@/components/apps/app-directory"

export const metadata: Metadata = {
  title: "Apps - Mycosoft",
  description: "Explore Mycosoft's suite of mycology research applications",
}

export default function AppsPage() {
  return (
    <div className="container py-6 md:py-8">
      <h1 className="text-3xl font-bold mb-8">Mycosoft Apps</h1>
      <AppDirectory />
    </div>
  )
}
