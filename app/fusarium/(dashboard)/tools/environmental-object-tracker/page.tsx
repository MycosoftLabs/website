import type { Metadata } from "next"
import { DefensiveAnalysisWorkspace } from "@/components/fusarium/tools-hub/defensive-analysis-workspace"
export const metadata: Metadata = { title: "Environmental Object Tracker | Fusarium" }
export default function Page() { return <DefensiveAnalysisWorkspace kind="tracker" /> }
