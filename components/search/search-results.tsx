"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { DataSourceBadge } from "@/components/ui/data-source-badge"
import { AlertCircle, FileText, FlaskRoundIcon as Flask, MouseIcon as Mushroom, MapPin } from "lucide-react"
import type { SearchResult } from "@/types/search"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { useSearch } from "./use-search"
import { findSimilarTerms } from "@/lib/utils/fuzzy-search"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { searchTracker } from "@/lib/services/search-tracker"

interface SearchResultsProps {
  query: string
}

export function SearchResults({ query }: SearchResultsProps) {
  const { results, isLoading, error, fetchResults } = useSearch(query)
  const router = useRouter()

  useEffect(() => {
    if (!query.trim()) return

    const controller = new AbortController()
    fetchResults(query, controller)
    return () => controller.abort()
  }, [query, fetchResults])

  // Track result clicks
  const handleResultClick = (result: SearchResult) => {
    searchTracker.trackResultClick(query, result.type)
  }

  if (!query.trim()) {
    return null
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-[250px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[80%] mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p className="font-medium">Search Error</p>
            </div>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              onClick={() => {
                // Retry the search
                fetchResults(query)
              }}
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (results.length === 0) {
    // Find similar terms
    const similarTerms = findSimilarTerms(query)

    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground mb-4">No results found for "{query}"</p>

          {similarTerms.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm font-medium">Did you mean:</p>
              <div className="flex flex-wrap gap-2">
                {similarTerms.slice(0, 5).map((result) => (
                  <Button
                    key={`${result.term}-${result.type}`}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      router.push(`/search?q=${encodeURIComponent(result.term)}`)
                    }}
                  >
                    {result.term}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">This species might not be in our database yet.</p>
              <Button
                onClick={() => {
                  // Open species submission dialog/form
                  router.push("/species/submit")
                }}
              >
                Submit New Species
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const speciesResults = results.filter((r) => r.type === "fungi")
  const compoundResults = results.filter((r) => r.type === "compound")
  const paperResults = results.filter((r) => r.type === "paper")

  // Get related searches
  const relatedSearches = searchTracker.getRelatedSearches(query, 5)

  return (
    <div className="space-y-8">
      <Tabs defaultValue="all" className="space-y-8">
        <TabsList>
          <TabsTrigger value="all">All Results ({results.length})</TabsTrigger>
          {speciesResults.length > 0 && <TabsTrigger value="species">Species ({speciesResults.length})</TabsTrigger>}
          {compoundResults.length > 0 && (
            <TabsTrigger value="compounds">Compounds ({compoundResults.length})</TabsTrigger>
          )}
          {paperResults.length > 0 && <TabsTrigger value="papers">Papers ({paperResults.length})</TabsTrigger>}
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {results.map((result) => (
            <SearchResultCard key={result.id} result={result} onClick={() => handleResultClick(result)} />
          ))}
        </TabsContent>

        <TabsContent value="species" className="space-y-4">
          {speciesResults.map((result) => (
            <SearchResultCard key={result.id} result={result} onClick={() => handleResultClick(result)} />
          ))}
        </TabsContent>

        <TabsContent value="compounds" className="space-y-4">
          {compoundResults.map((result) => (
            <SearchResultCard key={result.id} result={result} onClick={() => handleResultClick(result)} />
          ))}
        </TabsContent>

        <TabsContent value="papers" className="space-y-4">
          {paperResults.map((result) => (
            <SearchResultCard key={result.id} result={result} onClick={() => handleResultClick(result)} />
          ))}
        </TabsContent>
      </Tabs>

      {/* Related searches section */}
      {relatedSearches.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-2">Related Searches</h3>
          <div className="flex flex-wrap gap-2">
            {relatedSearches.map((relatedQuery) => (
              <Button
                key={relatedQuery}
                variant="outline"
                size="sm"
                onClick={() => {
                  router.push(`/search?q=${encodeURIComponent(relatedQuery)}`)
                }}
              >
                {relatedQuery}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SearchResultCard({ result, onClick }: { result: SearchResult; onClick: () => void }) {
  const TypeIcon = {
    fungi: Mushroom,
    compound: Flask,
    paper: FileText,
  }[result.type]

  const getDataSource = (result: SearchResult) => {
    if (result.source === "Mycosoft") return "Mycosoft"
    if (result.type === "fungi") return "iNaturalist"
    if (result.type === "compound") return result.id.startsWith("CS") ? "ChemSpider" : "PubChem"
    return "Elsevier"
  }

  const url = result.type === "fungi" ? `/species/${result.id}` : result.url

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TypeIcon className="h-5 w-5 text-primary" />
            <CardTitle>
              <Link href={url} className="hover:underline" onClick={onClick}>
                {result.title}
              </Link>
            </CardTitle>
          </div>
          <DataSourceBadge source={getDataSource(result)} />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{result.description}</p>

        {/* Paper metadata */}
        {result.metadata && "authors" in result.metadata && (
          <p className="text-sm text-muted-foreground mt-2">
            {result.metadata.authors.join(", ")} ({result.metadata.year}) - {result.metadata.journal}
          </p>
        )}

        {/* Compound metadata */}
        {result.metadata && "formula" in result.metadata && (
          <div className="mt-2 space-y-1">
            <p className="text-sm font-medium">{result.metadata.formula}</p>
            {result.metadata.sourceSpecies && (
              <p className="text-xs text-muted-foreground">Found in: {result.metadata.sourceSpecies.join(", ")}</p>
            )}
            {result.metadata.biologicalActivity && (
              <div className="flex flex-wrap gap-1 mt-1">
                {result.metadata.biologicalActivity.slice(0, 3).map((activity, index) => (
                  <span key={index} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {activity}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Expanded mushroom metadata */}
        {result.metadata && "regions" in result.metadata && (
          <div className="mt-2 space-y-1">
            {result.metadata.scientificName && <p className="text-sm italic">{result.metadata.scientificName}</p>}
            {result.metadata.regions && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>Found in: {result.metadata.regions.join(", ")}</span>
              </div>
            )}
            {result.metadata.category && (
              <Badge variant="outline" className="mt-1">
                {result.metadata.category}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
