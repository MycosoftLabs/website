"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, Leaf, MapPin, Calendar, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { FungiTaxonomy } from "@/components/fungal-database/fungi-taxonomy"
import { FungiCharacteristicsTable } from "@/components/fungal-database/fungi-characteristics-table"
import { Skeleton } from "@/components/ui/skeleton"

interface FungiProfileProps {
  id: string | number
}

interface Species {
  id: number
  scientific_name: string
  common_name: string
  family: string
  description: string
  image_url: string
  characteristics: string[]
}

interface SpeciesImage {
  id: number
  imageUrl: string
  caption: string
}

export function FungiProfile({ id }: FungiProfileProps) {
  const [species, setSpecies] = useState<Species | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [images, setImages] = useState<SpeciesImage[]>([])
  const [activeImage, setActiveImage] = useState<SpeciesImage | null>(null)

  useEffect(() => {
    const fetchSpecies = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/species?id=${id}`)

        if (!response.ok) {
          throw new Error(`Failed to fetch species: ${response.status}`)
        }

        const data = await response.json()
        setSpecies(data)

        // Generate additional images based on the main image
        const mainImage = {
          id: 1,
          imageUrl: data.image_url,
          caption: `${data.scientific_name} - Main View`,
        }

        // Create additional images for the gallery
        const additionalImages = [
          {
            id: 2,
            imageUrl: data.image_url?.replace(".png", "-detail.png") || data.image_url,
            caption: `${data.scientific_name} - Detail View`,
          },
          {
            id: 3,
            imageUrl: data.image_url?.replace(".png", "-habitat.png") || data.image_url,
            caption: `${data.scientific_name} - Habitat`,
          },
          {
            id: 4,
            imageUrl: `/placeholder.svg?height=400&width=400&query=${encodeURIComponent(data.scientific_name + " mushroom close-up")}`,
            caption: `${data.scientific_name} - Close-up`,
          },
        ]

        const allImages = [mainImage, ...additionalImages]
        setImages(allImages)
        setActiveImage(mainImage)
      } catch (err) {
        console.error("Error fetching species:", err)
        setError(err instanceof Error ? err.message : "Failed to load species")
      } finally {
        setLoading(false)
      }
    }

    fetchSpecies()
  }, [id])

  if (loading) {
    return <FungiProfileSkeleton />
  }

  if (error || !species) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-xl font-bold text-red-700">Error</h2>
        <p className="text-red-600">{error || "Failed to load species data"}</p>
        <Button asChild className="mt-4">
          <Link href="/ancestry/fungal-database">Back to Database</Link>
        </Button>
      </div>
    )
  }

  // Extract edibility from characteristics
  const edibility = species.characteristics?.includes("Edible")
    ? "Edible"
    : species.characteristics?.includes("Poisonous") || species.characteristics?.includes("Toxic")
      ? "Poisonous"
      : "Unknown"

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/ancestry/fungal-database">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Database
          </Link>
        </Button>
        <Badge
          className={`${
            edibility === "Edible"
              ? "bg-green-500 hover:bg-green-600"
              : edibility === "Poisonous"
                ? "bg-red-500 hover:bg-red-600"
                : "bg-amber-500 hover:bg-amber-600"
          }`}
        >
          {edibility}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <div className="relative aspect-square overflow-hidden rounded-lg border">
            {activeImage && (
              <Image
                src={activeImage.imageUrl || "/placeholder.svg"}
                alt={activeImage.caption || species.scientific_name}
                fill
                className="object-cover"
              />
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {images.map((image) => (
              <div
                key={image.id}
                className={`relative aspect-square rounded-md overflow-hidden border-2 cursor-pointer ${
                  activeImage?.id === image.id ? "border-emerald-500" : "border-transparent"
                }`}
                onClick={() => setActiveImage(image)}
              >
                <Image
                  src={image.imageUrl || "/placeholder.svg"}
                  alt={image.caption || species.scientific_name}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="text-3xl font-bold italic">{species.scientific_name}</h1>
            <p className="text-xl text-muted-foreground">{species.common_name}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-sm text-muted-foreground">Family</p>
                <p className="font-medium">{species.family}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-sm text-muted-foreground">Habitat</p>
                <p className="font-medium">Various forest types</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-sm text-muted-foreground">Season</p>
                <p className="font-medium">Spring to Fall</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-sm text-muted-foreground">Toxicity</p>
                <p className="font-medium">
                  {species.characteristics?.includes("Poisonous") || species.characteristics?.includes("Toxic")
                    ? "Toxic - Do not consume"
                    : "None reported"}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">Description</h2>
            <p className="text-muted-foreground">{species.description}</p>
          </div>

          <Tabs defaultValue="characteristics">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="characteristics">Characteristics</TabsTrigger>
              <TabsTrigger value="taxonomy">Taxonomy</TabsTrigger>
              <TabsTrigger value="ecology">Ecology</TabsTrigger>
            </TabsList>
            <TabsContent value="characteristics" className="pt-4">
              <FungiCharacteristicsTable characteristics={species.characteristics} />
            </TabsContent>
            <TabsContent value="taxonomy" className="pt-4">
              <FungiTaxonomy
                taxonomy={{
                  kingdom: "Fungi",
                  phylum: "Basidiomycota",
                  class: "Agaricomycetes",
                  order:
                    species.family === "Amanitaceae"
                      ? "Agaricales"
                      : species.family === "Boletaceae"
                        ? "Boletales"
                        : "Agaricales",
                  family: species.family,
                  genus: species.scientific_name?.split(" ")?.[0] ?? "",
                  species: species.scientific_name,
                  ancestor_ids: [],
                }}
              />
            </TabsContent>
            <TabsContent value="ecology" className="pt-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium">Ecology</h3>
                  <p className="text-muted-foreground">
                    {species.characteristics?.includes("Mycorrhizal")
                      ? "Forms mycorrhizal relationships with trees, helping them absorb nutrients in exchange for sugars."
                      : species.characteristics?.includes("Saprotrophic")
                        ? "Grows on dead organic matter, helping decompose and recycle nutrients in the ecosystem."
                        : species.characteristics?.includes("Parasitic")
                          ? "Grows on living trees or fungi, potentially causing damage to the host."
                          : "Ecological role varies depending on the environment and available substrates."}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium">Distribution</h3>
                  <p className="text-muted-foreground">
                    Found across temperate forests in North America, Europe, and Asia.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium">Notes</h3>
                  <p className="text-muted-foreground">
                    {species.characteristics?.includes("Edible") &&
                      "Considered a good edible mushroom by many foragers."}
                    {species.characteristics?.includes("Medicinal") &&
                      "Has been used in traditional medicine for its potential health benefits."}
                    {species.characteristics?.includes("Poisonous") &&
                      "Should not be consumed as it contains toxins that can cause illness."}
                    {!species.characteristics?.includes("Edible") &&
                      !species.characteristics?.includes("Medicinal") &&
                      !species.characteristics?.includes("Poisonous") &&
                      "Limited information available on special properties."}
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

function FungiProfileSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-6 w-20" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <Skeleton className="aspect-square w-full" />
          <div className="grid grid-cols-4 gap-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="aspect-square w-full" />
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div>
            <Skeleton className="h-10 w-3/4 mb-2" />
            <Skeleton className="h-6 w-1/2" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-5 w-5" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-32" />
                </div>
              </div>
            ))}
          </div>

          <div>
            <Skeleton className="h-7 w-40 mb-2" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-3/4" />
          </div>

          <div>
            <Skeleton className="h-10 w-full mb-4" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-3/4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
