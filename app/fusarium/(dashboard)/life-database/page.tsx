import type { Metadata } from "next"
import { FusariumLifeDatabaseMount } from "@/components/fusarium/twins/ancestry/ancestry-mount"

export const metadata: Metadata = {
  title: "Life Database | Fusarium",
  description: "Search MINDEX-backed biological records, taxonomy, observations, media, genetics, and provenance inside Fusarium.",
}

export default function FusariumLifeDatabasePage() {
  return <FusariumLifeDatabaseMount />
}
