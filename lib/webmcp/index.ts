/**
 * WebMCP Provider - February 17, 2026
 *
 * Browser-native AI agent tools via navigator.modelContext.
 * Fallback when API unavailable (Chrome 146+).
 */

export {
  isWebMCPAvailable,
  registerWebMCPTools,
  createUnifiedRegistration,
  type ToolRegistration,
  type WebMCPToolResult,
  type WebMCPCallbacks,
} from "./provider"
