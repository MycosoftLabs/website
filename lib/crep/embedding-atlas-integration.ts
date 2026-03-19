/**
 * CREP × Embedding Atlas Integration - Mar 2026
 *
 * Bridges CREP real-time entity data with embedding-atlas visualization.
 * Provides:
 * - Real-time CREP data → embedding point conversion
 * - Progressive data loading with streaming updates
 * - Cross-filter between CREP map and embedding atlas
 * - Density-aware clustering for entity types
 * - Coordinated selection between map and atlas views
 */

import type { UnifiedEntity } from "./entities/unified-entity-schema"
import {
  type EmbeddingPoint,
  type EmbeddingDelta,
  CATEGORY_MAP,
  EmbeddingLSH,
  computeEmbeddingDelta,
} from "../search/embedding-engine"

// ---------------------------------------------------------------------------
// CREP Entity → Embedding Point
// ---------------------------------------------------------------------------

const CREP_TYPE_TO_CATEGORY: Record<string, string> = {
  aircraft: "aircraft",
  vessel: "vessels",
  satellite: "satellites",
  fungal: "species",
  weather: "weather",
  earthquake: "events",
  elephant: "species",
  device: "devices",
  fire: "events",
  crisis: "events",
}

/** Convert a unified CREP entity to an embedding point. */
export function unifiedEntityToEmbedding(entity: UnifiedEntity): EmbeddingPoint {
  const catKey = CREP_TYPE_TO_CATEGORY[entity.type] || "crep"
  const cat = CATEGORY_MAP[catKey] || CATEGORY_MAP.crep

  // Extract coordinates
  let lat = 0
  let lng = 0
  if (entity.geometry.type === "Point") {
    lng = entity.geometry.coordinates[0]
    lat = entity.geometry.coordinates[1]
  }

  // Geo-aware embedding position
  const x = (lng + 180) / 360
  const y = (lat + 90) / 180
  // Small deterministic jitter based on ID
  let hash = 0
  for (let i = 0; i < entity.id.length; i++) {
    hash = ((hash << 5) - hash + entity.id.charCodeAt(i)) | 0
  }
  const jx = ((hash & 0xff) / 0xff - 0.5) * 0.01
  const jy = (((hash >> 8) & 0xff) / 0xff - 0.5) * 0.01

  const label = (entity.properties.callsign as string)
    || (entity.properties.name as string)
    || (entity.properties.species as string)
    || entity.id

  const description = buildEntityDescription(entity)

  return {
    id: entity.id,
    x: x + jx,
    y: y + jy,
    category: cat.index,
    label,
    description,
    type: catKey as EmbeddingPoint["type"],
    lat,
    lng,
    metadata: {
      ...entity.properties,
      entityType: entity.type,
      source: entity.source,
      confidence: entity.confidence,
      s2Cell: entity.s2_cell,
      state: entity.state,
    },
    score: entity.confidence,
    timestamp: new Date(entity.time.observed_at).getTime(),
  }
}

function buildEntityDescription(entity: UnifiedEntity): string {
  const parts: string[] = [entity.type]
  if (entity.state.altitude) parts.push(`alt: ${Math.round(entity.state.altitude)}`)
  if (entity.state.velocity) {
    const speed = Math.sqrt(entity.state.velocity.x ** 2 + entity.state.velocity.y ** 2)
    parts.push(`speed: ${Math.round(speed)}`)
  }
  if (entity.state.heading) parts.push(`hdg: ${Math.round(entity.state.heading)}°`)
  if (entity.state.classification) parts.push(entity.state.classification)
  parts.push(`src: ${entity.source}`)
  return parts.join(" | ")
}

// ---------------------------------------------------------------------------
// CREP Atlas Manager - orchestrates real-time embedding updates
// ---------------------------------------------------------------------------

export interface CREPAtlasState {
  points: EmbeddingPoint[]
  lsh: EmbeddingLSH
  lastDelta: EmbeddingDelta | null
  entityCount: Record<string, number>
  lastUpdate: number
}

export class CREPAtlasManager {
  private state: CREPAtlasState
  private onChange?: (state: CREPAtlasState) => void

