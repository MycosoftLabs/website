// components/ancestry/seed-trigger.tsx
"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"

export function SeedTrigger() {
  const [isSeeding, setIsSeeding] = useState(false)
  const [seedMessage, setSeedMessage] = useState<string | null>(null)

  const handleSeed = async () => {
    setIsSeeding(true)
    setSeedMessage(null)

    try {
      const response = await fetch("/api/ancestry/seed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()
      setSeedMessage(data.message)
    } catch (error) {
      console.error("Error triggering seed:", error)
      setSeedMessage("Failed to trigger seed process.")
    } finally {
      setIsSeeding(false)
    }
  }

  return (
    <div>
      <Button onClick={handleSeed} disabled={isSeeding}>
        {isSeeding ? "Seeding..." : "Seed Database"}
      </Button>
      {seedMessage && <p className="mt-2 text-sm text-muted-foreground">{seedMessage}</p>}
    </div>
  )
}
