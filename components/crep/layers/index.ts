/**
 * Map Layers - February 6, 2026
 *
 * CREP Phase 4: Timeline visualization layers
 * - TrailLayer: Entity movement trails with LOD and fading
 * - EventMarkerLayer: Clustered event markers with time filtering
 * - AggregatedLayer: Heatmap/hexbin/cluster spatial aggregation
 * - PredictionLayer: Predicted tracks and uncertainty
 */

export * from "./prediction-layer"
export * from "./trail-layer"
export * from "./event-marker-layer"
export * from "./aggregated-layer"