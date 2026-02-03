/**
 * RTF (Real-Time Factor) Watchdog
 * 
 * Monitors audio generation performance to ensure real-time operation.
 * If generation takes longer than audio duration (RTF > 1), stuttering WILL occur.
 * 
 * Created: February 3, 2026
 * 
 * RTF Definition:
 *   RTF = generation_time_ms / audio_duration_ms
 * 
 * Example:
 *   - Generate 100ms of audio in 70ms → RTF = 0.7 (healthy)
 *   - Generate 100ms of audio in 110ms → RTF = 1.1 (WILL STUTTER)
 */

// ============================================================================
// Types
// ============================================================================

export type RTFStatus = "healthy" | "warning" | "critical"

export interface RTFSample {
  generationMs: number
  audioDurationMs: number
  rtf: number
  timestamp: number
}

export interface RTFWatchdogState {
  currentRTF: number
  rollingAvg5s: number
  rollingAvg30s: number
  status: RTFStatus
  samples: RTFSample[]
  warningStartTime: number | null
  criticalStartTime: number | null
  totalSamples: number
  droppedFrames: number
}

export interface RTFThresholds {
  healthy: number          // Below this = healthy (default: 0.7)
  warning: number          // Above this = warning (default: 0.9)
  critical: number         // Above this = critical (default: 1.0)
  warningDurationMs: number   // How long warning before action (default: 2000)
  criticalDurationMs: number  // How long critical before action (default: 3000)
}

export interface RTFWatchdogOptions {
  thresholds?: Partial<RTFThresholds>
  maxSamples?: number           // Maximum samples to keep (default: 100)
  onStatusChange?: (status: RTFStatus, state: RTFWatchdogState) => void
  onDowngradeNeeded?: () => void
  onResyncNeeded?: () => void
}

// ============================================================================
// Default Thresholds
// ============================================================================

export const DEFAULT_THRESHOLDS: RTFThresholds = {
  healthy: 0.7,
  warning: 0.9,
  critical: 1.0,
  warningDurationMs: 2000,
  criticalDurationMs: 3000,
}

// ============================================================================
// RTF Watchdog Class
// ============================================================================

export class RTFWatchdog {
  private state: RTFWatchdogState
  private thresholds: RTFThresholds
  private maxSamples: number
  private onStatusChange?: (status: RTFStatus, state: RTFWatchdogState) => void
  private onDowngradeNeeded?: () => void
  private onResyncNeeded?: () => void

