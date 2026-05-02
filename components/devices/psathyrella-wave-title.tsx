"use client"

import { useId } from "react"
import { Cabin_Condensed } from "next/font/google"
import { useDomDarkMode } from "@/components/ui/neuromorphic"

const cabinCondensed = Cabin_Condensed({
  weight: "700",
  subsets: ["latin"],
  display: "swap",
})

interface PsathyrellaWaveTitleProps {
  title: string
  className?: string
}

/**
 * Animated wave-fill title (marine gradient) — adapted from SVG wave text pattern.
 */
export function PsathyrellaWaveTitle({ title, className = "" }: PsathyrellaWaveTitleProps) {
  const isDark = useDomDarkMode()
  const raw = useId().replace(/:/g, "")
  const gradId = `psathyrella-grad-${raw}`
  const waveId = `psathyrella-wave-${raw}`

  const gradTop = isDark ? "#326384" : "#0f172a"
  const gradBot = isDark ? "#123752" : "#020617"
  const rimStroke = isDark ? "#e0f2fe" : "#1e293b"
  const rimOpacity = isDark ? 0.35 : 0.45
  const waveFillOpacity = isDark ? 0.6 : 0.92
  const depthFillOpacity = isDark ? 0.1 : 0.22

  const textProps = {
    textAnchor: "middle" as const,
    x: 120,
    y: 19,
    fontSize: 17,
    strokeLinejoin: "round" as const,
    paintOrder: "stroke fill" as const,
  }

  return (
    <svg
      viewBox="0 0 240 26"
      className={`psathyrella-wave-title block w-full max-w-[min(92vw,44rem)] h-auto font-bold ${cabinCondensed.className} ${className}`}
      role="img"
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="5%" stopColor={gradTop} />
          <stop offset="95%" stopColor={gradBot} />
        </linearGradient>
        <pattern id={waveId} x="0" y="0" width="120" height="26" patternUnits="userSpaceOnUse">
          <path
            d="M-40 11 Q-30 8 -20 11 T0 11 T20 11 T40 11 T60 11 T80 11 T100 11 T120 11 V26 H-40z"
            fill={`url(#${gradId})`}
          >
            <animateTransform
              attributeName="transform"
              begin="0s"
              dur="1.5s"
              type="translate"
              from="0 0"
              to="40 0"
              repeatCount="indefinite"
            />
          </path>
        </pattern>
      </defs>
      {/* Light rim only — no blur filter (keeps wave fill crisp) */}
      <g>
        <text
          {...textProps}
          fill="none"
          stroke={rimStroke}
          strokeOpacity={rimOpacity}
          strokeWidth={0.9}
        >
          {title}
        </text>
        <text {...textProps} fill={`url(#${waveId})`} fillOpacity={waveFillOpacity}>
          {title}
        </text>
        <text {...textProps} fill={`url(#${gradId})`} fillOpacity={depthFillOpacity}>
          {title}
        </text>
      </g>
    </svg>
  )
}
