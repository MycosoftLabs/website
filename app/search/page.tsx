/**
 * Search Page - Feb 2026
 *
 * 3-panel search interface:
 * Left: MYCA Chat | Center: Fluid Search Canvas | Right: Live Results + Notepad
 */

"use client"

import dynamic from "next/dynamic"
import { Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { SearchContextProvider } from "@/components/search/SearchContextProvider"
import { SearchLayout } from "@/components/search/SearchLayout"

// Dynamic import of FluidSearchCanvas to avoid SSR issues
const FluidSearchCanvas = dynamic(
  () => import("@/components/search/fluid/FluidSearchCanvas"),
  {
    loading: () => (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading Search...</p>
        </div>
      </div>
    ),
    ssr: false,
  }
)

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const query = searchParams.get("q") || ""

  const handleNavigate = (url: string) => {
    if (url.startsWith("/")) {
      router.push(url)
    } else {
      window.location.href = url
    }
  }

  return (
    <SearchContextProvider>
      <SearchLayout>
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20">
              <div className="text-center space-y-4">
                <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-muted-foreground">Initializing search...</p>
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
      </SearchLayout>
    </SearchContextProvider>
  )
}
