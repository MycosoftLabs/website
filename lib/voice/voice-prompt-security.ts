/**
 * Voice Prompt Security Policy
 * 
 * Governs which voice prompts can be used and by whom.
 * All voice prompts must be:
 *   1. Hashed (SHA-256)
 *   2. Whitelisted in this registry
 *   3. Authorized for the requesting user's role
 * 
 * Created: February 3, 2026
 * 
 * SECURITY PRINCIPLE:
 * - No raw voice prompt paths accepted at runtime
 * - Only known hashes allowed
 * - Every session logs voice prompt usage for audit
 */

// ============================================================================
// Types
// ============================================================================

export interface VoicePromptEntry {
  hash: string                    // SHA-256 hash of the voice prompt file
  displayName: string             // Human-readable name
  description?: string            // Optional description
  allowedRoles: string[]          // Roles that can use this voice
  cloning: boolean                // Whether voice cloning is enabled
  deprecated?: boolean            // If true, log warning but allow
  deprecatedReason?: string
}

export interface VoicePromptWhitelist {
  [promptName: string]: VoicePromptEntry
}

export interface VoicePromptValidationResult {
  valid: boolean
  error?: string
  warning?: string
  entry?: VoicePromptEntry
}

export interface VoiceSessionAuditLog {
  conversation_id: string
  session_id: string
  persona_id: string
  voice_prompt_name: string
  voice_prompt_hash: string
  user_id?: string
  user_role: string
  started_at: string
  ended_at?: string
  rtf_avg?: number
  rtf_max?: number
  audio_duration_ms?: number
  validation_result: "allowed" | "denied" | "deprecated"
}

// ============================================================================
// Voice Prompt Whitelist
// ============================================================================

/**
 * Whitelisted voice prompts
 * 
 * To add a new voice prompt:
 * 1. Generate SHA-256 hash of the .pt file
 * 2. Add entry here with appropriate roles
 * 3. Deploy to all environments
 */
export const VOICE_PROMPT_WHITELIST: VoicePromptWhitelist = {
  "NATURAL_F2": {
    hash: "sha256:9c1f2b3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b",
    displayName: "MYCA Natural Female",
    description: "Default MYCA voice - clear, professional female",
    allowedRoles: ["myca_superadmin", "myca_admin", "myca_user"],
    cloning: false,
  },
  "NATURAL_M1": {
    hash: "sha256:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
    displayName: "Professional Male",
    description: "Alternative professional male voice",
    allowedRoles: ["myca_superadmin", "myca_admin"],
    cloning: false,
  },
  "NATURAL_F1": {
    hash: "sha256:2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c",
    displayName: "Warm Female",
    description: "Warmer, conversational female voice",
    allowedRoles: ["myca_superadmin", "myca_admin"],
    cloning: false,
  },
  "SYNTH_F1": {
    hash: "sha256:3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d",
    displayName: "Synthetic Female",
    description: "Synthetic voice for testing",
    allowedRoles: ["myca_superadmin"],
    cloning: false,
    deprecated: true,
    deprecatedReason: "Use NATURAL_F2 instead for production",
  },
}

// ============================================================================
// Roles
// ============================================================================

export const VOICE_ROLES = {
  myca_superadmin: {
    level: 100,
    description: "Full access to all voice prompts and cloning",
  },
  myca_admin: {
    level: 50,
    description: "Access to standard voice prompts",
  },
  myca_user: {
    level: 10,
    description: "Access to default voice prompt only",
  },
  guest: {
    level: 0,
    description: "No voice prompt access",
  },
} as const

export type VoiceRole = keyof typeof VOICE_ROLES

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate a voice prompt request
 */
export function validateVoicePrompt(
  promptName: string,
  userRole: string
): VoicePromptValidationResult {
  // Check if prompt exists in whitelist
  const entry = VOICE_PROMPT_WHITELIST[promptName]
  if (!entry) {
    return {
      valid: false,
      error: `Unknown voice prompt: ${promptName}. Only whitelisted prompts are allowed.`,
    }
  }

  // Check if user role is allowed
  if (!entry.allowedRoles.includes(userRole)) {
    return {
      valid: false,
      error: `Role '${userRole}' is not authorized to use voice prompt '${promptName}'.`,
      entry,
    }
  }

  // Check if deprecated
  if (entry.deprecated) {
    return {
      valid: true,
      warning: `Voice prompt '${promptName}' is deprecated: ${entry.deprecatedReason}`,
      entry,
    }
  }

  return {
    valid: true,
    entry,
  }
}

