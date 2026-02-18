/**
 * Search Page
 *
 * Phone    (< 640px):  Simple search input + scrollable card results
 * Tablet+  (≥ 640px):  Full FluidSearchCanvas with physics-based widgets
 */

"use client"

import dynamic from "next/dynamic"
import { Suspense, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { SearchContextProvider } from "@/components/search/SearchContextProvider"
import { SearchLayout } from "@/components/search/SearchLayout"
import { Search, ArrowRight, Loader2, Brain, Globe, FlaskConical, Microscope, Map } from "lucide-react"
import Link from "next/link"

// Full fluid canvas — tablet+ only, ssr:false (WebGL / canvas)
const FluidSearchCanvas = dynamic(
  () => import("@/components/search/fluid/FluidSearchCanvas"),
  {
    loading: () => (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    ),
    ssr: false,
  }
)

// Quick-access search categories shown on phone
const PHONE_CATEGORIES = [
  { label: "Species", href: "/search?cat=species", icon: Microscope },
  { label: "AI Research", href: "/search?cat=research", icon: Brain },
  { label: "Locations", href: "/search?cat=location", icon: Map },
  { label: "Science", href: "/search?cat=science", icon: FlaskConical },
  { label: "Global Data", href: "/search?cat=global", icon: Globe },
]

/** Minimal search UI for phones */
function PhoneSearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Search bar */}
      <div className="sticky top-12 z-30 bg-background/95 backdrop-blur-md border-b px-4 py-3">
        <form onSubmit={handleSubmit} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search species, science, locations…"
            autoFocus
            className="w-full h-12 pl-10 pr-12 rounded-xl border bg-background text-base focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-primary text-primary-foreground min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>

      {/* Category quick links */}
      <div className="px-4 pt-5 pb-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Explore</p>
        <div className="grid grid-cols-2 gap-3">
          {PHONE_CATEGORIES.map(cat => (
            <Link
              key={cat.label}
              href={cat.href}
              className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-muted transition-colors min-h-[60px]"
            >
              <cat.icon className="h-5 w-5 text-primary shrink-0" />
              <span className="font-medium text-sm">{cat.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Tip */}
      <div className="px-4 mt-6">
        <div className="rounded-xl bg-muted/50 border p-4 text-center">
          <p className="text-sm text-muted-foreground">
            For the full AI-powered search experience with visual widgets, open on a tablet or desktop.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const query = searchParams.get("q") || ""

  const handleNavigate = (url: string) => {
    if (url.startsWith("/")) router.push(url)
    else window.location.href = url
  }

  return (
    <SearchContextProvider>
      {/* Phone: simple search UI */}
      <div className="sm:hidden">
        <PhoneSearch initialQuery={query} />
      </div>

      {/* Tablet+: full fluid canvas */}
      <div className="hidden sm:block h-full">
        <SearchLayout>
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
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
      </div>
    </SearchContextProvider>
  )
}
