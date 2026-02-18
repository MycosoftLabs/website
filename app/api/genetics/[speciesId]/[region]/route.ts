import { NextRequest, NextResponse } from "next/server"

/**
 * Genetic Sequence Download API
 * NO MOCK DATA: Fetches real sequences from MINDEX genetics API.
 * Returns 404 when no sequence available (no placeholder/fake data).
 */

const VALID_REGIONS = ["ITS", "LSU", "SSU", "TEF1", "RPB1", "RPB2", "FASTA"] as const
type GeneticRegion = (typeof VALID_REGIONS)[number]

const MINDEX_API_URL = process.env.MINDEX_API_URL || process.env.MINDEX_API_BASE_URL || "http://localhost:8000"
const MINDEX_API_KEY = process.env.MINDEX_API_KEY || "local-dev-key"

interface GeneticSequence {
  speciesId: string
  speciesName: string
  region: string
  sequence: string
  length: number
  accession: string | null
  source: string
  description: string
}

const REGION_DESCRIPTIONS: Record<string, string> = {
  ITS: "Internal Transcribed Spacer - Primary fungal barcode region",
  LSU: "Large Subunit ribosomal DNA (28S rRNA)",
  SSU: "Small Subunit ribosomal DNA (18S rRNA)",
  TEF1: "Translation Elongation Factor 1-alpha",
  RPB1: "RNA Polymerase II largest subunit",
  RPB2: "RNA Polymerase II second largest subunit",
  FASTA: "Complete available genetic sequences",
}

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
    ``,
  ].join("\n")
}

function formatFASTA(seq: GeneticSequence): string {
  const header = generateFASTAHeader(seq)
  const formattedSeq = seq.sequence.match(/.{1,80}/g)?.join("\n") || seq.sequence
  return header + formattedSeq + "\n"
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ speciesId: string; region: string }> }
) {
  const { speciesId, region: regionParam } = await params
  const region = regionParam.toUpperCase() as GeneticRegion

  if (!VALID_REGIONS.includes(region)) {
    return NextResponse.json(
      {
        error: "Invalid genetic region",
        validRegions: [...VALID_REGIONS],
        message: `Region '${regionParam}' is not supported.`,
      },
      { status: 400 }
    )
  }

  try {
    let speciesName = "Unknown Species"
    let source = "MINDEX"
    let accession: string | null = null
    let sequence: string | null = null

    // Fetch species from MINDEX taxa
    try {
      const taxaRes = await fetch(`${MINDEX_API_URL}/api/mindex/taxa/${speciesId}`, {
        headers: {
          "X-API-Key": MINDEX_API_KEY,
          "Content-Type": "application/json",
        },
      })
      if (taxaRes.ok) {
        const taxon = await taxaRes.json()
        speciesName = taxon.canonical_name || taxon.scientific_name || speciesName
        source = `MINDEX (${taxon.source || "local"})`
        accession = taxon.metadata?.genbank_accession ?? null
      }
    } catch (e) {
      console.log("MINDEX taxa fetch failed:", e)
    }

    // Fetch real sequence from MINDEX genetics
    try {
      const speciesParam = encodeURIComponent(speciesName)
      const geneFilter = region === "FASTA" ? "" : `&gene=${region}`
      const geneticsRes = await fetch(
        `${MINDEX_API_URL}/api/mindex/genetics?species=${speciesParam}&limit=50${geneFilter}`,
        {
          headers: {
            "X-API-Key": MINDEX_API_KEY,
            "Content-Type": "application/json",
          },
        }
      )

      if (geneticsRes.ok) {
        const data = await geneticsRes.json()
        const sequences = data.data || data.sequences || []
        if (region === "FASTA" && sequences.length > 0) {
          sequence = sequences.map((s: { sequence?: string }) => s.sequence || "").join("")
        } else if (sequences.length > 0) {
          const match = sequences.find(
            (s: { gene?: string; region?: string }) =>
              (s.gene || s.region || "").toUpperCase() === region
          )
          if (match && match.sequence) sequence = match.sequence
          else if (sequences[0]?.sequence) sequence = sequences[0].sequence
        }
      }
    } catch (e) {
      console.log("MINDEX genetics fetch failed:", e)
    }

    // NO PLACEHOLDER: return 404 when no real sequence
    if (!sequence || sequence.length === 0) {
      return NextResponse.json(
        {
          error: "Sequence not available",
          message: `No genetic sequence for region '${region}' in MINDEX. Contribute data via MINDEX ETL.`,
        },
        { status: 404 }
      )
    }

    const geneticSeq: GeneticSequence = {
      speciesId,
      speciesName,
      region,
      sequence,
      length: sequence.length,
      accession,
      source,
      description: REGION_DESCRIPTIONS[region] || region,
    }

    const format = request.nextUrl.searchParams.get("format") || "fasta"

    if (format === "json") {
      return NextResponse.json({
        ...geneticSeq,
        downloadUrl: `/api/genetics/${speciesId}/${region}?format=fasta`,
      })
    }

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
