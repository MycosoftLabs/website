import type { Metadata } from "next"
import { DevelopmentWorkspace } from "@/components/fusarium/development/development-workspace"

export const metadata: Metadata = { title: "Functions | Fusarium" }
export default function FunctionsPage() { return <DevelopmentWorkspace surface="functions" /> }
