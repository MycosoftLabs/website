import { cachedFetch, checkRateLimit } from "./request-cache"

export async function getWikipediaImage(compoundName: string): Promise<string | null> {
  if (!checkRateLimit("wikipedia", 2, 10000)) {
    console.log("[v0] Wikipedia rate limit reached, skipping request")
    return null
  }

  return cachedFetch(`wiki-image-${compoundName}`, async () => {
    try {
      // First, search for the page
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(
        compoundName,
      )}&origin=*`

      const searchResponse = await fetch(searchUrl)
      const searchData = await searchResponse.json()

      if (!searchData.query?.search?.[0]?.pageid) {
        return null
      }

      const pageId = searchData.query.search[0].pageid

      // Then, get the page images
      const imageUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=original&pageids=${pageId}&origin=*`

      const imageResponse = await fetch(imageUrl)
      const imageData = await imageResponse.json()

      const image = imageData.query?.pages?.[pageId]?.original?.source
      return image || null
    } catch (error) {
      console.error("Error fetching Wikipedia image:", error)
      return null
    }
  })
}

export async function getWikipediaData(speciesName: string): Promise<any | null> {
  if (!checkRateLimit("wikipedia", 2, 10000)) {
    console.log("[v0] Wikipedia rate limit reached, skipping request")
    return null
  }

  return cachedFetch(`wiki-data-${speciesName}`, async () => {
    try {
      // Search for the page
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(
        speciesName,
      )}&origin=*`

      const searchResponse = await fetch(searchUrl)

      const contentType = searchResponse.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        console.warn("Wikipedia returned non-JSON response (likely rate limited)")
        return null
      }

      const searchData = await searchResponse.json()

      if (!searchData.query?.search?.[0]?.pageid) {
        return null
      }

      const pageId = searchData.query.search[0].pageid

      // Get page content, images, and extracts
      const contentUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts|pageimages|info&exintro=1&explaintext=1&piprop=original&pageids=${pageId}&origin=*`

      const contentResponse = await fetch(contentUrl)
      const contentData = await contentResponse.json()

      const page = contentData.query?.pages?.[pageId]

      if (!page) return null

      return {
        title: page.title,
        extract: page.extract,
        image: page.original?.source,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
        pageId: pageId,
      }
    } catch (error) {
      console.error("Error fetching Wikipedia data:", error)
      return null
    }
  })
}

export async function searchWikipedia(query: string): Promise<any[]> {
  if (!checkRateLimit("wikipedia", 2, 10000)) {
    console.log("[v0] Wikipedia rate limit reached, returning empty results")
    return []
  }

  return cachedFetch(
    `wiki-search-${query}`,
    async () => {
      try {
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(
          query + " fungus mushroom",
        )}&srlimit=10&origin=*`

        const searchResponse = await fetch(searchUrl, {
          signal: AbortSignal.timeout(5000),
        })

        const contentType = searchResponse.headers.get("content-type")
        if (!contentType || !contentType.includes("application/json")) {
          console.warn("Wikipedia returned non-JSON response")
          return []
        }

        const searchData = await searchResponse.json()

        if (!searchData.query?.search) {
          return []
        }

        // Just return basic results with snippet
        const results = searchData.query.search.slice(0, 5).map((result: any) => ({
          type: "article",
          title: result.title,
          extract: result.snippet,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title)}`,
          pageId: result.pageid,
        }))

        return results
      } catch (error) {
        console.error("Error searching Wikipedia:", error)
        return []
      }
    },
    300000,
  ) // Cache for 5 minutes
}

export const getWikipediaArticle = getWikipediaData
