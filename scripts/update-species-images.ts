import { neon } from "@neondatabase/serverless"
import { put } from "@vercel/blob"
import fetch from "node-fetch"

// Initialize database connection
const sql = neon(process.env.NEON_DATABASE_URL!)

// Function to fetch image from Wikipedia
async function fetchWikipediaImage(speciesName: string): Promise<string | null> {
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
}

// Function to download and save image to Vercel Blob
async function downloadAndSaveImage(url: string, speciesName: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`)
    }

    const buffer = await response.buffer()
    const fileName = `${speciesName.replace(/\s+/g, "_").toLowerCase()}.jpg`

    const blob = await put(fileName, buffer, {
      access: "public",
      contentType: response.headers.get("content-type") || "image/jpeg",
    })

    return blob.url
  } catch (error) {
    console.error(`Error saving image for ${speciesName}:`, error)
    return null
  }
}

// Main function to update species without images
async function updateSpeciesImages() {
  console.log("Starting to update species images...")

  // Get all species without images or with placeholder images
  const speciesWithoutImages = await sql`
    SELECT id, scientific_name
    FROM species
    WHERE image_url IS NULL OR image_url LIKE '%placeholder%'
  `

  console.log(`Found ${speciesWithoutImages.length} species without proper images`)

  for (const species of speciesWithoutImages) {
    try {
      console.log(`Fetching image for ${species.scientific_name}...`)
      const imageUrl = await fetchWikipediaImage(species.scientific_name)

      if (imageUrl) {
        console.log(`Found image for ${species.scientific_name}, saving...`)
        const savedImageUrl = await downloadAndSaveImage(imageUrl, species.scientific_name)

        if (savedImageUrl) {
          await sql`
            UPDATE species 
            SET image_url = ${savedImageUrl}
            WHERE id = ${species.id}
          `
          console.log(`Updated image for ${species.scientific_name}`)
        } else {
          console.log(`Failed to save image for ${species.scientific_name}`)
        }
      } else {
        console.log(`No image found for ${species.scientific_name}`)

        // Use a generated image as fallback
        const fallbackImageUrl = `/placeholder.svg?height=400&width=600&query=${encodeURIComponent(species.scientific_name)}`

        await sql`
          UPDATE species 
          SET image_url = ${fallbackImageUrl}
          WHERE id = ${species.id}
        `
        console.log(`Set fallback image for ${species.scientific_name}`)
      }
    } catch (error) {
      console.error(`Error processing ${species.scientific_name}:`, error)
    }
  }

  console.log("Finished updating species images!")
}

// Run the update function
updateSpeciesImages().catch(console.error)
