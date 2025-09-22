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
    return (
      <DashboardShell>
        <DashboardHeader
          heading="Spore Tracker"
          text="Global spore distribution tracking with real-time wind and weather data"
        />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardShell>
    )
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
