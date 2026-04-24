import { ReactNode } from "react"

import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"
import { DeviceSubnav } from "@/components/natureos/device-subnav"
import { DeploymentContextBar } from "@/components/natureos/deployment-context-bar"

interface DevicePageShellProps {
  heading: string
  text: string
  children: ReactNode
  /**
   * Hide the shared "Live devices / deployment sites / Earth Simulator"
   * context bar. Default is to show it — every device page should reflect
   * the live fleet + deployment-site context at a glance.
   */
  hideContextBar?: boolean
}

export function DevicePageShell({
  heading,
  text,
  children,
  hideContextBar = false,
}: DevicePageShellProps) {
  return (
    <DashboardShell>
      <DashboardHeader heading={heading} text={text} />
      {hideContextBar ? null : <DeploymentContextBar />}
      <DeviceSubnav />
      <div className="pt-6">{children}</div>
    </DashboardShell>
  )
}
