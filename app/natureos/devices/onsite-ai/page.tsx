import { Suspense } from "react"

import { OnSiteAIPanel } from "@/components/iot/onsite-ai-panel"
import { DevicePageShell } from "@/components/natureos/device-page-shell"

export default function OnSiteAIPage() {
  return (
    <DevicePageShell
      heading="On-Site AI"
      text="Run NemoClaw on your Jetson or gateway to manage MycoBrain devices via MYCA, Nemotron, and the Device Manager—shell and GUI from mycosoft.com."
    >
      <Suspense fallback={<div className="rounded-lg border p-6">Loading On-Site AI...</div>}>
        <OnSiteAIPanel />
      </Suspense>
    </DevicePageShell>
  )
}
