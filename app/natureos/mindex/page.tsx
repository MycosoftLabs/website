import type { Metadata } from "next"
import { MINDEXDashboard } from "@/components/natureos/mindex-dashboard"

export const metadata: Metadata = {
  title: "MINDEX - Mycosoft Data Integrity Index",
  description: "Fungal species database with cryptographic integrity verification and real-time data synchronization",
}

export default function MINDEXPage() {
  return <MINDEXDashboard />
}

