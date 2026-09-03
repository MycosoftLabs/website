import type { Metadata } from "next"
import { PlatformOperationWorkspace } from "@/components/fusarium/platform-operations/platform-operation-workspace"
import { platformOperation } from "@/lib/fusarium/platform-operations/catalog"

export const metadata: Metadata = { title: "MINDEX Evidence Fabric | Fusarium" }
export default function Page() { return <PlatformOperationWorkspace definition={platformOperation("mindex")} /> }
