import { NextRequest, NextResponse } from "next/server"

/**
 * MINDEX Gene Annotations API
 * NO MOCK DATA: Fetches gene/sequence features from MINDEX.
 * Returns empty genes array when no data available.
 */

interface Gene {
  id: string
  name: string
  chromosome: string
  start: number
  end: number
  strand: "+" | "-"
  type: string
  product?: string
  description?: string
  go_terms?: string[]
}

const MINDEX_API_URL = process.env.MINDEX_API_URL || process.env.MINDEX_API_BASE_URL || "http://localhost:8000"
const MINDEX_API_KEY = process.env.MINDEX_API_KEY || "local-dev-key"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ species: string }> }
) {
  const { species } = await params
  const { searchParams } = new URL(request.url)

  const chromosome = searchParams.get("chr") || undefined
  const start = searchParams.get("start") ? parseInt(searchParams.get("start")!, 10) : undefined
  const end = searchParams.get("end") ? parseInt(searchParams.get("end")!, 10) : undefined
  const limit = parseInt(searchParams.get("limit") || "500", 10)

  try {
    const genes: Gene[] = []

    // Try MINDEX genetics API (sequence features / genes)
    if (MINDEX_API_URL) {
      try {
        const speciesParam = encodeURIComponent(species.replace(/_/g, " "))
        const geneticsUrl = `${MINDEX_API_URL}/api/mindex/genetics?species=${speciesParam}&limit=${limit}`
        const response = await fetch(geneticsUrl, {
          headers: {
            "X-API-Key": MINDEX_API_KEY || "",
            "Content-Type": "application/json",
          },
          next: { revalidate: 60 },
        })

        if (response.ok) {
          const data = await response.json()
          const sequences = data.data || data.sequences || []
          // Map genetic sequences to Gene-like format if they have features
          for (let i = 0; i < sequences.length; i++) {
            const s = sequences[i]
            const geneName = s.gene || s.region || s.accession || `seq_${i + 1}`
            const seqLen = s.sequence?.length || s.sequence_length || 0
            const gene: Gene = {
              id: s.id || `${species}_${geneName}_${i}`,
              name: geneName,
              chromosome: s.chromosome || chromosome || "unknown",
              start: s.start_pos ?? s.start ?? 0,
              end: s.end_pos ?? s.end ?? seqLen,
              strand: (s.strand as "+" | "-") || "+",
              type: s.feature_type || s.type || "sequence",
              product: s.product || s.definition,
              description: s.description,
            }
            if (chromosome && gene.chromosome !== chromosome) continue
            if (start !== undefined && end !== undefined) {
              if (gene.end < start || gene.start > end) continue
            }
            genes.push(gene)
          }
        }
      } catch (error) {
        console.error("MINDEX genetics API error:", error)
      }
    }

    // NO DEMO DATA: return empty when MINDEX has no genes
    return NextResponse.json({
      success: true,
      source: genes.length > 0 ? "mindex" : "empty",
      message:
        genes.length === 0
          ? "No gene annotations in MINDEX. Run ETL to populate genetics data."
          : undefined,
      species,
      region: chromosome ? { chromosome, start, end } : null,
      genes: genes.slice(0, limit),
      total: genes.length,
      data_quality: genes.length > 0 ? "has_genes" : "no_genes",
    })
  } catch (error) {
    console.error("Genes API error:", error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
