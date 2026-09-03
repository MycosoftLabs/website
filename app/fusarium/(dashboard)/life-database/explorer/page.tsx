import { Suspense } from "react"
import type { Metadata } from "next"
import { FusariumLifeDatabaseExplorer } from "@/components/fusarium/twins/ancestry/life-database-explorer"

export const metadata: Metadata = {
  title: "Species Explorer | Fusarium Life Database",
  description: "Protected all-life species discovery through Mycosoft MINDEX.",
}

export default function FusariumLifeDatabaseExplorerPage() {
  return <Suspense fallback={null}><FusariumLifeDatabaseExplorer /></Suspense>
}
