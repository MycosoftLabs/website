"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getAllFungi } from "@/lib/mock-data"

export function FungalDataVisualization() {
  const [visualizationType, setVisualizationType] = useState("distribution")
  const fungi = getAllFungi()

  // In a real application, we would use a charting library like Chart.js, D3.js, or Recharts
  // For this example, we'll create simple visualizations with HTML/CSS

  // Distribution by family
  const familyDistribution = fungi.reduce(
    (acc, fungus) => {
      acc[fungus.family] = (acc[fungus.family] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const familyData = Object.entries(familyDistribution).sort((a, b) => b[1] - a[1])

  // Distribution by edibility
  const edibilityDistribution = fungi.reduce(
    (acc, fungus) => {
      acc[fungus.edibility] = (acc[fungus.edibility] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const edibilityData = Object.entries(edibilityDistribution).sort((a, b) => b[1] - a[1])

  // Distribution by habitat
  const habitatDistribution = fungi.reduce(
    (acc, fungus) => {
      acc[fungus.habitat] = (acc[fungus.habitat] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const habitatData = Object.entries(habitatDistribution).sort((a, b) => b[1] - a[1])

  // Get the maximum value for scaling
  const maxFamilyValue = Math.max(...Object.values(familyDistribution))
  const maxEdibilityValue = Math.max(...Object.values(edibilityDistribution))
  const maxHabitatValue = Math.max(...Object.values(habitatDistribution))

  return (
    <div className="space-y-6">
      <Tabs defaultValue="distribution" onValueChange={setVisualizationType}>
        <TabsList className="grid grid-cols-3 w-full md:w-[400px]">
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
          <TabsTrigger value="relationships">Relationships</TabsTrigger>
        </TabsList>

        <TabsContent value="distribution" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribution by Family</CardTitle>
              <CardDescription>Number of fungi species in each family</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {familyData.map(([family, count]) => (
                  <div key={family} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{family}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${(count / maxFamilyValue) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribution by Edibility</CardTitle>
              <CardDescription>Number of fungi species by edibility classification</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {edibilityData.map(([edibility, count]) => (
                  <div key={edibility} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{edibility}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          edibility.toLowerCase().includes("edible")
                            ? "bg-green-500"
                            : edibility.toLowerCase().includes("poisonous")
                              ? "bg-red-500"
                              : "bg-amber-500"
                        }`}
                        style={{ width: `${(count / maxEdibilityValue) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribution by Habitat</CardTitle>
              <CardDescription>Number of fungi species by habitat</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {habitatData.map(([habitat, count]) => (
                  <div key={habitat} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="truncate" title={habitat}>
                        {habitat}
                      </span>
                      <span className="font-medium">{count}</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-500 rounded-full"
                        style={{ width: `${(count / maxHabitatValue) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Edibility by Family</CardTitle>
              <CardDescription>Compare edibility across different fungal families</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end justify-around gap-2">
                {familyData.slice(0, 5).map(([family, count]) => {
                  const edibleCount = fungi.filter(
                    (f) => f.family === family && f.edibility.toLowerCase().includes("edible"),
                  ).length

                  const poisonousCount = fungi.filter(
                    (f) => f.family === family && f.edibility.toLowerCase().includes("poisonous"),
                  ).length

                  const unknownCount = count - edibleCount - poisonousCount

                  return (
                    <div key={family} className="flex flex-col items-center w-1/6">
                      <div className="w-full flex flex-col-reverse">
                        {unknownCount > 0 && (
                          <div
                            className="w-full bg-amber-500"
                            style={{ height: `${(unknownCount / count) * 200}px` }}
                          />
                        )}
                        {poisonousCount > 0 && (
                          <div
                            className="w-full bg-red-500"
                            style={{ height: `${(poisonousCount / count) * 200}px` }}
                          />
                        )}
                        {edibleCount > 0 && (
                          <div className="w-full bg-green-500" style={{ height: `${(edibleCount / count) * 200}px` }} />
                        )}
                      </div>
                      <div className="mt-2 text-xs text-center font-medium truncate w-full" title={family}>
                        {family}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-center mt-4 gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500" />
                  <span className="text-sm">Edible</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500" />
                  <span className="text-sm">Poisonous</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-amber-500" />
                  <span className="text-sm">Unknown</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="relationships" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Taxonomic Relationships</CardTitle>
              <CardDescription>Explore the taxonomic hierarchy of fungi</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 border rounded-md bg-muted/30">
                <p className="text-center text-muted-foreground mb-4">
                  In a real application, this would be an interactive taxonomic tree visualization. For this example,
                  we're showing a simplified representation.
                </p>

                <div className="flex flex-col items-center">
                  <div className="bg-card px-6 py-3 rounded-md border shadow-sm font-medium">Kingdom: Fungi</div>
                  <div className="h-6 w-0.5 bg-muted-foreground/30" />

                  <div className="grid grid-cols-2 gap-x-12 gap-y-2">
                    <div className="flex flex-col items-center">
                      <div className="bg-card px-4 py-2 rounded-md border shadow-sm">Phylum: Basidiomycota</div>
                      <div className="h-6 w-0.5 bg-muted-foreground/30" />
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                        <div className="flex flex-col items-center">
                          <div className="bg-card px-3 py-1 rounded-md border shadow-sm text-sm">Agaricales</div>
                          <div className="h-4 w-0.5 bg-muted-foreground/30" />
                          <div className="bg-emerald-100 px-2 py-1 rounded-md border shadow-sm text-xs">
                            Amanitaceae
                          </div>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="bg-card px-3 py-1 rounded-md border shadow-sm text-sm">Boletales</div>
                          <div className="h-4 w-0.5 bg-muted-foreground/30" />
                          <div className="bg-emerald-100 px-2 py-1 rounded-md border shadow-sm text-xs">Boletaceae</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="bg-card px-4 py-2 rounded-md border shadow-sm">Phylum: Ascomycota</div>
                      <div className="h-6 w-0.5 bg-muted-foreground/30" />
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                        <div className="flex flex-col items-center">
                          <div className="bg-card px-3 py-1 rounded-md border shadow-sm text-sm">Pezizales</div>
                          <div className="h-4 w-0.5 bg-muted-foreground/30" />
                          <div className="bg-emerald-100 px-2 py-1 rounded-md border shadow-sm text-xs">
                            Morchellaceae
                          </div>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="bg-card px-3 py-1 rounded-md border shadow-sm text-sm">Helotiales</div>
                          <div className="h-4 w-0.5 bg-muted-foreground/30" />
                          <div className="bg-emerald-100 px-2 py-1 rounded-md border shadow-sm text-xs">
                            Sclerotiniaceae
                          </div>
                        </div>
                      </div>
                    </div>
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
