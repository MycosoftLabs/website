import { NextRequest, NextResponse } from "next/server"

/**
 * MINDEX Phylogeny Data API
 * Provides phylogenetic tree data for visualization
 * 
 * GET /api/natureos/mindex/phylogeny - Get full phylogenetic tree
 * GET /api/natureos/mindex/phylogeny?clade=Psilocybe - Get subtree for clade
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

// Demo phylogeny tree for fungal species
const PHYLOGENY_TREE: PhylogenyNode = {
  id: "fungi",
  name: "Fungi",
  scientific_name: "Fungi",
  rank: "kingdom",
  parent_id: null,
  children: [
    {
      id: "basidiomycota",
      name: "Basidiomycota",
      scientific_name: "Basidiomycota",
      rank: "phylum",
      parent_id: "fungi",
      branch_length: 0.5,
      children: [
        {
          id: "agaricomycetes",
          name: "Agaricomycetes",
          scientific_name: "Agaricomycetes",
          rank: "class",
          parent_id: "basidiomycota",
          branch_length: 0.3,
          children: [
            {
              id: "agaricales",
              name: "Agaricales",
              scientific_name: "Agaricales",
              rank: "order",
              parent_id: "agaricomycetes",
              branch_length: 0.2,
              children: [
                {
                  id: "hymenogastraceae",
                  name: "Hymenogastraceae",
                  scientific_name: "Hymenogastraceae",
                  rank: "family",
                  parent_id: "agaricales",
                  branch_length: 0.15,
                  children: [
                    {
                      id: "psilocybe",
                      name: "Psilocybe",
                      scientific_name: "Psilocybe",
                      rank: "genus",
                      parent_id: "hymenogastraceae",
                      branch_length: 0.1,
                      children: [
                        {
                          id: "psilocybe_cubensis",
                          name: "P. cubensis",
                          scientific_name: "Psilocybe cubensis",
                          rank: "species",
                          parent_id: "psilocybe",
                          branch_length: 0.05,
                          observation_count: 1250,
                          genome_available: true
                        },
                        {
                          id: "psilocybe_semilanceata",
                          name: "P. semilanceata",
                          scientific_name: "Psilocybe semilanceata",
                          rank: "species",
                          parent_id: "psilocybe",
                          branch_length: 0.05,
                          observation_count: 890,
                          genome_available: false
                        },
                        {
                          id: "psilocybe_cyanescens",
                          name: "P. cyanescens",
                          scientific_name: "Psilocybe cyanescens",
                          rank: "species",
                          parent_id: "psilocybe",
                          branch_length: 0.06,
                          observation_count: 445,
                          genome_available: false
                        },
                        {
                          id: "psilocybe_azurescens",
                          name: "P. azurescens",
                          scientific_name: "Psilocybe azurescens",
                          rank: "species",
                          parent_id: "psilocybe",
                          branch_length: 0.04,
                          observation_count: 234,
                          genome_available: true
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          id: "polyporales",
          name: "Polyporales",
          scientific_name: "Polyporales",
          rank: "order",
          parent_id: "agaricomycetes",
          branch_length: 0.25,
          children: [
            {
              id: "ganodermataceae",
              name: "Ganodermataceae",
              scientific_name: "Ganodermataceae",
              rank: "family",
              parent_id: "polyporales",
              branch_length: 0.12,
              children: [
                {
                  id: "ganoderma",
                  name: "Ganoderma",
                  scientific_name: "Ganoderma",
                  rank: "genus",
                  parent_id: "ganodermataceae",
                  branch_length: 0.08,
                  children: [
                    {
                      id: "ganoderma_lucidum",
                      name: "G. lucidum",
                      scientific_name: "Ganoderma lucidum",
                      rank: "species",
                      parent_id: "ganoderma",
                      branch_length: 0.05,
                      observation_count: 567,
                      genome_available: true
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          id: "russulales",
          name: "Russulales",
          scientific_name: "Russulales",
          rank: "order",
          parent_id: "agaricomycetes",
          branch_length: 0.28,
          children: [
            {
              id: "hericiaceae",
              name: "Hericiaceae",
              scientific_name: "Hericiaceae",
              rank: "family",
              parent_id: "russulales",
              branch_length: 0.1,
              children: [
                {
                  id: "hericium",
                  name: "Hericium",
                  scientific_name: "Hericium",
                  rank: "genus",
                  parent_id: "hericiaceae",
                  branch_length: 0.06,
                  children: [
                    {
                      id: "hericium_erinaceus",
                      name: "H. erinaceus",
                      scientific_name: "Hericium erinaceus",
                      rank: "species",
                      parent_id: "hericium",
                      branch_length: 0.04,
                      observation_count: 789,
                      genome_available: true
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: "ascomycota",
      name: "Ascomycota",
      scientific_name: "Ascomycota",
      rank: "phylum",
      parent_id: "fungi",
      branch_length: 0.6,
      children: [
        {
          id: "sordariomycetes",
          name: "Sordariomycetes",
          scientific_name: "Sordariomycetes",
          rank: "class",
          parent_id: "ascomycota",
          branch_length: 0.35,
          children: [
            {
              id: "hypocreales",
              name: "Hypocreales",
              scientific_name: "Hypocreales",
              rank: "order",
              parent_id: "sordariomycetes",
              branch_length: 0.2,
              children: [
                {
                  id: "cordycipitaceae",
                  name: "Cordycipitaceae",
                  scientific_name: "Cordycipitaceae",
                  rank: "family",
                  parent_id: "hypocreales",
                  branch_length: 0.12,
                  children: [
                    {
                      id: "cordyceps",
                      name: "Cordyceps",
                      scientific_name: "Cordyceps",
                      rank: "genus",
                      parent_id: "cordycipitaceae",
                      branch_length: 0.08,
                      children: [
                        {
                          id: "cordyceps_militaris",
                          name: "C. militaris",
                          scientific_name: "Cordyceps militaris",
                          rank: "species",
                          parent_id: "cordyceps",
                          branch_length: 0.04,
                          observation_count: 345,
                          genome_available: true
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}

function findNode(tree: PhylogenyNode, name: string): PhylogenyNode | null {
  if (tree.name.toLowerCase().includes(name.toLowerCase()) ||
      tree.scientific_name.toLowerCase().includes(name.toLowerCase())) {
    return tree
  }
  
  if (tree.children) {
    for (const child of tree.children) {
      const found = findNode(child, name)
      if (found) return found
    }
  }
  
  return null
}

function flattenTree(node: PhylogenyNode, result: Omit<PhylogenyNode, 'children'>[] = []): Omit<PhylogenyNode, 'children'>[] {
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
    // Try to fetch from MINDEX API if available
    const mindexApiUrl = process.env.MINDEX_API_BASE_URL
    
    if (mindexApiUrl) {
      try {
        let apiUrl = `${mindexApiUrl}/phylogeny`
        if (clade) apiUrl += `?clade=${encodeURIComponent(clade)}`
        
        const response = await fetch(apiUrl, {
          headers: {
            "x-api-key": process.env.MINDEX_API_KEY || ""
          },
          next: { revalidate: 3600 } // Cache for 1 hour
        })
        
        if (response.ok) {
          const data = await response.json()
          return NextResponse.json({
            success: true,
            source: "mindex",
            ...data
          })
        }
      } catch (error) {
        console.error("MINDEX phylogeny API error:", error)
      }
    }
    
    // Use demo data
    let tree = PHYLOGENY_TREE
    
    if (clade) {
      const subtree = findNode(PHYLOGENY_TREE, clade)
      if (subtree) {
        tree = subtree
      } else {
        return NextResponse.json({
          success: false,
          error: `Clade "${clade}" not found`
        }, { status: 404 })
      }
    }
    
    if (format === "flat") {
      return NextResponse.json({
        success: true,
        source: "demo",
        format: "flat",
        nodes: flattenTree(tree)
      })
    }
    
    return NextResponse.json({
      success: true,
      source: "demo",
      message: "Using demo phylogeny data. Connect MINDEX API for real data.",
      format: "tree",
      tree
    })
    
  } catch (error) {
    console.error("Phylogeny API error:", error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
