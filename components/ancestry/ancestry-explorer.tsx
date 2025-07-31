// components/ancestry/ancestry-explorer.tsx
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToolContainer } from "@/components/ancestry/tool-container"
import { DNASequencingSearch } from "@/components/ancestry/dna-sequencing-search"
import { ITSLookupTool } from "@/components/ancestry/its-lookup"
import { SequenceAlignmentTool } from "@/components/ancestry/sequence-alignment-tool"
import { GenomeAnnotationTool } from "@/components/ancestry/genome-annotation-tool"
import { InteractionPredictionTool } from "@/components/ancestry/interaction-prediction-tool"
import { DNAVisualizerTool } from "@/components/ancestry/dna-visualizer-tool"
import { BiologicalTools } from "@/components/ancestry/biological-tools"
import PhylogenyVisualization from "@/app/ancestry/phylogeny/3d-visualization"
import { SeedTrigger } from "@/components/ancestry/seed-trigger"

export function AncestryExplorer() {
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<number | null>(null)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Fungal Ancestry Explorer Tools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Explore fungal genealogy and relationships using various tools and databases.
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <ToolContainer title="DNA Sequencing Search" description="Search for species by DNA sequence.">
              <DNASequencingSearch />
            </ToolContainer>

            <ToolContainer title="ITS Lookup" description="Lookup species by ITS code.">
              <ITSLookupTool />
            </ToolContainer>

            <ToolContainer title="Sequence Alignment" description="Align DNA sequences to determine similarity.">
              <SequenceAlignmentTool />
            </ToolContainer>

            <ToolContainer title="Genome Annotation" description="Annotate fungal genomes with functional information.">
              <GenomeAnnotationTool />
            </ToolContainer>

            <ToolContainer title="Interaction Prediction" description="Predict interactions between fungal species.">
              <InteractionPredictionTool />
            </ToolContainer>

            <ToolContainer title="DNA Visualizer" description="Visualize DNA sequences.">
              <DNAVisualizerTool />
            </ToolContainer>
            <ToolContainer title="Biological Tools" description="Access commonly used biological tools.">
              <BiologicalTools />
            </ToolContainer>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="tools" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3">
          <TabsTrigger value="tools">Tools</TabsTrigger>
          <TabsTrigger value="phylogeny">Phylogeny</TabsTrigger>
          <TabsTrigger value="admin">Admin</TabsTrigger>
        </TabsList>

        <TabsContent value="tools" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <ToolContainer title="DNA Sequencing Search" description="Search for species by DNA sequence.">
              <DNASequencingSearch />
            </ToolContainer>

            <ToolContainer title="ITS Lookup" description="Lookup species by ITS code.">
              <ITSLookupTool />
            </ToolContainer>

            <ToolContainer title="Sequence Alignment" description="Align DNA sequences to determine similarity.">
              <SequenceAlignmentTool />
            </ToolContainer>

            <ToolContainer title="Genome Annotation" description="Annotate fungal genomes with functional information.">
              <GenomeAnnotationTool />
            </ToolContainer>

            <ToolContainer title="Interaction Prediction" description="Predict interactions between fungal species.">
              <InteractionPredictionTool />
            </ToolContainer>

            <ToolContainer title="DNA Visualizer" description="Visualize DNA sequences.">
              <DNAVisualizerTool />
            </ToolContainer>
            <ToolContainer title="Biological Tools" description="Access commonly used biological tools.">
              <BiologicalTools />
            </ToolContainer>
          </div>
        </TabsContent>

        <TabsContent value="phylogeny" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Phylogenetic Tree Visualization</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Visualize the phylogenetic relationships between fungal species.
                </p>
                <PhylogenyVisualization rootSpeciesId={47170} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="admin" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Admin Tools</CardTitle>
              </CardHeader>
              <CardContent>
                <SeedTrigger />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
