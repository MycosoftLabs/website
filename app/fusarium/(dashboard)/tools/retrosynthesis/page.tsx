import type { Metadata } from "next"
import { RetrosynthesisEvidenceWorkbench as FusariumRetrosynthesisMount } from "@/components/fusarium/retrosynthesis/retrosynthesis-evidence-workbench"

export const metadata: Metadata = {
  title: "Retrosynthesis | Fusarium Tools",
  description: "Local, read-only review of supplied chemistry concept relationships and provenance without synthesis instructions or external access.",
}

export default function FusariumRetrosynthesisPage() {
  return <FusariumRetrosynthesisMount />
}
