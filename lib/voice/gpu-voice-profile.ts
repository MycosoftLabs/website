/**
 * GPU voice profile hints for PersonaPlex / Moshi (RTX 4080 16GB vs high-VRAM).
 * Populated from bridge /health gpu_profile or voice-stack/status defaults.
 */

export type GpuVoiceProfilePayload = {
  profile_id?: string
  gpu_name?: string
  vram_total_gb?: number
  vram_free_gb?: number
  no_cuda_graph?: boolean
  no_torch_compile?: boolean
  cpu_offload?: boolean
  expected_step_ms?: string
  first_connect_hint?: string
  cuda_mode_label?: string
  no_cuda_graph_env?: string
  production_host?: string
}

export type VoiceCudaHints = {
  profileId: string
  gpuName: string
  noCudaGraph: boolean
  noCudaGraphEnv: string
  modeLabel: string
  firstConnectHint: string
  expectedStepMs: string
  warmupUserMessage: string
  handshakeLogMessage: string
  bridgeReadyMessage: string
  moshiReadyLogPrefix: string
  startStackMessage: string
}

const RTX4080_DEFAULTS: VoiceCudaHints = {
  profileId: "rtx4080_16gb",
  gpuName: "RTX 4080 16GB",
  noCudaGraph: true,
  noCudaGraphEnv: "1",
  modeLabel: "4080 mode — NO_CUDA_GRAPH=1 (~150-200ms/step, no graph compile)",
  firstConnectHint: "30-90s model load (no CUDA graph compile)",
  expectedStepMs: "150-200ms",
  warmupUserMessage: "Loading Moshi on RTX 4080… This can take 30–90 seconds on first connection.",
  handshakeLogMessage: "Waiting for Moshi handshake (RTX 4080 model load, no CUDA graph compile)…",
  bridgeReadyMessage: "Bridge connected. Waiting for Moshi model load — do not speak until handshake completes.",
  moshiReadyLogPrefix: "Moshi ready on RTX 4080",
  startStackMessage:
    "Voice stack starting. Wait for VOICE SYSTEM READY in log (RTX 4080: ~30-90s Moshi load, no CUDA graph compile).",
}

const HIGH_VRAM_DEFAULTS: VoiceCudaHints = {
  profileId: "high_vram_24gb_plus",
  gpuName: "High VRAM GPU",
  noCudaGraph: false,
  noCudaGraphEnv: "0",
  modeLabel: "High VRAM — NO_CUDA_GRAPH=0 (~30ms/step with CUDA graphs)",
  firstConnectHint: "60-180s first connect (CUDA graph compile)",
  expectedStepMs: "30ms",
  warmupUserMessage: "CUDA graphs compiling… This can take 60–180 seconds on first connection.",
  handshakeLogMessage: "Waiting for Moshi handshake (CUDA graphs may compile on first run)…",
  bridgeReadyMessage: "Bridge connected. Waiting for Moshi CUDA graphs — do not speak until handshake completes.",
  moshiReadyLogPrefix: "Moshi CUDA ready",
  startStackMessage:
    "Voice stack starting. Wait for VOICE SYSTEM READY in log (CUDA graphs 60–180s on first run).",
}

export function resolveVoiceCudaHints(
  profile?: GpuVoiceProfilePayload | null,
  prefer4080 = false
): VoiceCudaHints {
  const base = prefer4080 || profile?.profile_id === "rtx4080_16gb" ? RTX4080_DEFAULTS : HIGH_VRAM_DEFAULTS
  if (!profile?.profile_id) return base

  const noCudaGraph = profile.no_cuda_graph ?? base.noCudaGraph
  const hints = noCudaGraph ? RTX4080_DEFAULTS : HIGH_VRAM_DEFAULTS

  return {
    ...hints,
    profileId: profile.profile_id ?? hints.profileId,
    gpuName: profile.gpu_name ?? hints.gpuName,
    noCudaGraph,
    noCudaGraphEnv: profile.no_cuda_graph_env ?? (noCudaGraph ? "1" : "0"),
    modeLabel: profile.cuda_mode_label ?? hints.modeLabel,
    firstConnectHint: profile.first_connect_hint ?? hints.firstConnectHint,
    expectedStepMs: profile.expected_step_ms ?? hints.expectedStepMs,
  }
}
