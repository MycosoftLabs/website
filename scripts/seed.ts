import { db } from "@/lib/db"
import { fungi } from "@/schema/fungi"

async function seed() {
  try {
    await db.insert(fungi).values([
      {
        name: "Lion's Mane",
        scientificName: "Hericium erinaceus",
        type: "medicinal",
        description: "Known for potential cognitive benefits",
      },
      {
        name: "Turkey Tail",
        scientificName: "Trametes versicolor",
        type: "medicinal",
        description: "Popular for immune system support",
      },
    ])

    console.log("Seed data inserted successfully")
  } catch (error) {
    console.error("Error seeding database:", error)
    process.exit(1)
  }
}

seed()
