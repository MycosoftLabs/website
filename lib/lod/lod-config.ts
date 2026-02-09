/**
 * LOD Configuration - February 6, 2026
 * 
 * Level-of-detail configuration for map rendering.
 */

export type LODLevel = 'global' | 'regional' | 'local' | 'detailed';

export interface ZoomToLOD {
  min: number;
  max: number;
  level: LODLevel;
}

export const ZOOM_LEVELS: ZoomToLOD[] = [
  { min: 0, max: 3, level: 'global' },
  { min: 4, max: 6, level: 'regional' },
  { min: 7, max: 9, level: 'local' },
  { min: 10, max: 22, level: 'detailed' },
];

export type RenderMode = 
  | 'flow_lines'
  | 'heatmap'
  | 'hexbins'
  | 'clusters'
  | 'individual'
  | 'individual_with_trail';

export interface EntityLODConfig {
  global: RenderMode;
  regional: RenderMode;
  local: RenderMode;
  detailed: RenderMode;
  clusterRadius?: {
    global?: number;
    regional?: number;
    local?: number;
  };
}

export const ENTITY_LOD_CONFIG: Record<string, EntityLODConfig> = {
  aircraft: {
    global: 'flow_lines',
    regional: 'clusters',
    local: 'individual',
    detailed: 'individual_with_trail',
    clusterRadius: {
      global: 100,
      regional: 50,
      local: 20,
    },
  },
  vessel: {
    global: 'heatmap',
    regional: 'clusters',
    local: 'individual',
    detailed: 'individual_with_trail',
    clusterRadius: {
      global: 100,
      regional: 30,
    },
  },
  satellite: {
    global: 'flow_lines',
    regional: 'flow_lines',
    local: 'individual',
    detailed: 'individual_with_trail',
  },
  wildlife: {
    global: 'heatmap',
    regional: 'hexbins',
    local: 'clusters',
    detailed: 'individual',
    clusterRadius: {
      global: 200,
      regional: 50,
      local: 10,
    },
  },
  earthquake: {
    global: 'heatmap',
    regional: 'clusters',
    local: 'individual',
    detailed: 'individual',
    clusterRadius: {
      regional: 100,
    },
  },
  weather: {
    global: 'heatmap',
    regional: 'hexbins',
    local: 'hexbins',
    detailed: 'individual',
  },
};

// Maximum entities per layer before forcing aggregation
export const MAX_ENTITIES_PER_LAYER: Record<LODLevel, number> = {
  global: 100,
  regional: 500,
  local: 2000,
  detailed: 10000,
};

// Refresh intervals by LOD
export const REFRESH_INTERVALS_MS: Record<LODLevel, number> = {
  global: 30000,    // 30 seconds
  regional: 15000,  // 15 seconds
  local: 5000,      // 5 seconds
  detailed: 2000,   // 2 seconds
};

export default ENTITY_LOD_CONFIG;