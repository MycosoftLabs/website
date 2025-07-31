"use client"

import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"
import { useEffect, useState } from "react"
import AncestryExplorerPage from "@/app/ancestry/explorer/page"

export default function AncestryPageWrapper() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    console.log("Ancestry page rendered")
  }, [])

  if (!isClient) {
    return null
  }

  return (
    <DashboardShell>
      <DashboardHeader heading="Ancestry Database" text="Explore fungal genealogy and relationships" />
      <AncestryExplorerPage />
    </DashboardShell>
  )
}
