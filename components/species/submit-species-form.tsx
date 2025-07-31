"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Plus, Trash } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function SubmitSpeciesForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [commonNames, setCommonNames] = useState<string[]>([])
  const [newCommonName, setNewCommonName] = useState("")
  const [habitat, setHabitat] = useState<string[]>([])
  const [newHabitat, setNewHabitat] = useState("")
  const [season, setSeason] = useState<string[]>([])
  const [newSeason, setNewSeason] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const scientificName = formData.get("scientificName") as string
    const description = formData.get("description") as string
    const iNaturalistId = formData.get("iNaturalistId") as string
    const edibility = formData.get("edibility") as string
    const references = formData.get("references") as string

    try {
      const response = await fetch("/api/species/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scientificName,
          commonNames,
          description,
          iNaturalistId,
          characteristics: {
            habitat,
            season,
            edibility,
          },
          references: references.split("\n").filter(Boolean),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to submit species")
      }

      // Navigate to the species page with a success parameter
      router.push("/species?submitted=true")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit species")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    router.push("/species")
  }

  const addCommonName = () => {
    if (newCommonName.trim() && !commonNames.includes(newCommonName.trim())) {
      setCommonNames([...commonNames, newCommonName.trim()])
      setNewCommonName("")
    }
  }

  const removeCommonName = (name: string) => {
    setCommonNames(commonNames.filter((n) => n !== name))
  }

  const addHabitat = () => {
    if (newHabitat.trim() && !habitat.includes(newHabitat.trim())) {
      setHabitat([...habitat, newHabitat.trim()])
      setNewHabitat("")
    }
  }

  const removeHabitat = (item: string) => {
    setHabitat(habitat.filter((h) => h !== item))
  }

  const addSeason = () => {
    if (newSeason.trim() && !season.includes(newSeason.trim())) {
      setSeason([...season, newSeason.trim()])
      setNewSeason("")
    }
  }

  const removeSeason = (item: string) => {
    setSeason(season.filter((s) => s !== item))
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Submit New Species</CardTitle>
          <CardDescription>
            Add a new mushroom species to our database. Please provide as much accurate information as possible.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="scientificName">Scientific Name *</Label>
            <Input id="scientificName" name="scientificName" placeholder="e.g., Amanita muscaria" required />
          </div>

          <div className="space-y-2">
            <Label>Common Names *</Label>
            <div className="flex gap-2">
              <Input
                value={newCommonName}
                onChange={(e) => setNewCommonName(e.target.value)}
                placeholder="e.g., Fly Agaric"
              />
              <Button type="button" onClick={addCommonName} disabled={!newCommonName.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {commonNames.map((name) => (
                <Badge key={name} variant="secondary" className="gap-1">
                  {name}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => removeCommonName(name)}
                  >
                    <Trash className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Provide a detailed description of the species..."
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="iNaturalistId">iNaturalist ID</Label>
            <Input id="iNaturalistId" name="iNaturalistId" placeholder="e.g., 48701" type="number" />
          </div>

          <div className="space-y-2">
            <Label>Habitat</Label>
            <div className="flex gap-2">
              <Input
                value={newHabitat}
                onChange={(e) => setNewHabitat(e.target.value)}
                placeholder="e.g., Deciduous forests"
              />
              <Button type="button" onClick={addHabitat} disabled={!newHabitat.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {habitat.map((item) => (
                <Badge key={item} variant="secondary" className="gap-1">
                  {item}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => removeHabitat(item)}
                  >
                    <Trash className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Season</Label>
            <div className="flex gap-2">
              <Input value={newSeason} onChange={(e) => setNewSeason(e.target.value)} placeholder="e.g., Summer" />
              <Button type="button" onClick={addSeason} disabled={!newSeason.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {season.map((item) => (
                <Badge key={item} variant="secondary" className="gap-1">
                  {item}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => removeSeason(item)}
                  >
                    <Trash className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edibility">Edibility</Label>
            <Input id="edibility" name="edibility" placeholder="e.g., Edible, Poisonous, etc." />
          </div>

          <div className="space-y-2">
            <Label htmlFor="references">References</Label>
            <Textarea
              id="references"
              name="references"
              placeholder="Add references (one per line)"
              className="min-h-[100px]"
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="button" variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || commonNames.length === 0}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Species
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
