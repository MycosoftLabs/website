"use client"

/**
 * Neuromorphic Progress bar component
 * Shows progress with optional shimmer animation.
 * Date: Feb 18, 2026
 */

export interface NeuProgressProps {
  value: number
  max?: number
  showLabel?: boolean
  label?: string
  shimmer?: boolean
  className?: string
}

export function NeuProgress({
  value,
  max = 100,
  showLabel = true,
  label = "Progress",
  shimmer = false,
  className = "",
}: NeuProgressProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className={className}>
      {(showLabel || label) && (
        <div className="flex justify-between mb-2">
          {label && (
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {label}
            </span>
          )}
          {showLabel && (
            <span className="text-sm font-medium text-purple-600">
              {Math.round(percent)}%
            </span>
          )}
        </div>
      )}
      <div
        className="h-3 rounded-full overflow-hidden neu-inset"
        role="progressbar"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 relative overflow-hidden neu-progress-fill ${shimmer ? "neu-shimmer" : ""}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
