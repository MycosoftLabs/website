// Voice Components - February 17, 2026
// Complete voice integration with PersonaPlex, MAS, Memory, and n8n

export { UnifiedVoiceProvider, useVoice } from "./UnifiedVoiceProvider"
export type { VoiceContextValue, VoiceMode } from "./UnifiedVoiceProvider"

export { VoiceButton, FloatingVoiceButton, InlineVoiceButton } from "./VoiceButton"
export type { VoiceButtonSize, VoiceButtonVariant } from "./VoiceButton"

// GlobalVoiceButton: floating mic on all pages EXCEPT /search (which has its own)
export { GlobalVoiceButton } from "./GlobalVoiceButton"

export { VoiceOverlay } from "./VoiceOverlay"
export { VoiceCommandPanel } from "./VoiceCommandPanel"

export { VoiceMonitorDashboard } from "./VoiceMonitorDashboard"
export { PersonaPlexWidget, FloatingPersonaPlexWidget } from "./PersonaPlexWidget"
export { PersonaPlexProvider, usePersonaPlexContext } from "./PersonaPlexProvider"
