import type { Metadata } from "next"
import { ToolsHubIndex } from "@/components/natureos/apps/tools-hub/tools-hub-index"

export const metadata: Metadata = {
  title: "Tools Hub | NatureOS",
  description:
    "Catalog of lab equipment, AI analysis, chemistry, biology, genetics, physics, and sampling tools across NatureOS.",
}

export default function NatureOSToolsHubPage() {
  return <ToolsHubIndex />
}
