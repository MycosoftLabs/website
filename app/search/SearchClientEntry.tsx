"use client"

import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import SearchPageContent from "./SearchPageContent"

function SearchSuspenseFallback() {
  return (
    <div
      className="flex min-h-dvh items-center justify-center bg-background px-4"
      suppressHydrationWarning
    >
      <div className="text-center space-y-3" suppressHydrationWarning>
        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
        <p className="text-sm text-muted-foreground" suppressHydrationWarning>
          Initializing search...
        </p>
      </div>
    </div>
  )
}

export function SearchClientEntry() {
  return (
    <Suspense fallback={<SearchSuspenseFallback />}>
      <SearchPageContent />
    </Suspense>
  )
}
