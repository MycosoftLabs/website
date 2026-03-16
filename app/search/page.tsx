/**
 * Search Page — Responsive breakpoint strategy
 *
 * Phone   (< 640px): ChatGPT-like MYCA chat interface with rich data cards
 * Tablet  (640–1023px): Fluid canvas only (no side panels by default).
 * Desktop (1024px+): Full 3-panel layout (chat | canvas | results+notepad).
 *
 * Error resilience: Each dynamic import has an error boundary fallback so the
 * page never gets stuck on infinite skeleton loaders.
 */

"use client"

import dynamic from "next/dynamic"
import { Suspense, Component, type ReactNode } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { SearchContextProvider } from "@/components/search/SearchContextProvider"
import { SearchLayout } from "@/components/search/SearchLayout"
import { SearchResults } from "@/components/search/search-results"
import { Loader2, Brain, AlertCircle, RefreshCw } from "lucide-react"

// ─── Lightweight error boundary so a failed dynamic import doesn't white-screen ──
class DynamicErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error: Error) {
    console.error("[SearchPage] Dynamic component failed to load:", error)
  }
  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}

// Fallback UI when dynamic import fails — shows basic search results instead
function SearchFallback({ query }: { query: string }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 mb-6">
        <AlertCircle className="h-4 w-4" />
        <span>Enhanced search view unavailable — showing results below.</span>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-1 underline hover:no-underline"
        >
          <RefreshCw className="h-3 w-3" /> Reload
        </button>
      </div>
      {query ? (
        <SearchResults query={query} />
      ) : (
        <p className="text-muted-foreground text-center py-12">
          Enter a search query to get started.
        </p>
      )}
    </div>
  )
}

// Full fluid search canvas — only loaded on tablet+
const FluidSearchCanvas = dynamic(
  () => import("@/components/search/fluid/FluidSearchCanvas"),
  {
    loading: () => (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading search...</p>
        </div>
      </div>
    ),
    ssr: false,
  }
)

// Mobile MYCA chat interface — only loaded on phone
const MobileSearchChat = dynamic(
  () => import("@/components/search/mobile/MobileSearchChat").then(m => ({ default: m.MobileSearchChat })),
  {
    loading: () => (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-background">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-violet-500/10">
            <Brain className="h-8 w-8 text-violet-500 animate-pulse" />
          </div>
          <p className="text-sm text-muted-foreground">Loading MYCA...</p>
        </div>
      </div>
    ),
    ssr: false,
  }
)

// ─── Main page ───────────────────────────────────────────────────────
export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const query = searchParams.get("q") || ""

  const handleNavigate = (url: string) => {
    if (url.startsWith("/")) router.push(url)
    else window.location.href = url
  }

  return (
    <>
      {/* ── Phone (< 640px): ChatGPT-like MYCA interface ── */}
      <div className="sm:hidden">
        <SearchContextProvider>
          <DynamicErrorBoundary fallback={<SearchFallback query={query} />}>
            <Suspense
              fallback={
                <div className="flex flex-col items-center justify-center min-h-dvh bg-background">
                  <div className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-violet-500/10">
                      <Brain className="h-8 w-8 text-violet-500 animate-pulse" />
                    </div>
                    <p className="text-sm text-muted-foreground">Loading MYCA...</p>
                  </div>
                </div>
              }
            >
              <MobileSearchChat initialQuery={query} />
            </Suspense>
          </DynamicErrorBoundary>
        </SearchContextProvider>
      </div>

      {/* ── Tablet + Desktop (≥ 640px): full canvas + panels ── */}
      <div className="hidden sm:block">
        <SearchContextProvider>
          <SearchLayout>
            <DynamicErrorBoundary fallback={<SearchFallback query={query} />}>
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-20">
                    <div className="text-center space-y-3">
                      <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                      <p className="text-sm text-muted-foreground">Initializing search...</p>
                    </div>
                  </div>
                }
              >
                <FluidSearchCanvas
                  initialQuery={query}
                  voiceEnabled={true}
                  onNavigate={handleNavigate}
                />
              </Suspense>
            </DynamicErrorBoundary>
          </SearchLayout>
        </SearchContextProvider>
      </div>
    </>
  )
}
