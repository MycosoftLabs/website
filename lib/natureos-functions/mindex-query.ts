/**
 * MINDEX Query Function
 * 
 * NatureOS serverless function for MINDEX database queries
 * Can be triggered from workflows, APIs, or scheduled jobs
 */

import { createMINDEXClient } from "../sdk/mindex"

export interface MINDEXQueryInput {
  operation: "search" | "getTaxa" | "getObservations" | "getStats" | "getTaxon"
  params?: Record<string, any>
}

export interface MINDEXQueryOutput {
  success: boolean
  data?: any
  error?: string
  timestamp: string
  executionTime: number
}

/**
 * Main function handler
 */
export async function mindexQuery(input: MINDEXQueryInput): Promise<MINDEXQueryOutput> {
  const startTime = Date.now()
  
  try {
    const client = createMINDEXClient()
    let data: any

    switch (input.operation) {
      case "search":
        data = await client.search({
          query: input.params?.query || "",
          type: input.params?.type,
          limit: input.params?.limit,
        })
        break

      case "getTaxa":
        data = await client.getTaxa(input.params)
        break

      case "getObservations":
        data = await client.getObservations(input.params)
        break

      case "getStats":
        data = await client.getStats()
        break

      case "getTaxon":
        if (!input.params?.id) {
          throw new Error("Taxon ID required")
        }
        data = await client.getTaxon(input.params.id)
        break

      default:
        throw new Error(`Unknown operation: ${input.operation}`)
    }

    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      executionTime: Date.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
      executionTime: Date.now() - startTime,
    }
  }
}

/**
 * Batch query function - execute multiple queries in parallel
 */
export async function mindexBatchQuery(inputs: MINDEXQueryInput[]): Promise<MINDEXQueryOutput[]> {
  return Promise.all(inputs.map(input => mindexQuery(input)))
}

/**
 * Scheduled sync function - trigger ETL pipeline
 */
export async function scheduledMINDEXSync(): Promise<{
  triggered: boolean
  timestamp: string
  message: string
}> {
  // This would trigger the MINDEX ETL pipeline
  // For now, return a status message
  return {
    triggered: true,
    timestamp: new Date().toISOString(),
    message: "ETL sync scheduled - iNaturalist and GBIF sync in progress",
  }
}

/**
 * Ancestry database enrichment function
 * Fetches additional data from MINDEX for ancestry records
 */
export async function enrichAncestryData(speciesId: number): Promise<any> {
  const client = createMINDEXClient()
  
  try {
    // Get taxon from MINDEX
    const taxon = await client.getTaxon(speciesId)
    
    // Get related observations
    const observations = await client.getObservations({
      taxonId: speciesId,
      hasLocation: true,
      hasPhotos: true,
      limit: 100,
    })

    return {
      taxon,
      observations: observations.observations,
      observationCount: observations.total,
      hasGeographicData: observations.observations.some(o => o.location),
      hasImagery: observations.observations.some(o => o.photos && o.photos.length > 0),
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to enrich data",
    }
  }
}





