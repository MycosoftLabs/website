"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, FileText, Microscope, Network } from "lucide-react"

interface SearchResults {
  species: any[]
  relatedSpecies: any[]
  papers: any[]
  query: string
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const query = searchParams.get("q") || ""
  const [results, setResults] = useState<SearchResults | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchResults() {
      if (!query) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        console.log("[v0] Fetching search results for:", query)
        const response = await fetch(`/api/species/search?q=${encodeURIComponent(query)}`)

        if (!response.ok) {
          throw new Error(`Search failed with status ${response.status}`)
        }

        const contentType = response.headers.get("content-type")
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Invalid response format from server")
        }

        const data = await response.json()
        console.log("[v0] Search results received:", data)

        if (data.error) {
          setError(data.error)
        } else {
          setResults(data)
        }
      } catch (err) {
        console.error("[v0] Search error:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch search results")
      } finally {
        setIsLoading(false)
      }
    }

    fetchResults()
  }, [query])

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Searching fungal database...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Search Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!results || (!results.species.length && !results.relatedSpecies.length && !results.papers.length)) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>No Results Found</CardTitle>
            <CardDescription>No species or papers found for "{query}". Try a different search term.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Search Results</h1>
        <p className="text-muted-foreground text-lg">
          Found {results.species.length} species, {results.relatedSpecies.length} related species, and{" "}
          {results.papers.length} research papers for "{query}"
        </p>
      </div>

      <Tabs defaultValue="species" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="species" className="flex items-center gap-2">
            <Microscope className="h-4 w-4" />
            Species ({results.species.length})
          </TabsTrigger>
          <TabsTrigger value="related" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            Related ({results.relatedSpecies.length})
          </TabsTrigger>
          <TabsTrigger value="papers" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Papers ({results.papers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="species" className="space-y-4">
          {results.species.map((species) => (
            <Card key={species.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl mb-1">
                      <Link href={species.url} className="hover:text-primary transition-colors">
                        {species.commonName}
                      </Link>
                    </CardTitle>
                    <CardDescription className="text-base italic">{species.scientificName}</CardDescription>
                  </div>
                  <Badge variant="secondary">Mycosoft</Badge>
                </div>
              </CardHeader>
              {species.description && (
                <CardContent>
                  <p className="text-muted-foreground line-clamp-3">{species.description}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="related" className="space-y-4">
          {results.relatedSpecies.map((species) => (
            <Card key={species.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl mb-1">
                      <Link href={species.url} className="hover:text-primary transition-colors">
                        {species.commonName}
                      </Link>
                    </CardTitle>
                    <CardDescription className="italic">{species.scientificName}</CardDescription>
                  </div>
                  <Badge variant="outline">{species.relation}</Badge>
                </div>
              </CardHeader>
              {species.description && (
                <CardContent>
                  <p className="text-muted-foreground text-sm line-clamp-2">{species.description}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="papers" className="space-y-4">
          {results.papers.map((paper) => (
            <Card key={paper.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">
                      <Link href={paper.url} className="hover:text-primary transition-colors">
                        {paper.title}
                      </Link>
                    </CardTitle>
                    <CardDescription className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{paper.authors.slice(0, 3).join(", ")}</span>
                        {paper.authors.length > 3 && <span>et al.</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{paper.year}</Badge>
                        <span className="text-sm">{paper.journal}</span>
                      </div>
                      {paper.relatedTo && (
                        <div className="mt-2">
                          <Badge variant="outline">Related to {paper.relatedTo}</Badge>
                        </div>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              {paper.abstract && (
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">{paper.abstract}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
