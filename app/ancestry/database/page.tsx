"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search,
  Database,
  Dna,
  FileText,
  Download,
  ExternalLink,
  Loader2,
  RefreshCw,
  ChevronRight,
  AlertCircle,
} from "lucide-react"

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
  const [usingFallback, setUsingFallback] = useState(false)

  useEffect(() => {
    fetchSpecies()
  }, [])

  const fetchSpecies = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/ancestry?limit=100")
      if (response.ok) {
        const data = await response.json()
        setSpecies(data.species || [])
        // Show info banner if using external APIs instead of local MINDEX
        setUsingFallback(data.source === "external_api" || data.source === "none")
        
        if (data.source === "none" && (!data.species || data.species.length === 0)) {
          setError(data.message || "No species data available. Please start MINDEX service.")
        }
      } else {
        throw new Error("Failed to fetch species")
      }
    } catch (err) {
      console.error("Error fetching species:", err)
      setError("Failed to load species data. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  // Filter species based on search query
  const filteredSpecies = species.filter((s) => {
    const query = searchQuery.toLowerCase()
    return (
      s.scientific_name.toLowerCase().includes(query) ||
      (s.common_name && s.common_name.toLowerCase().includes(query)) ||
      s.family.toLowerCase().includes(query) ||
      (s.description && s.description.toLowerCase().includes(query))
    )
  })

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link href="/ancestry" className="hover:text-foreground">
          Ancestry
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span>Database</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Database className="h-8 w-8 text-green-600" />
            Fungal Species Database
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse and search our comprehensive genetic database
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSpecies}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" asChild>
            <Link href="/ancestry/explorer">
              <Search className="h-4 w-4 mr-2" />
              Explorer
            </Link>
          </Button>
        </div>
      </div>

      {/* Status Banner */}
      {usingFallback && (
        <div className="mb-6 rounded-lg border border-blue-500/50 bg-blue-500/10 p-4">
          <div className="flex items-start gap-3">
            <Database className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <p className="font-medium text-blue-600 dark:text-blue-400">Data Source: External APIs</p>
              <p className="text-sm text-muted-foreground">
                Fetching real-time data from iNaturalist and GBIF. For faster local access, start MINDEX:
                <code className="ml-2 px-2 py-0.5 bg-muted rounded text-xs">docker-compose -f docker-compose.mindex.yml up -d</code>
              </p>
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="browse" className="space-y-6">
        <TabsList>
          <TabsTrigger value="browse">Browse Species</TabsTrigger>
          <TabsTrigger value="sequences">Genetic Sequences</TabsTrigger>
          <TabsTrigger value="publications">Publications</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by scientific name, common name, or family..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Loading */}
          {loading && (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
              <span className="ml-2 text-muted-foreground">Loading species data...</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <Card className="border-red-500/50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
                  <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
                  <p className="text-muted-foreground mb-4">{error}</p>
                  <Button onClick={fetchSpecies}>Try Again</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Species Table */}
          {!loading && !error && (
            <Card>
              <CardHeader>
                <CardTitle>Species Records</CardTitle>
                <CardDescription>
                  Showing {filteredSpecies.length} of {species.length} species
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableCaption>Fungal species in the Mycosoft database</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Scientific Name</TableHead>
                      <TableHead>Common Name</TableHead>
                      <TableHead>Family</TableHead>
                      <TableHead>Characteristics</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSpecies.map((s) => (
                      <TableRow key={s.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          <Link
                            href={`/ancestry/species/${s.id}`}
                            className="text-green-600 hover:underline"
                          >
                            {s.scientific_name}
                          </Link>
                        </TableCell>
                        <TableCell>{s.common_name || "—"}</TableCell>
                        <TableCell>{s.family}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {s.characteristics.slice(0, 2).map((char, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {char}
                              </Badge>
                            ))}
                            {s.characteristics.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{s.characteristics.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/ancestry/species/${s.id}`}>
                              View <ChevronRight className="h-4 w-4 ml-1" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sequences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dna className="h-5 w-5 text-blue-600" />
                Genetic Sequences
              </CardTitle>
              <CardDescription>
                Access DNA sequences for phylogenetic analysis and species identification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[
                  { name: "ITS Region", count: "15,234", description: "Internal Transcribed Spacer sequences" },
                  { name: "LSU rDNA", count: "12,891", description: "Large Subunit ribosomal DNA" },
                  { name: "SSU rDNA", count: "8,456", description: "Small Subunit ribosomal DNA" },
                  { name: "TEF1-α", count: "6,723", description: "Translation Elongation Factor 1-alpha" },
                  { name: "RPB1", count: "4,567", description: "RNA Polymerase II subunit 1" },
                  { name: "RPB2", count: "5,234", description: "RNA Polymerase II subunit 2" },
                ].map((seq) => (
                  <Card key={seq.name} className="border">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{seq.name}</h3>
                        <Badge variant="secondary">{seq.count}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{seq.description}</p>
                      <Button variant="outline" size="sm" className="w-full">
                        <Download className="h-4 w-4 mr-2" />
                        Download FASTA
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="publications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                Research Publications
              </CardTitle>
              <CardDescription>
                Scientific papers and research related to fungal genetics and phylogeny
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    title: "Molecular phylogeny of the Agaricales based on multigene analyses",
                    authors: "Matheny PB, Curtis JM, Hofstetter V, et al.",
                    journal: "Mycologia",
                    year: "2006",
                    doi: "10.1080/15572536.2006.11832599",
                  },
                  {
                    title: "A higher-level phylogenetic classification of the Fungi",
                    authors: "Hibbett DS, Binder M, Bischoff JF, et al.",
                    journal: "Mycological Research",
                    year: "2007",
                    doi: "10.1016/j.mycres.2007.03.004",
                  },
                  {
                    title: "Fungal barcoding: progress and problems",
                    authors: "Seifert KA",
                    journal: "Molecular Ecology Resources",
                    year: "2009",
                    doi: "10.1111/j.1755-0998.2008.02478.x",
                  },
                  {
                    title: "Phylogenetic overview of the class Agaricomycetes",
                    authors: "Larsson KH",
                    journal: "Mycological Progress",
                    year: "2007",
                    doi: "10.1007/s11557-007-0525-2",
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
                      <a
                        href={`https://doi.org/${paper.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:underline inline-flex items-center gap-1"
                      >
                        DOI: {paper.doi}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
