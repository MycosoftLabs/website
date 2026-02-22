import { ReactNode } from "react"

import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"
import { DeviceSubnav } from "@/components/natureos/device-subnav"

interface DevicePageShellProps {
  heading: string
  text: string
  children: ReactNode
}

export function DevicePageShell({ heading, text, children }: DevicePageShellProps) {
  return (
    <DashboardShell>
      <DashboardHeader heading={heading} text={text} />
      <DeviceSubnav />
      <div className="pt-6">{children}</div>
    </DashboardShell>
  )
}
