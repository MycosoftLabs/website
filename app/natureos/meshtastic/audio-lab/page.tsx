import { Suspense } from "react"

import { AudioLab } from "@/components/meshtastic/AudioLab"
import { MeshtasticSubnav } from "@/components/meshtastic/meshtastic-subnav"
import { DevicePageShell } from "@/components/natureos/device-page-shell"

export default function MeshtasticAudioLabPage() {
  return (
    <DevicePageShell
      heading="Meshtastic · Audio lab"
      text="Optional packet sonification with Tone.js — muted by default; unmute to bind SSE and play cues from live mesh traffic."
    >
      <MeshtasticSubnav />
      <Suspense fallback={<div className="rounded-lg border p-6">Loading audio lab…</div>}>
        <AudioLab />
      </Suspense>
    </DevicePageShell>
  )
}
