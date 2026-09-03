import type { ReactNode } from "react"
import NatureOSAncestrySegmentLayout from "@/app/natureos/ancestry/layout"
import { FusariumAncestryLinkRewriter } from "@/components/fusarium/twins/ancestry/ancestry-link-rewriter"

/** Fusarium-only Life Database boundary over the immutable NatureOS pages. */
export default function FusariumLifeDatabaseLayout({ children }: { children: ReactNode }) {
  return (
    <FusariumAncestryLinkRewriter>
      <NatureOSAncestrySegmentLayout>{children}</NatureOSAncestrySegmentLayout>
    </FusariumAncestryLinkRewriter>
  )
}
