import { NextRequest, NextResponse } from "next/server"

/**
 * MINDEX Gene Annotations API
 * Provides gene data for genome browser visualization
 * 
 * GET /api/natureos/mindex/genes/[species] - Get genes for species
 * GET /api/natureos/mindex/genes/[species]?chr=chr1&start=0&end=100000 - Filter by region
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

// Generate demo genes for a species
function generateDemoGenes(species: string, chromosome?: string, start?: number, end?: number): Gene[] {
  const geneNamePrefixes: Record<string, string[]> = {
    "psilocybe_cubensis": ["psiD", "psiK", "psiM", "psiH", "psiR", "cyp450", "abc", "nrps"],
    "hericium_erinaceus": ["eri", "hce", "ngs", "lfc", "abc", "cyp"],
    "ganoderma_lucidum": ["gls", "lan", "cyp", "abc", "pks", "nrps"]
  }
  
  const prefixes = geneNamePrefixes[species] || ["gene", "orf", "hyp"]
  const genes: Gene[] = []
  
  const chromosomes = chromosome ? [chromosome] : ["chr1", "chr2", "chr3", "chr4", "chr5"]
  
  chromosomes.forEach((chr, chrIdx) => {
    const chrLength = 5000000 - chrIdx * 500000
    const geneCount = Math.floor(chrLength / 50000)
    
    for (let i = 0; i < geneCount; i++) {
      const geneStart = 10000 + i * 40000 + Math.floor(Math.random() * 20000)
      const geneLength = 1500 + Math.floor(Math.random() * 5000)
      const geneEnd = geneStart + geneLength
      
      // Skip if outside requested range
      if (start !== undefined && end !== undefined) {
        if (geneEnd < start || geneStart > end) continue
      }
      
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
      const geneNumber = chrIdx * 1000 + i + 1
      
      genes.push({
        id: `${species}_${chr}_gene_${geneNumber}`,
        name: `${prefix}${geneNumber}`,
        chromosome: chr,
        start: geneStart,
        end: geneEnd,
        strand: Math.random() > 0.5 ? "+" : "-",
        type: Math.random() > 0.7 ? "biosynthesis" : Math.random() > 0.5 ? "transporter" : "housekeeping",
        product: getRandomProduct(),
        description: getRandomDescription()
      })
    }
  })
  
  return genes
}

function getRandomProduct(): string {
  const products = [
    "tryptophan decarboxylase",
    "cytochrome P450 monooxygenase",
    "O-methyltransferase",
    "ABC transporter",
    "polyketide synthase",
    "non-ribosomal peptide synthetase",
    "hydroxylase",
    "kinase",
    "hypothetical protein"
  ]
  return products[Math.floor(Math.random() * products.length)]
}

function getRandomDescription(): string {
  const descriptions = [
    "Involved in secondary metabolite biosynthesis",
    "Membrane-bound enzyme",
    "Catalyzes oxidation reaction",
    "Transport of small molecules",
    "Regulatory function",
    "Unknown function, conserved domain"
  ]
  return descriptions[Math.floor(Math.random() * descriptions.length)]
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ species: string }> }
) {
  const { species } = await params
  const { searchParams } = new URL(request.url)
  
  const chromosome = searchParams.get("chr") || undefined
  const start = searchParams.get("start") ? parseInt(searchParams.get("start")!) : undefined
  const end = searchParams.get("end") ? parseInt(searchParams.get("end")!) : undefined
  const limit = parseInt(searchParams.get("limit") || "500")
  
  try {
    // Try to fetch from MINDEX API if available
    const mindexApiUrl = process.env.MINDEX_API_BASE_URL
    
    if (mindexApiUrl) {
      try {
        let apiUrl = `${mindexApiUrl}/genes/${encodeURIComponent(species)}`
        const queryParams = new URLSearchParams()
        if (chromosome) queryParams.set("chr", chromosome)
        if (start !== undefined) queryParams.set("start", start.toString())
        if (end !== undefined) queryParams.set("end", end.toString())
        if (queryParams.toString()) apiUrl += `?${queryParams.toString()}`
        
        const response = await fetch(apiUrl, {
          headers: {
            "x-api-key": process.env.MINDEX_API_KEY || ""
          },
          next: { revalidate: 60 } // Cache for 1 minute
        })
        
        if (response.ok) {
          const data = await response.json()
          return NextResponse.json({
            success: true,
            source: "mindex",
            species,
            genes: data.genes || data.data || []
          })
        }
      } catch (error) {
        console.error("MINDEX genes API error:", error)
        // Fall through to demo data
      }
    }
    
    // Generate demo genes
    const speciesKey = species.toLowerCase().replace(/\s+/g, "_")
    const genes = generateDemoGenes(speciesKey, chromosome, start, end).slice(0, limit)
    
    return NextResponse.json({
      success: true,
      source: "demo",
      message: "Using demo gene data. Connect MINDEX API for real data.",
      species,
      region: chromosome ? { chromosome, start, end } : null,
      genes,
      total: genes.length
    })
    
  } catch (error) {
    console.error("Genes API error:", error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
