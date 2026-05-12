import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: {
    template: "%s | Mycosoft Docs",
    default: "Documentation | Mycosoft",
  },
  description:
    "Developer documentation for the Mycosoft platform — AI stack, devices, APIs, dashboards, and federal compliance.",
}

/**
 * Route-segment layout. The visual shell (sidebar + content area) lives in
 * `components/docs/docs-layout.tsx` and is mounted by each page so that the
 * existing `app/docs/fci-firmware/page.tsx` keeps its own chrome and is not
 * disrupted by the new sidebar wrapper.
 */
export default function DocsRouteLayout({ children }: { children: ReactNode }) {
  return children
}
