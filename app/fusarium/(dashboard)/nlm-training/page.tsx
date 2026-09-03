import type { Metadata } from "next"
import { NlmDashboard } from "@/components/fusarium/ai-readiness/nlm-dashboard"
export const metadata: Metadata = { title: "NLM Training Dashboard | Fusarium" }
export default function Page() { return <NlmDashboard /> }
