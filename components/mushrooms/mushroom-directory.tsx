"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, MouseIcon as Mushroom, MapPin } from "lucide-react"
import Link from "next/link"
import {
  TOP_MUSHROOMS_EXPANDED,
  getMushroomsByCategory,
  getMushroomsByRegion,
  searchExpandedMushrooms,
  REGIONAL_POPULARITY,
  CULTURAL_SIGNIFICANCE,
} from "@/lib/data/top-mushrooms-expanded"

export function MushroomDirectory() {
  const [searchQuery, setSearchQuery] = useState("")
  const [mushrooms, setMushrooms] = useState<any[]>([])
  const [filteredMushrooms, setFilteredMushrooms] = useState<any[]>([])
  const [activeCategory, setActiveCategory] = useState<string>("all")
  const [activeRegion, setActiveRegion] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState<"mushrooms" | "regions" | "cultural">("mushrooms")

  useEffect(() => {
    // Initialize mushrooms
    const allMushrooms = Object.values(TOP_MUSHROOMS_EXPANDED)

    setMushrooms(allMushrooms)
    setFilteredMushrooms(allMushrooms)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    // Filter mushrooms based on search query, active category, and active region
    const normalizedQuery = searchQuery.toLowerCase().trim()

    let filtered = mushrooms

    // Apply category filter if not "all"
    if (activeCategory !== "all") {
      filtered = getMushroomsByCategory(activeCategory)
    }

    // Apply region filter if not "all"
    if (activeRegion !== "all") {
      filtered = getMushroomsByRegion(activeRegion)
    }

    // Apply search query filter
    if (normalizedQuery) {
      filtered = searchExpandedMushrooms(normalizedQuery)
    }

    setFilteredMushrooms(filtered)
  }, [searchQuery, activeCategory, activeRegion, mushrooms])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Search is already handled by the useEffect
  }

  const handleCategoryChange = (value: string) => {
    setActiveCategory(value)
    setActiveRegion("all") // Reset region when category changes
  }

  const handleRegionChange = (value: string) => {
    setActiveRegion(value)
    setActiveCategory("all") // Reset category when region changes
  }

  const handleViewChange = (value: string) => {
    setView(value as "mushrooms" | "regions" | "cultural")
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-full max-w-sm bg-muted animate-pulse rounded-md"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 w-3/4 bg-muted rounded-md"></div>
                <div className="h-4 w-1/2 bg-muted rounded-md"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 w-full bg-muted rounded-md mb-2"></div>
                <div className="h-4 w-5/6 bg-muted rounded-md"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="mushrooms" value={view} onValueChange={handleViewChange}>
        <TabsList className="mb-6">
          <TabsTrigger value="mushrooms">Mushroom Species</TabsTrigger>
          <TabsTrigger value="regions">Regional Popularity</TabsTrigger>
          <TabsTrigger value="cultural">Cultural Significance</TabsTrigger>
        </TabsList>

        <TabsContent value="mushrooms" className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <form onSubmit={handleSearch} className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search mushrooms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </form>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filter:</span>
            </div>
          </div>

          <Tabs defaultValue="all" value={activeCategory} onValueChange={handleCategoryChange}>
            <TabsList className="mb-6">
              <TabsTrigger value="all">All Categories</TabsTrigger>
              <TabsTrigger value="edible">Edible</TabsTrigger>
              <TabsTrigger value="medicinal">Medicinal</TabsTrigger>
              <TabsTrigger value="psychoactive">Psychoactive</TabsTrigger>
              <TabsTrigger value="other">Other</TabsTrigger>
            </TabsList>

            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">Filter by Region:</h3>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={activeRegion === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleRegionChange("all")}
                >
                  All Regions
                </Button>
                {Object.keys(REGIONAL_POPULARITY).map((region) => (
                  <Button
                    key={region}
                    variant={activeRegion === region ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleRegionChange(region)}
                  >
                    {region}
                  </Button>
                ))}
              </div>
            </div>

            {filteredMushrooms.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMushrooms.map((mushroom) => (
                  <Link
                    href={
                      mushroom.iNaturalistId
                        ? `/species/${mushroom.iNaturalistId}`
                        : `/mushrooms/${mushroom.scientificName.toLowerCase().replace(/\s+/g, "-")}`
                    }
                    key={mushroom.scientificName}
                  >
                    <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xl">{mushroom.commonNames[0]}</CardTitle>
                          <Badge variant="outline">{mushroom.category}</Badge>
                        </div>
                        <CardDescription className="italic">{mushroom.scientificName}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                          {mushroom.description || `A ${mushroom.category} mushroom species.`}
                        </p>
                        {mushroom.regions && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
                            <MapPin className="h-4 w-4" />
                            <span>{mushroom.regions.join(", ")}</span>
                          </div>
                        )}
                        {mushroom.compounds && mushroom.compounds.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground">Notable compounds:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {mushroom.compounds.slice(0, 2).map((compound) => (
                                <Badge key={compound.id} variant="secondary" className="text-xs">
                                  {compound.name}
                                </Badge>
                              ))}
                              {mushroom.compounds.length > 2 && (
                                <span className="text-xs text-muted-foreground">
                                  +{mushroom.compounds.length - 2} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Mushroom className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No mushrooms found</h3>
                <p className="text-muted-foreground">Try adjusting your search or filter criteria</p>
              </div>
            )}
          </Tabs>
        </TabsContent>

        <TabsContent value="regions" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(REGIONAL_POPULARITY).map(([region, species]) => (
              <Card key={region}>
                <CardHeader>
                  <CardTitle>{region}</CardTitle>
                  <CardDescription>Popular mushroom species in this region</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {species.map((scientificName) => (
                      <li key={scientificName} className="flex items-center gap-2">
                        <Mushroom className="h-4 w-4 text-primary" />
                        <span className="italic">{scientificName}</span>
                        {Object.values(TOP_MUSHROOMS_EXPANDED).find((m) => m.scientificName === scientificName)
                          ?.commonNames[0] && (
                          <span className="text-sm text-muted-foreground">
                            (
                            {
                              Object.values(TOP_MUSHROOMS_EXPANDED).find((m) => m.scientificName === scientificName)
                                ?.commonNames[0]
                            }
                            )
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="cultural" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(CULTURAL_SIGNIFICANCE).map(([culture, data]) => (
              <Card key={culture}>
                <CardHeader>
                  <CardTitle>{culture}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{data.description}</p>
                  <h4 className="font-medium mb-2">Key Species:</h4>
                  <ul className="space-y-2">
                    {data.species.map((scientificName) => (
                      <li key={scientificName} className="flex items-center gap-2">
                        <Mushroom className="h-4 w-4 text-primary" />
                        <span className="italic">{scientificName}</span>
                        {Object.values(TOP_MUSHROOMS_EXPANDED).find((m) => m.scientificName === scientificName)
                          ?.commonNames[0] && (
                          <span className="text-sm text-muted-foreground">
                            (
                            {
                              Object.values(TOP_MUSHROOMS_EXPANDED).find((m) => m.scientificName === scientificName)
                                ?.commonNames[0]
                            }
                            )
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {view === "mushrooms" && filteredMushrooms.length > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          Showing {filteredMushrooms.length} of over 10,000 known mushroom species
        </div>
      )}
    </div>
  )
}
