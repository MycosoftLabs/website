import { validateSpeciesId } from "@/lib/utils/species-validator"
import fs from "fs/promises"
import path from "path"

// Top 100 mushroom species with preliminary IDs
const TOP_100_MUSHROOMS = [
  // Medicinal Mushrooms
  { scientificName: "Hericium erinaceus", commonNames: ["Lion's Mane"], preliminaryId: "49158" },
  { scientificName: "Trametes versicolor", commonNames: ["Turkey Tail"], preliminaryId: "54134" },
  { scientificName: "Ganoderma lucidum", commonNames: ["Reishi"], preliminaryId: "48139" },
  { scientificName: "Inonotus obliquus", commonNames: ["Chaga"], preliminaryId: "50443" },
  { scientificName: "Cordyceps militaris", commonNames: ["Orange Cordyceps"], preliminaryId: "57833" },
  { scientificName: "Grifola frondosa", commonNames: ["Maitake"], preliminaryId: "47795" },
  { scientificName: "Lentinula edodes", commonNames: ["Shiitake"], preliminaryId: "48564" },
  { scientificName: "Ophiocordyceps sinensis", commonNames: ["Caterpillar Fungus"], preliminaryId: "320600" },
  { scientificName: "Agaricus blazei", commonNames: ["Almond Mushroom"], preliminaryId: "121529" },
  { scientificName: "Wolfiporia extensa", commonNames: ["Poria"], preliminaryId: "774375" },

  // Culinary Mushrooms
  { scientificName: "Agaricus bisporus", commonNames: ["Button Mushroom", "Portobello"], preliminaryId: "54649" },
  { scientificName: "Pleurotus ostreatus", commonNames: ["Oyster Mushroom"], preliminaryId: "48701" },
  { scientificName: "Morchella esculenta", commonNames: ["Yellow Morel"], preliminaryId: "55042" },
  { scientificName: "Cantharellus cibarius", commonNames: ["Chanterelle"], preliminaryId: "47348" },
  { scientificName: "Boletus edulis", commonNames: ["Porcini"], preliminaryId: "48701" },
  { scientificName: "Flammulina velutipes", commonNames: ["Enoki"], preliminaryId: "55409" },
  { scientificName: "Volvariella volvacea", commonNames: ["Straw Mushroom"], preliminaryId: "57137" },
  { scientificName: "Auricularia auricula-judae", commonNames: ["Wood Ear"], preliminaryId: "49769" },
  { scientificName: "Tuber melanosporum", commonNames: ["Black Truffle"], preliminaryId: "55973" },
  { scientificName: "Craterellus cornucopioides", commonNames: ["Black Trumpet"], preliminaryId: "47496" },

  // Psychedelic Mushrooms (for research/taxonomy only)
  { scientificName: "Psilocybe cubensis", commonNames: ["Golden Teacher"], preliminaryId: "56772" },
  { scientificName: "Psilocybe semilanceata", commonNames: ["Liberty Cap"], preliminaryId: "56878" },
  { scientificName: "Amanita muscaria", commonNames: ["Fly Agaric"], preliminaryId: "48715" },

  // Common Wild Mushrooms
  { scientificName: "Armillaria mellea", commonNames: ["Honey Fungus"], preliminaryId: "47686" },
  { scientificName: "Coprinus comatus", commonNames: ["Shaggy Mane"], preliminaryId: "48490" },
  { scientificName: "Macrolepiota procera", commonNames: ["Parasol Mushroom"], preliminaryId: "47827" },
  { scientificName: "Laetiporus sulphureus", commonNames: ["Chicken of the Woods"], preliminaryId: "48484" },
  { scientificName: "Calvatia gigantea", commonNames: ["Giant Puffball"], preliminaryId: "47792" },
  { scientificName: "Pleurotus eryngii", commonNames: ["King Oyster"], preliminaryId: "121968" },
  { scientificName: "Hydnum repandum", commonNames: ["Sweet Tooth"], preliminaryId: "47796" },

  // ... more species to be added to reach 100
]

