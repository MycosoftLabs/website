"use client"

import { MYCAProvider } from "@/contexts/myca-context"
import { CREPProvider } from "@/contexts/crep-context"
import { GroundStationProvider } from "@/lib/ground-station/context"
import { CREPErrorBoundary } from "@/components/crep/crep-error-boundary"
import { CrepMobileShell } from "@/components/crep/mobile/crep-mobile-shell"
import CREPDashboardClient from "./CREPDashboardClient"
import type { CREPDashboardEmbedProps } from "./CREPDashboardLoader"

export default function CREPDashboardEmbedded(props: CREPDashboardEmbedProps) {
  return (
    <MYCAProvider>
      <CREPProvider>
        <GroundStationProvider>
          <CREPErrorBoundary componentName="CREP Dashboard">
            <CrepMobileShell>
              <CREPDashboardClient {...props} />
            </CrepMobileShell>
          </CREPErrorBoundary>
        </GroundStationProvider>
      </CREPProvider>
    </MYCAProvider>
  )
}
