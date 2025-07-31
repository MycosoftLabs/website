import { validateAllSpecies, generateSpeciesMappingUpdate } from "@/lib/utils/species-validator"

async function main() {
  console.log("Validating species IDs...")

  const results = await validateAllSpecies()

  console.log("\nValidation Results:")
  console.log("==================")

  const invalid = results.filter((r) => r.status === "invalid")
  const valid = results.filter((r) => r.status === "valid")
  const errors = results.filter((r) => r.status === "error")

  console.log(`\nTotal Species: ${results.length}`)
  console.log(`Valid IDs: ${valid.length}`)
  console.log(`Invalid IDs: ${invalid.length}`)
  console.log(`Errors: ${errors.length}`)

  if (invalid.length > 0) {
    console.log("\nInvalid Species IDs:")
    console.log("===================")
    invalid.forEach((result) => {
      console.log(`\n${result.species}:`)
      console.log(`  Current ID: ${result.currentId}`)
      console.log(`  Correct ID: ${result.correctId}`)
    })

    console.log("\nGenerated Species Mapping Update:")
    console.log("==============================")
    console.log(generateSpeciesMappingUpdate(invalid))
  }

  if (errors.length > 0) {
    console.log("\nValidation Errors:")
    console.log("================")
    errors.forEach((result) => {
      console.log(`\n${result.species}:`)
      console.log(`  Error: ${result.error}`)
    })
  }
}

main().catch(console.error)
