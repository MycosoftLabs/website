/**
 * Shared HLS.js options for live camera feeds (not VOD loops).
 * May 25, 2026 — Morgan: repeating clip seconds = stuck on VOD buffer; seek live edge.
 */

export function hlsLivePlayerConfig() {
  return {
    lowLatencyMode: true,
    liveSyncDurationCount: 3,
    liveMaxLatencyDurationCount: 10,
    maxLiveSyncPlaybackRate: 1.5,
    backBufferLength: 0,
    maxBufferLength: 12,
    manifestLoadingTimeOut: 12_000,
    levelLoadingTimeOut: 12_000,
    fragLoadingTimeOut: 12_000,
  }
}

/** Seek HLS player to the live edge after manifest parse / when latency drifts. */
export function seekVideoToLiveEdge(
  video: HTMLVideoElement,
  hls?: { liveSyncPosition?: number | null },
) {
  const livePos = hls?.liveSyncPosition
  if (livePos != null && Number.isFinite(livePos) && livePos > 0) {
    try {
      video.currentTime = livePos
    } catch {
      /* ignore seek errors during startup */
    }
    return
  }
  if (!Number.isFinite(video.duration) && video.seekable?.length) {
    try {
      video.currentTime = video.seekable.end(video.seekable.length - 1)
    } catch {
      /* ignore */
    }
  }
}
