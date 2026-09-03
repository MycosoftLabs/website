import type { Metadata } from "next"
import { EvidenceToolWorkspace } from "@/components/fusarium/tools-hub/evidence-tool-workspace"

export const metadata: Metadata = { title: "Source Health Matrix | Fusarium" }
export default function Page() { return <EvidenceToolWorkspace kind="health" /> }
