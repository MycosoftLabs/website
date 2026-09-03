import type { Metadata } from "next"
import { DevelopmentWorkspace } from "@/components/fusarium/development/development-workspace"

export const metadata: Metadata = { title: "SDK | Fusarium" }
export default function SdkPage() { return <DevelopmentWorkspace surface="sdk" /> }
