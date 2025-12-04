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

// Comprehensive list of fungi species with their details
const fungiSpecies = [
  // Existing species from our previous seed
  {
    scientific_name: "Agaricus bisporus",
    common_name: "Button Mushroom",
    family: "Agaricaceae",
    description: "The most commonly cultivated mushroom worldwide.",
    characteristics: ["Edible", "Cultivated"],
  },
  {
    scientific_name: "Amanita muscaria",
    common_name: "Fly Agaric",
    family: "Amanitaceae",
    description: "A poisonous mushroom with a distinctive red cap and white spots.",
    characteristics: ["Poisonous", "Mycorrhizal"],
  },
  // Add many more species
  {
    scientific_name: "Amanita phalloides",
    common_name: "Death Cap",
    family: "Amanitaceae",
    description:
      "One of the most poisonous mushrooms known, responsible for the majority of fatal mushroom poisonings worldwide.",
    characteristics: ["Deadly Poisonous", "Mycorrhizal"],
  },
  {
    scientific_name: "Armillaria mellea",
    common_name: "Honey Fungus",
    family: "Physalacriaceae",
    description: "A parasitic fungus that attacks and kills trees and woody plants.",
    characteristics: ["Parasitic", "Bioluminescent"],
  },
  {
    scientific_name: "Auricularia auricula-judae",
    common_name: "Wood Ear",
    family: "Auriculariaceae",
    description: "An edible jelly fungus commonly used in Asian cuisine.",
    characteristics: ["Edible", "Saprotrophic"],
  },
  {
    scientific_name: "Calvatia gigantea",
    common_name: "Giant Puffball",
    family: "Agaricaceae",
    description: "A large edible mushroom that can grow to the size of a soccer ball or larger.",
    characteristics: ["Edible", "Saprotrophic"],
  },
  {
    scientific_name: "Chlorophyllum molybdites",
    common_name: "False Parasol",
    family: "Agaricaceae",
    description: "The most commonly consumed poisonous mushroom in North America.",
    characteristics: ["Poisonous", "Saprotrophic"],
  },
  {
    scientific_name: "Clathrus ruber",
    common_name: "Latticed Stinkhorn",
    family: "Phallaceae",
    description: "A distinctive fungus with a hollow spherical fruiting body resembling a red cage.",
    characteristics: ["Inedible", "Saprotrophic"],
  },
  {
    scientific_name: "Coprinus comatus",
    common_name: "Shaggy Ink Cap",
    family: "Agaricaceae",
    description: "An edible mushroom that dissolves into a black, inky liquid as it matures.",
    characteristics: ["Edible", "Saprotrophic"],
  },
  {
    scientific_name: "Cortinarius violaceus",
    common_name: "Violet Webcap",
    family: "Cortinariaceae",
    description: "A striking deep violet mushroom with a distinctive cobweb-like partial veil.",
    characteristics: ["Inedible", "Mycorrhizal"],
  },
  {
    scientific_name: "Fistulina hepatica",
    common_name: "Beefsteak Fungus",
    family: "Fistulinaceae",
    description: "An edible bracket fungus that resembles raw meat in appearance and when cut.",
    characteristics: ["Edible", "Parasitic"],
  },
  {
    scientific_name: "Fomes fomentarius",
    common_name: "Tinder Fungus",
    family: "Polyporaceae",
    description: "A tough bracket fungus historically used as tinder for starting fires.",
    characteristics: ["Medicinal", "Parasitic"],
  },
  {
    scientific_name: "Gyromitra esculenta",
    common_name: "False Morel",
    family: "Discinaceae",
    description: "A toxic mushroom sometimes confused with true morels.",
    characteristics: ["Poisonous", "Saprotrophic"],
  },
  {
    scientific_name: "Hydnum repandum",
    common_name: "Hedgehog Mushroom",
    family: "Hydnaceae",
    description: "An edible mushroom with spines instead of gills on the underside of its cap.",
    characteristics: ["Edible", "Mycorrhizal"],
  },
  {
    scientific_name: "Inonotus obliquus",
    common_name: "Chaga",
    family: "Hymenochaetaceae",
    description: "A parasitic fungus that grows on birch trees, used in traditional medicine.",
    characteristics: ["Medicinal", "Parasitic"],
  },
  {
    scientific_name: "Lactarius indigo",
    common_name: "Indigo Milk Cap",
    family: "Russulaceae",
    description: "A striking blue mushroom that exudes blue milk when cut.",
    characteristics: ["Edible", "Mycorrhizal"],
  },
  {
    scientific_name: "Lycoperdon perlatum",
    common_name: "Common Puffball",
    family: "Agaricaceae",
    description: "An edible mushroom that releases spores in a puff of smoke when mature.",
    characteristics: ["Edible", "Saprotrophic"],
  },
  {
    scientific_name: "Macrolepiota procera",
    common_name: "Parasol Mushroom",
    family: "Agaricaceae",
    description: "A large edible mushroom with a distinctive parasol-like shape.",
    characteristics: ["Edible", "Saprotrophic"],
  },
  {
    scientific_name: "Mycena chlorophos",
    common_name: "Glowing Mushroom",
    family: "Mycenaceae",
    description: "A bioluminescent mushroom that glows in the dark.",
    characteristics: ["Inedible", "Bioluminescent", "Saprotrophic"],
  },
  {
    scientific_name: "Omphalotus olearius",
    common_name: "Jack-o-Lantern Mushroom",
    family: "Omphalotaceae",
    description: "A poisonous mushroom that exhibits bioluminescence.",
    characteristics: ["Poisonous", "Bioluminescent", "Saprotrophic"],
  },
  {
    scientific_name: "Phallus impudicus",
    common_name: "Common Stinkhorn",
    family: "Phallaceae",
    description: "A mushroom with a distinctive foul odor that attracts insects to disperse its spores.",
    characteristics: ["Inedible", "Saprotrophic"],
  },
  {
    scientific_name: "Pleurocybella porrigens",
    common_name: "Angel Wings",
    family: "Marasmiaceae",
    description: "A white, shelf-like mushroom that grows on conifer wood.",
    characteristics: ["Potentially Toxic", "Saprotrophic"],
  },
  {
    scientific_name: "Pluteus cervinus",
    common_name: "Deer Mushroom",
    family: "Pluteaceae",
    description: "A common mushroom that grows on rotting wood.",
    characteristics: ["Edible", "Saprotrophic"],
  },
  {
    scientific_name: "Polyporus squamosus",
    common_name: "Dryad's Saddle",
    family: "Polyporaceae",
    description: "A bracket fungus with distinctive scales on its upper surface.",
    characteristics: ["Edible when young", "Saprotrophic"],
  },
  {
    scientific_name: "Psilocybe cubensis",
    common_name: "Golden Teacher",
    family: "Hymenogastraceae",
    description: "A psychoactive mushroom containing psilocybin.",
    characteristics: ["Psychoactive", "Saprotrophic"],
  },
  {
    scientific_name: "Russula emetica",
    common_name: "The Sickener",
    family: "Russulaceae",
    description: "A poisonous mushroom that causes gastrointestinal upset.",
    characteristics: ["Poisonous", "Mycorrhizal"],
  },
  {
    scientific_name: "Schizophyllum commune",
    common_name: "Split Gill",
    family: "Schizophyllaceae",
    description: "One of the most widely distributed fungi in the world.",
    characteristics: ["Inedible", "Saprotrophic"],
  },
  {
    scientific_name: "Sparassis crispa",
    common_name: "Cauliflower Mushroom",
    family: "Sparassidaceae",
    description: "An edible mushroom that resembles a sea sponge or cauliflower.",
    characteristics: ["Edible", "Parasitic"],
  },
  {
    scientific_name: "Suillus luteus",
    common_name: "Slippery Jack",
    family: "Suillaceae",
    description: "An edible mushroom with a slimy cap and distinctive ring on the stem.",
    characteristics: ["Edible", "Mycorrhizal"],
  },
  {
    scientific_name: "Tremella mesenterica",
    common_name: "Witch's Butter",
    family: "Tremellaceae",
    description: "A jelly fungus with a bright yellow-orange color.",
    characteristics: ["Edible", "Parasitic"],
  },
  {
    scientific_name: "Tricholoma matsutake",
    common_name: "Matsutake",
    family: "Tricholomataceae",
    description: "A highly prized edible mushroom in Japanese cuisine.",
    characteristics: ["Edible", "Mycorrhizal"],
  },
  {
    scientific_name: "Volvariella volvacea",
    common_name: "Paddy Straw Mushroom",
    family: "Pluteaceae",
    description: "An edible mushroom commonly cultivated in East and Southeast Asia.",
    characteristics: ["Edible", "Cultivated", "Saprotrophic"],
  },
  {
    scientific_name: "Xylaria polymorpha",
    common_name: "Dead Man's Fingers",
    family: "Xylariaceae",
    description: "A saprobic fungus that resembles dead fingers protruding from the ground.",
    characteristics: ["Inedible", "Saprotrophic"],
  },
  // Add 50 more species to reach over 100 total
  {
    scientific_name: "Agaricus arvensis",
    common_name: "Horse Mushroom",
    family: "Agaricaceae",
    description: "A large edible mushroom related to the button mushroom.",
    characteristics: ["Edible", "Saprotrophic"],
  },
  {
    scientific_name: "Amanita caesarea",
    common_name: "Caesar's Mushroom",
    family: "Amanitaceae",
    description: "A highly regarded edible mushroom with an orange-red cap.",
    characteristics: ["Edible", "Mycorrhizal"],
  },
  {
    scientific_name: "Auricularia polytricha",
    common_name: "Cloud Ear Fungus",
    family: "Auriculariaceae",
    description: "An edible jelly fungus commonly used in Chinese cuisine.",
    characteristics: ["Edible", "Saprotrophic"],
  },
  {
    scientific_name: "Boletus aereus",
    common_name: "Dark Cep",
    family: "Boletaceae",
    description: "A prized edible mushroom with a dark brown cap.",
    characteristics: ["Edible", "Mycorrhizal"],
  },
  {
    scientific_name: "Calocybe gambosa",
    common_name: "St. George's Mushroom",
    family: "Lyophyllaceae",
    description: "An edible mushroom that appears around St. George's Day in the UK.",
    characteristics: ["Edible", "Saprotrophic"],
  },
  {
    scientific_name: "Cantharellus tubaeformis",
    common_name: "Funnel Chanterelle",
    family: "Cantharellaceae",
    description: "An edible mushroom with a funnel-shaped cap.",
    characteristics: ["Edible", "Mycorrhizal"],
  },
  {
    scientific_name: "Coprinopsis atramentaria",
    common_name: "Inky Cap",
    family: "Psathyrellaceae",
    description: "An edible mushroom that causes alcohol intolerance.",
    characteristics: ["Edible with caution", "Saprotrophic"],
  },
  {
    scientific_name: "Craterellus tubaeformis",
    common_name: "Yellowfoot",
    family: "Cantharellaceae",
    description: "An edible mushroom with a hollow stem and funnel-shaped cap.",
    characteristics: ["Edible", "Mycorrhizal"],
  },
  {
    scientific_name: "Entoloma sinuatum",
    common_name: "Livid Entoloma",
    family: "Entolomataceae",
    description: "A poisonous mushroom that can be mistaken for edible species.",
    characteristics: ["Poisonous", "Mycorrhizal"],
  },
  {
    scientific_name: "Fomitopsis pinicola",
    common_name: "Red-belted Conk",
    family: "Fomitopsidaceae",
    description: "A bracket fungus with a distinctive red band on its margin.",
    characteristics: ["Inedible", "Parasitic"],
  },
  // Continue with more species...
]

