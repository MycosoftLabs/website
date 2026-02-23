"use client"

/**
 * GeneticsCard - Feb 2026
 * 
 * Compact mobile card displaying genetic sequence information.
 */

import { useState } from "react"
import { Dna, Bookmark, ChevronDown, ExternalLink, Copy, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface GeneticsCardProps {
  data: Record<string, unknown>
  onSave?: () => void
}

export function GeneticsCard({ data, onSave }: GeneticsCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const name = (data.name || data.organism || "Unknown Sequence") as string
  const accession = data.accessionNumber as string | undefined
  const sequenceType = (data.sequenceType || data.marker) as string | undefined
  const sequence = data.sequence as string | undefined
  const length = data.sequenceLength as number | undefined
  const source = data.source as string | undefined
  const id = data.id as string | undefined

  const handleCopy = async () => {
    if (sequence) {
      await navigator.clipboard.writeText(sequence)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Format sequence for display
  const formatSequence = (seq: string) => {
    if (!seq) return ""
    const displayLength = 60
    if (seq.length <= displayLength) return seq
    return seq.slice(0, displayLength) + "..."
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex gap-3 p-3">
        <div className="h-12 w-12 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
          <Dna className="h-5 w-5 text-cyan-500" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{name}</h3>
          {accession && (
            <p className="text-xs font-mono text-muted-foreground">{accession}</p>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {sequenceType && (
              <Badge variant="outline" className="text-[10px] h-5 uppercase">
                {sequenceType}
              </Badge>
            )}
            {length && (
              <Badge variant="outline" className="text-[10px] h-5">
                {length.toLocaleString()} bp
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
          {source && (
            <div className="text-xs pt-2">
              <span className="text-muted-foreground">Source: </span>
              <span>{source}</span>
            </div>
          )}

          {sequence && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Sequence:</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 mr-1 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <div className="p-2 rounded bg-gray-100 dark:bg-gray-800/60 overflow-x-auto">
                <code className="text-[10px] font-mono text-gray-700 dark:text-gray-300 break-all whitespace-pre-wrap">
                  {formatSequence(sequence)}
                </code>
              </div>
            </div>
          )}

          {accession && (
            <a
              href={`https://www.ncbi.nlm.nih.gov/nuccore/${accession}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline pt-1"
            >
              View on NCBI GenBank
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}
    </div>
  )
}
