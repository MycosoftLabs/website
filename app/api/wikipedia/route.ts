import { NextResponse } from "next/server"

// Wikipedia API integration for fungal species information

interface WikipediaResult {
  title: string
  pageid: number
  extract: string
  thumbnail?: {
    source: string
    width: number
    height: number
  }
  url: string
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")

    if (!query?.trim()) {
      return NextResponse.json({ results: [], message: "No search query provided" }, { status: 200 })
    }

    // Wikipedia API endpoint for searching and getting extracts
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(
      query + " fungus",
    )}&srlimit=5&origin=*`

    const searchResponse = await fetch(searchUrl)
    const searchData = await searchResponse.json()

    if (!searchData.query?.search?.length) {
      return NextResponse.json({ results: [], message: "No results found" }, { status: 200 })
    }

    // Get detailed info for each result
    const pageIds = searchData.query.search.map((result: any) => result.pageid).join("|")
    const detailsUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts|pageimages&exintro=1&explaintext=1&piprop=thumbnail&pithumbsize=300&pageids=${pageIds}&origin=*`

    const detailsResponse = await fetch(detailsUrl)
    const detailsData = await detailsResponse.json()

    const results: WikipediaResult[] = Object.values(detailsData.query.pages).map((page: any) => ({
      title: page.title,
      pageid: page.pageid,
      extract: page.extract || "No description available",
      thumbnail: page.thumbnail,
      url: `https://en.wikipedia.org/?curid=${page.pageid}`,
    }))

    return NextResponse.json({
      results,
      source: "Wikipedia",
      note: "Encyclopedia data from Wikipedia",
    })
  } catch (error) {
    console.error("Wikipedia API error:", error)
    return NextResponse.json({ results: [], error: "Wikipedia service temporarily unavailable" }, { status: 200 })
  }
}
