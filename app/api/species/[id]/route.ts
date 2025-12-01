import { type NextRequest, NextResponse } from "next/server"
import { mindexClient } from "@/lib/services/mindex-client"
import { getFungiDetails } from "@/lib/services/inaturalist"
import { getWikipediaData } from "@/lib/services/wikipedia"
import { mycaOrchestrator } from "@/lib/services/myca-orchestrator"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    console.log("[v0] Fetching species from MINDEX:", id)

    await mindexClient.connect()

    if (mindexClient.isConnected()) {
      const species = await mindexClient.getSpecies(id)

      if (species) {
        console.log("[v0] Species found in MINDEX")

        // Get related data from MINDEX
        const [images, papers, observations] = await Promise.all([
          mindexClient.getImages(species.id),
          mindexClient.searchPapers("", species.id, 10),
          mindexClient.getObservations(species.id, 50),
        ])

        return NextResponse.json({
          ...species,
          images: images || [],
          papers: papers || [],
          observations: observations || [],
          source: "mindex",
        })
      } else {
        console.log("[v0] Species not in MINDEX, triggering sync via MYCA")

        // Trigger MYCA to scrape and populate MINDEX
        try {
          const taskId = await mycaOrchestrator.scrapeSpecies(id, ["inaturalist", "wikipedia", "fungidb", "mycobank"])
          console.log("[v0] MYCA scrape task submitted:", taskId)
        } catch (mycaError) {
          console.error("[v0] MYCA task submission failed:", mycaError)
        }
      }
    }
    // </CHANGE>

    console.log("[v0] Fetching from external APIs as fallback")

    const [iNatData, wikiData] = await Promise.all([
      getFungiDetails(id).catch(() => null),
      getWikipediaData(id).catch(() => null),
    ])

    if (!iNatData && !wikiData) {
      return NextResponse.json({ error: "Species not found" }, { status: 404 })
    }

    // Merge data and store in MINDEX for future requests
    const mergedData = {
      id,
      inaturalistId: id,
      scientificName: iNatData?.name || wikiData?.scientificName || id,
      commonNames: iNatData?.preferred_common_name
        ? [iNatData.preferred_common_name]
        : wikiData?.commonName
          ? [wikiData.commonName]
          : [],
      description: wikiData?.extract || iNatData?.wikipedia_summary || "",
      taxonomy: iNatData?.ancestry || {},
      images: [
        ...(iNatData?.taxon_photos?.map((photo: any) => ({
          url: photo.photo?.medium_url || photo.photo?.url,
          attribution: photo.photo?.attribution,
          license: photo.photo?.license_code,
        })) || []),
      ],
      conservationStatus: iNatData?.conservation_status?.status,
      observations: iNatData?.observations_count || 0,
      source: "external-api",
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Store in MINDEX for future use
    if (mindexClient.isConnected()) {
      try {
        await mindexClient.upsertSpecies(mergedData)
        console.log("[v0] Species cached in MINDEX")
      } catch (cacheError) {
        console.error("[v0] Failed to cache in MINDEX:", cacheError)
      }
    }

    return NextResponse.json(mergedData)
    // </CHANGE>
  } catch (error: any) {
    console.error("[v0] Species fetch error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch species" }, { status: 500 })
  }
}
