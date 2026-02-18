/**
 * MoleculeViewer - Feb 2026
 *
 * Renders a 2D structural diagram of a chemical compound using the PubChem
 * image API. No additional npm packages required — PubChem returns a PNG via
 * a simple URL fetch.
 *
 * Priority:
 *   1. PubChem CID              → /compound/cid/{cid}/PNG
 *   2. Compound name (string)   → /compound/name/{name}/PNG
 *   3. SMILES string            → /compound/smiles/{smiles}/PNG
 *
 * The image is light-themed (white background) from PubChem, so we invert it
 * in dark mode using CSS filter.
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { Atom, AlertCircle, Loader2, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Size presets ──────────────────────────────────────────────────────────────
const SIZE = {
  xs: { px: 80,  cls: "w-20 h-20" },
  sm: { px: 120, cls: "w-[120px] h-[120px]" },
  md: { px: 200, cls: "w-[200px] h-[200px]" },
  lg: { px: 300, cls: "w-[300px] h-[300px]" },
  full: { px: 400, cls: "w-full aspect-square" },
} as const

export type MoleculeViewerSize = keyof typeof SIZE

interface MoleculeViewerProps {
  /** Compound name — searched against PubChem */
  name?: string
  /** PubChem CID (fastest) */
  cid?: number | string
  /** SMILES string */
  smiles?: string
  size?: MoleculeViewerSize
  /** Show a link to PubChem under the image */
  showLink?: boolean
  className?: string
}

const PUBCHEM = "https://pubchem.ncbi.nlm.nih.gov/rest/pug"

function buildUrl(props: MoleculeViewerProps): string | null {
  const px = SIZE[props.size ?? "md"].px
  const imgParam = `?image_size=${px}x${px}`

  if (props.cid) {
    return `${PUBCHEM}/compound/cid/${props.cid}/PNG${imgParam}`
  }
  if (props.name) {
    return `${PUBCHEM}/compound/name/${encodeURIComponent(props.name)}/PNG${imgParam}`
  }
  if (props.smiles) {
    return `${PUBCHEM}/compound/smiles/${encodeURIComponent(props.smiles)}/PNG${imgParam}`
  }
  return null
}

function buildPubchemLink(props: MoleculeViewerProps): string | null {
  if (props.cid) return `https://pubchem.ncbi.nlm.nih.gov/compound/${props.cid}`
  if (props.name) return `https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(props.name)}`
  return null
}

export function MoleculeViewer({
  name,
  cid,
  smiles,
  size = "md",
  showLink = false,
  className,
}: MoleculeViewerProps) {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading")
  const { cls } = SIZE[size]

  const url = buildUrl({ name, cid, smiles, size })
  const link = buildPubchemLink({ name, cid })

  useEffect(() => {
    if (!url) { setStatus("error"); return }
    setStatus("loading")
  }, [url])

  const onLoad = useCallback(() => setStatus("ok"), [])
  const onError = useCallback(() => setStatus("error"), [])

  if (!url) {
    return (
      <div className={cn("flex items-center justify-center bg-muted/30 rounded-xl border border-border/20", cls, className)}>
        <Atom className="h-8 w-8 text-muted-foreground/30" />
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col items-center gap-1.5", className)}>
      <div className={cn("relative rounded-xl overflow-hidden border-2 border-border/30 bg-white flex items-center justify-center shrink-0 shadow-sm", cls)}>
        {/* Loading overlay */}
        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/40 z-10">
            <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
          </div>
        )}
        {/* Error state */}
        {status === "error" && (
          <div className="flex flex-col items-center gap-1 p-3 text-center">
            <AlertCircle className="h-6 w-6 text-muted-foreground/50" />
            <p className="text-[9px] text-muted-foreground/60 leading-tight">Structure unavailable</p>
          </div>
        )}
        {/* Molecule image — PubChem returns a clean vector-like PNG on white.
            We intentionally keep the white background so the structure is always crisp.
            No dark-mode inversion — chemical diagrams look best on white. */}
        <img
          src={url}
          alt={name ?? "Molecular structure"}
          className={cn(
            "w-full h-full object-contain p-2",
            status === "error" && "hidden"
          )}
          onLoad={onLoad}
          onError={onError}
          loading="lazy"
          crossOrigin="anonymous"
        />
      </div>
      {showLink && link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-purple-400 transition-colors"
        >
          <ExternalLink className="h-2.5 w-2.5" />
          View on PubChem
        </a>
      )}
    </div>
  )
}

export default MoleculeViewer
