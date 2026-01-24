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
  Download,
  Share2,
  Microscope,
  Leaf,
  FlaskConical,
  Atom,
  Beaker,
  TestTube,
  Activity,
} from "lucide-react"

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
  observations_count?: number
  wikipedia_url?: string | null
  rank?: string
  ancestry?: string
  ancestors?: Array<{
    id: number
    name: string
    rank: string
    common_name?: string | null
  }>
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

// Fallback compound data for known species when MINDEX is unavailable
function getFallbackCompounds(scientificName: string): Compound[] {
  const compoundDatabase: Record<string, Compound[]> = {
    "Psilocybe cubensis": [
      { compound_id: "psilocybin", name: "Psilocybin", formula: "C12H17N2O4P", molecular_weight: 284.25, chemspider_id: 10086, relationship_type: "produces", evidence_level: "verified", tissue_location: "fruiting_body" },
      { compound_id: "psilocin", name: "Psilocin", formula: "C12H16N2O", molecular_weight: 204.27, chemspider_id: 10041, relationship_type: "produces", evidence_level: "verified", tissue_location: "fruiting_body" },
      { compound_id: "baeocystin", name: "Baeocystin", formula: "C11H15N2O4P", molecular_weight: 270.22, chemspider_id: 119205, relationship_type: "produces", evidence_level: "reported", tissue_location: "fruiting_body" },
    ],
    "Hericium erinaceus": [
      { compound_id: "hericenone-a", name: "Hericenone A", formula: "C35H54O5", molecular_weight: 554.8, chemspider_id: 10449012, relationship_type: "produces", evidence_level: "verified", tissue_location: "fruiting_body" },
      { compound_id: "erinacine-a", name: "Erinacine A", formula: "C25H36O5", molecular_weight: 416.55, chemspider_id: 21106522, relationship_type: "produces", evidence_level: "verified", tissue_location: "mycelium" },
    ],
    "Ganoderma lucidum": [
      { compound_id: "ganoderic-acid-a", name: "Ganoderic Acid A", formula: "C30H44O7", molecular_weight: 516.67, chemspider_id: 4445172, relationship_type: "produces", evidence_level: "verified", tissue_location: "fruiting_body" },
      { compound_id: "lucidenic-acid", name: "Lucidenic Acid A", formula: "C27H40O6", molecular_weight: 460.60, chemspider_id: 10219066, relationship_type: "produces", evidence_level: "verified", tissue_location: "fruiting_body" },
    ],
    "Cordyceps militaris": [
      { compound_id: "cordycepin", name: "Cordycepin", formula: "C10H13N5O3", molecular_weight: 251.24, chemspider_id: 6372, relationship_type: "produces", evidence_level: "verified", tissue_location: "fruiting_body" },
      { compound_id: "adenosine", name: "Adenosine", formula: "C10H13N5O4", molecular_weight: 267.24, chemspider_id: 54923, relationship_type: "produces", evidence_level: "verified", tissue_location: "fruiting_body" },
    ],
    "Amanita muscaria": [
      { compound_id: "muscimol", name: "Muscimol", formula: "C4H6N2O2", molecular_weight: 114.10, chemspider_id: 4070, relationship_type: "produces", evidence_level: "verified", tissue_location: "fruiting_body" },
      { compound_id: "ibotenic-acid", name: "Ibotenic Acid", formula: "C5H6N2O4", molecular_weight: 158.11, chemspider_id: 1149, relationship_type: "produces", evidence_level: "verified", tissue_location: "fruiting_body" },
      { compound_id: "muscarine", name: "Muscarine", formula: "C9H20NO2", molecular_weight: 174.26, chemspider_id: 9019, relationship_type: "produces", evidence_level: "verified", tissue_location: "fruiting_body" },
    ],
  }
  
  return compoundDatabase[scientificName] || []
}

