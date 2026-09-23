/**
 * Super Intelligence Page — Layered ecosystem: MYCA + AVANI + NLM + FormSpace + MINDEX + NatureOS
 * Route: /si
 * Updated: Sep 22, 2026
 */

import type { Metadata } from "next"
import { SIPageContent } from "@/components/si/si-page-content"

export const metadata: Metadata = {
  title: "Super Intelligence | Layered SI Ecosystem | Mycosoft",
  description:
    "Mycosoft's superintelligence stack is a layered ecosystem: MYCA, AVANI, NLM, FormSpace, MINDEX, and NatureOS — planet-scale sensing, edge agents, nature-grounded reasoning, and governed interfaces.",
}

export default function SIOverviewPage() {
  return <SIPageContent />
}
