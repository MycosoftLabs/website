import type { Metadata } from "next"
import { MINDEXDashboard } from "@/components/natureos/mindex-dashboard"
import { MYCAProvider } from "@/contexts/myca-context"

export const metadata: Metadata = {
  title: "MINDEX | Mycosoft Data Integrity Index | Mycosoft",
  description: "Fungal species database with cryptographic integrity verification and real-time data synchronization",
}

export default function MINDEXPage() {
  return (
    <MYCAProvider>
      <MINDEXDashboard />
    </MYCAProvider>
  )
}





























