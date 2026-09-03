import type { Metadata } from "next"
import { FusariumLifeDatabaseRecords } from "@/components/fusarium/twins/ancestry/life-database-records"

export const metadata: Metadata = {
  title: "Database | Fusarium Life Database",
  description: "Protected MINDEX biological record index across all taxonomy ranks.",
}

export default function FusariumLifeDatabaseRecordsPage() {
  return <FusariumLifeDatabaseRecords />
}
