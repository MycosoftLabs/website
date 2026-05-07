/**
 * Search Page — Responsive breakpoint strategy
 *
 * Phone   (< 640px): ChatGPT-like MYCA chat interface with rich data cards
 * Tablet  (640–1023px): Fluid canvas only (no side panels by default).
 * Desktop (1024px+): Full 3-panel layout (chat | canvas | results+notepad).
 */

"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { SearchContextProvider } from "@/components/search/SearchContextProvider"
import { SearchLayout } from "@/components/search/SearchLayout"
import { FluidSearchCanvas } from "@/components/search/fluid/FluidSearchCanvas"
import { MobileSearchChat } from "@/components/search/mobile/MobileSearchChat"
import { Loader2, Brain } from "lucide-react"

/**
 * Eager-load search shells (no next/dynamic wrapper) so navigating from the
 * homepage does not wait on a second JS chunk + “Loading search…” waterfall.
 * Heavy widgets inside FluidSearchCanvas remain dynamically imported there.
 */

// ─── Main page ───────────────────────────────────────────────────────
export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const query = searchParams.get("q") || ""
  const [isPhone, setIsPhone] = useState<boolean | null>(null)

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)")
    const sync = () => setIsPhone(media.matches)
    sync()
    media.addEventListener("change", sync)
    return () => media.removeEventListener("change", sync)
  }, [])

  const handleNavigate = (url: string) => {
    if (url.startsWith("/")) router.push(url)
    else window.location.href = url
  }

  if (isPhone === null) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Initializing search...</p>
        </div>
      </div>
    )
  }

  if (isPhone) {
    return (
      <SearchContextProvider>
        <Suspense
          fallback={
            <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4">
              <div className="text-center space-y-3">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-violet-500/10">
                  <Brain className="h-8 w-8 text-violet-500 animate-pulse" />
                </div>
                <p className="text-sm text-muted-foreground">Loading MYCA...</p>
              </div>
            </div>
          }
        >
          <MobileSearchChat initialQuery={query} />
        </Suspense>
      </SearchContextProvider>
    )
  }

  return (
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
            voiceEnabled={false}
            onNavigate={handleNavigate}
          />
        </Suspense>
      </SearchLayout>
    </SearchContextProvider>
  )
}
