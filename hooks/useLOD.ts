/**
 * useLOD Hook - February 6, 2026
 * 
 * React hook wrapper for LOD manager.
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  getLODManager, 
  LODManager, 
  LODState, 
  ViewportBounds 
} from '@/lib/lod/lod-manager';
import { LODLevel, RenderMode } from '@/lib/lod/lod-config';

export interface UseLODOptions {
  /** Initial zoom level */
  initialZoom?: number;
  /** Initial viewport bounds */
  initialBounds?: ViewportBounds;
}

export interface UseLODReturn {
  /** Current LOD level */
  level: LODLevel;
  
  /** Current zoom */
  zoom: number;
  
  /** Current viewport bounds */
  bounds: ViewportBounds;
  
  /** Render modes for all entity types */
  renderModes: Record<string, RenderMode>;
  
  /** Max entities before forcing aggregation */
  maxEntities: number;
  
  /** Refresh interval in ms */
  refreshInterval: number;
  
  /** Get render mode for specific entity type */
  getRenderMode: (entityType: string) => RenderMode;
  
  /** Get cluster radius for entity type */
  getClusterRadius: (entityType: string) => number;
  
  /** Check if entity count should trigger aggregation */
  shouldAggregate: (entityType: string, count: number) => boolean;
  
  /** Update viewport (call on map move/zoom) */
  updateViewport: (zoom: number, bounds: ViewportBounds) => void;
  
  /** Get current full state */
  getState: () => LODState;
}

export function useLOD(options: UseLODOptions = {}): UseLODReturn {
  const { 
    initialZoom = 5, 
    initialBounds = { north: 90, south: -90, east: 180, west: -180 } 
  } = options;
  
  const [state, setState] = useState<LODState>(() => {
    const manager = getLODManager();
    return manager.updateViewport(initialZoom, initialBounds);
  });
  
  // Subscribe to LOD changes
  useEffect(() => {
    const manager = getLODManager();
    
    const unsubscribe = manager.subscribe((newState) => {
      setState(newState);
    });
    
    return unsubscribe;
  }, []);
  
  // Get render mode for entity type
  const getRenderMode = useCallback((entityType: string): RenderMode => {
    const manager = getLODManager();
    return manager.getRenderMode(entityType);
  }, []);
  
  // Get cluster radius for entity type
  const getClusterRadius = useCallback((entityType: string): number => {
    const manager = getLODManager();
    return manager.getClusterRadius(entityType);
  }, []);
  
  // Check if should aggregate
  const shouldAggregate = useCallback((entityType: string, count: number): boolean => {
    const manager = getLODManager();
    return manager.shouldAggregate(entityType, count);
  }, []);
  
  // Update viewport
  const updateViewport = useCallback((zoom: number, bounds: ViewportBounds) => {
    const manager = getLODManager();
    manager.updateViewport(zoom, bounds);
  }, []);
  
  // Get full state
  const getState = useCallback((): LODState => {
    const manager = getLODManager();
    return manager.getState();
  }, []);
  
  // Memoized return object
  return useMemo(() => ({
    level: state.level,
    zoom: state.zoom,
    bounds: state.bounds,
    renderModes: state.renderModes,
    maxEntities: state.maxEntities,
    refreshInterval: state.refreshInterval,
    getRenderMode,
    getClusterRadius,
    shouldAggregate,
    updateViewport,
    getState,
  }), [
    state,
    getRenderMode,
    getClusterRadius,
    shouldAggregate,
    updateViewport,
    getState,
  ]);
}

export default useLOD;
