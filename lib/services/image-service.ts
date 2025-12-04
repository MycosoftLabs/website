import { put } from "@vercel/blob"
import { cache } from "react"

// Function to fetch image from Wikipedia
export const getWikipediaImage = cache(async (speciesName: string): Promise<string | null> => {
  try {
    // First, search for the page
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(
      speciesName,
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
    console.error(`Error fetching Wikipedia image for ${speciesName}:`, error)
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
    })

    return blob.url
  } catch (error) {
    console.error(`Error saving image ${fileName}:`, error)
    return null
  }
}

// Function to get image for a species, fetching from Wikipedia if needed
export async function getSpeciesImage(species: { scientific_name: string; image_url: string | null }): Promise<string> {
  // If we already have a valid image URL that's not a placeholder, return it
  if (species.image_url && !species.image_url.includes("placeholder")) {
    return species.image_url
  }

  // Try to get image from Wikipedia
  const wikiImage = await getWikipediaImage(species.scientific_name)
  if (wikiImage) {
    const fileName = `${species.scientific_name.replace(/\s+/g, "_").toLowerCase()}.jpg`
    const savedImage = await saveImageFromUrl(wikiImage, fileName)
    if (savedImage) {
      return savedImage
    }
  }

  // Return placeholder if all else fails
  return "/placeholder.svg?height=200&width=200"
}
