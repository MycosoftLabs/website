import type { Metadata } from "next"
import { DefensePortalV2 } from "@/components/defense/defense-portal-v2"

export const metadata: Metadata = {
  title: "Defense - Operational Environmental Intelligence | Mycosoft",
  description: "Mycosoft Defense: Operational Environmental Intelligence (OEI) for the Department of Defense. Persistent environmental sensing, biological intelligence, and infrastructure protection.",
}

export default function DefensePage() {
  return <DefensePortalV2 />
}


































