// components/ancestry/species-explorer.tsx
"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Search } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"

interface Species {
  id: number
  scientific_name: string
  common_name: string
  family: string
  description: string
  image_url: string
  characteristics: string[]
}

interface SpeciesListProps {
  species: Species[]
  isLoading: boolean
}

function SpeciesList({ species, isLoading }: SpeciesListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <div className="aspect-[16/9] relative">
              <Skeleton className="h-full w-full absolute" />
            </div>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {species.map((species) => (
        <Card key={species.id} className="overflow-hidden transition-all hover:shadow-lg">
          <div className="aspect-[16/9] relative">
            <Image
              src={species.image_url || "/placeholder.svg?height=200&width=300&query=mushroom"}
              alt={species.scientific_name}
              fill
              className="object-cover"
            />
            {species.characteristics && (
              <Badge
                className={`absolute top-2 right-2 ${
                  species.characteristics.includes("Edible")
                    ? "bg-green-500 hover:bg-green-600"
                    : species.characteristics.includes("Poisonous") || species.characteristics.includes("Toxic")
                      ? "bg-red-500 hover:bg-red-600"
                      : "bg-amber-500 hover:bg-amber-600"
                }`}
              >
                {species.characteristics.includes("Edible")
                  ? "Edible"
                  : species.characteristics.includes("Poisonous") || species.characteristics.includes("Toxic")
                    ? "Poisonous"
                    : "Unknown"}
              </Badge>
            )}
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold">
              <Link href={`/ancestry/fungal-database/${species.id}`} className="hover:underline">
                {species.scientific_name}
              </Link>
            </CardTitle>
            <p className="text-sm text-muted-foreground">{species.common_name}</p>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div>
                <p className="font-medium">Family:</p>
                <p className="text-muted-foreground">{species.family}</p>
              </div>
              <div>
                <p className="font-medium">Description:</p>
                <p className="text-muted-foreground line-clamp-2">{species.description}</p>
              </div>
            </div>
            <div className="mt-4">
              <Link
                href={`/ancestry/fungal-database/${species.id}`}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                View Details →
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function SpeciesExplorer() {
  const [species, setSpecies] = useState<Species[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [sort, setSort] = useState("scientific_name")

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Use the same API endpoint as the fungal database
      const params = new URLSearchParams({
        search: searchQuery,
        sort: sort,
        page: page.toString(),
        limit: "9",
      })

      const response = await fetch(`/api/species?${params.toString()}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()

      setSpecies(data.species || [])
      setTotalPages(Math.ceil(data.total / 9) || 1)
    } catch (e: any) {
      setError(e.message)
      console.error("Error fetching species:", e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [searchQuery, page, sort])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1) // Reset to first page on new search
    fetchData()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Fungal Species Explorer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Explore our comprehensive database of fungal species with detailed profiles and images.
          </p>
          <form onSubmit={handleSearch} className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search species..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scientific_name">Scientific Name</SelectItem>
                <SelectItem value="common_name">Common Name</SelectItem>
                <SelectItem value="family">Family</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit">Search</Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <p className="text-red-600">Error loading species: {error}</p>
          </CardContent>
        </Card>
      )}

      <SpeciesList species={species} isLoading={isLoading} />

      <div className="flex justify-between items-center">
        <Button variant="outline" disabled={page === 1} onClick={() => setPage((prev) => Math.max(prev - 1, 1))}>
          Previous
        </Button>
        <p className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </p>
        <Button
          variant="outline"
          disabled={page === totalPages}
          onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
