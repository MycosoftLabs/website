import { FusariumOutcomesPanel } from "@/components/fusarium/personnel/personnel-panels"

export const metadata = { title: "Personnel outcomes | Fusarium", robots: { index: false, follow: false } }
export const dynamic = "force-dynamic"

export default function FusariumPersonnelOutcomesPage() {
  return <FusariumOutcomesPanel />
}
