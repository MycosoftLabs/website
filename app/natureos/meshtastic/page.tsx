import { MeshHub } from "@/components/meshtastic/MeshHub"
import { MeshtasticSubnav } from "@/components/meshtastic/meshtastic-subnav"
import { DevicePageShell } from "@/components/natureos/device-page-shell"

export default function MeshtasticHomePage() {
  return (
    <DevicePageShell
      heading="Meshtastic · Console"
      text="Global mesh ingest (MQTT bridge → MINDEX) with a map-first live scope, tables, and perf views. Functionality is modeled after field-proven operator layouts; branding stays Mycosoft."
    >
      <MeshtasticSubnav />
      <MeshHub />
    </DevicePageShell>
  )
}
