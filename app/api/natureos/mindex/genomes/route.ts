import { NextRequest, NextResponse } from "next/server"
import { fetchMindexWithAuthRetry } from "@/lib/mindex-bff-auth"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"

/**
 * MINDEX Genome Data API
 * Provides genome sequence data for visualization components
 * 
 * GET /api/natureos/mindex/genomes - List available genomes
 * GET /api/natureos/mindex/genomes?species=Psilocybe%20cubensis - Get specific genome
 */

interface GenomeAssembly {
  id: string
  species_name: string
  scientific_name: string
  assembly_name: string
  assembly_version: string
  chromosome_count: number
  total_length: number
  gene_count: number
  source: string
  accession?: string
  chromosomes: {
    name: string
    length: number
    gc_content?: number
  }[]
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const species = searchParams.get("species")
  const id = searchParams.get("id")
  
  try {
    // Try to fetch from MINDEX API if available
    const mindexApiUrl = resolveMindexServerBaseUrl()

    if (mindexApiUrl) {
      try {
        const baseUrl = mindexApiUrl.endsWith("/api/mindex") ? mindexApiUrl : `${mindexApiUrl}/api/mindex`
        const apiUrl = species
          ? `${baseUrl}/genomes?species=${encodeURIComponent(species)}`
          : `${baseUrl}/genomes`

        const response = await fetchMindexWithAuthRetry(apiUrl, {
          next: { revalidate: 300 },
        })
        
        if (response.ok) {
          const data = await response.json()
          const genomes = data.genomes || data.data || []
          return NextResponse.json({
            success: true,
            source: "mindex",
            genomes,
            total: data.pagination?.total ?? genomes.length,
            message: data.message,
          })
        }
        const errBody = await response.text().catch(() => "")
        return NextResponse.json({
          success: true,
          source: "mindex",
          genomes: [],
          total: 0,
          message: `MINDEX genomes unavailable (HTTP ${response.status})`,
          detail: errBody.slice(0, 200),
        })
      } catch (error) {
        console.error("MINDEX API error:", error)
      }
    }

    return NextResponse.json({
      success: true,
      source: "mindex",
      genomes: [],
      total: 0,
      message: "No genome records in MINDEX yet. Run genetics/fungidb ETL jobs.",
    })
    
  } catch (error) {
    console.error("Genomes API error:", error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
