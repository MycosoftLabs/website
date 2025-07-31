"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ExternalLink, Info, Database, FileText, Book, ImageIcon } from "lucide-react"
import { PhotoGallery } from "@/components/species/photo-gallery"
import Image from "next/image"
import { getFullTaxonomy, getSpeciesPhotos, getSpeciesMetadata } from "@/lib/services/inaturalist"
import { getArticlesBySpecies } from "@/lib/services/researchhub"

interface Image {
  url: string
  alt: string
  type: "primary" | "specimen"
  attribution: string
  source_url: string
  medium_url?: string
  large_url?: string
}

interface Compound {
  id: string
  name: string
  concentration?: string
}

interface Reference {
  title: string
  url: string
  type: "article" | "database" | "book"
}

interface FungiSpecies {
  id: string
  commonName: string
  scientificName: string
  description: string
  taxonomy: {
    kingdom: string
    phylum: string
    class: string
    order: string
    family: string
    genus: string
    species: string
  }
  characteristics?: {
    habitat?: string[]
    season?: string[]
    edibility?: string
    ecology?: string
  }
  compounds?: Compound[]
  images: Image[]
  references: Reference[]
  lastUpdated: string
  interactions?: string[]
  conservationStatus?: string
  wikipedia_summary?: string
}

interface SpeciesTemplateProps {
  species: FungiSpecies
}

interface INaturalistPhoto {
  attribution: string
  id: number
  license_code: string
  medium_url: string
  original_url: string
  square_url: string
  url: string
  large_url: string
}

