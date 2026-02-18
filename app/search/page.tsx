/**
 * Search Page — Responsive breakpoint strategy
 *
 * Phone   (< 640px): Simple search input + list results. No canvas.
 * Tablet  (640–1023px): Fluid canvas only (no side panels by default).
 * Desktop (1024px+): Full 3-panel layout (chat | canvas | results+notepad).
 */

"use client"

import dynamic from "next/dynamic"
import { Suspense, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { SearchContextProvider } from "@/components/search/SearchContextProvider"
import { SearchLayout } from "@/components/search/SearchLayout"
import { Search, ArrowRight, Loader2 } from "lucide-react"
import Link from "next/link"

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

// ─── Phone search UI ────────────────────────────────────────────────
function PhoneSearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`)
  }

  const quickLinks = [
    { label: "Species Database", href: "/search?q=fungi+species", emoji: "🍄" },
    { label: "Research Papers", href: "/search?q=mycology+research", emoji: "📄" },
    { label: "Compounds", href: "/search?q=fungal+compounds", emoji: "🧪" },
    { label: "Observations", href: "/search?q=field+observations", emoji: "🔭" },
    { label: "Genetics", href: "/search?q=fungal+genetics", emoji: "🧬" },
    { label: "Devices", href: "/devices", emoji: "📡" },
  ]

  return (
    <div className="flex flex-col min-h-dvh bg-background px-4 pt-6 pb-8">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold mb-1">Search</h1>
        <p className="text-sm text-muted-foreground">Mycosoft Intelligence Database</p>
      </div>

      {/* Search input */}
      <form onSubmit={handleSearch} className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search species, compounds, research..."
          autoFocus
          className="w-full h-14 pl-12 pr-14 rounded-xl border bg-background text-base focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-lg bg-primary text-primary-foreground"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      {/* Quick search topics */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Quick Search</p>
        <div className="grid grid-cols-2 gap-2">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted transition-colors"
            >
              <span className="text-xl">{link.emoji}</span>
              <span className="text-sm font-medium">{link.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Upgrade nudge */}
      <div className="mt-auto pt-4 p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
        <p className="text-xs text-muted-foreground mb-2">
          🖥️ For the full AI-powered search experience with floating widgets and MYCA chat, open on a tablet or desktop.
        </p>
        <p className="text-xs text-primary font-medium">Tablet &amp; Desktop: sandbox.mycosoft.com/search</p>
      </div>
    </div>
  )
}

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
      {/* ── Phone (< 640px): simple search UI ── */}
      <div className="sm:hidden">
        <PhoneSearch initialQuery={query} />
      </div>

      {/* ── Tablet + Desktop (≥ 640px): full canvas + panels ── */}
      <div className="hidden sm:block">
        <SearchContextProvider>
          <SearchLayout>
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
          </SearchLayout>
        </SearchContextProvider>
      </div>
    </>
  )
}
