"use client"

import { Suspense } from "react"

import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"
import { DashboardHero } from "@/components/dashboard/dashboard-hero"
import { NatureOSWelcome } from "@/components/natureos/natureos-welcome"

export default function NatureOSPage() {
  return (
    <DashboardShell>
      <DashboardHero displayName="Explorer" isSuperAdmin={false} />
      <DashboardHeader
        heading="NatureOS Dashboard"
        text="Quick actions and fleet-wide health for the NatureOS platform."
      />
      <Suspense fallback={<div className="rounded-lg border p-6">Loading NatureOS overview...</div>}>
        <NatureOSWelcome />
      </Suspense>
    </DashboardShell>
  )
}
