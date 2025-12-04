"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"
import { useTheme } from "next-themes"
import { MouseIcon as Mushroom, FileText, FlaskRoundIcon as Flask, Microscope, AlertCircle } from "lucide-react"
import type React from "react"
import { useSearch } from "./search/use-search"
import { SearchErrorBoundary } from "@/components/search/error-boundary"
import { EnhancedSearch } from "./enhanced-search"

export function SearchSection() {
  const { query, setQuery, suggestions, isLoading, error, fetchSuggestions } = useSearch()
  const [showSuggestions, setShowSuggestions] = useState(false)
  const router = useRouter()
  const searchRef = useRef<HTMLDivElement>(null)
  const theme = useTheme()

  useEffect(() => {
    if (!query.trim()) {
      setShowSuggestions(true) // Show popular/featured items
      return
    }

    const controller = new AbortController()
    fetchSuggestions(query, controller)

    return () => controller.abort()
  }, [query, fetchSuggestions])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      setShowSuggestions(false)
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <section className="pt-8 pb-16 md:pb-24 flex flex-col items-center gap-8">
      <SearchErrorBoundary>
        <div className="w-full max-w-2xl relative" ref={searchRef}>
          <div
            className="relative px-4 md:px-8"
            style={{
              padding: "6rem 1rem",
              paddingBottom: "8rem",
              "@media (minWidth: 768px)": {
                padding: "10rem 2rem",
              },
            }}
          >
            <video
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover rounded-xl"
              style={{ filter: "brightness(0.5)" }}
            >
              <source src="https://mycosoft.org/videos/mycelium-bg.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px] rounded-xl" />
            <div className="relative z-10 flex flex-col items-center gap-6 md:gap-8">
              <div className="flex flex-col items-center gap-2 md:gap-4">
                <div className="flex items-center gap-2 md:gap-4">
                  <div className="w-12 h-12 md:w-16 md:h-16">
                    <Image
                      src={
                        theme.theme === "dark"
                          ? "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Mycosoft%20Logo%20(1)-lArPx4fwtqahyHVlnRLWWSfqWLIJpv.png"
                          : "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/MycosoftLogo2%20(1)-5jx3SObDwKV9c6QmbxJ2NWopjhfLmZ.png"
                      }
                      alt="Mycosoft Logo"
                      width={64}
                      height={64}
                      className="object-contain"
                      priority
                    />
                  </div>
                  <span className="text-3xl md:text-6xl font-bold">Mycosoft</span>
                </div>
                <p className="text-base md:text-xl text-muted-foreground text-center">
                  The Fungal Intelligence Platform
                </p>
              </div>

              {/* Enhanced Search - Hidden on mobile */}
              <div className="hidden md:block w-full">
                <EnhancedSearch />
              </div>

              {/* Legacy Search Form - Hidden on desktop, visible on mobile */}
              <form onSubmit={handleSearch} className="w-full md:hidden">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value)
                      setShowSuggestions(true)
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Search fungi..."
                    className="pl-10 h-12 transition-all duration-200 hover:shadow-lg focus:shadow-xl"
                    aria-expanded={showSuggestions}
                    aria-controls="search-suggestions"
                    aria-label="Search fungi and compounds"
                    aria-busy={isLoading}
                    aria-invalid={!!error}
                    aria-errormessage={error || undefined}
                  />
                  {isLoading && (
                    <div className="absolute right-3 top-3">
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Suggestions dropdown - Only for mobile */}
          {showSuggestions && (query.trim() || suggestions.length > 0) && (
            <Card className="absolute w-full -mt-1 border-t-0 rounded-t-none z-50 max-h-[400px] overflow-auto shadow-xl md:hidden">
              <div className="p-2">
                {error ? (
                  <div className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-destructive mb-2">
                      <AlertCircle className="h-4 w-4" />
                      <p className="font-medium">Error</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{error}</p>
                    <Button variant="ghost" size="sm" className="mt-2" onClick={() => fetchSuggestions(query)}>
                      Try again
                    </Button>
                  </div>
                ) : isLoading ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                    Loading suggestions...
                  </div>
                ) : suggestions.length > 0 ? (
                  <div className="divide-y">
                    {suggestions.map((suggestion) => (
                      <Link
                        key={suggestion.id}
                        href={suggestion.url}
                        className="flex items-center gap-4 p-3 hover:bg-muted rounded-lg transition-colors"
                        onClick={() => setShowSuggestions(false)}
                      >
                        <div className="shrink-0">
                          {suggestion.type === "fungi" && <Mushroom className="h-5 w-5 text-primary" />}
                          {suggestion.type === "article" && <FileText className="h-5 w-5 text-primary" />}
                          {suggestion.type === "compound" && <Flask className="h-5 w-5 text-primary" />}
                          {suggestion.type === "research" && <Microscope className="h-5 w-5 text-primary" />}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{suggestion.title}</div>
                          {suggestion.scientificName && (
                            <div className="text-sm text-muted-foreground">{suggestion.scientificName}</div>
                          )}
                          <div className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                            <span>{suggestion.type}</span>
                            {suggestion.date && (
                              <>
                                <span>•</span>
                                <span>{suggestion.date}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  query.trim() && <div className="p-4 text-center text-muted-foreground">No suggestions found</div>
                )}
              </div>
            </Card>
          )}
        </div>
      </SearchErrorBoundary>

      <div className="flex flex-wrap gap-4 justify-center text-sm text-muted-foreground px-4">
        <span>Trending:</span>
        <Button variant="link" className="p-0 h-auto" asChild>
          <Link href="/search?q=lions+mane+research">Lion's Mane Research</Link>
        </Button>
        <Button variant="link" className="p-0 h-auto" asChild>
          <Link href="/search?q=bioremediation">Bioremediation</Link>
        </Button>
        <Button variant="link" className="p-0 h-auto" asChild>
          <Link href="/search?q=cordyceps+studies">Cordyceps Studies</Link>
        </Button>
      </div>
    </section>
  )
}