  constructor(options: RTFWatchdogOptions = {}) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...options.thresholds }
    this.maxSamples = options.maxSamples ?? 100
    this.onStatusChange = options.onStatusChange
    this.onDowngradeNeeded = options.onDowngradeNeeded
    this.onResyncNeeded = options.onResyncNeeded

    this.state = {
      currentRTF: 0,
      rollingAvg5s: 0,
      rollingAvg30s: 0,
      status: "healthy",
      samples: [],
      warningStartTime: null,
      criticalStartTime: null,
      totalSamples: 0,
      droppedFrames: 0,
    }
  }

  /**
   * Record a new RTF sample
   * Call this after each audio generation
   */
  recordSample(generationMs: number, audioDurationMs: number): RTFSample {
    const rtf = audioDurationMs > 0 ? generationMs / audioDurationMs : 0
    const now = Date.now()

    const sample: RTFSample = {
      generationMs,
      audioDurationMs,
      rtf,
      timestamp: now,
    }

    // Add sample
    this.state.samples.push(sample)
    this.state.totalSamples++
    this.state.currentRTF = rtf

    // Trim old samples
    while (this.state.samples.length > this.maxSamples) {
      this.state.samples.shift()
    }

    // Calculate rolling averages
    this.updateRollingAverages(now)

    // Update status
    this.updateStatus(now)

    // Check if we dropped a frame (RTF > 1)
    if (rtf > 1.0) {
      this.state.droppedFrames++
    }

    return sample
  }

  /**
   * Update rolling averages for 5s and 30s windows
   */
  private updateRollingAverages(now: number): void {
    const samples5s = this.state.samples.filter(s => now - s.timestamp <= 5000)
    const samples30s = this.state.samples.filter(s => now - s.timestamp <= 30000)

    this.state.rollingAvg5s = samples5s.length > 0
      ? samples5s.reduce((sum, s) => sum + s.rtf, 0) / samples5s.length
      : this.state.currentRTF

    this.state.rollingAvg30s = samples30s.length > 0
      ? samples30s.reduce((sum, s) => sum + s.rtf, 0) / samples30s.length
      : this.state.currentRTF
  }

  /**
   * Update status based on current RTF and duration
   */
  private updateStatus(now: number): void {
    const previousStatus = this.state.status
    const rtf = this.state.rollingAvg5s

    // Determine new status
    let newStatus: RTFStatus
    if (rtf >= this.thresholds.critical) {
      newStatus = "critical"
    } else if (rtf >= this.thresholds.warning) {
      newStatus = "warning"
    } else {
      newStatus = "healthy"
    }

    // Track status duration
    if (newStatus === "critical") {
      if (!this.state.criticalStartTime) {
        this.state.criticalStartTime = now
      }
      this.state.warningStartTime = null

      // Check if critical for too long
      const criticalDuration = now - this.state.criticalStartTime
      if (criticalDuration >= this.thresholds.criticalDurationMs) {
        this.onResyncNeeded?.()
      }
    } else if (newStatus === "warning") {
      if (!this.state.warningStartTime) {
        this.state.warningStartTime = now
      }
      this.state.criticalStartTime = null

      // Check if warning for too long
      const warningDuration = now - this.state.warningStartTime
      if (warningDuration >= this.thresholds.warningDurationMs) {
        this.onDowngradeNeeded?.()
      }
    } else {
      // Healthy - reset timers
      this.state.warningStartTime = null
      this.state.criticalStartTime = null
    }

    // Update state and notify
    this.state.status = newStatus
    if (newStatus !== previousStatus) {
      this.onStatusChange?.(newStatus, this.getState())
    }
  }

  /**
   * Get current watchdog state
   */
  getState(): RTFWatchdogState {
    return { ...this.state }
  }

  /**
   * Get current status
   */
  getStatus(): RTFStatus {
    return this.state.status
  }

  /**
   * Check if downgrade is recommended
   */
  shouldDowngrade(): boolean {
    if (!this.state.warningStartTime) return false
    const duration = Date.now() - this.state.warningStartTime
    return duration >= this.thresholds.warningDurationMs
  }

  /**
   * Check if resync is needed (critical for too long)
   */
  needsResync(): boolean {
    if (!this.state.criticalStartTime) return false
    const duration = Date.now() - this.state.criticalStartTime
    return duration >= this.thresholds.criticalDurationMs
  }

  /**
   * Reset the watchdog state
   */
  reset(): void {
    this.state = {
      currentRTF: 0,
      rollingAvg5s: 0,
      rollingAvg30s: 0,
      status: "healthy",
      samples: [],
      warningStartTime: null,
      criticalStartTime: null,
      totalSamples: 0,
      droppedFrames: 0,
    }
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    avgRTF: number
    minRTF: number
    maxRTF: number
    totalSamples: number
    droppedFrames: number
    dropRate: number
  } {
    const samples = this.state.samples
    if (samples.length === 0) {
      return {
        avgRTF: 0,
        minRTF: 0,
        maxRTF: 0,
        totalSamples: 0,
        droppedFrames: 0,
        dropRate: 0,
      }
    }

    const rtfs = samples.map(s => s.rtf)
    return {
      avgRTF: rtfs.reduce((a, b) => a + b, 0) / rtfs.length,
      minRTF: Math.min(...rtfs),
      maxRTF: Math.max(...rtfs),
      totalSamples: this.state.totalSamples,
      droppedFrames: this.state.droppedFrames,
      dropRate: this.state.totalSamples > 0
        ? this.state.droppedFrames / this.state.totalSamples
        : 0,
    }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get RTF status color for UI
 */
export function getRTFStatusColor(status: RTFStatus): string {
  switch (status) {
    case "healthy": return "#22c55e"  // green
    case "warning": return "#eab308"  // yellow
    case "critical": return "#ef4444" // red
    default: return "#6b7280"         // gray
  }
}

/**
 * Get RTF status label for UI
 */
export function getRTFStatusLabel(status: RTFStatus): string {
  switch (status) {
    case "healthy": return "Healthy"
    case "warning": return "Warning"
    case "critical": return "Critical"
    default: return "Unknown"
  }
}

/**
 * Format RTF for display
 */
export function formatRTF(rtf: number): string {
  return rtf.toFixed(2)
}

/**
 * Calculate RTF from generation time and audio duration
 */
export function calculateRTF(generationMs: number, audioDurationMs: number): number {
  if (audioDurationMs <= 0) return 0
  return generationMs / audioDurationMs
}

/**
 * Create a simple RTF watchdog with default settings
 */
export function createRTFWatchdog(
  onStatusChange?: (status: RTFStatus) => void
): RTFWatchdog {
  return new RTFWatchdog({
    onStatusChange: onStatusChange 
      ? (status) => onStatusChange(status)
      : undefined,
  })
}
