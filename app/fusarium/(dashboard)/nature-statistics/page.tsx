import type { Metadata } from "next"
import { FusariumNatureStatisticsMount } from "@/components/fusarium/twins/nature-statistics/nature-statistics-mount"

/**
 * /fusarium/nature-statistics — explicit mount of Nature Statistics.
 *
 * This static segment wins over (dashboard)/[slug], so the generic slug
 * workspace no longer captures this app. NatureOS payload files remain
 * immutable; Fusarium mounts the working NatureOS composition verbatim.
 */
export const metadata: Metadata = {
  title: "Nature Statistics | Fusarium",
  description:
    "The working Nature Statistics dashboard mounted inside Fusarium navigation and full-width glass treatment.",
}

export default function FusariumNatureStatisticsPage() {
  return <FusariumNatureStatisticsMount />
}
