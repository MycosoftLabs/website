import { FusariumOverview } from "./fusarium-overview"

/**
 * /fusarium — the console home, mirroring /natureos.
 *
 * Numbers come only from the Fusarium runtime on 8011. Nothing on this page is
 * seeded or estimated: if the runtime does not answer, the page says so rather
 * than rendering zeros that read as real.
 */
export const dynamic = "force-dynamic"

export default function FusariumOverviewPage() {
  return <FusariumOverview />
}
