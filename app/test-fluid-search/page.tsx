/**
 * Test Fluid Search Page - Feb 2026
 * 
 * Development page for testing the revolutionary search interface
 * with all features: voice, AI, widgets, session memory
 */

"use client"

import dynamic from "next/dynamic"
import { Suspense } from "react"
import { useRouter } from "next/navigation"

// Dynamic import of FluidSearchCanvas to avoid SSR issues with voice/animation
const FluidSearchCanvas = dynamic(
  () => import("@/components/search/fluid/FluidSearchCanvas"),
  {
    loading: () => (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading search...</p>
        </div>
      </div>
    ),
    ssr: false,
  }
)

export default function TestFluidSearchPage() {
  const router = useRouter()

  const handleNavigate = (url: string) => {
    if (url.startsWith("/")) {
      router.push(url)
    } else {
      window.location.href = url
    }
  }

  return (
    <main className="min-h-dvh bg-background">
      {/* Development banner */}
      <div className="bg-yellow-500/10 border-b border-yellow-500/20 py-2 px-4 text-center">
        <p className="text-sm text-yellow-600 dark:text-yellow-400">
          <strong>Development Mode:</strong> Testing Fluid Search with Voice, AI, and Session Memory
        </p>
      </div>

      <Suspense
        fallback={
          <div className="min-h-dvh flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-muted-foreground">Initializing search engine...</p>
            </div>
          </div>
        }
      >
        <FluidSearchCanvas
          initialQuery=""
          voiceEnabled={true}
          onNavigate={handleNavigate}
        />
      </Suspense>

      {/* Debug panel at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur border-t p-4 z-50">
        <div className="max-w-7xl mx-auto">
          <details className="text-xs">
            <summary className="cursor-pointer font-medium">Debug Info</summary>
            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-muted-foreground">
              <div>
                <strong>Environment:</strong> development
              </div>
              <div>
                <strong>Voice:</strong> PersonaPlex Ready
              </div>
              <div>
                <strong>AI Backend:</strong> MYCA Brain / Frontier Router
              </div>
              <div>
                <strong>Session:</strong> Active
              </div>
            </div>
          </details>
        </div>
      </div>
    </main>
  )
}
