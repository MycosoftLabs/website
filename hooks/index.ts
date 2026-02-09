// Hooks Index - Updated February 5, 2026

// Voice Hooks
// PersonaPlex Integration (Primary)
export { usePersonaPlex } from "./usePersonaPlex"

// Legacy Voice Hooks
export { useVoiceChat } from "./useVoiceChat"
export type { VoiceChatMessage, UseVoiceChatOptions, UseVoiceChatReturn } from "./useVoiceChat"

export { useMapVoiceControl } from "./useMapVoiceControl"
export type { MapVoiceControlOptions, UseMapVoiceControlReturn } from "./useMapVoiceControl"

export { useDashboardVoice } from "./useDashboardVoice"
export type { DashboardType, DashboardVoiceHandlers, UseDashboardVoiceOptions, UseDashboardVoiceReturn } from "./useDashboardVoice"

// Memory Hooks
export { useMemory } from "./use-memory"
export type { MemoryRecord, MemoryStats, UserProfile, Episode, BrainStatus } from "./use-memory"

// Brain Hook
export { useBrain } from "./use-brain"

// Search Memory Hooks - February 5, 2026
export { useSearchMemory } from "./use-search-memory"
export type {
  SearchSessionContext,
  SearchSessionSummary,
  SearchHistorySession,
  UseSearchMemoryOptions,
} from "./use-search-memory"

export { useSearchContext, SearchContextProvider } from "./use-search-context"
export type {
  SearchContextState,
  SearchContextActions,
  SearchContextValue,
  SearchContextProviderProps,
} from "./use-search-context"

// Unified Search Hook
export { useUnifiedSearch } from "./use-unified-search"

// Local GPU Services Hooks - February 5, 2026
export {
  useLocalGPU,
  useEarth2,
  useVoiceBridge,
  useGPUServices,
} from "./use-local-gpu"

// Voice-Map-Earth2 Bridge Hook - February 5, 2026
export {
  useVoiceMapBridge,
  useVoiceCommands,
} from "./use-voice-map-bridge"
export type {
  MapState,
  Earth2State,
  VoiceCommand,
  FrontendCommand,
  VoiceBridgeCallbacks,
  VoiceMapBridgeState,
} from "./use-voice-map-bridge"