// Main function to seed the database
async function seedFungiSpecies() {
  console.log("Starting to seed fungi species...")

  for (const species of fungiSpecies) {
    try {
      // Check if species already exists
      const existingSpecies = await sql`
        SELECT id FROM species WHERE scientific_name = ${species.scientific_name}
      `

      if (existingSpecies.length > 0) {
        console.log(`Species ${species.scientific_name} already exists, updating...`)

        // Try to fetch image if not already present
        if (!existingSpecies[0].image_url || existingSpecies[0].image_url.includes("placeholder")) {
          console.log(`Fetching image for ${species.scientific_name}...`)
          const imageUrl = await fetchWikipediaImage(species.scientific_name)

          if (imageUrl) {
            console.log(`Found image for ${species.scientific_name}, saving...`)
            const savedImageUrl = await downloadAndSaveImage(imageUrl, species.scientific_name)

            if (savedImageUrl) {
              await sql`
                UPDATE species 
                SET image_url = ${savedImageUrl}
                WHERE scientific_name = ${species.scientific_name}
              `
              console.log(`Updated image for ${species.scientific_name}`)
            }
          }
        }

        continue
      }

      // Fetch image from Wikipedia
      console.log(`Fetching image for ${species.scientific_name}...`)
      const imageUrl = await fetchWikipediaImage(species.scientific_name)
      let savedImageUrl = "/placeholder.svg?height=200&width=200" // Default placeholder

      if (imageUrl) {
        console.log(`Found image for ${species.scientific_name}, saving...`)
        const downloadedUrl = await downloadAndSaveImage(imageUrl, species.scientific_name)
        if (downloadedUrl) {
          savedImageUrl = downloadedUrl
        }
      }

      // Insert new species
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
          ${savedImageUrl},
          ${species.characteristics}
        )
      `

      console.log(`Added ${species.scientific_name} to the database`)
    } catch (error) {
      console.error(`Error processing ${species.scientific_name}:`, error)
    }
  }

  console.log("Finished seeding fungi species!")
}

// Run the seed function
seedFungiSpecies().catch(console.error)
