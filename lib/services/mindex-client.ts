import { MongoClient, type Db, type Collection } from "mongodb"

// MINDEX Database Client for Azure Cosmos DB
// This is the core database that feeds NatureOS and is orchestrated by MYCA

interface MINDEXConfig {
  endpoint: string
  key: string
  database: string
}

class MINDEXClient {
  private client: MongoClient | null = null
  private db: Db | null = null
  private connected = false

  async connect(): Promise<void> {
    if (this.connected && this.client) {
      return
    }

    try {
      const endpoint = process.env.MONGODB_ENDPOINT_URL || process.env.MINDEX_ENDPOINT_URL
      const key = process.env.MONGODB_API_KEY || process.env.MINDEX_API_KEY

      if (!endpoint || !key) {
        console.error("[v0] MINDEX credentials not found, using fallback")
        return
      }

      this.client = new MongoClient(endpoint, {
        auth: {
          username: "mindex",
          password: key,
        },
      })

      await this.client.connect()
      this.db = this.client.db("mindex")
      this.connected = true
      console.log("[v0] MINDEX database connected successfully")
    } catch (error) {
      console.error("[v0] Failed to connect to MINDEX:", error)
      this.connected = false
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close()
      this.connected = false
    }
  }

  isConnected(): boolean {
    return this.connected
  }

  getCollection<T = any>(name: string): Collection<T> | null {
    if (!this.db) {
      console.error("[v0] MINDEX database not initialized")
      return null
    }
    return this.db.collection<T>(name)
  }

  // Species Collection Methods
  async getSpecies(id: string): Promise<any> {
    const collection = this.getCollection("species")
    if (!collection) return null
    return await collection.findOne({ id })
  }

  async searchSpecies(query: string, limit = 20): Promise<any[]> {
    const collection = this.getCollection("species")
    if (!collection) return []

    return await collection
      .find({
        $or: [{ scientificName: { $regex: query, $options: "i" } }, { commonNames: { $regex: query, $options: "i" } }],
      })
      .limit(limit)
      .toArray()
  }

  async upsertSpecies(species: any): Promise<void> {
    const collection = this.getCollection("species")
    if (!collection) return

    await collection.updateOne({ id: species.id }, { $set: { ...species, updatedAt: new Date() } }, { upsert: true })
  }

  // Papers Collection Methods
  async getPaper(id: string): Promise<any> {
    const collection = this.getCollection("papers")
    if (!collection) return null
    return await collection.findOne({ id })
  }

  async searchPapers(query: string, speciesId?: string, limit = 20): Promise<any[]> {
    const collection = this.getCollection("papers")
    if (!collection) return []

    const filter: any = {
      $or: [{ title: { $regex: query, $options: "i" } }, { abstract: { $regex: query, $options: "i" } }],
    }

    if (speciesId) {
      filter.relatedSpecies = speciesId
    }

    return await collection.find(filter).limit(limit).toArray()
  }

  async upsertPaper(paper: any): Promise<void> {
    const collection = this.getCollection("papers")
    if (!collection) return

    await collection.updateOne({ id: paper.id }, { $set: { ...paper, updatedAt: new Date() } }, { upsert: true })
  }

  // Images Collection Methods
  async getImages(speciesId: string): Promise<any[]> {
    const collection = this.getCollection("images")
    if (!collection) return []
    return await collection.find({ speciesId }).toArray()
  }

  async upsertImage(image: any): Promise<void> {
    const collection = this.getCollection("images")
    if (!collection) return

    await collection.updateOne({ id: image.id }, { $set: { ...image, updatedAt: new Date() } }, { upsert: true })
  }

  // Observations Collection (from iNaturalist/field data)
  async getObservations(speciesId: string, limit = 100): Promise<any[]> {
    const collection = this.getCollection("observations")
    if (!collection) return []
    return await collection.find({ speciesId }).limit(limit).toArray()
  }

  async upsertObservation(observation: any): Promise<void> {
    const collection = this.getCollection("observations")
    if (!collection) return

    await collection.updateOne(
      { id: observation.id },
      { $set: { ...observation, updatedAt: new Date() } },
      { upsert: true },
    )
  }
}

// Singleton instance
const mindexClient = new MINDEXClient()

export { mindexClient, MINDEXClient }
export type { MINDEXConfig }
