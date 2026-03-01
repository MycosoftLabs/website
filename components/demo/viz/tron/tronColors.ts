export const TRON_COLORS = {
  background: "#000000",
  lane: "rgba(0, 255, 255, 0.18)",
  text: "#86f7ff",
  mutedText: "rgba(134, 247, 255, 0.6)",
  panel: "rgba(0, 255, 255, 0.08)",
} as const

export const EVENT_COLORS: Record<string, string> = {
  PushEvent: "#00ffff",
  PullRequestEvent: "#ff00ff",
  IssuesEvent: "#ff00ff",
  ForkEvent: "#00ffff",
  WatchEvent: "#ffff00",
  DeploymentEvent: "#00ff00",
} as const

export const ACTION_COLORS = {
  in_progress: "#ffff00",
  success: "#00ff00",
  failure: "#ff0000",
  neutral: "#00ffff",
} as const

export function resolveEventColor(eventType: string) {
  return EVENT_COLORS[eventType] ?? "#00ffff"
}

export function resolveActionColor(status: string, conclusion: string | null) {
  if (status === "in_progress") return ACTION_COLORS.in_progress
  if (conclusion === "success") return ACTION_COLORS.success
  if (conclusion === "failure" || conclusion === "cancelled") return ACTION_COLORS.failure
  return ACTION_COLORS.neutral
}

export function applyGlow(ctx: CanvasRenderingContext2D, color: string, blur: number) {
  ctx.shadowColor = color
  ctx.shadowBlur = blur
}
