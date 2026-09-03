import type { Metadata } from "next"
import { DevelopmentWorkspace } from "@/components/fusarium/development/development-workspace"

export const metadata: Metadata = { title: "Cloud Shell | Fusarium" }
export default function ShellPage() { return <DevelopmentWorkspace surface="shell" /> }
