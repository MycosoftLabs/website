/**
 * CREP Dashboard Components
 * 
 * Environmental Common Operating Picture widgets and map markers
 */

// Widgets
export { SpaceWeatherWidget } from "./space-weather-widget"
export { FlightTrackerWidget } from "./flight-tracker-widget"
export { SatelliteTrackerWidget } from "./satellite-tracker-widget"
export { VesselTrackerWidget } from "./vessel-tracker-widget"

// Conservation Widgets (Feb 05, 2026)
export { SmartFenceWidget, type FenceSegment, type FenceSensor } from "./smart-fence-widget"
export { PresenceDetectionWidget, type PresenceReading } from "./presence-detection-widget"
export { BiosignalWidget } from "./biosignal-widget"

// FCI - Fungal Computer Interface Widgets (Feb 10, 2026)
export { FCISignalWidget, FCIPatternChart } from "./fci"

// Map Markers
export { AircraftMarker, VesselMarker, SatelliteMarker, ElephantMarker, FungalMarker } from "./markers"
export type { ElephantData, FungalObservation } from "./markers"

// Map Controls
export {
  MapControls,
  StreamingStatusBar,
  type AircraftFilter,
  type VesselFilter,
  type SatelliteFilter,
  type SpaceWeatherFilter,
} from "./map-controls"

// Map Layers
export { TrajectoryLines } from "./trajectory-lines"
export { SatelliteOrbitLines } from "./satellite-orbit-lines"