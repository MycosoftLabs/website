"use client"

import { useEffect } from "react"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function ErrorClient({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Side-effect: log to your monitoring service
  useEffect(() => {
    console.error("Application error:", error)
  }, [error])

  return (
    <div className="container flex items-center justify-center min-h-[400px]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <CardTitle>Something went wrong!</CardTitle>
          </div>
          <CardDescription>{error.message || "An unexpected error occurred. Please try again."}</CardDescription>
        </CardHeader>

        <CardContent>
          {error.digest && <p className="text-sm text-muted-foreground">Error ID: {error.digest}</p>}
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button variant="ghost" onClick={() => (window.location.href = "/")}>
            Go Home
          </Button>
          <Button onClick={reset}>Try Again</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
