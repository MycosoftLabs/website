// In-memory database singleton for development
interface Collection<T> {
  data: T[]
  indices: {
    [key: string]: Map<any, T>
  }
}

class TempDB {
  private collections: { [name: string]: Collection<any> } = {}

  initCollection<T>(name: string, initialData: T[] = [], indexFields: string[] = []) {
    if (this.collections[name]) {
      console.warn(`Collection ${name} already exists`)
      return
    }

    const collection: Collection<T> = {
      data: [...initialData],
      indices: {},
    }

    // Create indices
    for (const field of indexFields) {
      collection.indices[field] = new Map()
      initialData.forEach((item) => {
        const value = (item as any)[field]
        if (value !== undefined) {
          collection.indices[field].set(value, item)
        }
      })
    }

    this.collections[name] = collection
  }

  async find<T>(collectionName: string, query: any = {}): Promise<T[]> {
    const collection = this.collections[collectionName]
    if (!collection) return []

    // If no query, return all documents
    if (Object.keys(query).length === 0) {
      return [...collection.data]
    }

    // Check if we can use an index
    const indexField = Object.keys(query).find((key) => collection.indices[key])
    if (indexField && !query.$or) {
      const value = query[indexField]
      const result = collection.indices[indexField].get(value)
      return result ? [result] : []
    }

    // Otherwise, filter the data
    return collection.data.filter((item) => {
      return Object.entries(query).every(([key, value]) => {
        if (key === "$or" && Array.isArray(value)) {
          return value.some((condition) => Object.entries(condition).every(([k, v]) => (item as any)[k] === v))
        }
        if (value && typeof value === "object" && value.$regex) {
          const regex = new RegExp(value.$regex, value.$options || "")
          return regex.test((item as any)[key])
        }
        return (item as any)[key] === value
      })
    })
  }

  async findOne<T>(collectionName: string, query: any = {}): Promise<T | null> {
    const results = await this.find<T>(collectionName, query)
    return results[0] || null
  }

  async insertOne<T>(collectionName: string, document: T): Promise<void> {
    const collection = this.collections[collectionName]
    if (!collection) {
      throw new Error(`Collection ${collectionName} does not exist`)
    }

    collection.data.push(document)

    // Update indices
    Object.entries(collection.indices).forEach(([field, index]) => {
      const value = (document as any)[field]
      if (value !== undefined) {
        index.set(value, document)
      }
    })
  }

  async updateOne<T>(collectionName: string, query: any, update: any): Promise<void> {
    const collection = this.collections[collectionName]
    if (!collection) {
      throw new Error(`Collection ${collectionName} does not exist`)
    }

    const document = await this.findOne<T>(collectionName, query)
    if (!document) return

    // Handle $set operator
    if (update.$set) {
      Object.assign(document, update.$set)
    }

    // Update indices
    Object.entries(collection.indices).forEach(([field, index]) => {
      const value = (document as any)[field]
      if (value !== undefined) {
        index.set(value, document)
      }
    })
  }

  async deleteOne(collectionName: string, query: any): Promise<void> {
    const collection = this.collections[collectionName]
    if (!collection) {
      throw new Error(`Collection ${collectionName} does not exist`)
    }

    const index = collection.data.findIndex((item) =>
      Object.entries(query).every(([key, value]) => (item as any)[key] === value),
    )

    if (index !== -1) {
      const document = collection.data[index]
      collection.data.splice(index, 1)

      // Update indices
      Object.entries(collection.indices).forEach(([field, index]) => {
        const value = (document as any)[field]
        if (value !== undefined) {
          index.delete(value)
        }
      })
    }
  }
}

// Export singleton instance
export const tempDB = new TempDB()
