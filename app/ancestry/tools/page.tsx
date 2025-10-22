import { DNASequencingSearch } from "@/components/ancestry/dna-sequencing-search"
import { BiologicalTools } from "@/components/ancestry/biological-tools"
import { ITSLookupTool } from "@/components/ancestry/its-lookup"
import { PhylogeneticTreeTool } from "@/components/ancestry/phylogenetic-tree-tool"
import { SequenceAlignmentTool } from "@/components/ancestry/sequence-alignment-tool"
import { GenomeAnnotationTool } from "@/components/ancestry/genome-annotation-tool"
import { InteractionPredictionTool } from "@/components/ancestry/interaction-prediction-tool"
import { ToolContainer } from "@/components/ancestry/tool-container"
import { DNAVisualizerTool } from "@/components/ancestry/dna-visualizer-tool"

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
