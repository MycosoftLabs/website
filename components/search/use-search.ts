"use client"

import { useState, useCallback, useEffect } from "react"
import { useDebounce } from "@/hooks/use-debounce"
import type { SearchResult } from "@/types/search"

interface SearchSuggestion {
  id: string
  title: string
  type: "fungi" | "article" | "compound" | "research"
  scientificName?: string
  url: string
  date?: string
}

interface SearchError extends Error {
  code?: string
  status?: number
}

export function useSearch(initialQuery = "") {
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchResult[]>([])
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const debouncedQuery = useDebounce(query, 300)

  const handleSearchError = useCallback((err: unknown): string => {
    if (err instanceof Error) {
      // Handle specific error types
      if ("status" in err) {
        const statusError = err as { status: number }
        switch (statusError.status) {
          case 404:
            return "No results found"
          case 429:
            return "Too many requests. Please try again later."
          case 500:
            return "Server error. Please try again later."
          default:
            return err.message || "An unexpected error occurred"
        }
      }
      return err.message
    }
    if (typeof err === "string") {
      return err
    }
    return "An unexpected error occurred"
  }, [])

  // Add retry logic and better error handling
  const fetchResults = useCallback(
    async (searchQuery: string, controller?: AbortController) => {
      if (!searchQuery?.trim()) {
        setResults([])
        setError(null)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          signal: controller?.signal,
        })

        const data = await response.json()

        // Handle both error and success cases with 200 status
        if (data.error) {
          throw new Error(data.error)
        }

        if (!Array.isArray(data.results)) {
          throw new Error("Invalid response format")
        }

        setResults(data.results.filter(isValidResult))
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return
        }

        const errorMessage = handleSearchError(err)
        console.error("Search error:", errorMessage)
        setError(errorMessage)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    },
    [handleSearchError],
  )

  const fetchSuggestions = useCallback(
    async (searchQuery: string, controller?: AbortController) => {
      if (!searchQuery?.trim()) {
        setSuggestions([])
        setError(null)
        return
      }

      if (searchQuery.trim().length < 2) {
        setSuggestions([])
        setError("Please enter at least 2 characters to search")
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(searchQuery.trim())}`, {
          signal: controller?.signal,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        })

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          throw new Error(errorData.error || `Suggestions request failed with status: ${res.status}`)
        }

        const data = await res.json()

        if (data.error) {
          throw new Error(data.error)
        }

        if (!Array.isArray(data.suggestions)) {
          throw new Error("Invalid response format: suggestions is not an array")
        }

        // Validate suggestions
        const validSuggestions = data.suggestions.filter((suggestion: any) => {
          if (!suggestion || !suggestion.id || !suggestion.title || !suggestion.type || !suggestion.url) {
            console.warn("Invalid suggestion format:", suggestion)
            return false
          }
          return true
        })

        setSuggestions(validSuggestions)

        if (data.message) {
          setError(data.message)
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return
        }

        const errorMessage = handleSearchError(err)
        console.error("Suggestions error:", errorMessage)
        setError(errorMessage)
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    },
    [handleSearchError],
  )

  // Effect to handle initial search if query is provided
  useEffect(() => {
    if (debouncedQuery) {
      const controller = new AbortController()
      fetchSuggestions(debouncedQuery, controller)
      return () => controller.abort()
    } else {
      setSuggestions([])
      setError(null)
    }
  }, [debouncedQuery, fetchSuggestions])

  // Add result validation
  function isValidResult(result: any): result is SearchResult {
    return (
      result &&
      typeof result.id === "string" &&
      typeof result.title === "string" &&
      typeof result.type === "string" &&
      typeof result.url === "string"
    )
  }

  return {
    query,
    setQuery,
    debouncedQuery,
    results,
    suggestions,
    isLoading,
    error,
    fetchResults,
    fetchSuggestions,
  }
}
