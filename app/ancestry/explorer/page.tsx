"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"

export default function AncestryExplorerPage() {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const router = useRouter()

  useEffect(() => {
    // Simulate loading data
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Ancestry Explorer</h1>
          <Button variant="outline" onClick={() => router.push("/ancestry")}>
            Back to Ancestry
          </Button>
        </div>

        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full md:w-auto grid-cols-3 md:grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="phylogeny">Phylogeny</TabsTrigger>
            <TabsTrigger value="species">Species</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            {loading ? (
              <LoadingState />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Fungal Ancestry</CardTitle>
                    <CardDescription>Explore the evolutionary history of fungi</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>
                      The Ancestry Explorer provides tools to investigate the phylogenetic relationships between fungal
                      species, trace evolutionary pathways, and understand taxonomic classifications.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Updates</CardTitle>
                    <CardDescription>Latest additions to the database</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>Added 150 new species to the phylogenetic tree</li>
                      <li>Updated taxonomic classifications based on recent research</li>
                      <li>Improved visualization tools for evolutionary relationships</li>
                      <li>Integrated DNA sequencing data for key species</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Getting Started</CardTitle>
                    <CardDescription>How to use the Ancestry Explorer</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4">
                      The Ancestry Explorer provides several tools to help you understand fungal evolutionary
                      relationships:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Button onClick={() => setActiveTab("phylogeny")} className="w-full">
                        Explore Phylogenetic Trees
                      </Button>
                      <Button onClick={() => setActiveTab("species")} className="w-full">
                        Browse Species Database
                      </Button>
                      <Button onClick={() => setActiveTab("tools")} className="w-full">
                        Use Analysis Tools
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="phylogeny" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Phylogenetic Trees</CardTitle>
                <CardDescription>Visualize evolutionary relationships</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] bg-muted rounded-md flex items-center justify-center">
                  <p className="text-muted-foreground">Phylogenetic tree visualization will appear here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="species" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Species Database</CardTitle>
                <CardDescription>Browse and search fungal species</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] bg-muted rounded-md flex items-center justify-center">
                  <p className="text-muted-foreground">Species browser will appear here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tools" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Analysis Tools</CardTitle>
                <CardDescription>Tools for ancestry analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" className="h-24 flex flex-col items-center justify-center">
                    <span className="text-lg font-medium">DNA Sequencing</span>
                    <span className="text-sm text-muted-foreground">Analyze genetic sequences</span>
                  </Button>
                  <Button variant="outline" className="h-24 flex flex-col items-center justify-center">
                    <span className="text-lg font-medium">ITS Lookup</span>
                    <span className="text-sm text-muted-foreground">Internal Transcribed Spacer analysis</span>
                  </Button>
                  <Button variant="outline" className="h-24 flex flex-col items-center justify-center">
                    <span className="text-lg font-medium">Sequence Alignment</span>
                    <span className="text-sm text-muted-foreground">Compare genetic sequences</span>
                  </Button>
                  <Button variant="outline" className="h-24 flex flex-col items-center justify-center">
                    <span className="text-lg font-medium">Genome Annotation</span>
                    <span className="text-sm text-muted-foreground">Identify gene functions</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Data Sources</CardTitle>
                <CardDescription>Information about our data</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-4">The Ancestry Explorer uses data from multiple sources:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Genomic databases from research institutions</li>
                  <li>Published phylogenetic studies</li>
                  <li>User-contributed DNA sequences (verified)</li>
                  <li>Taxonomic classifications from mycological societies</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    </div>
  )
}
