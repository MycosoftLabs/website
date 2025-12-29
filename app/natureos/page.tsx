"use client"

import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"
import { NatureOSDashboard } from "@/components/dashboard/natureos-dashboard"
import { Suspense } from "react"
import { RefreshCw } from "lucide-react"

export default function NatureOSPage() {
  return (
    <DashboardShell>
      <DashboardHeader heading="NatureOS Dashboard" text="Monitor and manage your fungal intelligence network" />
      <Suspense fallback={
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }>
        <NatureOSDashboard />
      </Suspense>
    </DashboardShell>
  )
}
