import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { Compound } from "@/types/search"

interface CompoundTemplateProps {
  compound: Compound
}

export function CompoundTemplate({ compound }: CompoundTemplateProps) {
  // Ensure foundIn exists and is an array
  const foundIn = compound.foundIn || []

  // Ensure references exists and is an array
  const references = compound.references || []

  // Ensure biologicalActivity exists and is an array
  const biologicalActivity = compound.biologicalActivity || []

  // Ensure safety exists or provide default
  const safety = compound.safety || {
    classification: "Not classified",
    warnings: [],
  }

  // Ensure properties exists or provide default
  const properties = compound.properties || {}

  return (
    <div className="container py-6 md:py-8">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="grid gap-6 md:grid-cols-[200px,1fr]">
                <div className="relative aspect-square rounded-lg overflow-hidden bg-background/50">
                  <Image
                    src={
                      compound.structure?.url ||
                      `/api/compound-image?smiles=${encodeURIComponent(compound.structure?.smiles || "")}`
                    }
                    alt={`Chemical structure of ${compound.name}`}
                    fill
                    className="object-contain p-2"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold">{compound.name}</h1>
                    <Badge variant="secondary">{compound.formula}</Badge>
                  </div>
                  <p className="text-lg text-muted-foreground">Molecular Weight: {compound.molecularWeight}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="overview">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="properties">Properties</TabsTrigger>
                  <TabsTrigger value="activity">Biological Activity</TabsTrigger>
                  <TabsTrigger value="safety">Safety</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4">
                  <div className="prose dark:prose-invert max-w-none">
                    <p>{compound.description}</p>
                  </div>
                  {compound.structure?.url && (
                    <div className="mt-6">
                      <h3 className="font-medium mb-2">Structure</h3>
                      <div className="relative aspect-square max-w-md">
                        <Image
                          src={compound.structure.url || "/placeholder.svg"}
                          alt={`Chemical structure of ${compound.name}`}
                          fill
                          className="object-contain"
                        />
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="properties" className="mt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {Object.entries(properties).map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <h3 className="font-medium capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</h3>
                        <p className="text-sm text-muted-foreground">{value}</p>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="activity" className="mt-4">
                  <div className="space-y-4">
                    {biologicalActivity.map((activity, index) => (
                      <p key={index} className="text-sm">
                        {activity}
                      </p>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="safety" className="mt-4">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-2">Classification</h3>
                      <p className="text-sm">{safety.classification}</p>
                    </div>
                    {safety.warnings.length > 0 && (
                      <div>
                        <h3 className="font-medium mb-2">Warnings</h3>
                        <ul className="list-disc list-inside space-y-1">
                          {safety.warnings.map((warning, index) => (
                            <li key={index} className="text-sm text-muted-foreground">
                              {warning}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {foundIn.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Found In</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {foundIn.map((fungi, index) => (
                    <div key={fungi.id}>
                      <Link href={`/species/${fungi.id}`} className="text-sm hover:underline block">
                        {fungi.commonName}
                      </Link>
                      <p className="text-xs text-muted-foreground italic">{fungi.scientificName}</p>
                      {index < foundIn.length - 1 && <Separator className="my-2" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {references.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>References</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {references.map((ref, index) => (
                    <div key={index}>
                      <Button variant="link" className="h-auto p-0 text-left" asChild>
                        <a href={ref.url} target="_blank" rel="noopener noreferrer">
                          {ref.title}
                        </a>
                      </Button>
                      <p className="text-xs text-muted-foreground">DOI: {ref.doi}</p>
                      {index < references.length - 1 && <Separator className="my-2" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
