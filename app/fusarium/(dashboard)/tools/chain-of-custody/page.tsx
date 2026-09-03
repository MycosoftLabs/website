import type { Metadata } from "next"
import { EvidenceOperationsWorkspace } from "@/components/fusarium/tools-hub/evidence-operations-workspace"

export const metadata: Metadata = { title: "Chain of Custody Ledger Inspector | Fusarium" }
export default function Page() { return <EvidenceOperationsWorkspace kind="custody" /> }
