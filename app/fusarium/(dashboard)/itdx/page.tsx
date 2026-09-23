import { BlueSightTrailLab } from "@/components/fusarium/bluesight-trail-lab"

export const metadata = {
  title: "ITDX BlueSight Trail | Fusarium",
  robots: { index: false, follow: false },
}

export default function FusariumItdxBlueSightPage() {
  return <BlueSightTrailLab surface="fusarium" />
}
