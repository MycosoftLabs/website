"use client"

/**
 * ChemistryCard - Feb 2026
 * 
 * Compact mobile card displaying chemical compound information.
 */

import { useState } from "react"
import { FlaskConical, Bookmark, ChevronDown, ExternalLink, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ChemistryCardProps {
  data: Record<string, unknown>
  onSave?: () => void
}

export function ChemistryCard({ data, onSave }: ChemistryCardProps) {
  const [expanded, setExpanded] = useState(false)

  const name = (data.name || data.compoundName || "Unknown Compound") as string
  const formula = data.molecularFormula as string | undefined
  const weight = data.molecularWeight as number | undefined
  const smiles = data.smiles as string | undefined
  const bioactivity = data.bioactivity as string | undefined
  const toxicity = data.toxicity as string | undefined
  const sources = data.fungalSources as string[] | undefined
  const id = data.id as string | undefined

  const isPsychoactive = name.toLowerCase().includes("psilocybin") || 
                         name.toLowerCase().includes("psilocin") ||
                         bioactivity?.toLowerCase().includes("psycho")

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex gap-3 p-3">
        <div className={cn(
          "h-12 w-12 rounded-lg flex items-center justify-center shrink-0",
          isPsychoactive ? "bg-purple-500/10" : "bg-blue-500/10"
        )}>
          <FlaskConical className={cn(
            "h-5 w-5",
            isPsychoactive ? "text-purple-500" : "text-blue-500"
          )} />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{name}</h3>
          {formula && (
            <p className="text-xs font-mono text-muted-foreground">{formula}</p>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {weight && (
              <Badge variant="outline" className="text-[10px] h-5">
                {weight.toFixed(2)} g/mol
              </Badge>
            )}
            {toxicity && (
              <Badge 
                variant="outline" 
                className={cn(
                  "text-[10px] h-5",
                  toxicity.toLowerCase().includes("toxic") && "bg-red-500/10 text-red-500 border-red-500/20"
                )}
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                {toxicity}
              </Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onSave}
          >
            <Bookmark className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setExpanded(!expanded)}
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
          </Button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 pb-3 pt-0 space-y-2 border-t">
          {bioactivity && (
            <div className="text-xs pt-2">
              <span className="text-muted-foreground">Bioactivity: </span>
              <span>{bioactivity}</span>
            </div>
          )}

          {smiles && (
            <div className="text-xs">
              <span className="text-muted-foreground">SMILES: </span>
              <code className="text-[10px] bg-muted px-1 py-0.5 rounded break-all">
                {smiles.length > 50 ? smiles.slice(0, 50) + "..." : smiles}
              </code>
            </div>
          )}

          {sources && sources.length > 0 && (
            <div className="text-xs">
              <span className="text-muted-foreground">Found in: </span>
              <span className="italic">{sources.slice(0, 3).join(", ")}</span>
            </div>
          )}

          {id && (
            <a
              href={`https://pubchem.ncbi.nlm.nih.gov/compound/${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline pt-1"
            >
              View on PubChem
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}
    </div>
  )
}
