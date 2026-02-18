import { NextRequest, NextResponse } from "next/server"

/**
 * List available genetic sequences for a species.
 * NO MOCK DATA: Fetches real regions from MINDEX genetics API.
 * Returns empty regions when none available.
 */

const MINDEX_API_URL = process.env.MINDEX_API_URL || process.env.MINDEX_API_BASE_URL || "http://localhost:8000"
const MINDEX_API_KEY = process.env.MINDEX_API_KEY || "local-dev-key"

// Region metadata for display (used only when we have real sequences)
const REGION_INFO: Record<string, { name: string; description: string }> = {
  FASTA: { name: "Complete Genome", description: "All available sequences combined" },
  ITS: { name: "ITS Region", description: "Internal Transcribed Spacer - Primary fungal barcode" },
  LSU: { name: "LSU rDNA", description: "Large Subunit ribosomal DNA (28S rRNA)" },
  SSU: { name: "SSU rDNA", description: "Small Subunit ribosomal DNA (18S rRNA)" },
  TEF1: { name: "TEF1-α", description: "Translation Elongation Factor 1-alpha" },
  RPB1: { name: "RPB1", description: "RNA Polymerase II largest subunit" },
  RPB2: { name: "RPB2", description: "RNA Polymerase II second largest subunit" },
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ speciesId: string }> }
) {
  const { speciesId } = await params

  try {
    let speciesName = "Unknown Species"
    let taxonomyInfo: { rank?: string; source?: string; commonName?: string | null } | null = null
    const regionCodes = new Set<string>()

    // Fetch species info from MINDEX taxa
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
        taxonomyInfo = {
          rank: taxon.rank,
          source: taxon.source,
          commonName: taxon.common_name,
        }
      }
    } catch (e) {
      console.log("MINDEX taxa fetch failed:", e)
    }

    // Fetch real genetic sequences from MINDEX (species filter by name or ID)
    try {
      const speciesParam = encodeURIComponent(speciesName)
      const geneticsRes = await fetch(
        `${MINDEX_API_URL}/api/mindex/genetics?species=${speciesParam}&limit=500`,
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
        for (const seq of sequences) {
          const gene = (seq.gene || seq.region || "FASTA") as string
          regionCodes.add(gene.toUpperCase())
        }
      }
    } catch (e) {
      console.log("MINDEX genetics fetch failed:", e)
    }

    // Build regions from real MINDEX data only
    const regions = Array.from(regionCodes).map((code) => {
      const info = REGION_INFO[code] || { name: code, description: code }
      return {
        code,
        name: info.name,
        description: info.description,
        available: true,
        downloadUrl: `/api/genetics/${speciesId}/${code}`,
        previewUrl: `/api/genetics/${speciesId}/${code}?format=json`,
      }
    })

    return NextResponse.json({
      speciesId,
      speciesName,
      taxonomy: taxonomyInfo,
      regions,
      data_quality: regions.length > 0 ? "has_genetics" : "no_genetics",
      branding: {
        provider: "Mycosoft Corporation",
        database: "MINDEX",
        version: "1.0",
        copyright: `Copyright © ${new Date().getFullYear()} Mycosoft Corporation`,
        license: "Data provided via MINDEX platform. Commercial use requires license.",
      },
    })
  } catch (error) {
    console.error("Error fetching genetic info:", error)
    return NextResponse.json(
      { error: "Failed to fetch genetic sequence information" },
      { status: 500 }
    )
  }
}
