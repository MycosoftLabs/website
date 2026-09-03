/**
 * Deterministic state machine for MapLibre-backed Arraylake raster playback.
 *
 * The renderer owns the clock; UI controls only express play/pause/scrub intent.
 * `retained` is deliberately separate from `playing`: a timer may be armed while
 * a style is reloading, but the UI must not claim that a frame is moving until
 * the complete MapLibre source/layer stack has been retained and painted.
 */

export const DYNAMIC_FIELD_STALE_AFTER_MS = 48 * 60 * 60 * 1000

export interface FieldPlaybackState {
  frameIndex: number
  frameCount: number
  playing: boolean
  retained: boolean
}

export type FieldPlaybackAction =
  | { type: "manifest"; frameCount: number; requestedIndex?: number | null }
  | { type: "retained" }
  | { type: "play" }
  | { type: "pause" }
  | { type: "advance" }
  | { type: "step"; delta: number }
  | { type: "scrub"; index: number }
  | { type: "style-reset" }
  | { type: "cleanup" }

export interface FieldPlaybackSnapshot extends FieldPlaybackState {
  layerId: string
  dataset: string
  variable: string
  validAt: string | null
  visibleLayerId: string | null
  event: "waiting" | "frame-painted" | "style-reset" | "gated" | "cleanup"
}

export function normalizeFieldFrameIndex(index: number, frameCount: number): number {
  const count = Math.max(0, Math.floor(frameCount))
  if (count === 0) return 0
  const integer = Number.isFinite(index) ? Math.trunc(index) : 0
  return ((integer % count) + count) % count
}

export function createFieldPlaybackState(frameCount = 0, playing = true): FieldPlaybackState {
  return {
    frameIndex: 0,
    frameCount: Math.max(0, Math.floor(frameCount)),
    playing,
    retained: false,
  }
}

export function transitionFieldPlayback(
  state: FieldPlaybackState,
  action: FieldPlaybackAction,
): FieldPlaybackState {
  switch (action.type) {
    case "manifest": {
      const frameCount = Math.max(0, Math.floor(action.frameCount))
      const requested = action.requestedIndex == null ? state.frameIndex : action.requestedIndex
      return {
        ...state,
        frameCount,
        frameIndex: normalizeFieldFrameIndex(requested, frameCount),
        retained: false,
      }
    }
    case "retained":
      return { ...state, retained: state.frameCount > 0 }
    case "play":
      return { ...state, playing: true }
    case "pause":
      return { ...state, playing: false }
    case "advance":
      if (!state.playing || !state.retained || state.frameCount < 2) return state
      return { ...state, frameIndex: normalizeFieldFrameIndex(state.frameIndex + 1, state.frameCount) }
    case "step":
      if (state.frameCount === 0) return { ...state, playing: false }
      return {
        ...state,
        frameIndex: normalizeFieldFrameIndex(state.frameIndex + action.delta, state.frameCount),
        playing: false,
      }
    case "scrub":
      return {
        ...state,
        frameIndex: normalizeFieldFrameIndex(action.index, state.frameCount),
        playing: false,
      }
    case "style-reset":
      return { ...state, retained: false }
    case "cleanup":
      return { ...state, retained: false, playing: false }
  }
}

export function isDynamicFieldManifestStale(
  updatedAt: string | null | undefined,
  staticDataset: boolean,
  evaluatedAtMs = Date.now(),
  staleAfterMs = DYNAMIC_FIELD_STALE_AFTER_MS,
): boolean {
  if (staticDataset) return false
  const updatedMs = Date.parse(updatedAt ?? "")
  return !Number.isFinite(updatedMs) || evaluatedAtMs - updatedMs > staleAfterMs
}
