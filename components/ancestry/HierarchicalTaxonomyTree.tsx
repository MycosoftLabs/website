"use client"

/**
 * Hierarchical Taxonomy Tree Viewer
 * Displays collapsible taxonomy hierarchy with click-to-navigate.
 * Data from MINDEX or ancestors API - NO mock data.
 */

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, ChevronRight, TreeDeciduous } from "lucide-react"
import { cn } from "@/lib/utils"

export interface TaxonomyNode {
  id: string | number
  name: string
  rank: string
  commonName?: string | null
  children?: TaxonomyNode[]
}

interface HierarchicalTaxonomyTreeProps {
  /** Flat list of ancestors (kingdom → phylum → ... → genus) plus current species */
  nodes: TaxonomyNode[]
  /** Current species/position to highlight (e.g. scientific name) */
  currentName?: string
  /** Current ID for species link */
  currentId?: string | number
  /** Whether to start expanded */
  defaultExpanded?: boolean
  /** Optional class name */
  className?: string
}

const RANK_ORDER = ["kingdom", "phylum", "class", "order", "family", "genus", "species"] as const
const RANK_LABEL: Record<string, string> = {
  kingdom: "Kingdom",
  phylum: "Phylum",
  class: "Class",
  order: "Order",
  family: "Family",
  genus: "Genus",
  species: "Species",
}
const RANK_COLOR: Record<string, string> = {
  kingdom: "text-violet-400",
  phylum: "text-blue-400",
  class: "text-cyan-400",
  order: "text-teal-400",
  family: "text-green-400",
  genus: "text-lime-400",
  species: "text-emerald-400 font-medium",
}

function getTaxonomyUrl(node: TaxonomyNode, isSpecies: boolean): string {
  const rank = node.rank?.toLowerCase() || "species"
  const name = encodeURIComponent(node.name)
  if (isSpecies && (typeof node.id === "string" && node.id.match(/^[0-9a-f-]{36}$/i))) {
    return `/ancestry/species/${node.id}`
  }
  return `/ancestry/taxonomy/${rank}/${name}`
}

interface TreeNodeProps {
  node: TaxonomyNode
  depth: number
  currentName?: string
  currentId?: string | number
  isLast?: boolean
}

function TreeNode({ node, depth, currentName, currentId, isLast }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true)
  const rank = node.rank?.toLowerCase() || "species"
  const rankLabel = RANK_LABEL[rank] || rank
  const isCurrent =
    currentName && node.name.toLowerCase() === currentName.toLowerCase()
  const isSpecies = rank === "species"
  const hasChildren = node.children && node.children.length > 0
  const href = getTaxonomyUrl(node, isSpecies)

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          "flex items-center gap-1.5 py-1 text-sm",
          "min-h-[44px] min-w-[44px] touch-manipulation",
          isCurrent && "rounded-md bg-primary/10 ring-1 ring-primary/20"
        )}
        <div
          className="flex items-center gap-1.5"
          style={{ paddingLeft: `${depth * 16}px` }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="p-0.5 rounded hover:bg-muted -m-0.5"
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          ) : (
            <span className="w-5" />
          )}
          <span
            className={cn(
              "text-muted-foreground shrink-0 w-20",
              "sm:w-24"
            )}
          >
            {rankLabel}:
          </span>
          <Link
            href={href}
            className={cn(
              "hover:underline hover:text-primary transition-colors",
              isSpecies && "italic",
              RANK_COLOR[rank] || "text-foreground",
              isCurrent && "font-semibold"
            )}
          >
            {node.name}
            {isCurrent && (
              <span className="ml-2 text-xs text-muted-foreground font-normal">
                [YOU ARE HERE]
              </span>
            )}
          </Link>
          {node.commonName && (
            <span className="text-muted-foreground text-xs ml-1">
              ({node.commonName})
            </span>
          )}
        </div>
      </div>
      {hasChildren && expanded && (
        <div className="border-l border-muted ml-4 pl-2">
          {node.children!.map((child, i) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              currentName={currentName}
              currentId={currentId}
              isLast={i === node.children!.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function HierarchicalTaxonomyTree({
  nodes,
  currentName,
  currentId,
  defaultExpanded = true,
  className,
}: HierarchicalTaxonomyTreeProps) {
  if (!nodes || nodes.length === 0) {
    return (
      <div
        className={cn(
          "rounded-lg border border-dashed border-muted p-6 text-center text-muted-foreground text-sm",
          className
        )}
      >
        <TreeDeciduous className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No taxonomy hierarchy available.</p>
        <p className="text-xs mt-1">Data comes from MINDEX or iNaturalist.</p>
      </div>
    )
  }

  // Build tree from flat nodes (ancestors + current)
  const root: TaxonomyNode = {
    id: nodes[0]?.id ?? "root",
    name: nodes[0]?.name ?? "Fungi",
    rank: nodes[0]?.rank ?? "kingdom",
    commonName: nodes[0]?.commonName,
    children: [],
  }

  let current = root
  for (let i = 1; i < nodes.length; i++) {
    const n = nodes[i]
    const child: TaxonomyNode = {
      id: n.id,
      name: n.name,
      rank: n.rank,
      commonName: n.commonName,
      children: [],
    }
    current.children = current.children || []
    current.children.push(child)
    current = child
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4",
        "overflow-x-auto",
        className
      )}
    >
      <h3 className="font-semibold mb-3 flex items-center gap-2 text-foreground">
        <TreeDeciduous className="h-4 w-4 text-green-600" />
        Taxonomic Hierarchy
      </h3>
      <div className="text-sm">
        <TreeNode
          node={root}
          depth={0}
          currentName={currentName}
          currentId={currentId}
        />
      </div>
    </div>
  )
}
