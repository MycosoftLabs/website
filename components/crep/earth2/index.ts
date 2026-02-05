/**
 * Earth-2 CREP Components
 * February 5, 2026
 * 
 * Full NVIDIA Earth-2 integration for CREP 2D Dashboard
 * Exports all layer components, controls, and hooks
 */

// Core Weather Layer Components
export { WeatherHeatmapLayer, WeatherLegend } from "./weather-heatmap-layer";
export { SporeDispersalLayer, SporeZoneSummary } from "./spore-dispersal-layer";
export { WindVectorLayer, WindLegend } from "./wind-vector-layer";

// Additional Weather Layer Components
export { CloudLayer } from "./cloud-layer";
export { PrecipitationLayer, PrecipitationLegend } from "./precipitation-layer";
export { PressureLayer, PressureLegend } from "./pressure-layer";
export { StormCellsLayer, StormCellsLegend } from "./storm-cells-layer";
export { HumidityLayer, HumidityLegend } from "./humidity-layer";

// Control Components
export { 
  Earth2LayerControl, 
  DEFAULT_EARTH2_FILTER,
  type Earth2Filter,
  type Earth2Model,
} from "./earth2-layer-control";

// Timeline & Alerts
export { ForecastTimeline } from "./forecast-timeline";
export { AlertPanel, useEarth2Alerts } from "./alert-panel";
export type { Earth2Alert } from "./alert-panel";
