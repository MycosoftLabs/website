import type { Metadata } from "next"
import { DefensiveAnalysisWorkspace } from "@/components/fusarium/tools-hub/defensive-analysis-workspace"
export const metadata: Metadata = { title: "Classification / Releaseability Checker | Fusarium" }
export default function Page() { return <DefensiveAnalysisWorkspace kind="release" /> }
