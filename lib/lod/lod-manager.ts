/**
 * LOD Manager - February 6, 2026
 * 
 * Manages level-of-detail for map entities.
 */

import {
  LODLevel,
  RenderMode,
  ZOOM_LEVELS,
  ENTITY_LOD_CONFIG,
  MAX_ENTITIES_PER_LAYER,
  REFRESH_INTERVALS_MS,
  EntityLODConfig,
} from './lod-config';

export interface ViewportBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface LODState {
  level: LODLevel;
  zoom: number;
  bounds: ViewportBounds;
  renderModes: Record<string, RenderMode>;
  maxEntities: number;
  refreshInterval: number;
}

export class LODManager {
  private currentState: LODState;
  private listeners: Set<(state: LODState) => void> = new Set();

  constructor() {
    this.currentState = {
      level: 'regional',
      zoom: 5,
      bounds: { north: 90, south: -90, east: 180, west: -180 },
      renderModes: {},
      maxEntities: MAX_ENTITIES_PER_LAYER.regional,
      refreshInterval: REFRESH_INTERVALS_MS.regional,
    };
    
    this.updateRenderModes();
  }

  /**
   * Get LOD level from zoom
   */
  getLevelFromZoom(zoom: number): LODLevel {
    for (const { min, max, level } of ZOOM_LEVELS) {
      if (zoom >= min && zoom <= max) {
        return level;
      }
    }
    return 'regional';
  }

  /**
   * Get render mode for entity type at current LOD
   */
  getRenderMode(entityType: string): RenderMode {
    const config = ENTITY_LOD_CONFIG[entityType];
    if (!config) return 'individual';
    
    return config[this.currentState.level] || 'individual';
  }

  /**
   * Get cluster radius for entity type
   */
  getClusterRadius(entityType: string): number {
    const config = ENTITY_LOD_CONFIG[entityType];
    if (!config?.clusterRadius) return 50;
    
    return config.clusterRadius[this.currentState.level] || 50;
  }

  /**
   * Update LOD state based on viewport
   */
  updateViewport(zoom: number, bounds: ViewportBounds): LODState {
    const newLevel = this.getLevelFromZoom(zoom);
    const levelChanged = newLevel !== this.currentState.level;

    this.currentState = {
      ...this.currentState,
      zoom,
      bounds,
      level: newLevel,
      maxEntities: MAX_ENTITIES_PER_LAYER[newLevel],
      refreshInterval: REFRESH_INTERVALS_MS[newLevel],
    };

    if (levelChanged) {
      this.updateRenderModes();
    }

    this.notifyListeners();
    return this.currentState;
  }

  /**
   * Update render modes for all entity types
   */
  private updateRenderModes(): void {
    const modes: Record<string, RenderMode> = {};
    
    for (const entityType of Object.keys(ENTITY_LOD_CONFIG)) {
      modes[entityType] = this.getRenderMode(entityType);
    }
    
    this.currentState.renderModes = modes;
  }

  /**
   * Get current state
   */
  getState(): LODState {
    return { ...this.currentState };
  }

  /**
   * Check if entity count exceeds limit for current LOD
   */
  shouldAggregate(entityType: string, count: number): boolean {
    return count > this.currentState.maxEntities;
  }

  /**
   * Get viewport area in square km (approximate)
   */
  getViewportArea(): number {
    const { bounds } = this.currentState;
    const latDiff = bounds.north - bounds.south;
    const lngDiff = bounds.east - bounds.west;
    
    // Approximate km per degree
    const kmPerDegreeLat = 111;
    const avgLat = (bounds.north + bounds.south) / 2;
    const kmPerDegreeLng = Math.cos(avgLat * Math.PI / 180) * 111;
    
    return latDiff * kmPerDegreeLat * lngDiff * kmPerDegreeLng;
  }

  /**
   * Subscribe to LOD changes
   */
  subscribe(listener: (state: LODState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.currentState);
    }
  }
}

// Singleton instance
let lodManagerInstance: LODManager | null = null;

export function getLODManager(): LODManager {
  if (!lodManagerInstance) {
    lodManagerInstance = new LODManager();
  }
  return lodManagerInstance;
}

export default LODManager;