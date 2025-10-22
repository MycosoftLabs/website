// Scraper for mushroom.world species database
export interface MushroomWorldSpecies {
  scientificName: string
  commonName: string
  url: string
  slug: string
}

export async function scrapeMushroomWorldNamelist(): Promise<MushroomWorldSpecies[]> {
  try {
    const response = await fetch("https://www.mushroom.world/mushrooms/namelist")
    const html = await response.text()

    // Parse the HTML to extract species
    const species: MushroomWorldSpecies[] = []

    // Match pattern: [Species name](url)(Common Name)
    const regex = /\[([^\]]+)\]$$https:\/\/www\.mushroom\.world\/show\?n=([^)]+)$$$$([^)]+)$$/g
    let match

    while ((match = regex.exec(html)) !== null) {
      const scientificName = match[1]
      const slug = match[2]
      const commonName = match[3]

      species.push({
        scientificName,
        commonName,
        url: `https://www.mushroom.world/show?n=${slug}`,
        slug,
      })
    }

    console.log(`[v0] Scraped ${species.length} species from mushroom.world`)
    return species
  } catch (error) {
    console.error("Error scraping mushroom.world:", error)
    return []
  }
}

export async function getMushroomWorldDetails(slug: string): Promise<any> {
  try {
    const response = await fetch(`https://www.mushroom.world/show?n=${slug}`)
    const html = await response.text()

    // Basic parsing - extract key information
    // This is a simplified version - you may want to enhance this
    return {
      slug,
      url: `https://www.mushroom.world/show?n=${slug}`,
      source: "mushroom.world",
      lastScraped: new Date().toISOString(),
    }
  } catch (error) {
    console.error(`Error fetching details for ${slug}:`, error)
    return null
  }
}

// Batch fetch species details with rate limiting
export async function batchFetchMushroomWorldDetails(
  species: MushroomWorldSpecies[],
  batchSize = 10,
  delayMs = 1000,
): Promise<any[]> {
  const results: any[] = []

  for (let i = 0; i < species.length; i += batchSize) {
    const batch = species.slice(i, i + batchSize)
    console.log(`[v0] Processing batch ${i / batchSize + 1} of ${Math.ceil(species.length / batchSize)}`)

    const batchResults = await Promise.all(batch.map((s) => getMushroomWorldDetails(s.slug)))

    results.push(...batchResults.filter((r) => r !== null))

    // Rate limiting delay
    if (i + batchSize < species.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  return results
}
