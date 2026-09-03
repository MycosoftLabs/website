import type { ReactNode } from "react"
import NatureOSAncesstrySegmentLayout from "@/app/natureos/ancestry/layout"
import { FusariumAncestryLinkRewriter } from "@/components/fusarium/twins/ancestry/ancestry-link-rewriter"

/**
 * /fusarium/ancestry/** — remounts the NatureOS ancestry segment layout
 * (passthrough) and rewrites in-page /natureos/ancestry links at the Fusarium
 * boundary.
 */
export default function FusariumAncestryLayout({ children }: { children: ReactNode }) {
  return (
    <FusariumAncestryLinkRewriter>
      <NatureOSAncesstrySegmentLayout>{children}</NatureOSAncesstrySegmentLayout>
    </FusariumAncestryLinkRewriter>
  )
}
