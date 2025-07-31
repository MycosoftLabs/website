if (!process.env.MONGODB_ENDPOINT_URL) {
  throw new Error("Please add MONGODB_ENDPOINT_URL to your environment variables")
}

if (!process.env.MONGODB_API_KEY) {
  throw new Error("Please add MONGODB_API_KEY to your environment variables")
}

const MONGODB_ENDPOINT_URL = process.env.MONGODB_ENDPOINT_URL
const MONGODB_API_KEY = process.env.MONGODB_API_KEY

export async function fetchFromMongoDB(action: string, data: any) {
  try {
    const response = await fetch(`${MONGODB_ENDPOINT_URL}/action/${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Request-Headers": "*",
        "api-key": MONGODB_API_KEY,
      },
      body: JSON.stringify({
        ...data,
        database: "mycorrhizae",
        dataSource: "MycorrhizaeDB",
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.error || `MongoDB API error: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()

    if (result.error) {
      throw new Error(result.error)
    }

    return result
  } catch (error) {
    console.error("MongoDB operation failed:", error)
    throw new Error(error instanceof Error ? error.message : "MongoDB operation failed")
  }
}

export async function findOne(collection: string, filter: object = {}, projection: object = {}) {
  return fetchFromMongoDB("findOne", {
    collection,
    filter,
    projection,
  })
}

export async function find(collection: string, filter: object = {}, projection: object = {}) {
  return fetchFromMongoDB("find", {
    collection,
    filter,
    projection,
  })
}

export async function insertOne(collection: string, document: object) {
  return fetchFromMongoDB("insertOne", {
    collection,
    document,
  })
}

export async function updateOne(collection: string, filter: object, update: object) {
  return fetchFromMongoDB("updateOne", {
    collection,
    filter,
    update,
  })
}

export async function deleteOne(collection: string, filter: object) {
  return fetchFromMongoDB("deleteOne", {
    collection,
    filter,
  })
}

// Example usage of the API:
/*
import { findOne, find, insertOne, updateOne, deleteOne } from '@/lib/mongodb'

// Find a single document
const species = await findOne('species', { scientificName: 'Hericium erinaceus' })

// Find multiple documents
const compounds = await find('compounds', { type: 'medicinal' })

// Insert a new document
await insertOne('species', {
  commonName: "Lion's Mane",
  scientificName: "Hericium erinaceus",
  description: "...",
})

// Update a document
await updateOne(
  'species',
  { scientificName: 'Hericium erinaceus' },
  { $set: { lastUpdated: new Date() } }
)

// Delete a document
await deleteOne('species', { scientificName: 'Hericium erinaceus' })
*/
