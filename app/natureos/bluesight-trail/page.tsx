import { BlueSightTrailLab } from "@/components/fusarium/bluesight-trail-lab"

export const metadata = {
  title: "BlueSight Trail AR | NatureOS",
  description: "ITDX26 Algorithm Lab BlueSight trail replay. SYNTHETIC EXERCISE. live=false.",
  robots: { index: false, follow: false },
}

export default function NatureOSBlueSightTrailPage() {
  return <BlueSightTrailLab surface="natureos" />
}
