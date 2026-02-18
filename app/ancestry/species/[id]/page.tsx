"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  MapPin,
  Dna,
  TreeDeciduous,
  FileText,
  AlertCircle,
  Atom,
  Beaker,
  TestTube,
  Activity,
} from "lucide-react"
import { PhotoGallery } from "@/components/species/photo-gallery"
import { HierarchicalTaxonomyTree, type TaxonomyNode } from "@/components/ancestry/HierarchicalTaxonomyTree"
import { LiveToolsWidget } from "@/components/ancestry/LiveToolsWidget"
import { QuickFactsWidget } from "@/components/ancestry/QuickFactsWidget"
import { ResearchDocuments } from "@/components/ancestry/ResearchDocuments"

interface Species {
  id: number | string
  scientific_name: string
  common_name: string | null
  family: string
  description: string | null
  image_url: string | null
  characteristics: string[]
  habitat: string | null
  edibility?: string | null
  season?: string | null
  distribution?: string | null
  toxicity?: string | null
  conservation_status?: string | null
  observations_count?: number
  wikipedia_url?: string | null
  rank?: string
  ancestry?: string
  ancestors?: Array<{
    id: number | string
    name: string
    rank: string
    common_name?: string | null
  }>
  photo_attribution?: string | null
  photos?: Array<{ url: string; medium_url?: string; large_url?: string; attribution: string }>
}

interface Compound {
  compound_id: string
  name: string
  formula: string | null
  molecular_weight: number | null
  chemspider_id: number | null
  relationship_type: string
  evidence_level: string
  tissue_location: string | null
}

interface SpeciesDetailResponse {
  photos?: Array<{ url: string; medium_url?: string; large_url?: string; attribution: string }>
}

function buildPhotos(species: Species): Array<{ url: string; medium_url?: string; large_url?: string; attribution: string }> {
  if (species.photos && species.photos.length > 0) {
    return species.photos.map((p) => ({
      url: p.url,
      medium_url: p.medium_url || p.url,
      large_url: p.large_url || p.medium_url || p.url,
      attribution: p.attribution || "Source",
    }))
  }
  if (species.image_url) {
    return [
      {
        url: species.image_url,
        medium_url: species.image_url,
        large_url: species.image_url,
        attribution: species.photo_attribution || "Source",
      },
    ]
  }
  return []
}

function buildTaxonomyNodes(species: Species): TaxonomyNode[] {
  const ancestors = species.ancestors || []
  const nodes: TaxonomyNode[] = ancestors.map((a) => ({
    id: a.id,
    name: a.name,
    rank: a.rank,
    commonName: a.common_name ?? null,
  }))
  nodes.push({
    id: species.id,
    name: species.scientific_name,
    rank: species.rank || "species",
    commonName: species.common_name ?? null,
  })
  return nodes
}

