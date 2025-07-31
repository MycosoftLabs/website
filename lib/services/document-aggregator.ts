import { find, insertOne } from "@/lib/temp-db" // Updated import
import { searchElsevierArticles } from "./elsevier"
import { searchMycoBank } from "./mycobank"
import { searchFungiDB } from "./fungidb"

interface AggregatedDocument {
  id: string
  title: string
  content: string
  source: string
  type: "research" | "taxonomy" | "observation"
  metadata: Record<string, any>
  lastUpdated: Date
}

export async function aggregateDocuments(query: string) {
  try {
    // Check MongoDB cache first
    const cachedResults = await find("document_cache", {
      query,
      timestamp: { $gt: new Date(Date.now() - 12 * 60 * 60 * 1000) }, // 12h cache
    })

    if (cachedResults.documents?.length > 0) {
      return cachedResults.documents
    }

    // Fetch from all sources in parallel
    const [elsevierDocs, mycoBankDocs, fungiDBDocs] = await Promise.allSettled([
      searchElsevierArticles(query),
      searchMycoBank(query),
      searchFungiDB(query),
    ])

    const documents: AggregatedDocument[] = []

    // Process Elsevier results
    if (elsevierDocs.status === "fulfilled") {
      documents.push(
        ...elsevierDocs.value.map((doc) => ({
          id: doc.doi,
          title: doc.title,
          content: doc.abstract || "",
          source: "Elsevier",
          type: "research" as const,
          metadata: {
            authors: doc.authors,
            journal: doc.journal,
            publicationDate: doc.publicationDate,
          },
          lastUpdated: new Date(),
        })),
      )
    }

    // Process MycoBank results
    if (mycoBankDocs.status === "fulfilled") {
      documents.push(
        ...mycoBankDocs.value.map((doc) => ({
          id: `mb-${doc.id}`,
          title: doc.scientific_name,
          content: doc.description || "",
          source: "MycoBank",
          type: "taxonomy" as const,
          metadata: {
            commonNames: doc.common_names,
            taxonomy: doc.taxonomy,
          },
          lastUpdated: new Date(),
        })),
      )
    }

    // Process FungiDB results
    if (fungiDBDocs.status === "fulfilled") {
      documents.push(
        ...fungiDBDocs.value.map((doc) => ({
          id: `fdb-${doc.scientific_name}`,
          title: doc.scientific_name,
          content: doc.description || "",
          source: "FungiDB",
          type: "taxonomy" as const,
          metadata: {
            commonName: doc.common_name,
            characteristics: doc.characteristics,
          },
          lastUpdated: new Date(),
        })),
      )
    }

    // Cache the aggregated results
    await insertOne("document_cache", {
      query,
      timestamp: new Date(),
      documents,
    })

    return documents
  } catch (error) {
    console.error("Document aggregation error:", error)
    throw error
  }
}
