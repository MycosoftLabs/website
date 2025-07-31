import { neon } from "@neondatabase/serverless"

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
  {
    scientific_name: "Agaricus bisporus",
    common_name: "Button Mushroom",
    family: "Agaricaceae",
    description: "The most commonly cultivated mushroom worldwide, available in white and brown varieties.",
    image_url: "/cultivated-button-mushrooms.png",
    characteristics: ["Edible", "Culinary"],
  },
  {
    scientific_name: "Lentinula edodes",
    common_name: "Shiitake",
    family: "Omphalotaceae",
    description: "Popular culinary mushroom with umbrella-shaped brown caps and cream gills, native to East Asia.",
    image_url: "/cluster-of-shiitake.png",
    characteristics: ["Edible", "Culinary", "Medicinal"],
  },
  {
    scientific_name: "Coprinopsis atramentaria",
    common_name: "Inky Cap",
    family: "Psathyrellaceae",
    description:
      "Bell-shaped caps that dissolve into black inky substance. Contains coprine which causes alcohol intolerance.",
    image_url: "/deliquescing-inky-caps.png",
    characteristics: ["Poisonous with alcohol", "Edible otherwise"],
  },
  {
    scientific_name: "Trametes versicolor",
    common_name: "Turkey Tail",
    family: "Polyporaceae",
    description:
      "Colorful bracket fungus with concentric zones of varying colors, used medicinally for immune support.",
    image_url: "/bracket-fungi-log.png",
    characteristics: ["Medicinal", "Non-edible"],
  },
  {
    scientific_name: "Hydnum repandum",
    common_name: "Hedgehog Mushroom",
    family: "Hydnaceae",
    description: "Pale yellow to orange-brown cap with spines instead of gills underneath. Excellent edible mushroom.",
    image_url: "/toothed-fungi.png",
    characteristics: ["Edible", "Culinary"],
  },
  {
    scientific_name: "Laetiporus sulphureus",
    common_name: "Chicken of the Woods",
    family: "Fomitopsidaceae",
    description:
      "Bright orange to yellow shelf-like brackets growing on trees. Has a texture similar to chicken when cooked.",
    image_url: "/placeholder.svg?height=300&width=400&query=chicken%20of%20the%20woods%20mushroom",
    characteristics: ["Edible", "Culinary"],
  },
]

async function seedDatabase() {
  try {
    // Initialize the SQL client with the database URL
    const sql = neon(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL)

    console.log("Creating species table if it doesn't exist...")

    // Create the species table if it doesn't exist
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

    console.log("Species table created or already exists.")

    // Check if we already have data
    const existingCount = await sql`SELECT COUNT(*) FROM species`

    if (Number.parseInt(existingCount[0].count) > 0) {
      console.log(`Database already has ${existingCount[0].count} species. Clearing existing data...`)
      await sql`TRUNCATE TABLE species RESTART IDENTITY CASCADE`
    }

    console.log("Seeding mushroom species data...")

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
      console.log(`Added: ${species.scientific_name} (${species.common_name})`)
    }

    console.log("Mushroom species data seeded successfully!")

    // Verify the data was inserted
    const count = await sql`SELECT COUNT(*) FROM species`
    console.log(`Total species in database: ${count[0].count}`)
  } catch (error) {
    console.error("Error seeding fungi species:", error)
  }
}

// Execute the seeding function
seedDatabase()
