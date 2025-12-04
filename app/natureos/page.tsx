"use client"

import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"
import { NatureOSDashboard } from "@/components/dashboard/natureos-dashboard"
import { useEffect, useState } from "react"

export default function NatureOSPage() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return (
    <DashboardShell>
      <DashboardHeader heading="NatureOS Dashboard" text="Monitor and manage your fungal intelligence network" />
      {isClient ? <NatureOSDashboard /> : null}
    </DashboardShell>
  )
}
