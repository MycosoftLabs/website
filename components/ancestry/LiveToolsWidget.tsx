"use client"

/**
 * Live Tools Widget - Context-aware tools panel
 * Genetics: NCBI BLAST, GenBank, sequence analysis
 * Chemistry: PubChem, ChEMBL, compound tools
 * Taxonomy: GBIF, iNaturalist, MycoBank with MINDEX source
 */

import Link from "next/link"
import { ExternalLink, Dna, FlaskConical, TreeDeciduous } from "lucide-react"
import { cn } from "@/lib/utils"

export type LiveToolsMode = "genetics" | "chemistry" | "taxonomy"

interface ToolLink {
  label: string
  href: string
  description?: string
  icon?: React.ReactNode
}

interface LiveToolsWidgetProps {
  mode: LiveToolsMode
  speciesName?: string
  /** Optional query for external tools */
  query?: string
  className?: string
}

const TOOLS: Record<LiveToolsMode, (speciesName: string, query: string) => ToolLink[]> = {
  genetics: (speciesName, query) => {
    const q = encodeURIComponent(query || speciesName || "fungus")
    return [
      {
        label: "NCBI BLAST",
        href: `https://blast.ncbi.nlm.nih.gov/Blast.cgi?PROGRAM=blastn&PAGE_TYPE=BlastSearch&BLAST_SPEC=blast2seq&QUERY=${q}`,
        description: "Sequence alignment search",
      },
      {
        label: "GenBank",
        href: `https://www.ncbi.nlm.nih.gov/nucleotide/?term=${q}`,
        description: "View nucleotide sequences",
      },
      {
        label: "UNITE",
        href: `https://unite.ut.ee/search.php?q=${q}`,
        description: "Fungal ITS barcode database",
      },
    ]
  },
  chemistry: (speciesName, query) => {
    const q = encodeURIComponent(query || speciesName || "fungus")
    return [
      {
        label: "PubChem",
        href: `https://pubchem.ncbi.nlm.nih.gov/#query=${q}`,
        description: "Compound database",
      },
      {
        label: "ChEMBL",
        href: `https://www.ebi.ac.uk/chembl/g/#search_results/all/query=${q}`,
        description: "Bioactive compounds",
      },
      {
        label: "ChemSpider",
        href: `http://www.chemspider.com/Search.aspx?q=${q}`,
        description: "Chemical structure search",
      },
    ]
  },
  taxonomy: (speciesName) => {
    const q = encodeURIComponent(speciesName || "fungus")
    return [
      {
        label: "GBIF",
        href: `https://www.gbif.org/species/search?q=${q}`,
        description: "Global Biodiversity Information Facility",
      },
      {
        label: "iNaturalist",
        href: `https://www.inaturalist.org/search?q=${q}`,
        description: "Citizen science observations",
      },
      {
        label: "MycoBank",
        href: `https://www.mycobank.org/page/Name%20search%20page?NameSearchText=${q}`,
        description: "Fungal nomenclature",
      },
    ]
  },
}

const MODE_ICON: Record<LiveToolsMode, React.ReactNode> = {
  genetics: <Dna className="h-4 w-4 text-blue-600" />,
  chemistry: <FlaskConical className="h-4 w-4 text-purple-600" />,
  taxonomy: <TreeDeciduous className="h-4 w-4 text-green-600" />,
}

const MODE_LABEL: Record<LiveToolsMode, string> = {
  genetics: "Genetics Tools",
  chemistry: "Chemistry Tools",
  taxonomy: "Taxonomy Tools",
}

export function LiveToolsWidget({
  mode,
  speciesName = "",
  query,
  className,
}: LiveToolsWidgetProps) {
  const tools = TOOLS[mode](speciesName, query || speciesName)

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4",
        className
      )}
    >
      <h3 className="font-semibold mb-3 flex items-center gap-2 text-foreground">
        {MODE_ICON[mode]}
        {MODE_LABEL[mode]}
      </h3>
      <p className="text-xs text-muted-foreground mb-3">
        External resources for {speciesName || "this species"}
      </p>
      <div className="space-y-2">
        {tools.map((tool) => (
          <a
            key={tool.label}
            href={tool.href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center justify-between gap-2 p-2 rounded-md",
              "hover:bg-muted transition-colors min-h-[44px]",
              "text-sm"
            )}
          >
            <span className="font-medium">{tool.label}</span>
            <ExternalLink className="h-3.5 w-3 shrink-0 text-muted-foreground" />
          </a>
        ))}
      </div>
    </div>
  )
}
