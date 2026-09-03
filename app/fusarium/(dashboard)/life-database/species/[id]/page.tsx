import type { Metadata } from "next"
import { FusariumLifeDatabaseProfile } from "@/components/fusarium/twins/ancestry/life-database-profile"

export const metadata: Metadata = {
  title: "Species Profile | Fusarium Life Database",
  description: "Unified protected taxonomy, genetics, chemistry, media, relationship, and location profile.",
}

export default function FusariumLifeDatabaseProfilePage() {
  return <FusariumLifeDatabaseProfile />
}
