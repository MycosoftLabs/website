import { neon } from "@neondatabase/serverless"

// Initialize database connection
const sql = neon(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL)

async function createSpeciesTable() {
  try {
    console.log("Creating species table...")

    // Create the species table
    await sql`
      CREATE TABLE IF NOT EXISTS species (
        id SERIAL PRIMARY KEY,
        scientific_name VARCHAR(255) NOT NULL UNIQUE,
        common_name VARCHAR(255),
        family VARCHAR(255),
        description TEXT,
        image_url VARCHAR(255),
        characteristics TEXT[],
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    console.log("Species table created successfully!")

    // Check if we already have data
    const existingCount = await sql`SELECT COUNT(*) FROM species`
    console.log(`Current species count: ${existingCount[0].count}`)

    if (Number.parseInt(existingCount[0].count) === 0) {
      console.log("Seeding initial species data...")

      // Sample mushroom species data
      const mushroomSpecies = [
        {
          scientific_name: "Amanita muscaria",
          common_name: "Fly Agaric",
          family: "Amanitaceae",
          description:
            "Iconic red mushroom with white spots, known for its psychoactive properties and use in traditional practices.",
          image_url: "/classic-amanita.png",
          characteristics: ["Poisonous", "Psychoactive"],
        },
        {
          scientific_name: "Boletus edulis",
          common_name: "Porcini",
          family: "Boletaceae",
          description:
            "Prized edible mushroom with a brown cap, thick stem, and pores instead of gills. Highly sought after for culinary use.",
          image_url: "/king-bolete-close-up.png",
          characteristics: ["Edible", "Culinary"],
        },
        {
          scientific_name: "Cantharellus cibarius",
          common_name: "Chanterelle",
          family: "Cantharellaceae",
          description:
            "Golden-yellow funnel-shaped mushroom with a fruity aroma and mild peppery taste. Popular edible wild mushroom.",
          image_url: "/golden-chanterelles.png",
          characteristics: ["Edible", "Culinary"],
        },
        {
          scientific_name: "Morchella esculenta",
          common_name: "Morel",
          family: "Morchellaceae",
          description: "Distinctive honeycomb pattern on cap, highly prized edible mushroom with unique nutty flavor.",
          image_url: "/forest-floor-morel.png",
          characteristics: ["Edible", "Culinary"],
        },
        {
          scientific_name: "Pleurotus ostreatus",
          common_name: "Oyster Mushroom",
          family: "Pleurotaceae",
          description:
            "Shelf-like growth on trees, oyster-shaped caps with gills running down the stem. Commonly cultivated edible mushroom.",
          image_url: "/oyster-mushroom-abundance.png",
          characteristics: ["Edible", "Culinary", "Medicinal"],
        },
        {
          scientific_name: "Ganoderma lucidum",
          common_name: "Reishi",
          family: "Ganodermataceae",
          description:
            "Shiny, reddish-brown shelf fungus with medicinal properties, used in traditional Asian medicine for centuries.",
          image_url: "/vibrant-reishi.png",
          characteristics: ["Medicinal", "Non-edible"],
        },
      ]

      // Insert each mushroom species
      for (const species of mushroomSpecies) {
        await sql`
          INSERT INTO species (
            scientific_name, 
            common_name, 
            family, 
            description, 
            image_url, 
            characteristics
          ) VALUES (
            ${species.scientific_name}, 
            ${species.common_name}, 
            ${species.family}, 
            ${species.description}, 
            ${species.image_url}, 
            ${species.characteristics}
          )
          ON CONFLICT (scientific_name) DO NOTHING
        `
        console.log(`Added ${species.scientific_name}`)
      }

      console.log("Mushroom species data seeded successfully!")
    }

    // Verify the data was inserted
    const count = await sql`SELECT COUNT(*) FROM species`
    console.log(`Total species in database: ${count[0].count}`)

    // List all species
    const allSpecies = await sql`SELECT id, scientific_name, common_name FROM species`
    console.log("All species in database:")
    console.table(allSpecies)
  } catch (error) {
    console.error("Error creating species table:", error)
  }
}

// Execute the function
createSpeciesTable()
