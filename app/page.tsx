import dynamic from "next/dynamic"
import { Suspense } from "react"

// Dynamic imports with loading states for heavy components
const ParallaxSearch = dynamic(
  () => import("@/components/home/parallax-search"),
  {
    loading: () => <SearchSkeleton />,
    ssr: true,
  }
)

const QuickAccess = dynamic(
  () => import("@/components/quick-access").then((mod) => ({ default: mod.QuickAccess })),
  {
    loading: () => <QuickAccessSkeleton />,
    ssr: true,
  }
)

// Lightweight skeleton components for instant feedback
function SearchSkeleton() {
  return (
    <section className="pt-8 pb-16 md:pb-24 flex flex-col items-center gap-8">
      <div className="w-full max-w-2xl relative">
        <div
          className="relative px-4 md:px-8 rounded-xl bg-muted/50 animate-pulse"
          style={{ padding: "6rem 1rem", paddingBottom: "8rem" }}
        >
          <div className="flex flex-col items-center gap-6 md:gap-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-muted rounded-full" />
              <div className="h-10 w-48 bg-muted rounded" />
            </div>
            <div className="h-5 w-64 bg-muted rounded" />
            <div className="w-full max-w-xl h-10 bg-muted rounded-lg" />
          </div>
        </div>
      </div>
    </section>
  )
}

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
      <Suspense fallback={<SearchSkeleton />}>
        <ParallaxSearch />
      </Suspense>
      <Suspense fallback={<QuickAccessSkeleton />}>
        <QuickAccess />
      </Suspense>
    </div>
  )
}
