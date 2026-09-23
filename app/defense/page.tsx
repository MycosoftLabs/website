import type { Metadata } from "next"
import { DefensePortalV2 } from "@/components/defense/defense-portal-v2"

export const metadata: Metadata = {
  title: "Defense | Environmental Intelligence | EVINT | Mycosoft",
  description: "Mycosoft Defense: Environmental Intelligence (EVINT) for the Department of Defense. Persistent environmental sensing, biological intelligence, and infrastructure protection.",
}

export default function DefensePage() {
  return <DefensePortalV2 />
}


































