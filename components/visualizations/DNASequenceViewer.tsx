/**
 * DNASequenceViewer - Feb 2026
 *
 * Pure-React/SVG visualization of a nucleotide sequence.
 * No external libraries required.
 *
 * Features:
 *   - Color-coded nucleotide bar strip (A=green, T=red, G=blue, C=yellow)
 *   - Base composition stats (A/T/G/C % + GC%)
 *   - Sequence text (monospace, color-coded, scrollable)
 *   - Compact mode for widget list cards (just the color bar)
 *   - Full mode for detail views (bar + stats + sequence text)
 *
 * Base colors (bioinformatics convention):
 *   A = #22c55e  (green)
 *   T = #ef4444  (red)
 *   G = #3b82f6  (blue)
 *   C = #f59e0b  (amber)
 *   N/other = #6b7280 (gray)
 */

"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronUp, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

// ── Color map ─────────────────────────────────────────────────────────────────
export const BASE_COLOR: Record<string, string> = {
  A: "#22c55e",
  T: "#ef4444",
  G: "#3b82f6",
  C: "#f59e0b",
  U: "#ef4444", // RNA uracil = same as T
}

function baseColor(b: string): string {
  return BASE_COLOR[b.toUpperCase()] ?? "#6b7280"
}

// ── Composition stats ─────────────────────────────────────────────────────────
interface BaseStats {
  A: number; T: number; G: number; C: number; GC: number; total: number
}

function calcStats(seq: string): BaseStats {
  const s = seq.toUpperCase()
  const total = s.replace(/[^ATGCUN]/g, "").length || 1
  const A = (s.match(/A/g) || []).length
  const T = (s.match(/[TU]/g) || []).length
  const G = (s.match(/G/g) || []).length
  const C = (s.match(/C/g) || []).length
  const GC = Math.round(((G + C) / total) * 100)
  return { A, T, G, C, GC, total }
}

// ── Compact color-bar (for widget list cards) ──────────────────────────────────
export function DNAColorBar({
  sequence,
  maxBases = 120,
  height = 8,
  className,
}: {
  sequence: string
  maxBases?: number
  height?: number
  className?: string
}) {
  const bases = sequence.slice(0, maxBases).toUpperCase().split("")
  if (!bases.length) return null

  const barW = 100 / bases.length

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      className={cn("rounded overflow-hidden", className)}
      role="img"
      aria-label="Nucleotide sequence color map"
    >
      {bases.map((b, i) => (
        <rect
          key={i}
          x={i * barW}
          y={0}
          width={barW + 0.1} // slight overlap to avoid gaps
          height={height}
          fill={baseColor(b)}
          opacity={0.85}
        />
      ))}
    </svg>
  )
}

