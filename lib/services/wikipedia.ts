export async function getWikipediaImage(compoundName: string): Promise<string | null> {
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
}

export async function getWikipediaData(speciesName: string): Promise<any | null> {
  try {
    // Search for the page
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(
      speciesName,
    )}&origin=*`

    const searchResponse = await fetch(searchUrl)
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
}
