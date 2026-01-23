import type { Metadata } from "next"
import { MINDEXPortal } from "@/components/mindex/mindex-portal"

export const metadata: Metadata = {
  title: "MINDEX - Mycosoft Data Integrity Index | Cryptographic Environmental Database",
  description: "MINDEX is the world's first cryptographically-secured mycological database. Tamper-evident records, provable chain-of-custody, and trusted environmental intelligence for research, compliance, and defense applications.",
  keywords: ["MINDEX", "mycological database", "data integrity", "cryptographic verification", "environmental data", "chain of custody", "Mycosoft"],
  openGraph: {
    title: "MINDEX - Mycosoft Data Integrity Index",
    description: "The world's first cryptographically-secured mycological database. Tamper-evident records and trusted environmental intelligence.",
    type: "website",
  },
}

export default function MINDEXPage() {
  return <MINDEXPortal />
}
