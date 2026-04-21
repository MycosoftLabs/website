// SERVER component — do NOT add "use client" here.
// CREPDashboardLoader handles the dynamic(ssr:false) import so
// WebGL / deck.gl / luma.gl only execute in the browser.
import { CrepResourceHints } from "@/components/crep/crep-resource-hints"
import CREPDashboardLoader from "./CREPDashboardLoader"

export const dynamic = "force-dynamic"

// Apr 20, 2026 perf: render preconnect/dns-prefetch hints for the
// high-traffic external origins CREP hits on mount (basemap CDN,
// ESRI, GIBS, Mapbox, Caltrans HLS, etc.). Browser starts TLS
// handshakes in parallel with page load → first tile fetch lands
// 100-300 ms sooner than cold. See components/crep/crep-resource-hints.tsx.
export default function CrepPage() {
  return (
    <>
      <CrepResourceHints />
      <CREPDashboardLoader />
    </>
  )
}
