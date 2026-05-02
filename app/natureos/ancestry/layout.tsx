import type { ReactNode } from "react"

/**
 * Ancestry lives under NatureOS; parent `app/natureos/layout.tsx` already
 * provides TopNav + DashboardNav — no duplicate shell.
 */
export default function NatureOSAncesstrySegmentLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
