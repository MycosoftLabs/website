"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getAllSpecies } from "@/lib/services/ancestry-service"
import { SeedTrigger } from "@/components/ancestry/seed-trigger"

interface Species {
  id: number
  scientific_name: string
  common_name: string | null
  family: string
  description: string | null
  image_url: string | null
  characteristics: string[]
  habitat: string | null
}

export default function AncestryDatabasePage() {
  const [species, setSpecies] = useState<Species[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredSpecies, setFilteredSpecies] = useState<Species[]>([])

  useEffect(() => {
    const fetchSpeciesData = async () => {
      setLoading(true)
      try {
        const allSpecies = await getAllSpecies()
        setSpecies(allSpecies)
        setFilteredSpecies(allSpecies) // Initialize filtered species with all species
      } catch (err) {
        console.error("Error fetching species:", err)
        setError("Failed to load species data. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchSpeciesData()
  }, [])

  useEffect(() => {
    // Filter species based on search query
    const normalizedQuery = searchQuery.toLowerCase()
    const filtered = species.filter((s) => {
      return (
        s.scientific_name.toLowerCase().includes(normalizedQuery) ||
        (s.common_name && s.common_name.toLowerCase().includes(normalizedQuery)) ||
        s.family.toLowerCase().includes(normalizedQuery)
      )
    })
    setFilteredSpecies(filtered)
  }, [searchQuery, species])

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Fungal Species Database</h1>

      <SeedTrigger />

      <div className="mb-4">
        <Input
          type="text"
          placeholder="Search species..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {loading && (
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
              <p className="text-foreground/70">{error}</p>
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !error && (
        <Card>
          <CardHeader>
            <CardTitle>Species List</CardTitle>
            <CardDescription>Displaying {filteredSpecies.length} species</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableCaption>A list of fungal species in our database.</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Scientific Name</TableHead>
                  <TableHead>Common Name</TableHead>
                  <TableHead>Family</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSpecies.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.scientific_name}</TableCell>
                    <TableCell>{s.common_name}</TableCell>
                    <TableCell>{s.family}</TableCell>
                    <TableCell className="text-muted-foreground">{s.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
