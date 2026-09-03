import Link from "next/link"
import { Suspense } from "react"
import { ArrowLeft, Database, Dna, GitBranch, Network, Search, ShieldCheck, Wrench } from "lucide-react"
import { DNASequencingSearch } from "@/components/ancestry/dna-sequencing-search"
import { AncestryLocusKingdomGuide } from "@/components/ancestry/ancestry-locus-kingdom-guide"
import { BiologicalTools } from "@/components/ancestry/biological-tools"
import { ITSLookupTool } from "@/components/ancestry/its-lookup"
import { PhylogeneticTreeTool } from "@/components/ancestry/phylogenetic-tree-tool"
import { SequenceAlignmentTool } from "@/components/ancestry/sequence-alignment-tool"
import { GenomeAnnotationTool } from "@/components/ancestry/genome-annotation-tool"
import { InteractionPredictionTool } from "@/components/ancestry/interaction-prediction-tool"
import { ToolContainer } from "@/components/ancestry/tool-container"
import { DNAVisualizerTool } from "@/components/ancestry/dna-visualizer-tool"
import styles from "./life-database-tools.module.css"

export function FusariumLifeDatabaseTools() {
  return (
    <main className={styles.page} data-life-database-tools data-fusarium-life-database="tools">
      <header className={styles.header}>
        <div>
          <Link href="/fusarium/life-database" className={styles.back}><ArrowLeft aria-hidden="true" /> Life Database</Link>
          <span className={styles.eyebrow}><Wrench aria-hidden="true" /> FUSARIUM LIFE DATABASE</span>
          <h1>Tools</h1>
          <p>
            Phylogeny, evolution, genetics, sequence, and biological relationship analysis in one evidence-aware
            workspace. Results remain provisional until they trace to a named reference, MINDEX record, or operator-supplied dataset.
          </p>
        </div>
        <nav aria-label="Life Database views">
          <Link href="/fusarium/life-database/explorer"><Search aria-hidden="true" /> Species Explorer</Link>
          <Link href="/fusarium/life-database/database"><Database aria-hidden="true" /> Database</Link>
        </nav>
      </header>

      <section id="phylogeny" className={styles.section} aria-labelledby="phylogeny-tools-title">
        <div className={styles.sectionTitle}>
          <span className={styles.iconWell} data-tone="cyan"><GitBranch aria-hidden="true" /></span>
          <div><span className={styles.eyebrow}>EVOLUTION AND RELATIONSHIPS</span><h2 id="phylogeny-tools-title">Phylogeny</h2><p>Build and inspect lineage relationships without separating the tree viewer from the analysis workspace.</p></div>
          <Link href="/fusarium/life-database/database">Browse source records <Database aria-hidden="true" /></Link>
        </div>
        <div className={styles.singleTool}>
          <ToolContainer title="Phylogenetic Tree Visualization" description="Visualize evidence-backed evolutionary relationships.">
            <PhylogeneticTreeTool />
          </ToolContainer>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="sequence-tools-title">
        <div className={styles.sectionTitle}>
          <span className={styles.iconWell} data-tone="orange"><Dna aria-hidden="true" /></span>
          <div><span className={styles.eyebrow}>GENETICS AND SEQUENCE</span><h2 id="sequence-tools-title">Sequence analysis</h2><p>Kingdom-aware locus selection, identification, alignment, annotation, and visual inspection.</p></div>
        </div>
        <Suspense fallback={<div className={styles.loading}>Loading locus reference…</div>}>
          <AncestryLocusKingdomGuide />
        </Suspense>
        <div className={styles.toolGrid}>
          <ToolContainer title="DNA Sequencing Search" description="Identify candidate taxa by supplied DNA sequence."><DNASequencingSearch /></ToolContainer>
          <ToolContainer title="Locus Lookup" description="Fungi-focused ITS plus kingdom-specific locus guidance."><ITSLookupTool /></ToolContainer>
          <ToolContainer title="Sequence Alignment" description="Align supplied sequences and inspect similarities."><SequenceAlignmentTool /></ToolContainer>
          <ToolContainer title="Genome Annotation" description="Annotate supplied genome evidence with functional context."><GenomeAnnotationTool /></ToolContainer>
          <div className={styles.doubleTool}><ToolContainer title="DNA Visualizer" description="Inspect the supplied sequence visually."><DNAVisualizerTool /></ToolContainer></div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="relationship-tools-title">
        <div className={styles.sectionTitle}>
          <span className={styles.iconWell} data-tone="green"><Network aria-hidden="true" /></span>
          <div><span className={styles.eyebrow}>BIOLOGICAL ANALYSIS</span><h2 id="relationship-tools-title">Relationships and utilities</h2><p>Bounded analysis tools whose outputs must remain linked to their input evidence and method.</p></div>
        </div>
        <div className={styles.toolGrid}>
          <ToolContainer title="Interaction Prediction" description="Evaluate supplied biological interaction hypotheses."><InteractionPredictionTool /></ToolContainer>
          <ToolContainer title="Base Tools" description="Common biological record and sequence utilities."><BiologicalTools /></ToolContainer>
        </div>
      </section>

      <footer className={styles.boundary}>
        <ShieldCheck aria-hidden="true" />
        <span><strong>Analysis boundary</strong><small>Tool output is not an observation, verified identity, operational determination, or authoritative MINDEX record until its provenance and review state are recorded.</small></span>
      </footer>
    </main>
  )
}
