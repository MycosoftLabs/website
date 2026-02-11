/**
 * MycoBrain Widget Components
 * 
 * Auto-rendering widgets for peripherals, sensors, and board controls.
 * Supports plug-and-play detection and device-specific displays.
 */

// Core widgets
export { LedControlWidget } from "./led-control-widget"
export { BuzzerControlWidget } from "./buzzer-control-widget"
export { PeripheralWidget, PeripheralGrid } from "./peripheral-widget"
export { TelemetryChartWidget } from "./telemetry-chart-widget"
export { CommunicationPanel } from "./communication-panel"

// Environmental sensors
export { SmellDetectionWidget } from "./smell-detection-widget"
export { AQIComparisonWidget } from "./aqi-comparison-widget"

// Advanced sensors
export { CellularWidget } from "./cellular-widget"
export { IMUWidget } from "./imu-widget"
export { SpectrometerWidget } from "./spectrometer-widget"

// FCI (Fungal Computer Interface)
export { FCIPeripheralWidget } from "./fci-peripheral-widget"

























