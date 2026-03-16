"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

export default function NatureOSError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("NatureOS error:", error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Card className="max-w-md w-full bg-card/50">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <CardTitle>NatureOS Error</CardTitle>
          </div>
          <CardDescription>
            {error.message?.includes("Supabase") || error.message?.includes("credentials")
              ? "Authentication service is temporarily unavailable. Please try again later."
              : error.message || "An unexpected error occurred. Please try again."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error.digest && <p className="text-sm text-muted-foreground">Error ID: {error.digest}</p>}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="ghost" onClick={() => (window.location.href = "/")}>
            Go Home
          </Button>
          <Button variant="ghost" onClick={() => (window.location.href = "/login")}>
            Sign In
          </Button>
          <Button onClick={() => reset()}>Try Again</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
