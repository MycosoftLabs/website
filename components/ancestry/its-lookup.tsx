"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export function ITSLookupTool() {
  const [itsCode, setItsCode] = useState("")
  const [speciesName, setSpeciesName] = useState("")

  const handleLookup = async () => {
    // Implement ITS lookup logic here
    // This is a placeholder, replace with actual API call
    await new Promise((resolve) => setTimeout(resolve, 500))
    setSpeciesName("Hericium erinaceus")
  }

  return (
    <div className="space-y-4">
      <Input type="text" placeholder="Enter ITS code..." value={itsCode} onChange={(e) => setItsCode(e.target.value)} />
      <Button onClick={handleLookup}>Lookup</Button>
      {speciesName && (
        <div>
          <h4 className="text-md font-medium">Species Name:</h4>
          <p>{speciesName}</p>
        </div>
      )}
    </div>
  )
}
