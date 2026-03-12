import { put } from "@vercel/blob"
import { cache } from "react"

// Function to fetch image from Wikipedia
const imageCache = new Map<string, string | null>()

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 500 // 500ms between requests

export const getWikipediaImage = cache(async (speciesName: string): Promise<string | null> => {
  if (imageCache.has(speciesName)) {
    return imageCache.get(speciesName) || null
  }

  try {
    const now = Date.now()
    const timeSinceLastRequest = now - lastRequestTime
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      await delay(MIN_REQUEST_INTERVAL - timeSinceLastRequest)
    }
    lastRequestTime = Date.now()

    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(
      speciesName,
    )}&origin=*`

    const searchResponse = await fetch(searchUrl, {
      headers: {
        "User-Agent": "MycoSoft/1.0 (https://mycosoft.com; contact@mycosoft.com)",
      },
    })

    if (searchResponse.status === 429) {
      console.warn(`Wikipedia rate limited for ${speciesName}, using placeholder`)
      imageCache.set(speciesName, null)
      return null
    }

    if (!searchResponse.ok) {
      imageCache.set(speciesName, null)
      return null
    }

    const searchData = await searchResponse.json()

    if (!searchData.query?.search?.[0]?.pageid) {
      imageCache.set(speciesName, null)
      return null
    }

    const pageId = searchData.query.search[0].pageid

    await delay(MIN_REQUEST_INTERVAL)
    lastRequestTime = Date.now()

    const imageUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=original&pageids=${pageId}&origin=*`

    const imageResponse = await fetch(imageUrl, {
      headers: {
        "User-Agent": "MycoSoft/1.0 (https://mycosoft.com; contact@mycosoft.com)",
      },
    })

    if (imageResponse.status === 429 || !imageResponse.ok) {
      imageCache.set(speciesName, null)
      return null
    }

    const imageData = await imageResponse.json()

    const image = imageData.query?.pages?.[pageId]?.original?.source
    imageCache.set(speciesName, image || null)
    return image || null
  } catch (error) {
    console.error(`Error fetching Wikipedia image for ${speciesName}:`, error)
    imageCache.set(speciesName, null)
    return null
  }
})

// Function to download and save image to Vercel Blob
export async function saveImageFromUrl(url: string, fileName: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`)
    }

    const buffer = await response.arrayBuffer()
    const blob = await put(fileName, buffer, {
      access: "public",
      contentType: response.headers.get("content-type") || "image/jpeg",
      addRandomSuffix: false,
      allowOverwrite: true,
    })

    return blob.url
  } catch (error) {
    console.error(`Error saving image ${fileName}:`, error)
    return null
  }
}

// Function to get image for a species, fetching from Wikipedia if needed
export async function getSpeciesImage(species: { scientific_name: string; image_url: string | null }): Promise<string> {
  if (species.image_url && !species.image_url.includes("placeholder")) {
    return species.image_url
  }

  const placeholder = `/placeholder.svg?height=200&width=200&query=${encodeURIComponent(species.scientific_name + " mushroom fungus")}`

  try {
    const wikiImage = await getWikipediaImage(species.scientific_name)
    if (wikiImage) {
      try {
        const fileName = `${species.scientific_name.replace(/\s+/g, "_").toLowerCase()}.jpg`
        const savedImage = await saveImageFromUrl(wikiImage, fileName)
        if (savedImage) {
          return savedImage
        }
      } catch {
        return wikiImage
      }
    }
  } catch {}

  return placeholder
}
