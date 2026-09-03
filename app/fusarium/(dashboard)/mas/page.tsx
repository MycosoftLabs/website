import type { Metadata } from "next"
import { AiOperationalWorkspace } from "@/components/fusarium/ai-readiness/ai-operational-workspace"
export const metadata: Metadata = { title: "MAS Topology | Fusarium" }
export default function Page() { return <AiOperationalWorkspace surface="mas" /> }
