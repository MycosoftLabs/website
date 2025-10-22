import { scrapeMushroomWorldNamelist } from "@/lib/services/mushroom-world-scraper"
import { searchFungi, getFungiDetails } from "@/lib/services/inaturalist"

async function seedMushroomWorldSpecies() {
  console.log("[v0] Starting mushroom.world species seeding...")

  try {
    // Step 1: Scrape the namelist
    console.log("[v0] Scraping mushroom.world namelist...")
    const species = await scrapeMushroomWorldNamelist()
    console.log(`[v0] Found ${species.length} species`)

    // Step 2: For each species, try to find it on iNaturalist
    console.log("[v0] Matching species with iNaturalist...")
    const matchedSpecies = []

    for (let i = 0; i < species.length; i++) {
      const sp = species[i]
      console.log(`[v0] Processing ${i + 1}/${species.length}: ${sp.scientificName}`)

      try {
        // Search iNaturalist for this species
        const searchResults = await searchFungi(sp.scientificName)

        if (searchResults.results && searchResults.results.length > 0) {
          // Find exact match
          const exactMatch = searchResults.results.find(
            (r: any) => r.name.toLowerCase() === sp.scientificName.toLowerCase(),
          )

          if (exactMatch) {
            console.log(`[v0] ✓ Found match: ${sp.scientificName} (ID: ${exactMatch.id})`)

            // Get full details
            try {
              const details = await getFungiDetails(exactMatch.id.toString())
              matchedSpecies.push({
                ...sp,
                iNaturalistId: exactMatch.id.toString(),
                details,
              })
            } catch (error) {
              console.error(`[v0] Error fetching details for ${sp.scientificName}:`, error)
              matchedSpecies.push({
                ...sp,
                iNaturalistId: exactMatch.id.toString(),
                details: null,
              })
            }
          } else {
            console.log(`[v0] ⚠ No exact match for ${sp.scientificName}`)
          }
        }

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500))
      } catch (error) {
        console.error(`[v0] Error processing ${sp.scientificName}:`, error)
      }
    }

    console.log(`[v0] Successfully matched ${matchedSpecies.length} species`)

    // Step 3: Save to database (you would implement this based on your DB)
    console.log("[v0] Saving to database...")
    // TODO: Implement database saving logic here
    // For now, we'll just log the results
    console.log("[v0] Sample matched species:", matchedSpecies.slice(0, 5))

    console.log("[v0] Seeding complete!")
    return matchedSpecies
  } catch (error) {
    console.error("[v0] Seeding failed:", error)
    throw error
  }
}

// Run the seeding
seedMushroomWorldSpecies()
  .then(() => {
    console.log("[v0] All done!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("[v0] Fatal error:", error)
    process.exit(1)
  })