export function SpeciesTemplate({ species }: SpeciesTemplateProps) {
  const [taxonomy, setTaxonomy] = useState(species.taxonomy)
  const [photos, setPhotos] = useState<INaturalistPhoto[]>([])
  const [articles, setArticles] = useState<any[]>([])
  const [metadata, setMetadata] = useState<{
    conservationStatus: string
    observationsCount: number
    wikipediaSummary?: string
    interactions: string[]
  }>({
    conservationStatus: "Not evaluated",
    observationsCount: 0,
    interactions: [],
  })
  const [isLoading, setIsLoading] = useState({
    taxonomy: true,
    photos: true,
    articles: true,
    metadata: true,
  })

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch photos first for immediate display
        const iNaturalistPhotos = await getSpeciesPhotos(species.id)
        setPhotos(iNaturalistPhotos)
      } catch (error) {
        console.error("Error fetching photos:", error)
      } finally {
        setIsLoading((prev) => ({ ...prev, photos: false }))
      }

      try {
        // Fetch taxonomy
        const fullTaxonomy = await getFullTaxonomy(species.id)
        setTaxonomy(fullTaxonomy)
      } catch (error) {
        console.error("Error fetching taxonomy:", error)
      } finally {
        setIsLoading((prev) => ({ ...prev, taxonomy: false }))
      }

      try {
        // Fetch metadata
        const speciesMetadata = await getSpeciesMetadata(species.id)
        setMetadata(speciesMetadata)
      } catch (error) {
        console.error("Error fetching metadata:", error)
      } finally {
        setIsLoading((prev) => ({ ...prev, metadata: false }))
      }

      try {
        // Fetch research articles
        const researchArticles = await getArticlesBySpecies(species.scientificName)
        setArticles(researchArticles)
      } catch (error) {
        console.error("Error fetching articles:", error)
      } finally {
        setIsLoading((prev) => ({ ...prev, articles: false }))
      }
    }

    fetchData()
  }, [species.id, species.scientificName])

  // Update the main image section to use the first iNaturalist photo
  const mainPhoto = photos[0] || null

  return (
    <div className="container py-6 md:py-8">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="grid md:grid-cols-[240px,1fr] gap-6 items-start">
                <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                  {mainPhoto ? (
                    <Image
                      src={mainPhoto.large_url || mainPhoto.medium_url || mainPhoto.url}
                      alt={`${species.commonName} specimen`}
                      fill
                      className="object-cover"
                      priority
                      crossOrigin="anonymous"
                      unoptimized={true}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <ImageIcon className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-2xl">{species.commonName}</CardTitle>
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-lg text-muted-foreground italic">{species.scientificName}</span>
                    {taxonomy.phylum && <Badge variant="secondary">{taxonomy.phylum}</Badge>}
                    {taxonomy.class && <Badge variant="secondary">{taxonomy.class}</Badge>}
                    {taxonomy.order && <Badge variant="secondary">{taxonomy.order}</Badge>}
                    {taxonomy.family && <Badge variant="secondary">{taxonomy.family}</Badge>}
                    {taxonomy.genus && <Badge variant="secondary">{taxonomy.genus}</Badge>}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="overview">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="taxonomy">Taxonomy</TabsTrigger>
                  <TabsTrigger value="characteristics">Characteristics</TabsTrigger>
                  {species.compounds && species.compounds.length > 0 && (
                    <TabsTrigger value="compounds">Compounds</TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="overview" className="mt-4">
                  <div className="prose dark:prose-invert max-w-none">
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Description</h3>
                        <div
                          className="text-muted-foreground"
                          dangerouslySetInnerHTML={{
                            __html: (
                              species.description ||
                              species.wikipedia_summary ||
                              "No description available. This species may need further research and documentation."
                            ).replace(/<\/?[^>]+(>|$)/g, ""), // Remove HTML tags
                          }}
                        />
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold mb-2">Habitat & Distribution</h3>
                        <p className="text-muted-foreground">
                          {species.characteristics?.habitat?.join(", ") || "Habitat information not available."}
                        </p>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold mb-2">Ecological Role</h3>
                        <p className="text-muted-foreground">
                          {species.characteristics?.ecology || "Ecological information not available."}
                        </p>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold mb-2">Known Interactions</h3>
                        <ul className="list-disc list-inside text-muted-foreground">
                          {metadata.interactions.length > 0 ? (
                            metadata.interactions.map((interaction, index) => <li key={index}>{interaction}</li>)
                          ) : (
                            <li>No known interactions documented.</li>
                          )}
                        </ul>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold mb-2">Research Highlights</h3>
                        <div className="space-y-4">
                          {articles?.slice(0, 3).map((article, index) => (
                            <div key={index} className="pl-4 border-l-2 border-primary">
                              <p className="text-sm">{article.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {article.authors.join(", ")} ({new Date(article.publishedDate).getFullYear()})
                              </p>
                              <Button variant="link" className="h-auto p-0 text-xs" asChild>
                                <a href={article.url} target="_blank" rel="noopener noreferrer">
                                  Read more <ExternalLink className="ml-1 h-3 w-3 inline" />
                                </a>
                              </Button>
                            </div>
                          )) || <p className="text-muted-foreground">No research articles available.</p>}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold mb-2">Conservation Status</h3>
                        <p className="text-muted-foreground">
                          {metadata.conservationStatus}
                          {metadata.observationsCount > 0 && (
                            <>
                              <br />
                              <span className="text-sm">
                                Based on {metadata.observationsCount.toLocaleString()} observations on iNaturalist
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="taxonomy" className="mt-4">
                  <div className="grid gap-2">
                    {Object.entries(taxonomy).map(([rank, name]) => {
                      if (rank === "ancestor_ids") return null
                      return (
                        <div key={rank} className="flex items-center justify-between py-2">
                          <span className="font-medium capitalize">{rank}:</span>
                          <span className="text-muted-foreground">{name}</span>
                        </div>
                      )
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="characteristics" className="mt-4">
                  {species.characteristics ? (
                    <div className="space-y-4">
                      {species.characteristics.habitat && (
                        <div>
                          <h3 className="font-medium mb-2">Habitat</h3>
                          <ul className="list-disc list-inside space-y-1">
                            {species.characteristics.habitat.map((habitat) => (
                              <li key={habitat} className="text-muted-foreground">
                                {habitat}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {species.characteristics.season && (
                        <div>
                          <h3 className="font-medium mb-2">Season</h3>
                          <ul className="list-disc list-inside space-y-1">
                            {species.characteristics.season.map((season) => (
                              <li key={season} className="text-muted-foreground">
                                {season}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {species.characteristics.edibility && (
                        <div>
                          <h3 className="font-medium mb-2">Edibility</h3>
                          <p className="text-muted-foreground">{species.characteristics.edibility}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No characteristics information available.</p>
                  )}
                </TabsContent>

                {species.compounds && species.compounds.length > 0 && (
                  <TabsContent value="compounds" className="mt-4">
                    <div className="space-y-4">
                      {species.compounds.map((compound) => (
                        <div key={compound.id}>
                          <Button variant="link" className="h-auto p-0" asChild>
                            <a href={`/compounds/${compound.id}`}>{compound.name}</a>
                          </Button>
                          {compound.concentration && (
                            <p className="text-sm text-muted-foreground">Concentration: {compound.concentration}</p>
                          )}
                          {compound.id !== species.compounds![species.compounds!.length - 1].id && (
                            <Separator className="my-2" />
                          )}
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Photos</CardTitle>
              <p className="text-sm text-muted-foreground">
                Photos from iNaturalist contributors ({photos.length} available)
              </p>
            </CardHeader>
            <CardContent>
              <PhotoGallery photos={photos} speciesName={species.commonName} isLoading={isLoading.photos} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Scientific References</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
                    <Database className="h-4 w-4" />
                    Databases
                  </h3>
                  <div className="space-y-2">
                    <Button variant="link" className="h-auto p-0 text-left" asChild>
                      <a
                        href={`https://www.inaturalist.org/taxa/${species.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View on iNaturalist
                        <ExternalLink className="ml-1 h-3 w-3 inline" />
                      </a>
                    </Button>
                    <Button variant="link" className="h-auto p-0 text-left" asChild>
                      <a
                        href={`https://www.mycobank.org/page/Basic%20names/search?searchKey=${encodeURIComponent(species.scientificName)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View on MycoBank
                        <ExternalLink className="ml-1 h-3 w-3 inline" />
                      </a>
                    </Button>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
                    <FileText className="h-4 w-4" />
                    Research Articles
                  </h3>
                  <div className="space-y-4">
                    {isLoading.articles ? (
                      <p className="text-sm text-muted-foreground">Loading articles...</p>
                    ) : articles.length > 0 ? (
                      articles.slice(0, 5).map((article, index) => (
                        <div key={article.id}>
                          <Button variant="link" className="h-auto p-0 text-left" asChild>
                            <a href={article.url} target="_blank" rel="noopener noreferrer">
                              {article.title}
                              <ExternalLink className="ml-1 h-3 w-3 inline" />
                            </a>
                          </Button>
                          <p className="text-xs text-muted-foreground mt-1">
                            {article.authors.join(", ")} ({new Date(article.publishedDate).getFullYear()})
                          </p>
                          {index < articles.length - 1 && <Separator className="my-2" />}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No articles found</p>
                    )}
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
                    <Book className="h-4 w-4" />
                    Additional Resources
                  </h3>
                  <div className="space-y-2">
                    {species.references.map((reference, index) => (
                      <div key={index}>
                        <Button variant="link" className="h-auto p-0 text-left" asChild>
                          <a href={reference.url} target="_blank" rel="noopener noreferrer">
                            {reference.title}
                            <ExternalLink className="ml-1 h-3 w-3 inline" />
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4" />
                <p>Last updated: {new Date(species.lastUpdated).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
