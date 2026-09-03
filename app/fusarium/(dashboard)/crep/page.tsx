import type { Metadata } from "next"
import { PlatformOperationWorkspace } from "@/components/fusarium/platform-operations/platform-operation-workspace"
import { platformOperation } from "@/lib/fusarium/platform-operations/catalog"

export const metadata: Metadata = { title: "Earth / CREP Mission Picture | Fusarium" }
export default function Page() { return <PlatformOperationWorkspace definition={platformOperation("crep")} /> }
