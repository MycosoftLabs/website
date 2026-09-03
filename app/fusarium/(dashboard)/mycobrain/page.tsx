import type { Metadata } from "next"
import { PlatformOperationWorkspace } from "@/components/fusarium/platform-operations/platform-operation-workspace"
import { platformOperation } from "@/lib/fusarium/platform-operations/catalog"

export const metadata: Metadata = { title: "DirtNet Edge Nodes | Fusarium" }
export default function Page() { return <PlatformOperationWorkspace definition={platformOperation("mycobrain")} /> }
