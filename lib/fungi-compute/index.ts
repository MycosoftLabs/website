/**
 * Fungi Compute Library
 * 
 * Core library for the biological computing visualization platform.
 */

// Types
export * from "./types"

// WebSocket Client
export { FCIWebSocketClient, createFCIClient } from "./websocket-client"
export type { ConnectionStatus, FCIWebSocketConfig } from "./websocket-client"

// Hooks
export {
  useFCIDevices,
  useFCIDevice,
  useSignalStream,
  usePatternHistory,
  useSignalFingerprint,
  useNLMAnalysis,
  useEventCorrelations,
  useOscilloscopeSettings,
} from "./hooks"
