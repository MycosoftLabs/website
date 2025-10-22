import { createClient } from "@supabase/supabase-js"
import { getFungiDetails } from "../lib/services/inaturalist"
import { getWikipediaData } from "../lib/services/wikipedia"
import { searchPapersBySpecies } from "../lib/services/research-papers"

// Initialize Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Top 50 most common/important fungal species to seed
const INITIAL_SPECIES = [
  { id: "48701", name: "Amanita muscaria" },
  { id: "48715", name: "Agaricus bisporus" },
  { id: "54743", name: "Pleurotus ostreatus" },
  { id: "48250", name: "Morchella esculenta" },
  { id: "48439", name: "Cantharellus cibarius" },
  { id: "48804", name: "Boletus edulis" },
  { id: "48449", name: "Ganoderma lucidum" },
  { id: "48717", name: "Agaricus campestris" },
  { id: "48702", name: "Amanita phalloides" },
  { id: "48703", name: "Amanita virosa" },
  { id: "54744", name: "Pleurotus pulmonarius" },
  { id: "48251", name: "Morchella elata" },
  { id: "48805", name: "Boletus aereus" },
  { id: "48806", name: "Boletus pinophilus" },
  { id: "48440", name: "Cantharellus formosus" },
  { id: "48441", name: "Cantharellus lateritius" },
  { id: "48704", name: "Amanita pantherina" },
  { id: "48705", name: "Amanita rubescens" },
  { id: "48718", name: "Agaricus augustus" },
  { id: "48719", name: "Agaricus arvensis" },
]

async function seedSpecies() {
  console.log("Starting species seeding...")

  for (const species of INITIAL_SPECIES) {
    try {
      console.log(`\nProcessing ${species.name} (${species.id})...`)

      // Check if already exists
      const { data: existing } = await supabase.from("species").select("id").eq("inaturalist_id", species.id).single()

      if (existing) {
        console.log(`  ✓ Already exists, skipping`)
        continue
      }

      // Fetch from iNaturalist
      console.log(`  Fetching from iNaturalist...`)
      const iNatData = await getFungiDetails(species.id)

      // Fetch from Wikipedia
      console.log(`  Fetching from Wikipedia...`)
      let wikiData = null
      try {
        wikiData = await getWikipediaData(iNatData.scientificName)
      } catch (error) {
        console.warn(`  ⚠ Wikipedia fetch failed`)
      }

      // Insert species
      console.log(`  Inserting species...`)
      const { data: insertedSpecies, error: speciesError } = await supabase
        .from("species")
        .insert({
          inaturalist_id: species.id,
          scientific_name: iNatData.scientificName,
          common_names: iNatData.commonName ? [iNatData.commonName] : [],
          description: iNatData.description || wikiData?.extract || "",
          taxonomy: iNatData.taxonomy,
          sources: {
            inaturalist: iNatData,
            wikipedia: wikiData,
          },
        })
        .select()
        .single()

      if (speciesError) {
        console.error(`  ✗ Error inserting species:`, speciesError)
        continue
      }

      // Insert images
      if (iNatData.images && iNatData.images.length > 0) {
        console.log(`  Inserting ${iNatData.images.length} images...`)
        const images = iNatData.images.slice(0, 10).map((img: any, index: number) => ({
          species_id: insertedSpecies.id,
          url: img.url,
          thumbnail_url: img.thumbnail,
          attribution: img.attribution,
          license: img.license_code,
          source: "inaturalist",
          is_primary: index === 0,
        }))

        await supabase.from("species_images").insert(images)
      }

      // Fetch and insert papers
      console.log(`  Fetching research papers...`)
      try {
        const papers = await searchPapersBySpecies(iNatData.scientificName, iNatData.commonName)

        for (const paper of papers.slice(0, 5)) {
          const { data: insertedPaper } = await supabase
            .from("research_papers")
            .upsert(
              {
                title: paper.title,
                authors: paper.authors,
                abstract: paper.abstract,
                year: paper.year,
                journal: paper.journal,
                doi: paper.doi,
                external_url: paper.url,
                source: paper.source,
                keywords: paper.keywords,
              },
              {
                onConflict: "doi",
                ignoreDuplicates: false,
              },
            )
            .select()
            .single()

          if (insertedPaper) {
            await supabase.from("species_papers").upsert(
              {
                species_id: insertedSpecies.id,
                paper_id: insertedPaper.id,
                relevance_score: 1.0,
              },
              {
                onConflict: "species_id,paper_id",
                ignoreDuplicates: true,
              },
            )
          }
        }
        console.log(`  ✓ Added ${papers.length} papers`)
      } catch (error) {
        console.warn(`  ⚠ Error fetching papers`)
      }

      console.log(`  ✓ Successfully seeded ${species.name}`)

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000))
    } catch (error) {
      console.error(`  ✗ Error processing ${species.name}:`, error)
    }
  }

  console.log("\n✓ Seeding complete!")
}

seedSpecies()
