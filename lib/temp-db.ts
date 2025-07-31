import { tempDB } from "./temp-db-singleton"
import type { FungiSpecies } from "@/types/fungi"

// Initialize collections with mock data
const initialSpecies: FungiSpecies[] = [
  {
    id: "49158",
    iNaturalistId: "49158",
    commonName: "Lion's Mane",
    scientificName: "Hericium erinaceus",
    description: "A medicinal mushroom known for its cognitive benefits and distinctive appearance.",
    type: "medicinal",
    taxonomy: {
      kingdom: "Fungi",
      phylum: "Basidiomycota",
      class: "Agaricomycetes",
      order: "Russulales",
      family: "Hericiaceae",
      genus: "Hericium",
      species: "H. erinaceus",
    },
    characteristics: {
      habitat: ["Hardwood trees", "Oak", "Maple", "Beech"],
      season: ["Late summer", "Fall"],
      edibility: "Edible and medicinal",
    },
    images: [
      {
        url: "https://inaturalist-open-data.s3.amazonaws.com/photos/58603433/large.jpg",
        medium_url: "https://inaturalist-open-data.s3.amazonaws.com/photos/58603433/medium.jpg",
        large_url: "https://inaturalist-open-data.s3.amazonaws.com/photos/58603433/large.jpg",
        attribution: "© Noah Siegel",
        type: "primary",
        source_url: "https://www.inaturalist.org/photos/58603433",
      },
    ],
    references: [
      {
        title: "View on iNaturalist",
        url: "https://www.inaturalist.org/taxa/49158",
        type: "database",
      },
    ],
    lastUpdated: new Date().toISOString(),
  },
  {
    id: "48484",
    iNaturalistId: "48484",
    commonName: "Reishi",
    scientificName: "Ganoderma lucidum",
    description: "A medicinal mushroom known for its immune-boosting properties.",
    type: "medicinal",
    taxonomy: {
      kingdom: "Fungi",
      phylum: "Basidiomycota",
      class: "Agaricomycetes",
      order: "Polyporales",
      family: "Ganodermataceae",
      genus: "Ganoderma",
      species: "G. lucidum",
    },
    characteristics: {
      habitat: ["Dead hardwood", "Tree stumps"],
      season: ["Year-round"],
      edibility: "Medicinal",
    },
    images: [
      {
        url: "https://inaturalist-open-data.s3.amazonaws.com/photos/12345/large.jpg",
        medium_url: "https://inaturalist-open-data.s3.amazonaws.com/photos/12345/medium.jpg",
        attribution: "© iNaturalist",
        type: "primary",
        source_url: "https://www.inaturalist.org/photos/12345",
      },
    ],
    references: [
      {
        title: "View on iNaturalist",
        url: "https://www.inaturalist.org/taxa/48484",
        type: "database",
      },
    ],
    lastUpdated: new Date().toISOString(),
  },
]

// Initialize the database with the species collection
tempDB.initCollection<FungiSpecies>("species", initialSpecies, ["id", "iNaturalistId", "scientificName"])

// Export database functions
export async function findOne<T>(collection: string, query: any = {}): Promise<T | null> {
  return tempDB.findOne<T>(collection, query)
}

export async function find<T>(collection: string, query: any = {}): Promise<T[]> {
  return tempDB.find<T>(collection, query)
}

export async function insertOne<T>(collection: string, document: T): Promise<void> {
  return tempDB.insertOne<T>(collection, document)
}

export async function updateOne<T>(collection: string, query: any, update: any): Promise<void> {
  return tempDB.updateOne<T>(collection, query, update)
}

export async function deleteOne(collection: string, query: any): Promise<void> {
  return tempDB.deleteOne(collection, query)
}
