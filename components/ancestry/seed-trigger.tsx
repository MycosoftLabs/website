"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"

export function SeedTrigger() {
  const [isLoading, setIsLoading] = useState(false)

  const handleSeed = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/ancestry/seed", {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to start seeding process")
      }

      toast({
        title: "Seeding Process Started",
        description: data.message,
      })
    } catch (error) {
      console.error("Error triggering seed:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start seeding process",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-end mb-4">
      <Button variant="outline" size="sm" onClick={handleSeed} disabled={isLoading} className="text-xs">
        {isLoading ? "Processing..." : "Refresh Species Database"}
      </Button>
    </div>
  )
}
