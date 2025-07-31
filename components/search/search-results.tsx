"use client"

import { useState, useEffect, useMemo } from "react"
import { useDebounce } from "@/hooks/use-debounce"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Search, Filter, X } from "lucide-react"
import Link from "next/link"
import type { SearchResult } from "@/lib/types"

interface SearchResultsProps {
  initialQuery?: string
  className?: string
}

export function SearchResults({ initialQuery = "", className }: SearchResultsProps) {
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("relevance")
  const [totalResults, setTotalResults] = useState(0)

  const debouncedQuery = useDebounce(query, 300)

  // Mock search function - replace with actual API call
  const searchData = async (searchQuery: string): Promise<SearchResult[]> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    if (!searchQuery.trim()) {
      return []
    }

    // Mock search results
    const mockResults: SearchResult[] = [
      {
        id: "species-1",
        title: "Agaricus bisporus",
        type: "species",
        description: "Common button mushroom, widely cultivated and consumed worldwide",
        url: "/species/agaricus-bisporus",
        relevance: 0.95,
        metadata: {
          scientificName: "Agaricus bisporus",
          commonName: "Button Mushroom",
          edibility: "edible",
          habitat: "cultivated",
        },
      },
      {
        id: "compound-1",
        title: "Psilocybin",
        type: "compound",
        description: "Psychoactive compound found in certain mushroom species",
        url: "/compounds/psilocybin",
        relevance: 0.88,
        metadata: {
          formula: "C12H17N2O4P",
          sources: ["Psilocybe cubensis", "Psilocybe semilanceata"],
        },
      },
      {
        id: "paper-1",
        title: "Fungal Networks in Forest Ecosystems",
        type: "paper",
        description: "Research on mycorrhizal networks and their role in forest communication",
        url: "/papers/fungal-networks-forest",
        relevance: 0.82,
        metadata: {
          authors: ["Dr. Jane Smith", "Dr. John Doe"],
          publishedDate: "2024-01-15",
          journal: "Nature Mycology",
        },
      },
      {
        id: "device-1",
        title: "Mushroom 1 Sensor",
        type: "device",
        description: "Ground-based fungal intelligence monitoring station",
        url: "/devices/mushroom-1",
        relevance: 0.75,
        metadata: {
          deviceType: "sensor",
          status: "active",
        },
      },
    ]

    // Filter results based on query
    return mockResults.filter(
      (result) =>
        result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        result.description.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }

  // Perform search when debounced query changes
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedQuery.trim()) {
        setResults([])
        setTotalResults(0)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const searchResults = await searchData(debouncedQuery)
        setResults(searchResults)
        setTotalResults(searchResults.length)
      } catch (err) {
        setError("Failed to perform search. Please try again.")
        setResults([])
        setTotalResults(0)
      } finally {
        setIsLoading(false)
      }
    }

    performSearch()
  }, [debouncedQuery])

  // Filter and sort results
  const filteredAndSortedResults = useMemo(() => {
    let filtered = results

    // Filter by type
    if (selectedType !== "all") {
      filtered = filtered.filter((result) => result.type === selectedType)
    }

    // Sort results
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "relevance":
          return b.relevance - a.relevance
        case "title":
          return a.title.localeCompare(b.title)
        case "type":
          return a.type.localeCompare(b.type)
        default:
          return 0
      }
    })

    return filtered
  }, [results, selectedType, sortBy])

  // Group results by type
  const resultsByType = useMemo(() => {
    const grouped = filteredAndSortedResults.reduce(
      (acc, result) => {
        if (!acc[result.type]) {
          acc[result.type] = []
        }
        acc[result.type].push(result)
        return acc
      },
      {} as Record<string, SearchResult[]>,
    )

    return grouped
  }, [filteredAndSortedResults])

  const clearSearch = () => {
    setQuery("")
    setResults([])
    setTotalResults(0)
    setError(null)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "species":
        return "🍄"
      case "compound":
        return "⚗️"
      case "paper":
        return "📄"
      case "device":
        return "📡"
      default:
        return "🔍"
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "species":
        return "bg-green-100 text-green-800"
      case "compound":
        return "bg-blue-100 text-blue-800"
      case "paper":
        return "bg-purple-100 text-purple-800"
      case "device":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search species, compounds, papers, devices..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
            onClick={clearSearch}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Filters and Controls */}
      {(query || results.length > 0) && (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="species">Species</SelectItem>
                  <SelectItem value="compound">Compounds</SelectItem>
                  <SelectItem value="paper">Papers</SelectItem>
                  <SelectItem value="device">Devices</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="type">Type</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {totalResults > 0 && (
            <p className="text-sm text-muted-foreground">
              {filteredAndSortedResults.length} of {totalResults} results
            </p>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Searching...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive text-center">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* No Results */}
      {!isLoading && !error && query && filteredAndSortedResults.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No results found</h3>
              <p className="text-muted-foreground">Try adjusting your search terms or filters</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {!isLoading && !error && filteredAndSortedResults.length > 0 && (
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All ({filteredAndSortedResults.length})</TabsTrigger>
            {Object.entries(resultsByType).map(([type, typeResults]) => (
              <TabsTrigger key={type} value={type}>
                {getTypeIcon(type)} {type} ({typeResults.length})
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {filteredAndSortedResults.map((result) => (
              <Card key={result.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        <Link href={result.url} className="hover:text-primary transition-colors">
                          {result.title}
                        </Link>
                      </CardTitle>
                      <CardDescription>{result.description}</CardDescription>
                    </div>
                    <Badge className={getTypeColor(result.type)}>
                      {getTypeIcon(result.type)} {result.type}
                    </Badge>
                  </div>
                </CardHeader>
                {result.metadata && (
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(result.metadata).map(([key, value]) => (
                        <Badge key={key} variant="outline" className="text-xs">
                          {key}: {Array.isArray(value) ? value.join(", ") : String(value)}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </TabsContent>

          {Object.entries(resultsByType).map(([type, typeResults]) => (
            <TabsContent key={type} value={type} className="space-y-4">
              {typeResults.map((result) => (
                <Card key={result.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      <Link href={result.url} className="hover:text-primary transition-colors">
                        {result.title}
                      </Link>
                    </CardTitle>
                    <CardDescription>{result.description}</CardDescription>
                  </CardHeader>
                  {result.metadata && (
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(result.metadata).map(([key, value]) => (
                          <Badge key={key} variant="outline" className="text-xs">
                            {key}: {Array.isArray(value) ? value.join(", ") : String(value)}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  )
}
