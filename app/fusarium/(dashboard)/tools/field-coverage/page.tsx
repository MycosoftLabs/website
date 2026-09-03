import type { Metadata } from "next"
import { LocalReviewWorkspace } from "@/components/fusarium/tools-hub/local-review-workspace"
export const metadata: Metadata = { title: "Environmental Coverage Planner | Fusarium" }
export default function Page() { return <LocalReviewWorkspace kind="coverage" /> }
