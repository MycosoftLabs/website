// Voice Libraries - February 3, 2026
// Complete voice integration with PersonaPlex, MAS, Memory, and n8n
// Updated: February 3, 2026 - Added protocol versioning, RTF watchdog, voice security

export { 
  PersonaPlexClient,
  createMYCAClient,
  MYCA_PERSONAPLEX_PROMPT,
} from "./personaplex-client"

export type {
  PersonaPlexConfig,
  ConnectionStatus,
  AudioStats,
} from "./personaplex-client"

// Re-export existing modules
export * from "./command-parser"
export * from "./map-websocket-client"

// Protocol versioning (v1.0.0)
export * from "./personaplex-protocol"

// RTF monitoring
export * from "./rtf-watchdog"

// Voice prompt security
export * from "./voice-prompt-security"
