/**
 * FCI (Fungal Computer Interface) Components
 * 
 * Visualization components for mycelium bioelectric signals
 * and pattern detection based on GFST (Global Fungi Symbiosis Theory).
 * 
 * Components:
 * - FCISignalWidget: Main widget showing live signal data, patterns, and environment
 * - FCIPatternChart: Pattern occurrence analysis and distribution charts
 * 
 * (c) 2026 Mycosoft Labs
 */

export { FCISignalWidget } from "./fci-signal-widget"
export { FCIPatternChart } from "./fci-pattern-chart"

// Re-export types for convenience
export type { 
  // These would need to be exported from the component files
} from "./fci-signal-widget"
