"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import PhylogenyVisualization from "./3d-visualization"
import { PhylogeneticTree } from "@/components/ancestry/phylogenetic-tree"

export default function PhylogenyPage() {
  const [treeType, setTreeType] = useState<"cladogram" | "phylogram" | "radial" | "unrooted">("cladogram")
  const [taxonomicLevel, setTaxonomicLevel] = useState("order")
  const [dataSource, setDataSource] = useState("its")
  const [selectedTree, setSelectedTree] = useState("agaricales")
  const [visualizationMode, setVisualizationMode] = useState<"d3" | "3d">("d3")

  // Map tree names to root species IDs (mock data)
  const treeRootMap: Record<string, number> = {
    agaricales: 1,
    boletales: 2,
    polyporales: 3,
    russulales: 4,
    medicinal: 5,
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Phylogenetic Trees</h1>
          <p className="text-lg text-foreground/70 mt-2">
            Explore the evolutionary relationships between fungal species through interactive phylogenetic trees.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={visualizationMode === "d3" ? "bg-green-500/10 text-green-400 border-green-500/30" : ""}>
            D3 Tree
          </Badge>
          <Badge variant="outline" className={visualizationMode === "3d" ? "bg-blue-500/10 text-blue-400 border-blue-500/30" : ""}>
            3D View
          </Badge>
        </div>
      </div>

      {/* D3 Phylogenetic Tree - Full Width */}
      <section className="mb-12">
        <PhylogeneticTree 
          height={650}
          showControls={true}
          showLegend={true}
          treeType="radial"
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Tree Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Tree Type</label>
                <Select value={treeType} onValueChange={setTreeType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tree type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cladogram">Cladogram</SelectItem>
                    <SelectItem value="phylogram">Phylogram</SelectItem>
                    <SelectItem value="radial">Radial Tree</SelectItem>
                    <SelectItem value="unrooted">Unrooted Tree</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Taxonomic Level</label>
                <Select value={taxonomicLevel} onValueChange={setTaxonomicLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select taxonomic level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phylum">Phylum</SelectItem>
                    <SelectItem value="class">Class</SelectItem>
                    <SelectItem value="order">Order</SelectItem>
                    <SelectItem value="family">Family</SelectItem>
                    <SelectItem value="genus">Genus</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Data Source</label>
                <Select value={dataSource} onValueChange={setDataSource}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select data source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="its">ITS Region</SelectItem>
                    <SelectItem value="lsu">LSU rDNA</SelectItem>
                    <SelectItem value="rpb2">RPB2 Gene</SelectItem>
                    <SelectItem value="tef1">TEF1 Gene</SelectItem>
                    <SelectItem value="combined">Combined Data</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4 border-t dark:border-gray-800">
                <h3 className="text-sm font-medium mb-2 text-foreground">Featured Trees</h3>
                <ul className="space-y-2 text-sm">
                  {[
                    { id: "agaricales", name: "Agaricales" },
                    { id: "boletales", name: "Boletales" },
                    { id: "polyporales", name: "Polyporales" },
                    { id: "russulales", name: "Russulales" },
                    { id: "medicinal", name: "Medicinal Fungi" },
                  ].map((tree) => (
                    <li key={tree.id}>
                      <button
                        className={`text-green-600 hover:underline ${selectedTree === tree.id ? "font-medium" : ""}`}
                        onClick={() => setSelectedTree(tree.id)}
                      >
                        {tree.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Tabs defaultValue="tree">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-foreground">
                {selectedTree.charAt(0).toUpperCase() + selectedTree.slice(1)} Phylogeny
              </h2>
              <TabsList>
                <TabsTrigger value="tree">Tree</TabsTrigger>
                <TabsTrigger value="data">Data</TabsTrigger>
                <TabsTrigger value="info">Info</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="tree">
              <Card>
                <CardContent className="p-6">
                  {treeRootMap && treeRootMap[selectedTree] ? (
                    <PhylogenyVisualization rootSpeciesId={treeRootMap[selectedTree]} />
                  ) : (
                    <p className="text-muted-foreground">No visualization available for this tree.</p>
                  )}
                  <div className="flex justify-end gap-2 mt-4">
                    <button className="text-sm text-foreground/70 hover:text-foreground flex items-center gap-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      Download
                    </button>
                    <button className="text-sm text-foreground/70 hover:text-foreground flex items-center gap-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="18" cy="5" r="3"></circle>
                        <circle cx="6" cy="12" r="3"></circle>
                        <circle cx="18" cy="19" r="3"></circle>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                      </svg>
                      Share
                    </button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="data">
              <Card>
                <CardContent className="p-6">
                  <div className="border rounded-lg overflow-hidden dark:border-gray-800">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-foreground/70">Species</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-foreground/70">Family</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-foreground/70">
                            Genetic Distance
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-foreground/70">
                            Bootstrap Value
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-gray-800">
                        {[
                          { species: "Agaricus bisporus", family: "Agaricaceae", distance: "0.0124", bootstrap: "98%" },
                          { species: "Lepiota cristata", family: "Agaricaceae", distance: "0.0156", bootstrap: "95%" },
                          { species: "Coprinus comatus", family: "Agaricaceae", distance: "0.0189", bootstrap: "92%" },
                          { species: "Amanita muscaria", family: "Amanitaceae", distance: "0.0278", bootstrap: "99%" },
                          {
                            species: "Amanita phalloides",
                            family: "Amanitaceae",
                            distance: "0.0285",
                            bootstrap: "97%",
                          },
                        ].map((item, i) => (
                          <tr key={i} className="hover:bg-muted/50">
                            <td className="px-4 py-3 text-sm font-medium text-foreground">{item.species}</td>
                            <td className="px-4 py-3 text-sm text-foreground/70">{item.family}</td>
                            <td className="px-4 py-3 text-sm text-foreground/70">{item.distance}</td>
                            <td className="px-4 py-3 text-sm text-foreground/70">{item.bootstrap}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="info">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-medium mb-4 text-foreground">About This Phylogeny</h3>
                  <p className="text-foreground/70 mb-4">
                    This phylogenetic tree represents the evolutionary relationships within the order{" "}
                    {selectedTree.charAt(0).toUpperCase() + selectedTree.slice(1)}. The tree was constructed using the{" "}
                    {dataSource === "its"
                      ? "Internal Transcribed Spacer (ITS)"
                      : dataSource === "lsu"
                        ? "Large Subunit (LSU)"
                        : dataSource === "rpb2"
                          ? "RNA Polymerase II Second Largest Subunit (RPB2)"
                          : "tef1"
                            ? "Translation Elongation Factor 1-α (TEF1)"
                            : "Combined"}{" "}
                    region of ribosomal DNA.
                  </p>
                  <h4 className="font-medium mt-6 mb-2 text-foreground">Methodology</h4>
                  <p className="text-foreground/70 mb-4">
                    Sequences were aligned using MUSCLE, and the phylogenetic tree was inferred using
                    {treeType === "cladogram"
                      ? " Maximum Parsimony"
                      : treeType === "phylogram"
                        ? " Maximum Likelihood"
                        : treeType === "radial"
                          ? " Neighbor-Joining"
                          : " Bayesian Inference"}{" "}
                    method with the GTR+G+I model of nucleotide substitution. Bootstrap values (based on 1000
                    replicates) are shown next to the branches.
                  </p>
                  <h4 className="font-medium mt-6 mb-2 text-foreground">References</h4>
                  <ul className="list-disc pl-5 text-foreground/70 space-y-2">
                    <li>
                      Smith AB, et al. (2022) Molecular phylogeny of the{" "}
                      {selectedTree.charAt(0).toUpperCase() + selectedTree.slice(1)}. Mycologia 114(5): 1021-1035.
                    </li>
                    <li>
                      Johnson CD, et al. (2021) Evolutionary history of mushroom-forming fungi. Nature Mycology 10:
                      124-137.
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <section className="mt-12">
        <h2 className="text-2xl font-bold mb-6 text-foreground">Related Resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Research Papers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground/70 mb-4">
                Access scientific publications related to fungal phylogenetics and evolutionary biology.
              </p>
              <a href="/ancestry/database" className="text-green-600 hover:underline">
                Browse Papers →
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sequence Database</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground/70 mb-4">
                Search and download DNA sequences used in phylogenetic analyses.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
