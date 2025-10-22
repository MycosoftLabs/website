import { aggregateSpeciesData } from "../lib/services/data-aggregator"

// Top fungal species to seed the database with
const SEED_SPECIES = [
  { id: "49158", name: "Hericium erinaceus" }, // Lion's Mane
  { id: "48139", name: "Ganoderma lucidum" }, // Reishi
  { id: "54134", name: "Trametes versicolor" }, // Turkey Tail
  { id: "57833", name: "Cordyceps militaris" }, // Cordyceps
  { id: "50443", name: "Inonotus obliquus" }, // Chaga
  { id: "48004", name: "Agaricus bisporus" }, // Button Mushroom
  { id: "48626", name: "Pleurotus ostreatus" }, // Oyster Mushroom
  { id: "48701", name: "Lentinula edodes" }, // Shiitake
  { id: "48348", name: "Amanita muscaria" }, // Fly Agaric
  { id: "48349", name: "Amanita phalloides" }, // Death Cap
]

async function seedDatabase() {
  console.log("🍄 Starting species database seeding...")
  console.log(`📊 Seeding ${SEED_SPECIES.length} species\n`)

  const results = []

  for (const species of SEED_SPECIES) {
    try {
      console.log(`Fetching data for ${species.name} (ID: ${species.id})...`)

      const aggregatedData = await aggregateSpeciesData(species.id, species.name)

      if (aggregatedData) {
        results.push({
          success: true,
          species: species.name,
          data: aggregatedData,
        })
        console.log(`✅ Successfully aggregated data for ${species.name}`)
      } else {
        results.push({
          success: false,
          species: species.name,
          error: "No data returned",
        })
        console.log(`❌ Failed to aggregate data for ${species.name}`)
      }

      // Rate limiting - wait 1 second between requests
      await new Promise((resolve) => setTimeout(resolve, 1000))
    } catch (error) {
      results.push({
        success: false,
        species: species.name,
        error: error instanceof Error ? error.message : "Unknown error",
      })
      console.log(`❌ Error fetching ${species.name}:`, error)
    }
  }

  console.log("\n📈 Seeding Summary:")
  console.log(`✅ Successful: ${results.filter((r) => r.success).length}`)
  console.log(`❌ Failed: ${results.filter((r) => !r.success).length}`)

  // Save results to a JSON file for inspection
  const fs = require("fs")
  fs.writeFileSync("seed-results.json", JSON.stringify(results, null, 2))
  console.log("\n💾 Results saved to seed-results.json")

  return results
}

// Run the seeding script
seedDatabase()
  .then(() => {
    console.log("\n🎉 Database seeding completed!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n💥 Database seeding failed:", error)
    process.exit(1)
  })
