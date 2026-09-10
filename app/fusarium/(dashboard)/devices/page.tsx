import type { Metadata } from "next"
import { OsintEquipmentLibrary } from "@/components/fusarium/devices/osint-equipment-library"
import { HardwarePortfolioReference } from "@/components/fusarium/platform-operations/hardware-portfolio-reference"
import { PlatformOperationWorkspace } from "@/components/fusarium/platform-operations/platform-operation-workspace"
import { platformOperation } from "@/lib/fusarium/platform-operations/catalog"
import { FusariumRoleLens } from "@/components/fusarium/personnel/fusarium-role-lens"

export const metadata: Metadata = { title: "DirtNet Operations | Fusarium" }
export default function Page() {
  return (
    <PlatformOperationWorkspace definition={platformOperation("devices")}>
      <FusariumRoleLens surface="devices" />
      <HardwarePortfolioReference />
      <OsintEquipmentLibrary />
    </PlatformOperationWorkspace>
  )
}
