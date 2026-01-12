import { NextRequest, NextResponse } from "next/server"

/**
 * List available genetic sequences for a species
 */

const MINDEX_API_URL = process.env.MINDEX_API_URL || "http://localhost:8000"
const MINDEX_API_KEY = process.env.MINDEX_API_KEY || "local-dev-key"

const GENETIC_REGIONS = [
  { code: "FASTA", name: "Complete Genome", description: "All available sequences combined", available: true },
  { code: "ITS", name: "ITS Region", description: "Internal Transcribed Spacer - Primary fungal barcode", available: true },
  { code: "LSU", name: "LSU rDNA", description: "Large Subunit ribosomal DNA (28S rRNA)", available: true },
  { code: "SSU", name: "SSU rDNA", description: "Small Subunit ribosomal DNA (18S rRNA)", available: true },
  { code: "TEF1", name: "TEF1-α", description: "Translation Elongation Factor 1-alpha", available: true },
  { code: "RPB1", name: "RPB1", description: "RNA Polymerase II largest subunit", available: true },
  { code: "RPB2", name: "RPB2", description: "RNA Polymerase II second largest subunit", available: true },
]

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ speciesId: string }> }
) {
  const { speciesId } = await params

  try {
    // Fetch species info from MINDEX
    let speciesName = "Unknown Species"
    let taxonomyInfo = null

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
        taxonomyInfo = {
          rank: taxon.rank,
          source: taxon.source,
          commonName: taxon.common_name,
        }
      }
    } catch (e) {
      console.log("MINDEX fetch failed:", e)
    }

    // Generate download URLs for each region
    const regions = GENETIC_REGIONS.map((region) => ({
      ...region,
      downloadUrl: `/api/genetics/${speciesId}/${region.code}`,
      previewUrl: `/api/genetics/${speciesId}/${region.code}?format=json`,
    }))

    return NextResponse.json({
      speciesId,
      speciesName,
      taxonomy: taxonomyInfo,
      regions,
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
