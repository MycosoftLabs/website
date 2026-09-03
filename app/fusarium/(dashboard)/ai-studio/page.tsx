import type { Metadata } from "next"
import { AiOperationalWorkspace } from "@/components/fusarium/ai-readiness/ai-operational-workspace"
export const metadata: Metadata = { title: "MYCA AI Studio | Fusarium" }
export default function Page() { return <AiOperationalWorkspace surface="ai-studio" /> }
