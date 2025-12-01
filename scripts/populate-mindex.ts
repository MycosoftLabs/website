// Script to populate MINDEX with species data via MYCA orchestration
import { mindexClient } from "../lib/services/mindex-client"
import { mycaOrchestrator } from "../lib/services/myca-orchestrator"

const TOP_FUNGAL_SPECIES = [
  "Agaricus bisporus",
  "Pleurotus ostreatus",
  "Lentinula edodes",
  "Hericium erinaceus",
  "Ganoderma lucidum",
  "Amanita muscaria",
  "Cantharellus cibarius",
  "Morchella esculenta",
  "Boletus edulis",
  "Lactarius deliciosus",
  "Trametes versicolor",
  "Cordyceps militaris",
  "Psilocybe cubensis",
  "Grifola frondosa",
  "Flammulina velutipes",
  "Armillaria mellea",
  "Coprinus comatus",
  "Russula emetica",
  "Lycoperdon perlatum",
  "Auricularia auricula-judae",
]

async function populateMINDEX() {
  console.log("[v0] Starting MINDEX population via MYCA...")

  try {
    // Connect to MINDEX
    await mindexClient.connect()

    if (!mindexClient.isConnected()) {
      throw new Error("Failed to connect to MINDEX")
    }

    console.log("[v0] Connected to MINDEX")

    const tasks: string[] = []

    // Submit scraping tasks to MYCA for each species
    for (const speciesName of TOP_FUNGAL_SPECIES) {
      console.log(`[v0] Submitting scrape task for: ${speciesName}`)

      try {
        const taskId = await mycaOrchestrator.scrapeSpecies(speciesName, [
          "inaturalist",
          "wikipedia",
          "fungidb",
          "mycobank",
          "mushroom-world",
        ])

        tasks.push(taskId)
        console.log(`[v0] Task submitted: ${taskId}`)
      } catch (error) {
        console.error(`[v0] Failed to submit task for ${speciesName}:`, error)
      }

      // Add delay to avoid overwhelming MYCA
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    console.log(`[v0] Submitted ${tasks.length} tasks to MYCA`)
    console.log("[v0] Task IDs:", tasks)

    // Monitor task completion
    console.log("[v0] Monitoring task completion...")

    let completedTasks = 0
    const checkInterval = setInterval(async () => {
      for (const taskId of tasks) {
        try {
          const status = await mycaOrchestrator.getTaskStatus(taskId)

          if (status.status === "completed") {
            completedTasks++
            console.log(`[v0] Task completed (${completedTasks}/${tasks.length}): ${taskId}`)
          } else if (status.status === "failed") {
            console.error(`[v0] Task failed: ${taskId}`, status.error)
          }
        } catch (error) {
          console.error(`[v0] Failed to check task status: ${taskId}`, error)
        }
      }

      if (completedTasks === tasks.length) {
        clearInterval(checkInterval)
        console.log("[v0] All tasks completed!")
        await mindexClient.disconnect()
        process.exit(0)
      }
    }, 5000) // Check every 5 seconds
  } catch (error) {
    console.error("[v0] MINDEX population failed:", error)
    await mindexClient.disconnect()
    process.exit(1)
  }
}

// Run the population script
populateMINDEX()
