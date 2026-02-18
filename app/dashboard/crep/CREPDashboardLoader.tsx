"use client"

import nextDynamic from "next/dynamic"
import { RefreshCw } from "lucide-react"

const CREPDashboardClient = nextDynamic(
  () => import("./CREPDashboardClient"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
)

export default function CREPDashboardLoader() {
  return <CREPDashboardClient />
}
