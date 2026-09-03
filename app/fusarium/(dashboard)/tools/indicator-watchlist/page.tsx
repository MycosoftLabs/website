import type { Metadata } from "next"
import { DefensiveAnalysisWorkspace } from "@/components/fusarium/tools-hub/defensive-analysis-workspace"
export const metadata: Metadata = { title: "Indicator Watchlist | Fusarium" }
export default function Page() { return <DefensiveAnalysisWorkspace kind="watchlist" /> }
