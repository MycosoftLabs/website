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