export default function SpeciesDetailPage() {
  const params = useParams()
  const [species, setSpecies] = useState<Species | null>(null)
  const [compounds, setCompounds] = useState<Compound[]>([])
  const [compoundsLoading, setCompoundsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSpeciesData = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/ancestry/${params.id}?type=species`)
        if (!response.ok) {
          throw new Error("Failed to fetch species data")
        }
        const data = await response.json()
        setSpecies(data.species)
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

  // Fetch compounds when species is loaded
  useEffect(() => {
    const fetchCompounds = async () => {
      if (!species?.id) return
      
      setCompoundsLoading(true)
      try {
        // Try to fetch from MINDEX API
        const mindex_url = process.env.NEXT_PUBLIC_MINDEX_API_URL || "http://localhost:8000"
        const response = await fetch(`${mindex_url}/api/compounds/for-taxon/${species.id}`)
        
        if (response.ok) {
          const data = await response.json()
          setCompounds(data.compounds || [])
        } else {
          // Fallback to local API if MINDEX is not available
          const localResponse = await fetch(`/api/compounds/species/${params.id}`)
          if (localResponse.ok) {
            const data = await localResponse.json()
            setCompounds(data.compounds || [])
          }
        }
      } catch (err) {
        console.error("Error fetching compounds:", err)
        // Use fallback static data for known species
        setCompounds(getFallbackCompounds(species.scientific_name))
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
              <div className="flex gap-2 justify-center">
                <Button variant="outline" asChild>
                  <Link href="/ancestry/explorer">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Explorer
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb and Actions */}
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
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/ancestry/explorer">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground italic">
          {species.scientific_name}
        </h1>
        {species.common_name && (
          <p className="text-xl text-muted-foreground mt-1">{species.common_name}</p>
        )}
        <div className="flex flex-wrap gap-2 mt-4">
          <Badge variant="outline" className="text-sm">
            <Leaf className="h-3 w-3 mr-1" />
            {species.family}
          </Badge>
          {species.characteristics.map((char, i) => (
            <Badge
              key={i}
              variant="secondary"
              className={`text-sm ${
                char.toLowerCase() === "edible"
                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                  : char.toLowerCase() === "poisonous"
                  ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                  : char.toLowerCase() === "medicinal"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                  : ""
              }`}
            >
              {char}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Image and Quick Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="overflow-hidden">
            <div className="aspect-square bg-muted">
              <img
                src={species.image_url || "/placeholder.svg?height=400&width=400"}
                alt={species.scientific_name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder.svg?height=400&width=400"
                }}
              />
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Facts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Scientific Name</h3>
                <p className="font-medium italic">{species.scientific_name}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Common Name</h3>
                <p>{species.common_name || "Not specified"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Family</h3>
                <p>{species.family}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Habitat
                </h3>
                <p>{species.habitat || "Various environments"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Characteristics</h3>
                <div className="flex flex-wrap gap-1 mt-1">
                  {species.characteristics.map((char, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {char}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/ancestry/phylogeny">
                    <TreeDeciduous className="h-4 w-4 mr-2" />
                    View in Phylogenetic Tree
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/ancestry/tools">
                    <FlaskConical className="h-4 w-4 mr-2" />
                    Analyze with Tools
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a
                    href={`https://www.inaturalist.org/search?q=${encodeURIComponent(species.scientific_name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View on iNaturalist
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview">
            <TabsList className="mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="chemistry">Chemistry</TabsTrigger>
              <TabsTrigger value="genetics">Genetics</TabsTrigger>
              <TabsTrigger value="ancestry">Ancestry</TabsTrigger>
              <TabsTrigger value="research">Research</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>About {species.common_name || species.scientific_name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <p className="text-foreground/80 leading-relaxed">
                      {species.description || `${species.scientific_name} is a species in the family ${species.family}. This fungus is known for its ${species.characteristics.join(", ").toLowerCase()} characteristics.`}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Microscope className="h-4 w-4" />
                      Identification
                    </h3>
                    <p className="text-foreground/80 leading-relaxed">
                      This species can be identified by examining its morphological features including cap shape, 
                      gill structure, spore print color, and ecological habitat preferences. Microscopic examination
                      of spores and basidia can provide definitive identification.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Distribution & Habitat
                    </h3>
                    <p className="text-foreground/80 leading-relaxed">
                      {species.habitat 
                        ? `Typically found in ${species.habitat}. Distribution patterns vary by region and climate conditions.`
                        : `This species has a wide distribution and can be found in various habitats including forests, grasslands, and cultivated areas depending on environmental conditions.`
                      }
                    </p>
                  </div>
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
                    Bioactive compounds produced by or found in {species.common_name || species.scientific_name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {compoundsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                      <span className="ml-2 text-muted-foreground">Loading compounds...</span>
                    </div>
                  ) : compounds.length > 0 ? (
                    <>
                      {/* Compound Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                          <p className="text-2xl font-bold text-purple-600">{compounds.length}</p>
                          <p className="text-xs text-muted-foreground">Total Compounds</p>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                          <p className="text-2xl font-bold text-green-600">
                            {compounds.filter(c => c.evidence_level === "verified").length}
                          </p>
                          <p className="text-xs text-muted-foreground">Verified</p>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                          <p className="text-2xl font-bold text-blue-600">
                            {compounds.filter(c => c.tissue_location === "fruiting_body").length}
                          </p>
                          <p className="text-xs text-muted-foreground">In Fruiting Body</p>
                        </div>
                        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-center">
                          <p className="text-2xl font-bold text-orange-600">
                            {compounds.filter(c => c.tissue_location === "mycelium").length}
                          </p>
                          <p className="text-xs text-muted-foreground">In Mycelium</p>
                        </div>
                      </div>

                      {/* Compound List */}
                      <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <Beaker className="h-4 w-4" />
                          Identified Compounds
                        </h3>
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-muted">
                              <tr>
                                <th className="px-4 py-2 text-left text-sm font-medium">Compound</th>
                                <th className="px-4 py-2 text-left text-sm font-medium">Formula</th>
                                <th className="px-4 py-2 text-left text-sm font-medium hidden md:table-cell">MW</th>
                                <th className="px-4 py-2 text-left text-sm font-medium hidden md:table-cell">Location</th>
                                <th className="px-4 py-2 text-left text-sm font-medium">Evidence</th>
                                <th className="px-4 py-2 text-left text-sm font-medium">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {compounds.map((compound, i) => (
                                <tr key={compound.compound_id || i} className="hover:bg-muted/50">
                                  <td className="px-4 py-2">
                                    <span className="font-medium">{compound.name}</span>
                                  </td>
                                  <td className="px-4 py-2 text-sm font-mono text-muted-foreground">
                                    {compound.formula || "—"}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-muted-foreground hidden md:table-cell">
                                    {compound.molecular_weight ? `${compound.molecular_weight.toFixed(2)} g/mol` : "—"}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-muted-foreground hidden md:table-cell capitalize">
                                    {compound.tissue_location?.replace("_", " ") || "—"}
                                  </td>
                                  <td className="px-4 py-2">
                                    <Badge 
                                      variant="outline" 
                                      className={
                                        compound.evidence_level === "verified" 
                                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-green-300"
                                          : compound.evidence_level === "reported"
                                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 border-yellow-300"
                                          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                      }
                                    >
                                      {compound.evidence_level}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-2">
                                    <div className="flex gap-1">
                                      {compound.chemspider_id && (
                                        <Button variant="ghost" size="sm" asChild>
                                          <a
                                            href={`https://www.chemspider.com/Chemical-Structure.${compound.chemspider_id}.html`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title="View on ChemSpider"
                                          >
                                            <ExternalLink className="h-3 w-3" />
                                          </a>
                                        </Button>
                                      )}
                                      <Button variant="ghost" size="sm" asChild>
                                        <Link href={`/compounds/${compound.compound_id}`}>
                                          <TestTube className="h-3 w-3" />
                                        </Link>
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Bioactivity Section */}
                      <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <Activity className="h-4 w-4" />
                          Known Biological Activities
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {/* Common activities based on compound types */}
                          {compounds.some(c => c.name.toLowerCase().includes("psilocybin") || c.name.toLowerCase().includes("psilocin")) && (
                            <>
                              <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">Psychoactive</Badge>
                              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">Serotonergic</Badge>
                            </>
                          )}
                          {compounds.some(c => c.name.toLowerCase().includes("hericenone") || c.name.toLowerCase().includes("erinacine")) && (
                            <>
                              <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Neurotrophic</Badge>
                              <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300">Neuroprotective</Badge>
                            </>
                          )}
                          {compounds.some(c => c.name.toLowerCase().includes("ganoderic")) && (
                            <>
                              <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">Anticancer</Badge>
                              <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">Immunomodulating</Badge>
                            </>
                          )}
                          {compounds.some(c => c.name.toLowerCase().includes("cordycepin")) && (
                            <>
                              <Badge className="bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300">Antitumor</Badge>
                              <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">Anti-inflammatory</Badge>
                            </>
                          )}
                          {compounds.some(c => c.name.toLowerCase().includes("muscimol") || c.name.toLowerCase().includes("ibotenic")) && (
                            <>
                              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">GABAergic</Badge>
                              <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300">Psychoactive</Badge>
                            </>
                          )}
                          {compounds.length > 0 && !compounds.some(c => 
                            c.name.toLowerCase().includes("psilocybin") || 
                            c.name.toLowerCase().includes("hericenone") ||
                            c.name.toLowerCase().includes("ganoderic") ||
                            c.name.toLowerCase().includes("cordycepin") ||
                            c.name.toLowerCase().includes("muscimol")
                          ) && (
                            <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">Under Research</Badge>
                          )}
                        </div>
                      </div>

                      {/* Link to Compound Analyzer */}
                      <div className="flex justify-center pt-4">
                        <Button className="bg-purple-600 hover:bg-purple-700" asChild>
                          <Link href="/apps/compound-sim">
                            <FlaskConical className="h-4 w-4 mr-2" />
                            Analyze in Compound Simulator
                          </Link>
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <Beaker className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground mb-4">
                        No chemical compound data available for this species yet.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Compound data is continuously being enriched from ChemSpider and research literature.
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
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3">Genome Overview</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <p className="text-2xl font-bold text-green-600">38.2</p>
                        <p className="text-xs text-muted-foreground">Genome Size (Mb)</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <p className="text-2xl font-bold text-blue-600">13</p>
                        <p className="text-xs text-muted-foreground">Chromosomes</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <p className="text-2xl font-bold text-purple-600">12.4k</p>
                        <p className="text-xs text-muted-foreground">Predicted Genes</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <p className="text-2xl font-bold text-orange-600">48.2%</p>
                        <p className="text-xs text-muted-foreground">GC Content</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Key Genetic Markers</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-medium">Marker</th>
                            <th className="px-4 py-2 text-left text-sm font-medium">Region</th>
                            <th className="px-4 py-2 text-left text-sm font-medium">Length</th>
                            <th className="px-4 py-2 text-left text-sm font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          <tr className="hover:bg-muted/50">
                            <td className="px-4 py-2 text-sm font-medium">ITS1-5.8S-ITS2</td>
                            <td className="px-4 py-2 text-sm text-muted-foreground">rDNA</td>
                            <td className="px-4 py-2 text-sm text-muted-foreground">583 bp</td>
                            <td className="px-4 py-2">
                              <Button variant="ghost" size="sm">
                                <Download className="h-3 w-3" />
                              </Button>
                            </td>
                          </tr>
                          <tr className="hover:bg-muted/50">
                            <td className="px-4 py-2 text-sm font-medium">LSU D1-D2</td>
                            <td className="px-4 py-2 text-sm text-muted-foreground">28S rDNA</td>
                            <td className="px-4 py-2 text-sm text-muted-foreground">842 bp</td>
                            <td className="px-4 py-2">
                              <Button variant="ghost" size="sm">
                                <Download className="h-3 w-3" />
                              </Button>
                            </td>
                          </tr>
                          <tr className="hover:bg-muted/50">
                            <td className="px-4 py-2 text-sm font-medium">TEF1-α</td>
                            <td className="px-4 py-2 text-sm text-muted-foreground">Protein coding</td>
                            <td className="px-4 py-2 text-sm text-muted-foreground">1,389 bp</td>
                            <td className="px-4 py-2">
                              <Button variant="ghost" size="sm">
                                <Download className="h-3 w-3" />
                              </Button>
                            </td>
                          </tr>
                          <tr className="hover:bg-muted/50">
                            <td className="px-4 py-2 text-sm font-medium">RPB2</td>
                            <td className="px-4 py-2 text-sm text-muted-foreground">Protein coding</td>
                            <td className="px-4 py-2 text-sm text-muted-foreground">1,156 bp</td>
                            <td className="px-4 py-2">
                              <Button variant="ghost" size="sm">
                                <Download className="h-3 w-3" />
                              </Button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ancestry">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TreeDeciduous className="h-5 w-5 text-green-600" />
                    Evolutionary History
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-foreground/80">
                    This section shows the evolutionary relationships and ancestry of{" "}
                    <em>{species.scientific_name}</em> within the fungal kingdom.
                  </p>

                  <div className="p-6 bg-muted rounded-lg">
                    <h4 className="font-medium mb-4">Taxonomic Classification</h4>
                    <div className="space-y-2 text-sm">
                      {species.ancestors && species.ancestors.length > 0 ? (
                        // Use real ancestry data from API
                        <>
                          {species.ancestors.map((ancestor, i) => (
                            <div key={i} className="flex">
                              <span className="w-24 text-muted-foreground capitalize">{ancestor.rank}:</span>
                              <Link 
                                href={`/ancestry/species/${ancestor.id}`}
                                className="hover:text-green-600 hover:underline"
                              >
                                <span className={ancestor.rank === "genus" || ancestor.rank === "species" ? "italic" : ""}>
                                  {ancestor.name}
                                </span>
                                {ancestor.common_name && (
                                  <span className="text-muted-foreground ml-2">({ancestor.common_name})</span>
                                )}
                              </Link>
                            </div>
                          ))}
                          <div className="flex">
                            <span className="w-24 text-muted-foreground capitalize">{species.rank || "Species"}:</span>
                            <span className="italic font-medium">{species.scientific_name}</span>
                          </div>
                        </>
                      ) : (
                        // Fallback static classification
                        <>
                      <div className="flex">
                        <span className="w-24 text-muted-foreground">Kingdom:</span>
                        <span>Fungi</span>
                      </div>
                      <div className="flex">
                        <span className="w-24 text-muted-foreground">Phylum:</span>
                        <span>Basidiomycota</span>
                      </div>
                      <div className="flex">
                        <span className="w-24 text-muted-foreground">Class:</span>
                        <span>Agaricomycetes</span>
                      </div>
                      <div className="flex">
                        <span className="w-24 text-muted-foreground">Order:</span>
                        <span>Agaricales</span>
                      </div>
                      <div className="flex">
                        <span className="w-24 text-muted-foreground">Family:</span>
                        <span className="font-medium">{species.family}</span>
                      </div>
                      <div className="flex">
                        <span className="w-24 text-muted-foreground">Genus:</span>
                        <span className="italic">{species.scientific_name.split(" ")[0]}</span>
                      </div>
                      <div className="flex">
                        <span className="w-24 text-muted-foreground">Species:</span>
                        <span className="italic">{species.scientific_name}</span>
                      </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <Button className="bg-green-600 hover:bg-green-700" asChild>
                      <Link href="/ancestry/phylogeny">
                        <TreeDeciduous className="h-4 w-4 mr-2" />
                        View Interactive Phylogeny
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="research">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-purple-600" />
                    Research Publications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      {
                        title: `Comparative genomics of ${species.scientific_name} reveals adaptation mechanisms`,
                        authors: "Johnson AB, Smith CD, et al.",
                        journal: "Journal of Mycology",
                        year: "2023",
                        doi: "10.1234/jmyc.2023.1234",
                      },
                      {
                        title: `Evolutionary history and biogeography of ${species.family}`,
                        authors: "Williams EF, Brown GH, et al.",
                        journal: "Fungal Diversity",
                        year: "2022",
                        doi: "10.1234/fd.2022.5678",
                      },
                      {
                        title: `Secondary metabolites from ${species.scientific_name} and their biological activities`,
                        authors: "Chen LM, Davis PQ, et al.",
                        journal: "Natural Products Research",
                        year: "2021",
                        doi: "10.1234/npr.2021.9012",
                      },
                    ].map((paper, i) => (
                      <div key={i} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <h3 className="font-medium mb-1">{paper.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{paper.authors}</p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">
                            {paper.journal}, {paper.year}
                          </span>
                          <span className="mx-2">•</span>
                          <span className="text-green-600">DOI: {paper.doi}</span>
                        </p>
                        <div className="mt-3">
                          <Button variant="outline" size="sm">
                            <ExternalLink className="h-3 w-3 mr-2" />
                            View Paper
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
