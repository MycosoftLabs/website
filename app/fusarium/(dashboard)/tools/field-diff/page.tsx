import type { Metadata } from "next"
import { LocalReviewWorkspace } from "@/components/fusarium/tools-hub/local-review-workspace"
export const metadata: Metadata = { title: "Field Change Detector | Fusarium" }
export default function Page() { return <LocalReviewWorkspace kind="field-diff" /> }
