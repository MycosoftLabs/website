"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  Send,
  MouseIcon as Mushroom,
  FileText,
  FlaskRoundIcon as Flask,
  Microscope,
  AlertCircle,
} from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSearch } from "./search/use-search"
import { searchTracker } from "@/lib/services/search-tracker"

export function EnhancedSearch() {
  const { query, setQuery, suggestions, isLoading, error, fetchSuggestions } = useSearch()
  const [showSuggestions, setShowSuggestions] = useState(false)
  const router = useRouter()
  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      return
    }

    const controller = new AbortController()
    fetchSuggestions(debouncedQuery, controller)

    return () => controller.abort()
  }, [debouncedQuery, fetchSuggestions])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      setShowSuggestions(false)
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    setShowSuggestions(true)
  }

  const container = {
    hidden: { opacity: 0, height: 0 },
    show: {
      opacity: 1,
      height: "auto",
      transition: {
        height: {
          duration: 0.4,
        },
        staggerChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      height: 0,
      transition: {
        height: {
          duration: 0.3,
        },
        opacity: {
          duration: 0.2,
        },
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
      },
    },
    exit: {
      opacity: 0,
      y: -10,
      transition: {
        duration: 0.2,
      },
    },
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="relative flex flex-col justify-start items-center">
        <div className="w-full sticky top-0 bg-background z-10 pt-4 pb-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block" htmlFor="search">
            Search Fungi, Compounds, or Research
          </label>
          <form onSubmit={handleSearch} className="relative">
            <Input
              id="search"
              type="text"
              placeholder="What would you like to search for?"
              value={query}
              onChange={handleInputChange}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="pl-3 pr-9 py-1.5 h-10 text-sm rounded-lg focus-visible:ring-offset-0"
              aria-expanded={showSuggestions}
              aria-controls="search-suggestions"
              aria-label="Search fungi and compounds"
              aria-busy={isLoading}
              aria-invalid={!!error}
              aria-errormessage={error || undefined}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4">
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, rotate: 0 }}
                    animate={{ opacity: 1, rotate: 360 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                  >
                    <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                  </motion.div>
                ) : query.length > 0 ? (
                  <motion.div
                    key="send"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Send className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="search"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Search className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </form>
        </div>

        <div className="w-full">
          <AnimatePresence>
            {showSuggestions && (query.trim() || suggestions.length > 0) && (
              <motion.div
                className="w-full border rounded-md shadow-sm overflow-hidden dark:border-gray-800 bg-background mt-1"
                variants={container}
                initial="hidden"
                animate="show"
                exit="exit"
              >
                <motion.ul>
                  {error ? (
                    <motion.li variants={item} className="px-3 py-4 text-center">
                      <div className="flex items-center justify-center gap-2 text-destructive mb-2">
                        <AlertCircle className="h-4 w-4" />
                        <p className="font-medium">Error</p>
                      </div>
                      <p className="text-sm text-muted-foreground">{error}</p>
                      <Button variant="ghost" size="sm" className="mt-2" onClick={() => fetchSuggestions(query)}>
                        Try again
                      </Button>
                    </motion.li>
                  ) : isLoading ? (
                    <motion.li variants={item} className="px-3 py-4 text-center text-muted-foreground">
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                      Loading suggestions...
                    </motion.li>
                  ) : suggestions.length > 0 ? (
                    suggestions.map((suggestion) => (
                      <motion.li key={suggestion.id} variants={item} layout>
                        <Link
                          href={suggestion.url}
                          className="flex items-center gap-4 p-3 hover:bg-muted rounded-lg transition-colors"
                          onClick={() => {
                            setShowSuggestions(false)
                            searchTracker.trackResultClick(query, suggestion.type)
                          }}
                        >
                          <div className="shrink-0">
                            {suggestion.type === "fungi" && <Mushroom className="h-5 w-5 text-green-500" />}
                            {suggestion.type === "article" && <FileText className="h-5 w-5 text-blue-500" />}
                            {suggestion.type === "compound" && <Flask className="h-5 w-5 text-purple-500" />}
                            {suggestion.type === "research" && <Microscope className="h-5 w-5 text-orange-500" />}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{suggestion.title}</div>
                            {suggestion.scientificName && (
                              <div className="text-sm text-muted-foreground italic">{suggestion.scientificName}</div>
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
                      </motion.li>
                    ))
                  ) : (
                    query.trim() && (
                      <motion.li variants={item} className="px-3 py-4 text-center text-muted-foreground">
                        No suggestions found
                      </motion.li>
                    )
                  )}
                </motion.ul>
                <div className="mt-2 px-3 py-2 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Press ⌘K to open commands</span>
                    <span>ESC to cancel</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
