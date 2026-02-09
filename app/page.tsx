import dynamic from "next/dynamic"
import { Suspense } from "react"
// Static import so the search bar always renders (no dynamic loading that can hide it)
import ParallaxSearch from "@/components/home/parallax-search"

const QuickAccess = dynamic(
  () => import("@/components/quick-access").then((mod) => ({ default: mod.QuickAccess })),
  {
    loading: () => <QuickAccessSkeleton />,
    ssr: true,
  }
)

// Lightweight skeleton for QuickAccess only (search is static so always visible)
function QuickAccessSkeleton() {
  return (
    <section className="py-8">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-32 bg-muted/50 rounded-lg animate-pulse"
          />
        ))}
      </div>
    </section>
  )
}

export default function HomePage() {
  return (
    <div className="container max-w-7xl mx-auto px-4 relative">
      <ParallaxSearch />
      <Suspense fallback={<QuickAccessSkeleton />}>
        <QuickAccess />
      </Suspense>
    </div>
  )
}