// ── Composition bar chart ─────────────────────────────────────────────────────
function CompositionBar({ label, count, total, color }: {
  label: string; count: number; total: number; color: string
}) {
  const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0"
  const w = total > 0 ? (count / total) * 100 : 0
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="w-4 font-mono font-bold text-[11px]" style={{ color }}>{label}</span>
      <div className="flex-1 h-2 bg-muted/40 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${w}%`, backgroundColor: color }} />
      </div>
      <span className="w-10 text-right text-muted-foreground tabular-nums text-[10px]">{pct}%</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
interface DNASequenceViewerProps {
  sequence: string
  /** Only show color bar + stats, no sequence text */
  compact?: boolean
  /** Max bases to color in the bar strip */
  maxBarBases?: number
  /** Max chars shown in text preview before "show more" */
  textPreview?: number
  className?: string
}

export function DNASequenceViewer({
  sequence,
  compact = false,
  maxBarBases = 200,
  textPreview = 300,
  className,
}: DNASequenceViewerProps) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const clean = useMemo(() => sequence.replace(/\s/g, "").toUpperCase(), [sequence])
  const stats = useMemo(() => calcStats(clean), [clean])

  const displaySeq = expanded ? clean : clean.slice(0, textPreview)
  const isTruncated = clean.length > textPreview && !expanded

  const copy = () => {
    navigator.clipboard.writeText(clean).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (!clean.length) return null

  return (
    <div className={cn("space-y-2", className)}>
      {/* Color bar strip */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
            Sequence map  <span className="text-muted-foreground/60 ml-1">{clean.length.toLocaleString()} bp</span>
          </span>
          {!compact && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-sm bg-blue-500" />GC {stats.GC}%
              </span>
            </div>
          )}
        </div>
        <DNAColorBar sequence={clean} maxBases={maxBarBases} height={compact ? 6 : 10} />
      </div>

      {/* Base composition */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        <CompositionBar label="A" count={stats.A} total={stats.total} color={BASE_COLOR.A} />
        <CompositionBar label="T" count={stats.T} total={stats.total} color={BASE_COLOR.T} />
        <CompositionBar label="G" count={stats.G} total={stats.total} color={BASE_COLOR.G} />
        <CompositionBar label="C" count={stats.C} total={stats.total} color={BASE_COLOR.C} />
      </div>

      {/* GC badge */}
      <div className="flex items-center gap-2">
        <div className="text-[10px] rounded-full px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 tabular-nums font-medium">
          GC {stats.GC}%
        </div>
        <div className="text-[10px] text-muted-foreground">
          {stats.total.toLocaleString()} bases
        </div>
        {!compact && (
          <Button variant="ghost" size="sm" className="h-5 px-2 text-[10px] ml-auto" onClick={copy}>
            {copied ? <><Check className="h-3 w-3 mr-1 text-green-400" />Copied</> : <><Copy className="h-3 w-3 mr-1" />Copy</>}
          </Button>
        )}
      </div>

      {/* Sequence text (full mode only) */}
      {!compact && (
        <div className="space-y-1">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Sequence</span>
          <div className="relative">
            <pre className="text-[10px] font-mono leading-relaxed bg-gray-100 dark:bg-gray-800/60 border border-gray-200 dark:border-white/10 rounded-lg p-3 overflow-y-auto max-h-36 break-all whitespace-pre-wrap w-full select-all">
              {displaySeq.split("").map((b, i) => (
                <span key={i} style={{ color: baseColor(b) }}>{b}</span>
              ))}
              {isTruncated && <span className="text-gray-600 dark:text-gray-400">…</span>}
            </pre>
          </div>
          {clean.length > textPreview && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] w-full"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded
                ? <><ChevronUp className="h-3 w-3 mr-1" />Collapse</>
                : <><ChevronDown className="h-3 w-3 mr-1" />Show full {clean.length.toLocaleString()} bp</>
              }
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// ── DNA double helix SVG animation (decorative, for page headers) ─────────────
export function DNAHelixBanner({ className }: { className?: string }) {
  const turns = 3
  const points = 60
  const W = 300
  const H = 80

  // Generate helix paths
  const strand1: string[] = []
  const strand2: string[] = []
  const rungs: { x: number; y1: number; y2: number }[] = []

  for (let i = 0; i <= points; i++) {
    const t = (i / points) * turns * 2 * Math.PI
    const x = (i / points) * W
    const y1 = H / 2 + Math.sin(t) * (H / 2 - 6)
    const y2 = H / 2 + Math.sin(t + Math.PI) * (H / 2 - 6)
    strand1.push(`${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y1.toFixed(1)}`)
    strand2.push(`${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y2.toFixed(1)}`)
    if (i % 5 === 0) rungs.push({ x, y1, y2 })
  }

  const bases = ["A", "T", "G", "C"]
  const rungColors = rungs.map((_, i) => BASE_COLOR[bases[i % 4]])

  return (
    <div className={cn("overflow-hidden select-none pointer-events-none", className)}>
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        className="opacity-60"
      >
        {/* Rungs (base pairs) */}
        {rungs.map((r, i) => (
          <line
            key={i}
            x1={r.x}
            y1={r.y1}
            x2={r.x}
            y2={r.y2}
            stroke={rungColors[i]}
            strokeWidth={2}
            opacity={0.7}
          />
        ))}
        {/* Backbone strands */}
        <path d={strand1.join(" ")} stroke="#22c55e" strokeWidth={2.5} fill="none" strokeLinecap="round" />
        <path d={strand2.join(" ")} stroke="#3b82f6" strokeWidth={2.5} fill="none" strokeLinecap="round" />
        {/* Node dots */}
        {rungs.map((r, i) => (
          <g key={`dot-${i}`}>
            <circle cx={r.x} cy={r.y1} r={3} fill={rungColors[i]} opacity={0.9} />
            <circle cx={r.x} cy={r.y2} r={3} fill={rungColors[(i + 2) % 4]} opacity={0.9} />
          </g>
        ))}
      </svg>
    </div>
  )
}

export default DNASequenceViewer