/**
 * Validate a voice prompt by hash
 */
export function validateVoicePromptByHash(
  hash: string,
  userRole: string
): VoicePromptValidationResult {
  // Find prompt by hash
  const promptName = Object.keys(VOICE_PROMPT_WHITELIST).find(
    name => VOICE_PROMPT_WHITELIST[name].hash === hash
  )

  if (!promptName) {
    return {
      valid: false,
      error: `Unknown voice prompt hash. Only whitelisted prompts are allowed.`,
    }
  }

  return validateVoicePrompt(promptName, userRole)
}

/**
 * Get voice prompt entry by name
 */
export function getVoicePromptEntry(promptName: string): VoicePromptEntry | null {
  return VOICE_PROMPT_WHITELIST[promptName] || null
}

/**
 * Get all voice prompts available to a role
 */
export function getAvailableVoicePrompts(userRole: string): VoicePromptEntry[] {
  return Object.values(VOICE_PROMPT_WHITELIST).filter(
    entry => entry.allowedRoles.includes(userRole) && !entry.deprecated
  )
}

/**
 * Get all voice prompt names available to a role
 */
export function getAvailableVoicePromptNames(userRole: string): string[] {
  return Object.entries(VOICE_PROMPT_WHITELIST)
    .filter(([, entry]) => entry.allowedRoles.includes(userRole) && !entry.deprecated)
    .map(([name]) => name)
}

// ============================================================================
// Hash Functions
// ============================================================================

/**
 * Generate SHA-256 hash of data (for adding new voice prompts)
 * Note: In production, this would hash the actual .pt file
 */
export async function generateVoicePromptHash(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
  return `sha256:${hashHex}`
}

/**
 * Verify a voice prompt file matches its expected hash
 */
export async function verifyVoicePromptHash(
  data: ArrayBuffer,
  expectedHash: string
): Promise<boolean> {
  const actualHash = await generateVoicePromptHash(data)
  return actualHash === expectedHash
}

// ============================================================================
// Audit Logging
// ============================================================================

/**
 * Create an audit log entry for a voice session
 */
export function createAuditLogEntry(params: {
  conversationId: string
  sessionId: string
  personaId: string
  voicePromptName: string
  userId?: string
  userRole: string
}): VoiceSessionAuditLog {
  const entry = getVoicePromptEntry(params.voicePromptName)
  const validation = validateVoicePrompt(params.voicePromptName, params.userRole)

  return {
    conversation_id: params.conversationId,
    session_id: params.sessionId,
    persona_id: params.personaId,
    voice_prompt_name: params.voicePromptName,
    voice_prompt_hash: entry?.hash || "unknown",
    user_id: params.userId,
    user_role: params.userRole,
    started_at: new Date().toISOString(),
    validation_result: validation.valid
      ? validation.warning
        ? "deprecated"
        : "allowed"
      : "denied",
  }
}

/**
 * Complete an audit log entry when session ends
 */
export function completeAuditLogEntry(
  entry: VoiceSessionAuditLog,
  stats: {
    rtf_avg?: number
    rtf_max?: number
    audio_duration_ms?: number
  }
): VoiceSessionAuditLog {
  return {
    ...entry,
    ended_at: new Date().toISOString(),
    rtf_avg: stats.rtf_avg,
    rtf_max: stats.rtf_max,
    audio_duration_ms: stats.audio_duration_ms,
  }
}

// ============================================================================
// Default Voice Prompt
// ============================================================================

/**
 * Get the default voice prompt for a role
 */
export function getDefaultVoicePrompt(userRole: string): string {
  // NATURAL_F2 is the default MYCA voice
  const validation = validateVoicePrompt("NATURAL_F2", userRole)
  if (validation.valid) {
    return "NATURAL_F2"
  }

  // Fall back to first available
  const available = getAvailableVoicePromptNames(userRole)
  return available[0] || "NATURAL_F2"
}

/**
 * Get the default voice prompt hash
 */
export function getDefaultVoicePromptHash(): string {
  return VOICE_PROMPT_WHITELIST["NATURAL_F2"].hash
}
