import type { Metadata } from "next"
import { SearchResults } from "@/components/search/search-results"

interface SearchPageProps {
  searchParams: { q?: string }
}

export const metadata: Metadata = {
  title: "Search Results - Mycosoft",
  description: "Search results for fungi and compounds",
}

export default function SearchPage({ searchParams }: SearchPageProps) {
  const query = searchParams.q || ""

  return (
    <div className="container py-6 md:py-8 px-4 sm:px-6">
      <h1 className="text-3xl font-bold mb-2">Search Results</h1>
      <p className="text-muted-foreground mb-8">{query ? `Results for "${query}"` : "Enter a search term"}</p>
      <SearchResults query={query} />
    </div>
  )
}