interface ValidationReport {
  totalSpecies: number
  validIds: number
  invalidIds: number
  errors: number
  validatedSpecies: Array<{
    scientificName: string
    commonNames: string[]
    iNaturalistId: string
    status: "valid" | "invalid" | "error"
    correctId?: string
    error?: string
  }>
}

async function validateTop100(): Promise<ValidationReport> {
  const report: ValidationReport = {
    totalSpecies: TOP_100_MUSHROOMS.length,
    validIds: 0,
    invalidIds: 0,
    errors: 0,
    validatedSpecies: [],
  }

  console.log("Starting validation of top 100 mushroom species...")
  console.log("===============================================")

  for (const mushroom of TOP_100_MUSHROOMS) {
    console.log(`\nValidating ${mushroom.scientificName}...`)

    try {
      const result = await validateSpeciesId(mushroom.scientificName, mushroom.preliminaryId)

      report.validatedSpecies.push({
        scientificName: mushroom.scientificName,
        commonNames: mushroom.commonNames,
        iNaturalistId: result.correctId || result.currentId,
        status: result.status,
        ...(result.correctId && { correctId: result.correctId }),
        ...(result.error && { error: result.error }),
      })

      if (result.status === "valid") {
        report.validIds++
        console.log(`✓ Valid ID: ${result.currentId}`)
      } else if (result.status === "invalid") {
        report.invalidIds++
        console.log(`✗ Invalid ID: ${result.currentId} should be ${result.correctId}`)
      } else {
        report.errors++
        console.log(`! Error: ${result.error}`)
      }
    } catch (error) {
      report.errors++
      console.error(`Error validating ${mushroom.scientificName}:`, error)
    }

    // Add delay to respect API rate limits
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  return report
}

async function generateSpeciesMapping(report: ValidationReport) {
  const categories = {
    medicinal: ["Hericium erinaceus", "Trametes versicolor", "Ganoderma lucidum", "Inonotus obliquus"],
    culinary: ["Agaricus bisporus", "Pleurotus ostreatus", "Lentinula edodes"],
    wild: ["Armillaria mellea", "Calvatia gigantea", "Macrolepiota procera"],
    research: ["Psilocybe cubensis", "Amanita muscaria"],
  }

  let mapping = "export const VERIFIED_SPECIES_MAPPING = {\n"

  // Group species by category
  for (const [category, speciesList] of Object.entries(categories)) {
    mapping += `\n  // ${category.charAt(0).toUpperCase() + category.slice(1)} Mushrooms\n`

    for (const scientificName of speciesList) {
      const species = report.validatedSpecies.find((s) => s.scientificName === scientificName)
      if (species && species.status !== "error") {
        const slug = scientificName.toLowerCase().replace(/\s+/g, "-")
        mapping += `  "${slug}": {\n`
        mapping += `    iNaturalistId: "${species.correctId || species.iNaturalistId}",\n`
        mapping += `    commonNames: ${JSON.stringify(species.commonNames)},\n`
        mapping += `    scientificName: "${species.scientificName}",\n`
        mapping += `    category: "${category}",\n`
        mapping += `  },\n`
      }
    }
  }

  mapping += "}\n"
  return mapping
}

async function main() {
  const report = await validateTop100()

  console.log("\nValidation Report")
  console.log("================")
  console.log(`Total Species: ${report.totalSpecies}`)
  console.log(`Valid IDs: ${report.validIds}`)
  console.log(`Invalid IDs: ${report.invalidIds}`)
  console.log(`Errors: ${report.errors}`)

  // Generate updated species mapping
  const mapping = await generateSpeciesMapping(report)

  // Save report and mapping
  const outputDir = path.join(process.cwd(), "validation-results")
  await fs.mkdir(outputDir, { recursive: true })

  await fs.writeFile(path.join(outputDir, "species-validation-report.json"), JSON.stringify(report, null, 2))

  await fs.writeFile(path.join(outputDir, "verified-species-mapping.ts"), mapping)

  console.log("\nResults saved to validation-results/")
}

main().catch(console.error)
