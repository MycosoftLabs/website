"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { PUBLIC_TOOL_HREFS } from "@/lib/nav-public-tools"
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
  BookOpen,
  Camera,
  Link2,
  BarChart2,
} from "lucide-react"

interface Species {
  id: number | string
  uuid?: string
  scientific_name: string
  common_name: string | null
  family: string
  kingdom?: string | null
  lineage?: string[] | null
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

/** MINDEX all-life bundle from BFF (no client-side mock payloads). */
interface AllLifeProfile {
  interactions: { data?: Array<Record<string, unknown>> } | null
  media: { video?: Array<Record<string, unknown>>; audio?: Array<Record<string, unknown>> } | null
  publications: { data?: Array<Record<string, unknown>> } | null
  lineage: {
    nodes?: Array<{ name: string; taxon_id?: string | null; depth?: number }>
    kingdom?: string | null
    message?: string
  } | null
  characteristics: { data?: Array<Record<string, unknown>> } | null
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

export default function SpeciesDetailPage() {
  const params = useParams()
  const [species, setSpecies] = useState<Species | null>(null)
  const [allLife, setAllLife] = useState<AllLifeProfile | null>(null)
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
        if (data.all_life) setAllLife(data.all_life as AllLifeProfile)
        else setAllLife(null)
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

  // Fetch compounds when species is loaded - via website API route (server-only env vars)
  useEffect(() => {
    const fetchCompounds = async () => {
      if (!species?.id) return

      setCompoundsLoading(true)
      try {
        const response = await fetch(`/api/compounds/species/${species.id}`)
        if (response.ok) {
          const data = await response.json()
          setCompounds(data.compounds || [])
        } else {
          setCompounds([])
        }
      } catch (err) {
        console.error("Error fetching compounds:", err)
        setCompounds([])
      } finally {
        setCompoundsLoading(false)
      }
    }

    if (species) {
      fetchCompounds()
    }
  }, [species])

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
                  <Link href="/natureos/ancestry/explorer">
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
          <Link href="/natureos/ancestry" className="hover:text-foreground">
            Ancestry
          </Link>
          <span>/</span>
          <Link href="/natureos/ancestry/explorer" className="hover:text-foreground">
            Explorer
          </Link>
          <span>/</span>
          <span className="text-foreground">{species.scientific_name}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/natureos/ancestry/explorer">
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
          {species.kingdom && (
            <Badge variant="outline" className="text-sm">
              {species.kingdom}
            </Badge>
          )}
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
                  <Link href={`/natureos/ancestry/phylogeny?taxon=${encodeURIComponent(String(params.id))}`}>
                    <TreeDeciduous className="h-4 w-4 mr-2" />
                    View in Phylogenetic Tree
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/natureos/ancestry/tools">
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
            <TabsList className="mb-6 flex w-full min-h-[48px] flex-nowrap items-stretch justify-start gap-1 overflow-x-auto p-1 md:flex-wrap">
              <TabsTrigger value="overview" className="shrink-0 min-h-[44px] min-w-[44px] text-base">
                Overview
              </TabsTrigger>
              <TabsTrigger value="taxonomy" className="shrink-0 min-h-[44px] min-w-[44px] text-base">
                Taxonomy
              </TabsTrigger>
              <TabsTrigger value="genetics" className="shrink-0 min-h-[44px] min-w-[44px] text-base">
                Genetics
              </TabsTrigger>
              <TabsTrigger value="chemistry" className="shrink-0 min-h-[44px] min-w-[44px] text-base">
                Chemistry
              </TabsTrigger>
              <TabsTrigger value="locations" className="shrink-0 min-h-[44px] min-w-[44px] text-base">
                Locations
              </TabsTrigger>
              <TabsTrigger value="media" className="shrink-0 min-h-[44px] min-w-[44px] text-base">
                Media
              </TabsTrigger>
              <TabsTrigger value="research" className="shrink-0 min-h-[44px] min-w-[44px] text-base">
                Research
              </TabsTrigger>
              <TabsTrigger value="relationships" className="shrink-0 min-h-[44px] min-w-[44px] text-base">
                Relationships
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>About {species.common_name || species.scientific_name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <p className="text-foreground/80 leading-relaxed text-base sm:text-sm">
                      {species.description
                        ? species.description
                        : `No description available for ${species.scientific_name} in MINDEX yet. Taxonomic placement: ${
                            species.kingdom || "unknown kingdom"
                          } · Family ${species.family}.`}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Microscope className="h-4 w-4" />
                      {species.kingdom === "Fungi" ? "Field identification" : "Identification notes"}
                    </h3>
                    <p className="text-foreground/80 leading-relaxed text-base sm:text-sm">
                      {species.kingdom === "Fungi"
                        ? "Mushroom-forming species: verify macroscopic traits (if applicable) and, where needed, microscopic features from voucher material. Do not eat wild specimens without expert confirmation."
                        : "Use authoritative keys and, where available, sequence or morphological data appropriate for this taxon’s kingdom. Data here reflects what is present in MINDEX; expert review may be required for critical use."}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Distribution &amp; habitat
                    </h3>
                    <p className="text-foreground/80 leading-relaxed text-base sm:text-sm">
                      {species.habitat
                        ? `Habitat: ${species.habitat}.`
                        : "Habitat and distribution details are not available in the database for this record."}
                    </p>
                    {typeof species.observations_count === "number" && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        iNaturalist observation count (when sourced): {species.observations_count.toLocaleString()}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="taxonomy">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TreeDeciduous className="h-5 w-5 text-green-600" />
                    Taxonomy &amp; classification
                  </CardTitle>
                  <CardDescription>
                    Lineage and traits from MINDEX (materialized lineage) when available
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 text-base sm:text-sm">
                  <div className="p-4 bg-muted/60 rounded-lg space-y-2 text-sm">
                    <div className="flex flex-wrap gap-2">
                      {species.kingdom && (
                        <Badge variant="secondary" className="min-h-9 text-base sm:text-sm">
                          Kingdom: {species.kingdom}
                        </Badge>
                      )}
                      {species.rank && (
                        <Badge variant="outline" className="min-h-9 text-base sm:text-sm">
                          Rank: {species.rank}
                        </Badge>
                      )}
                    </div>
                    {allLife?.lineage?.message && !allLife.lineage?.nodes?.length && (
                      <p className="text-muted-foreground">{allLife.lineage.message}</p>
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Lineage (MINDEX)</h3>
                    {allLife?.lineage?.nodes && allLife.lineage.nodes.length > 0 ? (
                      <ol className="list-decimal list-inside space-y-1">
                        {allLife.lineage.nodes.map((n, i) => (
                          <li key={i} className="pl-1">
                            {n.taxon_id ? (
                              <Link
                                href={`/natureos/ancestry/species/${encodeURIComponent(n.taxon_id)}`}
                                className="text-primary hover:underline"
                              >
                                {n.name}
                              </Link>
                            ) : (
                              <span>{n.name}</span>
                            )}
                          </li>
                        ))}
                      </ol>
                    ) : species.lineage && species.lineage.length > 0 ? (
                      <ol className="list-decimal list-inside space-y-1">
                        {species.lineage.map((name, i) => (
                          <li key={i}>{name}</li>
                        ))}
                      </ol>
                    ) : species.ancestors && species.ancestors.length > 0 ? (
                      <ul className="space-y-2">
                        {species.ancestors.map((ancestor, i) => (
                          <li key={i} className="flex flex-wrap gap-2 text-sm">
                            <span className="text-muted-foreground capitalize w-20 shrink-0">
                              {ancestor.rank}
                            </span>
                            <Link
                              href={`/natureos/ancestry/species/${ancestor.id}`}
                              className="hover:underline"
                            >
                              {ancestor.name}
                            </Link>
                          </li>
                        ))}
                        <li className="pt-1 font-medium">{species.scientific_name}</li>
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">
                        No full lineage in MINDEX for this taxon yet. Run ETL and lineage backfill to populate
                        hierarchy.
                      </p>
                    )}
                  </div>

                  {allLife?.characteristics?.data && allLife.characteristics.data.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Database characteristics</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-[500px] w-full text-sm border rounded-md">
                          <thead>
                            <tr className="bg-muted">
                              <th className="p-2 text-left">Name</th>
                              <th className="p-2 text-left">Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allLife.characteristics.data.map((row, i) => (
                              <tr key={i} className="border-t">
                                <td className="p-2">{String(row.name ?? "—")}</td>
                                <td className="p-2">
                                  {String(
                                    (row as { value_text?: string; value_num?: number }).value_text ??
                                      (row as { value_num?: number }).value_num ??
                                      "—"
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <Button className="min-h-11" asChild>
                    <Link href={`/natureos/ancestry/phylogeny?taxon=${encodeURIComponent(String(params.id))}`}>
                      <TreeDeciduous className="h-4 w-4 mr-2" />
                      Open interactive phylogeny
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="genetics">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Dna className="h-5 w-5 text-blue-600" />
                    Genomics &amp; markers
                  </CardTitle>
                  <CardDescription>Real sequence and assembly data will appear as ETL populates MINDEX (GenBank, BOLD, Ensembl).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-base sm:text-sm">
                  <p className="text-muted-foreground">
                    No genome assembly or sequence records are shown here until your connectors write verified
                    metadata to MINDEX. Use the Ancestry tools page for common barcode regions by kingdom
                    (e.g. ITS for Fungi, rbcL/matK for plants, COI for animals, 16S for bacteria).
                  </p>
                  {species.kingdom === "Fungi" && (
                    <p>
                      Fungi: standard region for species-level ID is often the ITS barcode (ITS1–5.8S–ITS2); verify
                      against vouchered sequences.
                    </p>
                  )}
                  {species.kingdom === "Plantae" && <p>Plantae: plastid markers (e.g. rbcL, matK) are common in reference databases.</p>}
                  {species.kingdom === "Animalia" && <p>Animalia: mitochondrial COI is widely used in barcoding (with known exceptions).</p>}
                  {species.kingdom === "Bacteria" && <p>Bacteria: 16S rRNA is a common first-pass taxonomic marker for prokaryotes.</p>}
                  <Button className="min-h-11 w-full sm:w-auto" asChild>
                    <Link href="/natureos/ancestry/tools">
                      <FlaskConical className="h-4 w-4 mr-2" />
                      Open Ancestry tools
                    </Link>
                  </Button>
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
                          <Link href={PUBLIC_TOOL_HREFS.compoundSim}>
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

            <TabsContent value="locations">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-emerald-600" />
                    Observations &amp; distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-base sm:text-sm">
                  {typeof species.observations_count === "number" && (
                    <div className="flex items-center gap-2">
                      <BarChart2 className="h-4 w-4 text-muted-foreground" />
                      <span>Community observation count: {species.observations_count.toLocaleString()}</span>
                    </div>
                  )}
                  {species.distribution && (
                    <p>
                      <span className="font-medium">Reported range: </span>
                      {species.distribution}
                    </p>
                  )}
                  {species.habitat && (
                    <p>
                      <span className="font-medium">Habitat: </span>
                      {species.habitat}
                    </p>
                  )}
                  <Button className="min-h-11 w-full sm:w-auto" asChild>
                    <a
                      href={`https://www.inaturalist.org/search?tab=taxa&q=${encodeURIComponent(species.scientific_name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View on iNaturalist
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="media">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5 text-amber-600" />
                    Media
                  </CardTitle>
                  <CardDescription>Video and audio from MINDEX media store when ETL is enabled</CardDescription>
                </CardHeader>
                <CardContent>
                  {allLife?.media && (allLife.media.video?.length || allLife.media.audio?.length) ? (
                    <div className="space-y-6">
                      {allLife.media.video && allLife.media.video.length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-2">Video</h3>
                          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                            {allLife.media.video.map((v, i) => {
                              const url = String((v as { url?: string }).url ?? "")
                              return (
                                <li key={i}>
                                  {url ? (
                                    <a href={url} className="text-primary hover:underline break-all" target="_blank" rel="noreferrer">
                                      {url}
                                    </a>
                                  ) : (
                                    "—"
                                  )}
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      )}
                      {allLife.media.audio && allLife.media.audio.length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-2">Audio</h3>
                          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                            {allLife.media.audio.map((a, i) => {
                              const url = String((a as { url?: string }).url ?? "")
                              return (
                                <li key={i}>
                                  {url ? (
                                    <a href={url} className="text-primary hover:underline break-all" target="_blank" rel="noreferrer">
                                      {url}
                                    </a>
                                  ) : (
                                    "—"
                                  )}
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No video or audio records linked in MINDEX for this taxon.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="research">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-violet-600" />
                    Research &amp; publications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {allLife?.publications?.data && allLife.publications.data.length > 0 ? (
                    <div className="space-y-4">
                      {allLife.publications.data.map((pub, i) => {
                        const title = String((pub as { title?: string }).title || "Untitled")
                        const year = (pub as { year?: number }).year
                        const doi = (pub as { doi?: string | null }).doi
                        const refUrl = (pub as { url?: string | null }).url
                        const authorArr = (pub as { authors?: unknown }).authors
                        const authorsText = Array.isArray(authorArr)
                          ? (authorArr as { name?: string; family_name?: string }[])
                              .map((a) => a?.name || a?.family_name || JSON.stringify(a))
                              .filter(Boolean)
                              .join(", ")
                          : null
                        return (
                          <div key={i} className="p-4 border rounded-lg">
                            <h3 className="font-medium mb-1">{title}</h3>
                            {authorsText && <p className="text-sm text-muted-foreground">{authorsText}</p>}
                            {year != null && <p className="text-sm text-muted-foreground">Year: {year}</p>}
                            {doi && <p className="text-sm text-green-700 dark:text-green-400">DOI: {doi}</p>}
                            {refUrl && (
                              <Button className="mt-2 min-h-11" variant="outline" size="sm" asChild>
                                <a href={refUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  Open reference
                                </a>
                              </Button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No publication links in MINDEX for this taxon yet.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="relationships">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="h-5 w-5 text-sky-600" />
                    Interactions
                  </CardTitle>
                  <CardDescription>Species interactions from MINDEX (e.g. GloBI after ETL)</CardDescription>
                </CardHeader>
                <CardContent>
                  {allLife?.interactions?.data && allLife.interactions.data.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-[480px] w-full text-sm border rounded-md">
                        <thead>
                          <tr className="bg-muted">
                            <th className="p-2 text-left">Type</th>
                            <th className="p-2 text-left">With</th>
                            <th className="p-2 text-left">Source</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allLife.interactions.data.map((row, i) => (
                            <tr key={i} className="border-t">
                              <td className="p-2">
                                {String(
                                  (row as { interaction_type?: string }).interaction_type ?? (row as { type?: string }).type ?? "—"
                                )}
                              </td>
                              <td className="p-2 break-all text-xs sm:text-sm">
                                {String((row as { target_taxon_id?: string }).target_taxon_id ?? "") || "—"}
                              </td>
                              <td className="p-2">
                                {String((row as { evidence_source?: string }).evidence_source ?? "—")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No interaction records in MINDEX for this taxon yet.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}