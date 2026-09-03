import type { Metadata } from "next"
import { FusariumLifeDatabaseTools } from "@/components/fusarium/twins/ancestry/life-database-tools"

export const metadata: Metadata = {
  title: "Life Database Tools | Fusarium",
  description: "Phylogeny, evolution, genetics, sequence, and biological relationship analysis inside Fusarium.",
}

export default function LifeDatabaseToolsPage() {
  return <FusariumLifeDatabaseTools />
}
