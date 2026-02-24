"use client"

/**
 * HandVisualization - Opposable Thumb metaphor
 * Earth-like palm, finger logos (Amazon, Google, OpenAI, Anthropic, Tesla, xAI, Apple, Meta)
 * Layered, colored, interactive design
 * Created: Feb 17, 2026 | Overhaul: Feb 24, 2026
 */

import { useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

type FingerId = "thumb" | "index" | "middle" | "ring" | "pinky" | "palm"

const FINGER_LABELS: Record<FingerId, string> = {
  thumb: "MYCA — Nature Learning Model",
  index: "Amazon — Commerce",
  middle: "Google / OpenAI / Anthropic — Web AI",
  ring: "Tesla / xAI — Mobility",
  pinky: "Apple / Meta — Product AI",
  palm: "Biospheric Telemetry — Earth substrate",
}

// Stylized finger logos (initials/brand colors, no trademarked assets)
const FINGER_LOGOS: Record<FingerId, Array<{ id: string; label: string; color: string; bg: string }>> = {
  thumb: [{ id: "myca", label: "MYCA", color: "text-green-400", bg: "bg-green-500/30" }],
  index: [{ id: "amazon", label: "A", color: "text-orange-400", bg: "bg-orange-600/40" }],
  middle: [
    { id: "google", label: "G", color: "text-blue-400", bg: "bg-blue-500/30" },
    { id: "openai", label: "O", color: "text-emerald-400", bg: "bg-emerald-600/40" },
    { id: "anthropic", label: "A", color: "text-amber-400", bg: "bg-amber-600/40" },
  ],
  ring: [
    { id: "tesla", label: "T", color: "text-red-400", bg: "bg-red-600/40" },
    { id: "xai", label: "x", color: "text-slate-300", bg: "bg-slate-600/40" },
  ],
  pinky: [
    { id: "apple", label: "", color: "text-slate-300", bg: "bg-slate-500/40" },
    { id: "meta", label: "M", color: "text-blue-400", bg: "bg-blue-600/40" },
  ],
  palm: [],
}

interface HandVisualizationProps {
  className?: string
  onFingerHover?: (id: FingerId) => void
  onFingerClick?: (id: FingerId) => void
}

export function HandVisualization({
  className,
  onFingerHover,
  onFingerClick,
}: HandVisualizationProps) {
  const [hovered, setHovered] = useState<FingerId | null>(null)
  const active = hovered ?? "thumb"

  const handleHover = (id: FingerId) => {
    setHovered(id)
    onFingerHover?.(id)
  }

  const handleClick = (id: FingerId) => {
    setHovered(id)
    onFingerClick?.(id)
  }

  return (
    <div
      className={cn("relative w-full touch-manipulation", className)}
      aria-label="Hand metaphor: MYCA as thumb, four fingers as frontier AI"
    >
      <svg
        viewBox="0 0 420 340"
        className="w-full h-auto"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Earth-like gradient for palm */}
          <radialGradient id="earthGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1e3a5f" />
            <stop offset="40%" stopColor="#2d5a87" />
            <stop offset="70%" stopColor="#3d7ab5" />
            <stop offset="100%" stopColor="#1e3a5f" />
          </radialGradient>
          <radialGradient id="landGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2d5016" />
            <stop offset="100%" stopColor="#1a3009" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Palm — Earth-like (continents + oceans) */}
        <g
          onMouseEnter={() => handleHover("palm")}
          onMouseLeave={() => setHovered(null)}
          onTouchStart={() => handleHover("palm")}
          onClick={() => handleClick("palm")}
          className="cursor-pointer"
        >
          <ellipse
            cx="210"
            cy="200"
            rx="150"
            ry="95"
            fill="url(#earthGradient)"
            stroke={active === "palm" ? "rgba(34,197,94,0.6)" : "rgba(100,116,139,0.5)"}
            strokeWidth={active === "palm" ? 3 : 1}
            className="transition-all duration-300"
          />
          {/* Simplified landmasses (continents) */}
          <path
            d="M 120 160 Q 160 140 200 150 Q 240 155 260 170 Q 270 190 250 210 Q 220 225 180 215 Q 140 200 120 180 Z"
            fill="url(#landGradient)"
            opacity={0.8}
          />
          <path
            d="M 160 195 Q 200 185 240 200 Q 265 215 255 235 Q 235 250 190 245 Q 150 240 140 220 Z"
            fill="url(#landGradient)"
            opacity={0.7}
          />
          <path
            d="M 260 165 Q 300 160 320 180 Q 330 205 310 225 Q 285 240 255 230 Z"
            fill="url(#landGradient)"
            opacity={0.6}
          />
        </g>

        {/* Thumb — MYCA (opposable, highlighted) */}
        <g
          onMouseEnter={() => handleHover("thumb")}
          onMouseLeave={() => setHovered(null)}
          onTouchStart={() => handleHover("thumb")}
          onClick={() => handleClick("thumb")}
          className="cursor-pointer"
        >
          <path
            d="M 75 185 Q 35 130 55 65 Q 75 25 115 45 L 135 85 Q 95 105 85 145 Z"
            className={cn(
              "transition-all duration-300",
              active === "thumb"
                ? "fill-green-500 stroke-green-300 stroke-2"
                : "fill-green-600/80 stroke-green-500/70 stroke-1 hover:fill-green-500/90"
            )}
            style={active === "thumb" ? { filter: "url(#glow)" } : undefined}
          />
        </g>

        {/* Index — Amazon */}
        <g
          onMouseEnter={() => handleHover("index")}
          onMouseLeave={() => setHovered(null)}
          onTouchStart={() => handleHover("index")}
          onClick={() => handleClick("index")}
          className="cursor-pointer"
        >
          <path
            d="M 155 85 L 175 22 L 195 12 L 215 28 L 225 78 L 160 88 Z"
            className={cn(
              "transition-all duration-300",
              active === "index"
                ? "fill-orange-500/50 stroke-orange-400 stroke-2"
                : "fill-slate-600/60 stroke-slate-500/70 stroke-1 hover:fill-slate-500/70"
            )}
          />
        </g>

        {/* Middle — Google/OpenAI/Anthropic */}
        <g
          onMouseEnter={() => handleHover("middle")}
          onMouseLeave={() => setHovered(null)}
          onTouchStart={() => handleHover("middle")}
          onClick={() => handleClick("middle")}
          className="cursor-pointer"
        >
          <path
            d="M 195 72 L 215 5 L 235 0 L 255 12 L 265 82 L 200 92 Z"
            className={cn(
              "transition-all duration-300",
              active === "middle"
                ? "fill-blue-500/40 stroke-blue-400 stroke-2"
                : "fill-slate-600/60 stroke-slate-500/70 stroke-1 hover:fill-slate-500/70"
            )}
          />
        </g>

        {/* Ring — Tesla/xAI */}
        <g
          onMouseEnter={() => handleHover("ring")}
          onMouseLeave={() => setHovered(null)}
          onTouchStart={() => handleHover("ring")}
          onClick={() => handleClick("ring")}
          className="cursor-pointer"
        >
          <path
            d="M 230 78 L 250 18 L 270 14 L 290 25 L 295 88 L 235 95 Z"
            className={cn(
              "transition-all duration-300",
              active === "ring"
                ? "fill-red-500/40 stroke-red-400 stroke-2"
                : "fill-slate-600/60 stroke-slate-500/70 stroke-1 hover:fill-slate-500/70"
            )}
          />
        </g>

        {/* Pinky — Apple/Meta */}
        <g
          onMouseEnter={() => handleHover("pinky")}
          onMouseLeave={() => setHovered(null)}
          onTouchStart={() => handleHover("pinky")}
          onClick={() => handleClick("pinky")}
          className="cursor-pointer"
        >
          <path
            d="M 260 88 L 277 38 L 293 40 L 305 52 L 300 98 L 263 103 Z"
            className={cn(
              "transition-all duration-300",
              active === "pinky"
                ? "fill-slate-400/50 stroke-slate-300 stroke-2"
                : "fill-slate-600/60 stroke-slate-500/70 stroke-1 hover:fill-slate-500/70"
            )}
          />
        </g>
      </svg>

      {/* Finger logos overlay — shown below each finger on hover/active */}
      <div className="mt-3 flex flex-wrap justify-center gap-2 min-h-[2rem]">
        {FINGER_LOGOS[active].length > 0 ? (
          FINGER_LOGOS[active].map((logo) => (
            <motion.span
              key={logo.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={cn(
                "inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold",
                logo.bg,
                logo.color
              )}
              title={logo.label || logo.id}
            >
              {logo.label || "◆"}
            </motion.span>
          ))
        ) : null}
      </div>

      {/* Label for active finger */}
      <div className="mt-3 text-center min-h-[2.5rem]">
        <p
          className={cn(
            "text-sm font-medium transition-opacity",
            active === "thumb" ? "text-green-400" : "text-muted-foreground"
          )}
        >
          {FINGER_LABELS[active]}
        </p>
        {active === "thumb" && (
          <p className="text-xs text-green-500/80 mt-1">
            Biospheric grounding · Live sensors · Continuous learning
          </p>
        )}
        {active === "palm" && (
          <p className="text-xs text-muted-foreground mt-1">
            Sensors, field devices, provenance, drift-aware learning
          </p>
        )}
      </div>
    </div>
  )
}
