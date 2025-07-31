"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Database, Microscope, Search, Leaf, FileText, PlusCircle } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function FungalDatabaseApp() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Fungal Database</h1>
        <p className="text-muted-foreground">
          Comprehensive database of fungal species with detailed profiles, advanced search, and visualization tools.
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="explorer">Explorer</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-green-600" />
                  Species Explorer
                </CardTitle>
                <CardDescription>Browse and search through thousands of fungal species</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-40 relative rounded-md overflow-hidden">
                  <Image src="/golden-chanterelles.png" alt="Mushroom species" fill className="object-cover" />
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href="/ancestry/fungal-database">Open Explorer</Link>
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-green-600" />
                  Advanced Search
                </CardTitle>
                <CardDescription>Find species by specific characteristics and properties</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-40 relative rounded-md overflow-hidden">
                  <Image src="/king-bolete-close-up.png" alt="Advanced search" fill className="object-cover" />
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href="/ancestry/fungal-database/advanced-search">Advanced Search</Link>
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Microscope className="h-5 w-5 text-green-600" />
                  DNA Analysis
                </CardTitle>
                <CardDescription>Analyze DNA sequences and identify species</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-40 relative rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <div className="text-center p-4">
                    <Microscope className="h-12 w-12 mx-auto mb-2 text-green-600" />
                    <p className="text-sm text-muted-foreground">DNA sequencing and analysis tools</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href="/natureos/apps/ancestry?tab=tools">DNA Tools</Link>
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Leaf className="h-5 w-5 text-green-600" />
                  Visualization
                </CardTitle>
                <CardDescription>Interactive visualizations of fungal relationships</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-40 relative rounded-md overflow-hidden">
                  <Image src="/amanita-close-up.png" alt="Visualization" fill className="object-cover" />
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href="/ancestry/fungal-database/visualization">Open Visualizations</Link>
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-600" />
                  Reports
                </CardTitle>
                <CardDescription>Generate reports and export data</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-40 relative rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <div className="text-center p-4">
                    <FileText className="h-12 w-12 mx-auto mb-2 text-green-600" />
                    <p className="text-sm text-muted-foreground">Generate custom reports from database</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href="/ancestry/fungal-database/reports">Generate Reports</Link>
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <PlusCircle className="h-5 w-5 text-green-600" />
                  Submit Species
                </CardTitle>
                <CardDescription>Contribute to the database by submitting new species</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-40 relative rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <div className="text-center p-4">
                    <PlusCircle className="h-12 w-12 mx-auto mb-2 text-green-600" />
                    <p className="text-sm text-muted-foreground">Submit new species to the database</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href="/ancestry/fungal-database/submit">Submit Species</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="explorer" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Species Explorer</CardTitle>
              <CardDescription>Browse and search through the comprehensive fungal species database</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[500px] flex items-center justify-center border rounded-md">
                <div className="text-center">
                  <Database className="h-16 w-16 mx-auto mb-4 text-green-600" />
                  <h3 className="text-lg font-medium mb-2">Fungal Species Explorer</h3>
                  <p className="text-muted-foreground mb-4 max-w-md">
                    Access the complete database of fungal species with detailed profiles, images, and taxonomic
                    information
                  </p>
                  <Button asChild size="lg">
                    <Link href="/ancestry/fungal-database">Open Full Explorer</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tools" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Database Tools</CardTitle>
              <CardDescription>Access specialized tools for fungal research and analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-md p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Microscope className="h-5 w-5 text-green-600" />
                    <h3 className="font-medium">DNA Sequencing</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">Analyze DNA sequences to identify fungal species</p>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/natureos/apps/ancestry?tab=tools">Open Tool</Link>
                  </Button>
                </div>

                <div className="border rounded-md p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Search className="h-5 w-5 text-green-600" />
                    <h3 className="font-medium">Advanced Search</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">Search species by multiple characteristics</p>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/ancestry/fungal-database/advanced-search">Open Tool</Link>
                  </Button>
                </div>

                <div className="border rounded-md p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Leaf className="h-5 w-5 text-green-600" />
                    <h3 className="font-medium">Visualization Tools</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Interactive visualizations of fungal relationships
                  </p>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/ancestry/fungal-database/visualization">Open Tool</Link>
                  </Button>
                </div>

                <div className="border rounded-md p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-green-600" />
                    <h3 className="font-medium">Report Generator</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">Generate custom reports from the database</p>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/ancestry/fungal-database/reports">Open Tool</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Database Statistics</CardTitle>
              <CardDescription>Overview of the fungal database statistics and metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="border rounded-md p-4 text-center">
                  <p className="text-sm text-muted-foreground">Total Species</p>
                  <h3 className="text-3xl font-bold text-green-600">5,280</h3>
                </div>
                <div className="border rounded-md p-4 text-center">
                  <p className="text-sm text-muted-foreground">Edible Species</p>
                  <h3 className="text-3xl font-bold text-green-600">1,450</h3>
                </div>
                <div className="border rounded-md p-4 text-center">
                  <p className="text-sm text-muted-foreground">Medicinal Species</p>
                  <h3 className="text-3xl font-bold text-green-600">820</h3>
                </div>
                <div className="border rounded-md p-4 text-center">
                  <p className="text-sm text-muted-foreground">Toxic Species</p>
                  <h3 className="text-3xl font-bold text-green-600">1,120</h3>
                </div>
              </div>

              <div className="h-[300px] border rounded-md p-4 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-muted-foreground mb-2">Species Distribution by Family</p>
                  <div className="h-[200px] w-full bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center">
                    <p className="text-muted-foreground">Interactive chart would appear here</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
