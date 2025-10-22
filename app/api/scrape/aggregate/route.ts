import { NextResponse } from "next/server"
import { searchFungi, getFungiDetails } from "@/lib/services/inaturalist"

// Aggregate data from multiple sources for a comprehensive species profile

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")
    const speciesId = searchParams.get("id")

    if (!query && !speciesId) {
      return NextResponse.json({ error: "Either query or id parameter is required" }, { status: 400 })
    }

    let aggregatedData: any = {
      sources: [],
      data: {},
    }

    if (speciesId) {
      // Fetch detailed data for a specific species
      const [iNatData, mycoBankData, fungiDBData] = await Promise.allSettled([
        getFungiDetails(speciesId),
        fetch(`/api/mycobank?q=${speciesId}`).then((r) => r.json()),
        fetch(`/api/fungidb?q=${speciesId}`).then((r) => r.json()),
      ])

      if (iNatData.status === "fulfilled") {
        aggregatedData.sources.push("iNaturalist")
        aggregatedData.data.iNaturalist = iNatData.value
      }

      if (mycoBankData.status === "fulfilled") {
        aggregatedData.sources.push("MycoBank")
        aggregatedData.data.mycoBank = mycoBankData.value
      }

      if (fungiDBData.status === "fulfilled") {
        aggregatedData.sources.push("FungiDB")
        aggregatedData.data.fungiDB = fungiDBData.value
      }
    } else if (query) {
      // Search across all sources
      const [iNatResults, mycoBankResults, fungiDBResults, wikiResults] = await Promise.allSettled([
        searchFungi(query),
        fetch(`/api/mycobank?q=${query}`).then((r) => r.json()),
        fetch(`/api/fungidb?q=${query}`).then((r) => r.json()),
        fetch(`/api/wikipedia?q=${query}`).then((r) => r.json()),
      ])

      aggregatedData = {
        query,
        sources: [],
        results: {
          iNaturalist: iNatResults.status === "fulfilled" ? iNatResults.value.results : [],
          mycoBank: mycoBankResults.status === "fulfilled" ? mycoBankResults.value.results : [],
          fungiDB: fungiDBResults.status === "fulfilled" ? fungiDBResults.value.results : [],
          wikipedia: wikiResults.status === "fulfilled" ? wikiResults.value.results : [],
        },
      }

      if (iNatResults.status === "fulfilled") aggregatedData.sources.push("iNaturalist")
      if (mycoBankResults.status === "fulfilled") aggregatedData.sources.push("MycoBank")
      if (fungiDBResults.status === "fulfilled") aggregatedData.sources.push("FungiDB")
      if (wikiResults.status === "fulfilled") aggregatedData.sources.push("Wikipedia")
    }

    return NextResponse.json({
      ...aggregatedData,
      timestamp: new Date().toISOString(),
      note: "Aggregated data from multiple fungal databases",
    })
  } catch (error) {
    console.error("Aggregate scrape error:", error)
    return NextResponse.json({ error: "Failed to aggregate data from sources" }, { status: 500 })
  }
}
