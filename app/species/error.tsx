"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

export default function SpeciesError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Species page error:", error)
  }, [error])

  // Get a user-friendly error message
  const errorMessage =
    error?.message || (typeof error === "object" && Object.keys(error).length === 0)
      ? "An unexpected error occurred while loading the species information. Please try again."
      : String(error)

  return (
    <div className="container flex items-center justify-center min-h-[400px]">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <CardTitle>Error Loading Species</CardTitle>
          </div>
          <CardDescription>{errorMessage}</CardDescription>
        </CardHeader>
        <CardContent>
          {error?.digest && <p className="text-sm text-muted-foreground">Error Reference: {error.digest}</p>}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="ghost" onClick={() => (window.location.href = "/")}>
            Go Home
          </Button>
          <Button onClick={() => reset()}>Try Again</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
