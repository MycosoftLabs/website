"use client"

import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"
import { useEffect, useState } from "react"
import { SporeTrackerApp } from "@/components/apps/spore-tracker/spore-tracker-app"

export default function SporeTrackerPage() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return null
  }

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Spore Tracker"
        text="Global spore distribution tracking with real-time wind and weather data"
      />
      <SporeTrackerApp />
    </DashboardShell>
  )
}
