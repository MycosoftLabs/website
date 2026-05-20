/**
 * Search Page — Responsive breakpoint strategy (client-only entry).
 *
 * Loaded with `dynamic(..., { ssr: false })` from page.tsx so this route does not
 * SSR a large tree that then diverges under dev tooling (e.g. automation attrs).
 */

"use client"

import { Suspense, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { SearchContextProvider } from "@/components/search/SearchContextProvider"
import { SearchLayout } from "@/components/search/SearchLayout"
import { FluidSearchCanvas } from "@/components/search/fluid/FluidSearchCanvas"
import { Loader2 } from "lucide-react"

export default function SearchPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const query = searchParams.get("q") || ""

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual"
    }
    const scrollToHeader = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior })
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }
    scrollToHeader()
    const raf = window.requestAnimationFrame(scrollToHeader)
    const timer = window.setTimeout(scrollToHeader, 250)
    return () => {
      window.cancelAnimationFrame(raf)
      window.clearTimeout(timer)
    }
  }, [query])

  const handleNavigate = (url: string) => {
    if (url.startsWith("/")) router.push(url)
    else window.location.href = url
  }

  return (
    <div className="search-glass-page min-h-dvh">
      <SearchContextProvider>
        <SearchLayout>
          <Suspense
            fallback={
              <div className="flex items-center justify-center px-4 py-20">
                <div className="text-center space-y-3">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">Initializing search...</p>
                </div>
              </div>
            }
          >
            <FluidSearchCanvas
              initialQuery={query}
              voiceEnabled
              onNavigate={handleNavigate}
            />
          </Suspense>
        </SearchLayout>
      </SearchContextProvider>
    </div>
  )
}
