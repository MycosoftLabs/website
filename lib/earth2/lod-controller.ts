/**
 * Level of Detail (LOD) Controller
 * February 4, 2026
 * 
 * Manages rendering detail based on zoom level for weather layers
 * Reduces grid resolution at low zoom, increases at high zoom
 * Skips rendering for off-screen areas
 */

interface LODLevel {
  minZoom: number;
  maxZoom: number;
  gridResolution: number; // degrees per cell
  particleDensity: number; // 0-1 multiplier
  animationFps: number;
  skipLayers?: string[];
}

interface LODConfig {
  levels: LODLevel[];
  defaultLevel: LODLevel;
}

// Default LOD configuration
const DEFAULT_LOD_CONFIG: LODConfig = {
  levels: [
    {
      minZoom: 0,
      maxZoom: 3,
      gridResolution: 2, // Very coarse
      particleDensity: 0.2,
      animationFps: 15,
      skipLayers: ["rain-streaks", "snow-flakes", "smoke-particles"],
    },
    {
      minZoom: 3,
      maxZoom: 5,
      gridResolution: 1,
      particleDensity: 0.4,
      animationFps: 20,
      skipLayers: ["rain-streaks"],
    },
    {
      minZoom: 5,
      maxZoom: 8,
      gridResolution: 0.5,
      particleDensity: 0.7,
      animationFps: 30,
      skipLayers: [],
    },
    {
      minZoom: 8,
      maxZoom: 12,
      gridResolution: 0.25,
      particleDensity: 1.0,
      animationFps: 30,
      skipLayers: [],
    },
    {
      minZoom: 12,
      maxZoom: 22,
      gridResolution: 0.1,
      particleDensity: 1.0,
      animationFps: 60, // Full detail at high zoom
      skipLayers: [],
    },
  ],
  defaultLevel: {
    minZoom: 0,
    maxZoom: 22,
    gridResolution: 0.5,
    particleDensity: 0.5,
    animationFps: 30,
    skipLayers: [],
  },
};

interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export class LODController {
  private config: LODConfig;
  private currentZoom: number = 5;
  private currentBounds: Bounds | null = null;
  private listeners: Set<(lod: LODLevel) => void> = new Set();

  constructor(config: Partial<LODConfig> = {}) {
    this.config = {
      ...DEFAULT_LOD_CONFIG,
      ...config,
      levels: config.levels || DEFAULT_LOD_CONFIG.levels,
    };
  }

  /**
   * Update the current zoom level and bounds
   */
  updateView(zoom: number, bounds: Bounds): void {
    const prevLevel = this.getCurrentLOD();
    this.currentZoom = zoom;
    this.currentBounds = bounds;
    const newLevel = this.getCurrentLOD();

    // Notify listeners if LOD level changed
    if (prevLevel.gridResolution !== newLevel.gridResolution) {
      this.notifyListeners(newLevel);
    }
  }

  /**
   * Get current LOD level based on zoom
   */
  getCurrentLOD(): LODLevel {
    for (const level of this.config.levels) {
      if (this.currentZoom >= level.minZoom && this.currentZoom < level.maxZoom) {
        return level;
      }
    }
    return this.config.defaultLevel;
  }

  /**
   * Get optimal grid resolution for current view
   */
  getGridResolution(): number {
    return this.getCurrentLOD().gridResolution;
  }

  /**
   * Get particle density multiplier
   */
  getParticleDensity(): number {
    return this.getCurrentLOD().particleDensity;
  }

  /**
   * Get target animation FPS
   */
  getAnimationFps(): number {
    return this.getCurrentLOD().animationFps;
  }

  /**
   * Check if a layer should be rendered at current LOD
   */
  shouldRenderLayer(layerId: string): boolean {
    const level = this.getCurrentLOD();
    return !level.skipLayers?.includes(layerId);
  }

  /**
   * Check if a point is within the current view bounds with buffer
   */
  isInView(lat: number, lon: number, bufferDegrees: number = 1): boolean {
    if (!this.currentBounds) return true;
    
    const { north, south, east, west } = this.currentBounds;
    return (
      lat >= south - bufferDegrees &&
      lat <= north + bufferDegrees &&
      lon >= west - bufferDegrees &&
      lon <= east + bufferDegrees
    );
  }

  /**
   * Calculate optimal grid dimensions for current view
   */
  getOptimalGridSize(): { rows: number; cols: number } {
    if (!this.currentBounds) {
      return { rows: 50, cols: 50 };
    }

    const resolution = this.getGridResolution();
    const { north, south, east, west } = this.currentBounds;
    
    const latRange = north - south;
    const lonRange = east - west;
    
    const rows = Math.ceil(latRange / resolution);
    const cols = Math.ceil(lonRange / resolution);
    
    // Limit max grid size for performance
    const maxDimension = 200;
    
    return {
      rows: Math.min(rows, maxDimension),
      cols: Math.min(cols, maxDimension),
    };
  }

  /**
   * Filter features based on current view and LOD
   */
  filterFeatures<T extends { lat?: number; lon?: number; coordinates?: [number, number] }>(
    features: T[],
    maxFeatures?: number
  ): T[] {
    const density = this.getParticleDensity();
    const targetCount = maxFeatures 
      ? Math.floor(maxFeatures * density) 
      : Math.floor(features.length * density);

    // Filter by view bounds
    const inViewFeatures = features.filter(f => {
      const lat = f.lat ?? f.coordinates?.[1] ?? 0;
      const lon = f.lon ?? f.coordinates?.[0] ?? 0;
      return this.isInView(lat, lon);
    });

    // Sample if too many features
    if (inViewFeatures.length > targetCount) {
      const step = Math.ceil(inViewFeatures.length / targetCount);
      return inViewFeatures.filter((_, i) => i % step === 0);
    }

    return inViewFeatures;
  }

  /**
   * Subscribe to LOD changes
   */
  onLODChange(callback: (lod: LODLevel) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(lod: LODLevel): void {
    this.listeners.forEach(callback => {
      try {
        callback(lod);
      } catch (error) {
        console.error("[LODController] Listener error:", error);
      }
    });
  }

  /**
   * Get debug info about current LOD state
   */
  getDebugInfo(): {
    zoom: number;
    lodLevel: LODLevel;
    gridSize: { rows: number; cols: number };
    bounds: Bounds | null;
  } {
    return {
      zoom: this.currentZoom,
      lodLevel: this.getCurrentLOD(),
      gridSize: this.getOptimalGridSize(),
      bounds: this.currentBounds,
    };
  }
}

// Singleton instance
let lodControllerInstance: LODController | null = null;

export function getLODController(config?: Partial<LODConfig>): LODController {
  if (!lodControllerInstance) {
    lodControllerInstance = new LODController(config);
  }
  return lodControllerInstance;
}

export type { LODLevel, LODConfig, Bounds };
export default LODController;
