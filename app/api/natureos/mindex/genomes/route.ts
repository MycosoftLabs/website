import { NextRequest, NextResponse } from "next/server"

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

// Demo genome assemblies - will be replaced with MINDEX database queries
const GENOME_ASSEMBLIES: GenomeAssembly[] = [
  {
    id: "psilocybe_cubensis_v1",
    species_name: "P. cubensis",
    scientific_name: "Psilocybe cubensis",
    assembly_name: "PsiCub_v1.0",
    assembly_version: "1.0",
    chromosome_count: 5,
    total_length: 21600000,
    gene_count: 8500,
    source: "MINDEX",
    chromosomes: [
      { name: "chr1", length: 5200000, gc_content: 48.2 },
      { name: "chr2", length: 4800000, gc_content: 47.8 },
      { name: "chr3", length: 4200000, gc_content: 48.5 },
      { name: "chr4", length: 3900000, gc_content: 47.1 },
      { name: "chr5", length: 3500000, gc_content: 48.9 },
    ]
  },
  {
    id: "hericium_erinaceus_v1",
    species_name: "H. erinaceus",
    scientific_name: "Hericium erinaceus",
    assembly_name: "HerEri_v1.0",
    assembly_version: "1.0",
    chromosome_count: 4,
    total_length: 17100000,
    gene_count: 7200,
    source: "MINDEX",
    chromosomes: [
      { name: "chr1", length: 4800000, gc_content: 46.5 },
      { name: "chr2", length: 4500000, gc_content: 47.2 },
      { name: "chr3", length: 4100000, gc_content: 46.8 },
      { name: "chr4", length: 3700000, gc_content: 47.5 },
    ]
  },
  {
    id: "ganoderma_lucidum_v1",
    species_name: "G. lucidum",
    scientific_name: "Ganoderma lucidum",
    assembly_name: "GanLuc_v1.0",
    assembly_version: "1.0",
    chromosome_count: 6,
    total_length: 27000000,
    gene_count: 12000,
    source: "MINDEX",
    accession: "PRJNA000001",
    chromosomes: [
      { name: "chr1", length: 5500000, gc_content: 49.1 },
      { name: "chr2", length: 5100000, gc_content: 48.7 },
      { name: "chr3", length: 4700000, gc_content: 49.3 },
      { name: "chr4", length: 4300000, gc_content: 48.2 },
      { name: "chr5", length: 3900000, gc_content: 49.5 },
      { name: "chr6", length: 3500000, gc_content: 48.0 },
    ]
  }
]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const species = searchParams.get("species")
  const id = searchParams.get("id")
  
  try {
    // Try to fetch from MINDEX API if available
    const mindexApiUrl = process.env.MINDEX_API_BASE_URL
    
    if (mindexApiUrl) {
      try {
        const apiUrl = species 
          ? `${mindexApiUrl}/genomes?species=${encodeURIComponent(species)}`
          : `${mindexApiUrl}/genomes`
        
        const response = await fetch(apiUrl, {
          headers: {
            "x-api-key": process.env.MINDEX_API_KEY || ""
          },
          next: { revalidate: 300 } // Cache for 5 minutes
        })
        
        if (response.ok) {
          const data = await response.json()
          return NextResponse.json({
            success: true,
            source: "mindex",
            genomes: data.genomes || data.data || []
          })
        }
      } catch (error) {
        console.error("MINDEX API error:", error)
        // Fall through to demo data
      }
    }
    
    // Filter demo data
    let results = GENOME_ASSEMBLIES
    
    if (species) {
      results = results.filter(g => 
        g.scientific_name.toLowerCase().includes(species.toLowerCase()) ||
        g.species_name.toLowerCase().includes(species.toLowerCase())
      )
    }
    
    if (id) {
      results = results.filter(g => g.id === id)
    }
    
    return NextResponse.json({
      success: true,
      source: "demo",
      message: "Using demo genome data. Connect MINDEX API for real data.",
      genomes: results,
      total: results.length
    })
    
  } catch (error) {
    console.error("Genomes API error:", error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
