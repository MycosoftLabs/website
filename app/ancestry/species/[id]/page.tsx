"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Species } from "@/lib/services/ancestry-service"

export default function SpeciesDetailPage() {
  const params = useParams()
  const [species, setSpecies] = useState<Species | null>(null)
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
      </div>
    )
  }

  if (error || !species) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
              <p className="text-foreground/70">{error || "Species not found"}</p>
              <Button className="mt-4" onClick={() => window.history.back()}>
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="outline" size="sm" onClick={() => window.history.back()} className="mb-4">
          ← Back to Explorer
        </Button>
        <h1 className="text-3xl font-bold text-foreground">{species.scientific_name}</h1>
        <p className="text-xl text-foreground/70">{species.common_name}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card>
            <div className="aspect-square bg-muted">
              <img
                src={species.image_url || "/placeholder.svg?height=400&width=400"}
                alt={species.scientific_name}
                className="w-full h-full object-cover"
              />
            </div>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium text-foreground/70">Family</h3>
                  <p className="font-medium">{species.family}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-foreground/70">Habitat</h3>
                  <p>{species.habitat || "Unknown"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-foreground/70">Characteristics</h3>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {species.characteristics.map((char, i) => (
                      <span key={i} className="text-xs bg-muted px-2 py-1 rounded">
                        {char}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Tabs defaultValue="overview">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="ancestry">Ancestry</TabsTrigger>
              <TabsTrigger value="genetics">Genetics</TabsTrigger>
              <TabsTrigger value="research">Research</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>About {species.common_name || species.scientific_name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground/80 leading-relaxed">
                    {species.description || "No description available for this species."}
                  </p>

                  <h3 className="font-medium mt-6 mb-2">Identification</h3>
                  <p className="text-foreground/80 leading-relaxed">
                    Information about how to identify this species would appear here.
                  </p>

                  <h3 className="font-medium mt-6 mb-2">Distribution</h3>
                  <p className="text-foreground/80 leading-relaxed">
                    Information about the geographical distribution of this species would appear here.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ancestry">
              <Card>
                <CardHeader>
                  <CardTitle>Evolutionary History</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground/80 mb-6">
                    This section shows the evolutionary relationships and ancestry of {species.scientific_name}.
                  </p>

                  <div className="aspect-[16/9] bg-muted rounded-md flex items-center justify-center mb-6">
                    <div className="text-center p-8">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="80"
                        height="80"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mx-auto text-foreground/40 mb-4"
                      >
                        <path d="M2 12h10"></path>
                        <path d="M9 4v16"></path>
                        <path d="M12 8h10"></path>
                        <path d="M19 4v16"></path>
                      </svg>
                      <p className="text-foreground/70">Phylogenetic tree visualization</p>
                      <p className="text-sm text-foreground/50 mt-2">
                        Click the button below to explore the interactive tree
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <Button className="bg-green-600 hover:bg-green-700">View Interactive Phylogeny</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="genetics">
              <Card>
                <CardHeader>
                  <CardTitle>Genetic Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-medium mb-2">Genome Overview</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-foreground/70">Genome Size</p>
                          <p className="font-medium">38.2 Mb</p>
                        </div>
                        <div>
                          <p className="text-sm text-foreground/70">Chromosome Count</p>
                          <p className="font-medium">13</p>
                        </div>
                        <div>
                          <p className="text-sm text-foreground/70">Gene Count</p>
                          <p className="font-medium">12,471</p>
                        </div>
                        <div>
                          <p className="text-sm text-foreground/70">GC Content</p>
                          <p className="font-medium">48.2%</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium mb-2">Key Genes</h3>
                      <div className="border rounded-lg overflow-hidden dark:border-gray-800">
                        <table className="w-full">
                          <thead className="bg-muted">
                            <tr>
                              <th className="px-4 py-2 text-left text-sm font-medium">Gene</th>
                              <th className="px-4 py-2 text-left text-sm font-medium">Function</th>
                              <th className="px-4 py-2 text-left text-sm font-medium">Length</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y dark:divide-gray-800">
                            <tr className="hover:bg-muted/50">
                              <td className="px-4 py-2 text-sm font-medium">ITS1</td>
                              <td className="px-4 py-2 text-sm">Species identification</td>
                              <td className="px-4 py-2 text-sm">583 bp</td>
                            </tr>
                            <tr className="hover:bg-muted/50">
                              <td className="px-4 py-2 text-sm font-medium">LSU</td>
                              <td className="px-4 py-2 text-sm">Ribosomal structure</td>
                              <td className="px-4 py-2 text-sm">1,842 bp</td>
                            </tr>
                            <tr className="hover:bg-muted/50">
                              <td className="px-4 py-2 text-sm font-medium">TEF1</td>
                              <td className="px-4 py-2 text-sm">Protein synthesis</td>
                              <td className="px-4 py-2 text-sm">1,389 bp</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="research">
              <Card>
                <CardHeader>
                  <CardTitle>Research Publications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {[
                      {
                        title: "Comparative genomics of " + species.scientific_name + " reveals adaptation mechanisms",
                        authors: "Johnson, A.B., Smith, C.D., et al.",
                        journal: "Journal of Mycology",
                        year: "2022",
                        doi: "10.1234/jmyc.2022.1234",
                      },
                      {
                        title: "Evolutionary history and biogeography of " + species.family,
                        authors: "Williams, E.F., Brown, G.H., et al.",
                        journal: "Fungal Diversity",
                        year: "2021",
                        doi: "10.1234/fd.2021.5678",
                      },
                      {
                        title:
                          "Secondary metabolites from " + species.scientific_name + " and their biological activities",
                        authors: "Chen, L.M., Davis, P.Q., et al.",
                        journal: "Natural Products Research",
                        year: "2020",
                        doi: "10.1234/npr.2020.9012",
                      },
                    ].map((paper, i) => (
                      <div key={i} className="p-4 border rounded-lg dark:border-gray-800">
                        <h3 className="font-medium mb-1">{paper.title}</h3>
                        <p className="text-sm text-foreground/70 mb-2">{paper.authors}</p>
                        <p className="text-sm">
                          <span className="text-foreground/70">
                            {paper.journal}, {paper.year}
                          </span>{" "}
                          •<span className="ml-1 text-green-600">DOI: {paper.doi}</span>
                        </p>
                        <div className="mt-3">
                          <Button variant="outline" size="sm">
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
