import { FusariumSurveyPanel } from "@/components/fusarium/personnel/personnel-panels"

export const metadata = { title: "Personnel survey | Fusarium", robots: { index: false, follow: false } }
export const dynamic = "force-dynamic"

export default function FusariumPersonnelSurveyPage() {
  return <FusariumSurveyPanel />
}
