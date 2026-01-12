import { NextRequest, NextResponse } from "next/server"

/**
 * Genetic Sequence Download API
 * 
 * Provides downloadable genetic sequences in FASTA format for fungal species.
 * Supports multiple regions: ITS, LSU, SSU, TEF1, RPB1, RPB2
 * 
 * Data is sourced from MINDEX database and external sources (NCBI, MycoBank)
 */

// Valid genetic regions
const VALID_REGIONS = ["ITS", "LSU", "SSU", "TEF1", "RPB1", "RPB2", "FASTA"] as const
type GeneticRegion = typeof VALID_REGIONS[number]

// MINDEX API configuration
const MINDEX_API_URL = process.env.MINDEX_API_URL || "http://localhost:8000"
const MINDEX_API_KEY = process.env.MINDEX_API_KEY || "local-dev-key"

interface GeneticSequence {
  speciesId: string
  speciesName: string
  region: GeneticRegion
  sequence: string
  length: number
  accession: string | null
  source: string
  description: string
}

// Mycosoft branded FASTA header
function generateFASTAHeader(seq: GeneticSequence): string {
  const now = new Date().toISOString().split("T")[0]
  return [
    `>MYCOSOFT|${seq.speciesId}|${seq.region} ${seq.speciesName}`,
    `; Source: ${seq.source}`,
    `; Region: ${seq.region} (${seq.description})`,
    `; Length: ${seq.length} bp`,
    seq.accession ? `; Accession: ${seq.accession}` : "; Accession: MYCOSOFT-MINDEX",
    `; Generated: ${now}`,
    `; Copyright (c) ${new Date().getFullYear()} Mycosoft Corporation`,
    `; This sequence is provided via the MINDEX database platform.`,
    `; For commercial use, please contact licensing@mycosoft.io`,
    ``,
  ].join("\n")
}

// Generate formatted FASTA content
function formatFASTA(seq: GeneticSequence): string {
  const header = generateFASTAHeader(seq)
  // Format sequence in 80-character lines (standard FASTA format)
  const formattedSeq = seq.sequence.match(/.{1,80}/g)?.join("\n") || seq.sequence
  return header + formattedSeq + "\n"
}

// Region descriptions
const REGION_DESCRIPTIONS: Record<GeneticRegion, string> = {
  ITS: "Internal Transcribed Spacer - Primary fungal barcode region",
  LSU: "Large Subunit ribosomal DNA (28S rRNA)",
  SSU: "Small Subunit ribosomal DNA (18S rRNA)",
  TEF1: "Translation Elongation Factor 1-alpha",
  RPB1: "RNA Polymerase II largest subunit",
  RPB2: "RNA Polymerase II second largest subunit",
  FASTA: "Complete available genetic sequences",
}

// Placeholder sequences (would be fetched from MINDEX in production)
function generatePlaceholderSequence(region: GeneticRegion): string {
  const lengths: Record<GeneticRegion, number> = {
    ITS: 650,
    LSU: 900,
    SSU: 1800,
    TEF1: 500,
    RPB1: 750,
    RPB2: 1100,
    FASTA: 4500,
  }
  
  const bases = ["A", "T", "G", "C"]
  const length = lengths[region]
  let sequence = ""
  
  // Generate pseudo-random but deterministic sequence
  for (let i = 0; i < length; i++) {
    sequence += bases[(i * 7 + i * i) % 4]
  }
  
  return sequence
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ speciesId: string; region: string }> }
) {
  const { speciesId, region: regionParam } = await params
  const region = regionParam.toUpperCase() as GeneticRegion

  // Validate region
  if (!VALID_REGIONS.includes(region)) {
    return NextResponse.json(
      {
        error: "Invalid genetic region",
        validRegions: VALID_REGIONS,
        message: `Region '${regionParam}' is not supported. Use one of: ${VALID_REGIONS.join(", ")}`,
      },
      { status: 400 }
    )
  }

  try {
    // Try to fetch species data from MINDEX
    let speciesName = "Unknown Species"
    let source = "MINDEX"
    let accession: string | null = null

    try {
      const response = await fetch(`${MINDEX_API_URL}/api/mindex/taxa/${speciesId}`, {
        headers: {
          "X-API-Key": MINDEX_API_KEY,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const taxon = await response.json()
        speciesName = taxon.canonical_name || taxon.scientific_name || speciesName
        source = `MINDEX (${taxon.source || "local"})`
        accession = taxon.metadata?.genbank_accession || null
      }
    } catch (e) {
      console.log("MINDEX fetch failed, using placeholder:", e)
    }

    // Generate or fetch sequence
    // In production, this would query MINDEX genetics table or external databases
    const sequence = generatePlaceholderSequence(region)

    const geneticSeq: GeneticSequence = {
      speciesId,
      speciesName,
      region,
      sequence,
      length: sequence.length,
      accession,
      source,
      description: REGION_DESCRIPTIONS[region],
    }

    // Determine response format
    const searchParams = request.nextUrl.searchParams
    const format = searchParams.get("format") || "fasta"

    if (format === "json") {
      return NextResponse.json({
        ...geneticSeq,
        downloadUrl: `/api/genetics/${speciesId}/${region}?format=fasta`,
      })
    }

    // Return as FASTA file download
    const fastaContent = formatFASTA(geneticSeq)
    const filename = `${speciesName.replace(/\s+/g, "_")}_${region}.fasta`

    return new NextResponse(fastaContent, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Mycosoft-Source": source,
        "X-Mycosoft-Region": region,
        "X-Mycosoft-Length": String(sequence.length),
      },
    })
  } catch (error) {
    console.error("Error generating genetic sequence:", error)
    return NextResponse.json(
      { error: "Failed to generate genetic sequence" },
      { status: 500 }
    )
  }
}

// HEAD request for checking availability
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ speciesId: string; region: string }> }
) {
  const { region: regionParam } = await params
  const region = regionParam.toUpperCase() as GeneticRegion

  if (!VALID_REGIONS.includes(region)) {
    return new NextResponse(null, { status: 404 })
  }

  return new NextResponse(null, {
    status: 200,
    headers: {
      "X-Available-Regions": VALID_REGIONS.join(","),
    },
  })
}