export default function SpeciesDetailPage() {
  const params = useParams()
  const [species, setSpecies] = useState<Species | null>(null)
  const [photos, setPhotos] = useState<Array<{ url: string; medium_url?: string; large_url?: string; attribution: string }>>([])
  const [compounds, setCompounds] = useState<Compound[]>([])
  const [compoundsLoading, setCompoundsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    const fetchSpeciesData = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/ancestry/${params.id}?type=species`)
        if (!response.ok) {
          throw new Error("Failed to fetch species data")
        }
        const data = await response.json()
        const sp = data.species
        setSpecies(sp)
        const basePhotos = buildPhotos(sp)
        if (basePhotos.length > 1) {
          setPhotos(basePhotos)
        } else if (sp?.scientific_name) {
          try {
            const detailRes = await fetch(`/api/mindex/species/detail?name=${encodeURIComponent(sp.scientific_name)}`)
            if (detailRes.ok) {
              const detail: SpeciesDetailResponse = await detailRes.json()
              if (detail.photos && detail.photos.length > 0) {
                setPhotos(
                  detail.photos.map((p) => ({
                    url: p.url,
                    medium_url: p.medium_url || p.url,
                    large_url: p.large_url || p.medium_url || p.url,
                    attribution: p.attribution || "Source",
                  }))
                )
                return
              }
            }
          } catch {
            /* ignore */
          }
          setPhotos(basePhotos)
        } else {
          setPhotos(basePhotos)
        }
      } catch (err) {
        console.error("Error fetching species:", err)
        setError("Failed to load species data. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchSpeciesData()
    }
  }, [params.id])

  useEffect(() => {
    const fetchCompounds = async () => {
      if (!species?.id) return
      setCompoundsLoading(true)
      try {
        const mindexUrl = process.env.NEXT_PUBLIC_MINDEX_API_URL || process.env.MINDEX_API_URL || "http://localhost:8000"
        const response = await fetch(`${mindexUrl}/api/compounds/for-taxon/${species.id}`)
        if (response.ok) {
          const data = await response.json()
          setCompounds(data.compounds || [])
        } else {
          const localResponse = await fetch(`/api/compounds/species/${params.id}`)
          if (localResponse.ok) {
            const data = await localResponse.json()
            setCompounds(data.compounds || [])
          } else {
            setCompounds([])
          }
        }
      } catch {
        setCompounds([])
      } finally {
        setCompoundsLoading(false)
      }
    }
    if (species) {
      fetchCompounds()
    }
  }, [species, params.id])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-green-600 mb-4" />
        <p className="text-muted-foreground">Loading species data...</p>
      </div>
    )
  }

  if (error || !species) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
              <h2 className="text-xl font-semibold text-red-600 mb-2">Species Not Found</h2>
              <p className="text-muted-foreground mb-4">
                {error || "The requested species could not be found in the database."}
              </p>
              <Button variant="outline" asChild>
                <Link href="/ancestry/explorer">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Explorer
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const taxonomyNodes = buildTaxonomyNodes(species)
  const galleryPhotos = photos.length > 0 ? photos : buildPhotos(species)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/ancestry" className="hover:text-foreground">
            Ancestry
          </Link>
          <span>/</span>
          <Link href="/ancestry/explorer" className="hover:text-foreground">
            Explorer
          </Link>
          <span>/</span>
          <span className="text-foreground">{species.scientific_name}</span>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/ancestry/explorer">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
      </div>

      <h1 className="text-3xl md:text-4xl font-bold text-foreground italic mb-1">
        {species.scientific_name}
      </h1>
      {species.common_name && <p className="text-xl text-muted-foreground mb-4">{species.common_name}</p>}

      {/* Hero: Large Photo Gallery */}
      <div className="mb-8">
        <PhotoGallery
          photos={galleryPhotos}
          speciesName={species.scientific_name}
          initialLimit={8}
        />
      </div>

      {/* Quick Facts | Hierarchical Taxonomy Tree */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <QuickFactsWidget
          speciesName={species.scientific_name}
          data={{
            family: species.family,
            conservationStatus: species.conservation_status,
            habitat: species.habitat,
            distribution: species.distribution,
            edibility: species.edibility,
            toxicity: species.toxicity,
            commonName: species.common_name,
            rank: species.rank,
          }}
        />
        <HierarchicalTaxonomyTree
          nodes={taxonomyNodes}
          currentName={species.scientific_name}
          currentId={species.id}
          defaultExpanded
          className="border rounded-lg p-4"
        />
      </div>

      {/* Tabs: Overview | Genetics | Chemistry | Research with Live Tools sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 flex flex-wrap">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="chemistry">Chemistry</TabsTrigger>
              <TabsTrigger value="genetics">Genetics</TabsTrigger>
              <TabsTrigger value="research">Research</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>About {species.common_name || species.scientific_name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-foreground/80 leading-relaxed">
                    {species.description ||
                      `${species.scientific_name} is a species in the family ${species.family}.`}
                  </p>
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Distribution & Habitat
                    </h3>
                    <p className="text-foreground/80">
                      {species.habitat ||
                        species.distribution ||
                        "Habitat and distribution data is being collected."}
                    </p>
                  </div>
                  {species.characteristics.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {species.characteristics.map((char, i) => (
                        <Badge key={i} variant="secondary">
                          {char}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="chemistry">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Atom className="h-5 w-5 text-purple-600" />
                    Chemical Compounds
                  </CardTitle>
                  <CardDescription>
                    Bioactive compounds from {species.common_name || species.scientific_name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {compoundsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                      <span className="ml-2 text-muted-foreground">Loading compounds...</span>
                    </div>
                  ) : compounds.length > 0 ? (
                    <div className="space-y-4">
                      <div className="border rounded-lg overflow-x-auto">
                        <table className="w-full min-w-[500px]">
                          <thead className="bg-muted">
                            <tr>
                              <th className="px-4 py-2 text-left text-sm font-medium">Compound</th>
                              <th className="px-4 py-2 text-left text-sm font-medium">Formula</th>
                              <th className="px-4 py-2 text-left text-sm font-medium hidden md:table-cell">MW</th>
                              <th className="px-4 py-2 text-left text-sm font-medium">Evidence</th>
                              <th className="px-4 py-2 text-left text-sm font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {compounds.map((compound, i) => (
                              <tr key={compound.compound_id || i} className="hover:bg-muted/50">
                                <td className="px-4 py-2 font-medium">{compound.name}</td>
                                <td className="px-4 py-2 text-sm font-mono text-muted-foreground">
                                  {compound.formula || "—"}
                                </td>
                                <td className="px-4 py-2 text-sm hidden md:table-cell">
                                  {compound.molecular_weight ? `${compound.molecular_weight.toFixed(2)} g/mol` : "—"}
                                </td>
                                <td className="px-4 py-2">
                                  <Badge variant="outline">{compound.evidence_level}</Badge>
                                </td>
                                <td className="px-4 py-2">
                                  {compound.chemspider_id && (
                                    <a
                                      href={`https://www.chemspider.com/Chemical-Structure.${compound.chemspider_id}.html`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex"
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </a>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <Button variant="outline" asChild>
                        <Link href="/apps/compound-sim">
                          <Beaker className="h-4 w-4 mr-2" />
                          Analyze in Compound Simulator
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Beaker className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">
                        No chemical compound data available for this species yet.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="genetics">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Dna className="h-5 w-5 text-blue-600" />
                    Genetic Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Genetic data is loaded from MINDEX. Use the Genetics tools in the sidebar to explore sequences on NCBI BLAST, GenBank, and UNITE.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="research">
              <ResearchDocuments speciesName={species.scientific_name} limit={15} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:col-span-1">
          <LiveToolsWidget
            mode={activeTab === "genetics" ? "genetics" : activeTab === "chemistry" ? "chemistry" : "taxonomy"}
            speciesName={species.scientific_name}
          />
        </div>
      </div>
    </div>
  )
}
