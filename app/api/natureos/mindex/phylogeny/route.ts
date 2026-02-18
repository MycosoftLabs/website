import { NextRequest, NextResponse } from "next/server"

/**
 * MINDEX Phylogeny Data API
 * NO MOCK DATA: Fetches taxonomy hierarchy from MINDEX.
 * Returns empty tree when MINDEX unavailable or no phylogeny endpoint.
 */

interface PhylogenyNode {
  id: string
  name: string
  scientific_name: string
  rank: string
  parent_id: string | null
  children?: PhylogenyNode[]
  branch_length?: number
  bootstrap?: number
  observation_count?: number
  genome_available?: boolean
}

const MINDEX_API_URL = process.env.MINDEX_API_URL || process.env.MINDEX_API_BASE_URL || "http://localhost:8000"
const MINDEX_API_KEY = process.env.MINDEX_API_KEY || "local-dev-key"

function flattenTree(
  node: PhylogenyNode,
  result: Omit<PhylogenyNode, "children">[] = []
): Omit<PhylogenyNode, "children">[] {
  const { children, ...nodeData } = node
  result.push(nodeData)
  if (children) {
    for (const child of children) {
      flattenTree(child, result)
    }
  }
  return result
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const clade = searchParams.get("clade")
  const format = searchParams.get("format") || "tree"

  try {
    // Try MINDEX taxonomy API to build hierarchy
    let tree: PhylogenyNode | null = null

    if (MINDEX_API_URL) {
      try {
        // MINDEX may expose phylogeny or taxonomy tree endpoint
        const phylogenyUrl = `${MINDEX_API_URL.replace(/\/$/, "")}/api/mindex/phylogeny`
        const response = await fetch(
          clade ? `${phylogenyUrl}?clade=${encodeURIComponent(clade)}` : phylogenyUrl,
          {
            headers: {
              "X-API-Key": MINDEX_API_KEY || "",
              "Content-Type": "application/json",
            },
            next: { revalidate: 3600 },
          }
        )

        if (response.ok) {
          const data = await response.json()
          const rawTree = data.tree ?? data
          if (rawTree && typeof rawTree === "object") {
            tree = rawTree as PhylogenyNode
          }
        }
      } catch (error) {
        console.error("MINDEX phylogeny API error:", error)
      }
    }

    // NO DEMO DATA: return empty when MINDEX has no phylogeny
    if (!tree) {
      if (format === "flat") {
        return NextResponse.json({
          success: true,
          source: "empty",
          message: "No phylogeny data in MINDEX. Run ETL to populate taxonomy.",
          format: "flat",
          nodes: [],
        })
      }
      return NextResponse.json({
        success: true,
        source: "empty",
        message: "No phylogeny data in MINDEX. Run ETL to populate taxonomy.",
        format: "tree",
        tree: null,
      })
    }

    if (format === "flat") {
      return NextResponse.json({
        success: true,
        source: "mindex",
        format: "flat",
        nodes: flattenTree(tree),
      })
    }

    return NextResponse.json({
      success: true,
      source: "mindex",
      format: "tree",
      tree,
    })
  } catch (error) {
    console.error("Phylogeny API error:", error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
