// Server component — loads the CREP dashboard with ssr: false
// to prevent WebGL/deck.gl/luma.gl from crashing during server-side rendering.
// luma.gl requires a browser environment and cannot run in Node.js.
import dynamic from "next/dynamic"
import { RefreshCw } from "lucide-react"

export const dynamic = "force-dynamic"

const CREPDashboardClient = dynamic(
  () => import("./CREPDashboardClient"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
)

export default function CREPPage() {
  return <CREPDashboardClient />
}
