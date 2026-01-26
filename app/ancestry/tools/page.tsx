import { DNASequencingSearch } from "@/components/ancestry/dna-sequencing-search"
import { BiologicalTools } from "@/components/ancestry/biological-tools"
import { ITSLookupTool } from "@/components/ancestry/its-lookup"
import { PhylogeneticTreeTool } from "@/components/ancestry/phylogenetic-tree-tool"
import { SequenceAlignmentTool } from "@/components/ancestry/sequence-alignment-tool"
import { GenomeAnnotationTool } from "@/components/ancestry/genome-annotation-tool"
import { InteractionPredictionTool } from "@/components/ancestry/interaction-prediction-tool"
import { ToolContainer } from "@/components/ancestry/tool-container"
import { DNAVisualizerTool } from "@/components/ancestry/dna-visualizer-tool"
import { 
  JBrowseViewerLazy, 
  CircosViewerLazy, 
  GenomeTrackViewerLazy 
} from "@/components/mindex/lazy-viewers"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dna, Layers, CircleDot, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function AncestryToolsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Ancestry Tools</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Explore our suite of tools for analyzing and visualizing fungal ancestry data.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* DNA Analysis Tools */}
        <ToolContainer title="DNA Sequencing Search" description="Identify species by DNA sequence.">
          <DNASequencingSearch />
        </ToolContainer>

        {/* Base Tools */}
        <ToolContainer title="Base Tools" description="Commonly used biological tools.">
          <BiologicalTools />
        </ToolContainer>

        {/* ITS Lookup Tool */}
        <ToolContainer title="ITS Lookup Tool" description="Find species by ITS code.">
          <ITSLookupTool />
        </ToolContainer>

        {/* Phylogenetic Tree Tool */}
        <ToolContainer
          title="Phylogenetic Tree Visualization"
          description="Visualize evolutionary relationships."
          popupLink="/ancestry/phylogeny"
        >
          <PhylogeneticTreeTool />
        </ToolContainer>

        {/* Sequence Alignment Tool */}
        <ToolContainer title="Sequence Alignment Tool" description="Align DNA sequences to identify similarities.">
          <SequenceAlignmentTool />
        </ToolContainer>

        {/* Genome Annotation Tool */}
        <ToolContainer
          title="Genome Annotation Tool"
          description="Annotate fungal genomes with functional information."
        >
          <GenomeAnnotationTool />
        </ToolContainer>

        {/* Interaction Prediction Tool */}
        <ToolContainer title="Interaction Prediction Tool" description="Predict interactions between fungal species.">
          <InteractionPredictionTool />
        </ToolContainer>

        {/* DNA Visualizer Tool */}
        <div className="col-span-1 md:col-span-2">
          <ToolContainer title="DNA Visualizer" description="Visualize DNA sequences.">
            <DNAVisualizerTool />
          </ToolContainer>
        </div>
      </div>
      {/* Advanced Genomics Visualization Section */}
      <section id="genomics" className="mt-12 scroll-mt-20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Dna className="h-6 w-6 text-green-500" />
              </div>
              Advanced Genomics Visualization
            </h2>
            <p className="text-muted-foreground mt-2">
              Interactive genome browsers and circular visualization tools powered by industry-standard libraries
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline">JBrowse2</Badge>
            <Badge variant="outline">Gosling.js</Badge>
            <Badge variant="outline">pyCirclize</Badge>
          </div>
        </div>

        {/* JBrowse2 Genome Browser - Full Width */}
        <Card className="mb-6 border-green-500/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Layers className="h-5 w-5 text-indigo-500" />
                <div>
                  <CardTitle>Genome Browser</CardTitle>
                  <CardDescription>Navigate chromosomes, genes, and variants</CardDescription>
                </div>
              </div>
              <Link 
                href="/natureos/mindex" 
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                Open in MINDEX <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <JBrowseViewerLazy />
          </CardContent>
        </Card>

        {/* Side by Side: Genome Tracks and Circos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="border-green-500/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Dna className="h-5 w-5 text-green-500" />
                <div>
                  <CardTitle>Genome Track Viewer</CardTitle>
                  <CardDescription>Multi-track gene visualization</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <GenomeTrackViewerLazy />
            </CardContent>
          </Card>

          <Card className="border-purple-500/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <CircleDot className="h-5 w-5 text-purple-500" />
                <div>
                  <CardTitle>Circos Visualization</CardTitle>
                  <CardDescription>Circular genome and pathway plots</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CircosViewerLazy plotType="phylogeny" />
            </CardContent>
          </Card>
        </div>

        {/* Quick links to related pages */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/natureos/mindex/explorer" className="block">
            <Card className="hover:border-cyan-500/40 transition-colors cursor-pointer">
              <CardContent className="pt-4">
                <h3 className="font-semibold">Species Explorer</h3>
                <p className="text-sm text-muted-foreground">Spatial observation mapping</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/natureos/ai-studio/explainer" className="block">
            <Card className="hover:border-purple-500/40 transition-colors cursor-pointer">
              <CardContent className="pt-4">
                <h3 className="font-semibold">AI Explainer</h3>
                <p className="text-sm text-muted-foreground">Understand MYCA AI</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/ancestry/phylogeny" className="block">
            <Card className="hover:border-green-500/40 transition-colors cursor-pointer">
              <CardContent className="pt-4">
                <h3 className="font-semibold">Phylogenetic Tree</h3>
                <p className="text-sm text-muted-foreground">3D evolutionary visualization</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Tool Resources</h2>
        <p className="text-muted-foreground">
          The following tools could not be added logically to the page, but are listed here for reference:
        </p>
        <ul className="list-disc list-inside text-muted-foreground">
          <li>
            <a
              href="https://www.mathworks.com/products/matlab.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:underline"
            >
              Matlab
            </a>
          </li>
          <li>
            <a
              href="https://www.snapgene.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:underline"
            >
              SnapGene
            </a>
          </li>
          <li>
            <a
              href="https://www.geneious.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:underline"
            >
              Geneious
            </a>
          </li>
          <li>
            <a
              href="https://www.benchling.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:underline"
            >
              Benchling
            </a>
          </li>
          <li>
            <a
              href="https://pymol.org/2/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:underline"
            >
              PyMOL
            </a>
          </li>
          <li>
            <a
              href="https://www.openrasmol.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:underline"
            >
              RasMol
            </a>
          </li>
          <li>
            <a
              href="https://salilab.org/modeller/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:underline"
            >
              MODERLLER
            </a>
          </li>
          <li>
            <a
              href="http://www.gromacs.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:underline"
            >
              Gromacs
            </a>
          </li>
        </ul>
      </div>
    </div>
  )
}
