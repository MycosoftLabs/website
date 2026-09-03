import type { Metadata } from "next"
import { DefensiveAnalysisWorkspace } from "@/components/fusarium/tools-hub/defensive-analysis-workspace"
export const metadata: Metadata = { title: "Multi-Sensor Track Fusion | Fusarium" }
export default function Page() { return <DefensiveAnalysisWorkspace kind="fusion" /> }