  constructor(onChange?: (state: CREPAtlasState) => void) {
    this.onChange = onChange
    this.state = {
      points: [],
      lsh: new EmbeddingLSH(0.03),
      lastDelta: null,
      entityCount: {},
      lastUpdate: 0,
    }
  }

  /** Ingest a batch of unified entities. Returns delta for incremental rendering. */
  ingestEntities(entities: UnifiedEntity[]): EmbeddingDelta {
    const newPoints = entities.map(unifiedEntityToEmbedding)
    const delta = computeEmbeddingDelta(this.state.points, newPoints)

    // Rebuild LSH index
    this.state.lsh.clear()
    this.state.lsh.insertAll(newPoints)
    this.state.points = newPoints
    this.state.lastDelta = delta
    this.state.lastUpdate = Date.now()

    // Count by type
    this.state.entityCount = {}
    for (const p of newPoints) {
      this.state.entityCount[p.type] = (this.state.entityCount[p.type] || 0) + 1
    }

    this.onChange?.(this.state)
    return delta
  }

  /** Add new entities incrementally (streaming). */
  addEntities(entities: UnifiedEntity[]): EmbeddingDelta {
    const newEmbeddings = entities.map(unifiedEntityToEmbedding)
    const existingIds = new Set(this.state.points.map((p) => p.id))

    const added: EmbeddingPoint[] = []
    for (const e of newEmbeddings) {
      if (!existingIds.has(e.id)) {
        added.push(e)
        this.state.lsh.insert(e)
        this.state.points.push(e)
        this.state.entityCount[e.type] = (this.state.entityCount[e.type] || 0) + 1
      }
    }

    const delta: EmbeddingDelta = { added, removed: [], updated: [] }
    this.state.lastDelta = delta
    this.state.lastUpdate = Date.now()
    this.onChange?.(this.state)
    return delta
  }

  /** Search within CREP embeddings. */
  search(query: string, limit = 20): EmbeddingPoint[] {
    return this.state.lsh.search(query, limit)
  }

  /** Find nearest neighbors to a point. */
  nearestNeighbors(x: number, y: number, k = 10): EmbeddingPoint[] {
    return this.state.lsh.query(x, y, k)
  }

  /** Filter points by entity type. */
  filterByType(type: string): EmbeddingPoint[] {
    return this.state.points.filter((p) => p.type === type)
  }

  /** Filter points by time range. */
  filterByTimeRange(start: number, end: number): EmbeddingPoint[] {
    return this.state.points.filter((p) => p.timestamp >= start && p.timestamp <= end)
  }

  /** Get current typed arrays for embedding-atlas rendering. */
  getAtlasData(): {
    x: Float32Array
    y: Float32Array
    category: Uint8Array
    labels: Array<{ x: number; y: number; text: string }>
  } {
    const n = this.state.points.length
    const x = new Float32Array(n)
    const y = new Float32Array(n)
    const category = new Uint8Array(n)

    for (let i = 0; i < n; i++) {
      x[i] = this.state.points[i].x
      y[i] = this.state.points[i].y
      category[i] = this.state.points[i].category
    }

    // Generate cluster labels from entity counts
    const labels = Object.entries(this.state.entityCount)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => {
        const typePoints = this.state.points.filter((p) => p.type === type)
        const cx = typePoints.reduce((s, p) => s + p.x, 0) / typePoints.length
        const cy = typePoints.reduce((s, p) => s + p.y, 0) / typePoints.length
        const cat = CATEGORY_MAP[type]
        return {
          x: cx,
          y: cy,
          text: `${cat?.label || type} (${count})`,
        }
      })

    return { x, y, category, labels }
  }

  getState(): CREPAtlasState {
    return this.state
  }

  getStats() {
    return {
      totalPoints: this.state.points.length,
      entityCount: { ...this.state.entityCount },
      lshStats: this.state.lsh.getStats(),
      lastUpdate: this.state.lastUpdate,
    }
  }

  clear(): void {
    this.state.points = []
    this.state.lsh.clear()
    this.state.entityCount = {}
    this.state.lastDelta = null
    this.state.lastUpdate = Date.now()
    this.onChange?.(this.state)
  }
}
