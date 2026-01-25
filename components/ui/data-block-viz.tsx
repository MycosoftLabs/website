"use client"

import { useEffect, useRef, useMemo, useState } from "react"
import { motion } from "framer-motion"

interface DataBlock {
  id: string
  hash: string
  value: number
  timestamp: number
  status: "pending" | "confirmed" | "anchored"
  type: "transaction" | "merkle" | "signature" | "hash"
}

interface DataBlockVizProps {
  blocks?: DataBlock[]
  maxBlocks?: number
  blockSize?: number
  gap?: number
  animated?: boolean
  showLabels?: boolean
  colorScheme?: "purple" | "cyan" | "orange" | "green"
  orientation?: "horizontal" | "vertical"
  className?: string
}

// Seeded pseudo-random number generator for deterministic SSR
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
}

// Generate mock blocks with deterministic seeded random (SSR-safe)
function generateMockBlocks(count: number, seed: number = 42): DataBlock[] {
  const random = seededRandom(seed)
  const types: DataBlock["type"][] = ["transaction", "merkle", "signature", "hash"]
  
  return Array.from({ length: count }, (_, i) => ({
    id: `block-${i}`,
    hash: `0x${Math.floor(random() * 0xFFFFFFFF).toString(16).padStart(8, '0')}`,
    value: random() * 100,
    timestamp: 1706169600000 - i * 60000, // Fixed base timestamp for SSR
    status: (i === 0 ? "pending" : i < 3 ? "confirmed" : "anchored") as DataBlock["status"],
    type: types[Math.floor(random() * 4)]
  }))
}

// Isometric 3D block component (mempool-style)
function IsometricBlock({
  block,
  size,
  index,
  animated,
  showLabels,
  colorScheme
}: {
  block: DataBlock
  size: number
  index: number
  animated: boolean
  showLabels: boolean
  colorScheme: string
}) {
  const colors = {
    purple: {
      top: "#A855F7",
      left: "#7C3AED",
      right: "#6D28D9",
      glow: "rgba(168, 85, 247, 0.4)",
      pending: "#F59E0B",
      confirmed: "#10B981",
      anchored: "#8B5CF6"
    },
    cyan: {
      top: "#22D3EE",
      left: "#06B6D4",
      right: "#0891B2",
      glow: "rgba(34, 211, 238, 0.4)",
      pending: "#F59E0B",
      confirmed: "#10B981",
      anchored: "#06B6D4"
    },
    orange: {
      top: "#FB923C",
      left: "#F97316",
      right: "#EA580C",
      glow: "rgba(251, 146, 60, 0.4)",
      pending: "#F59E0B",
      confirmed: "#10B981",
      anchored: "#F97316"
    },
    green: {
      top: "#4ADE80",
      left: "#22C55E",
      right: "#16A34A",
      glow: "rgba(74, 222, 128, 0.4)",
      pending: "#F59E0B",
      confirmed: "#10B981",
      anchored: "#22C55E"
    }
  }

  const scheme = colors[colorScheme as keyof typeof colors] || colors.purple
  const statusColor = block.status === "pending" ? scheme.pending : block.status === "confirmed" ? scheme.confirmed : scheme.anchored

  // Isometric transformation values
  const isoX = size * 0.866 // cos(30°)
  const isoY = size * 0.5   // sin(30°)
  const height = size * (0.3 + block.value / 100 * 0.7) // Variable height based on value

  return (
    <motion.div
      initial={animated ? { opacity: 0, y: 20, scale: 0.8 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="relative"
      style={{
        width: size * 1.8,
        height: size * 1.5,
        filter: `drop-shadow(0 0 8px ${scheme.glow})`
      }}
    >
      <svg
        viewBox={`0 0 ${size * 1.8} ${size * 1.5}`}
        className="w-full h-full"
      >
        {/* Top face */}
        <motion.polygon
          points={`
            ${size * 0.9},${size * 0.2}
            ${size * 1.6},${size * 0.6}
            ${size * 0.9},${size}
            ${size * 0.2},${size * 0.6}
          `}
          fill={scheme.top}
          animate={animated ? { opacity: [0.8, 1, 0.8] } : {}}
          transition={{ duration: 2, repeat: Infinity, delay: index * 0.1 }}
        />

        {/* Left face */}
        <polygon
          points={`
            ${size * 0.2},${size * 0.6}
            ${size * 0.9},${size}
            ${size * 0.9},${size + height * 0.5}
            ${size * 0.2},${size * 0.6 + height * 0.5}
          `}
          fill={scheme.left}
        />

        {/* Right face */}
        <polygon
          points={`
            ${size * 0.9},${size}
            ${size * 1.6},${size * 0.6}
            ${size * 1.6},${size * 0.6 + height * 0.5}
            ${size * 0.9},${size + height * 0.5}
          `}
          fill={scheme.right}
        />

        {/* Status indicator */}
        <circle
          cx={size * 0.9}
          cy={size * 0.5}
          r={4}
          fill={statusColor}
        >
          {block.status === "pending" && (
            <animate
              attributeName="opacity"
              values="1;0.3;1"
              dur="1s"
              repeatCount="indefinite"
            />
          )}
        </circle>

        {/* Hash text on top face */}
        {showLabels && (
          <text
            x={size * 0.9}
            y={size * 0.7}
            textAnchor="middle"
            fill="rgba(255,255,255,0.7)"
            fontSize={8}
            fontFamily="monospace"
          >
            {block.hash.slice(0, 8)}
          </text>
        )}
      </svg>

      {/* Label below block */}
      {showLabels && (
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-mono text-muted-foreground whitespace-nowrap">
          {block.type}
        </div>
      )}
    </motion.div>
  )
}

// Main component - displays a row/stack of 3D isometric blocks
export function DataBlockViz({
  blocks,
  maxBlocks = 8,
  blockSize = 50,
  gap = 10,
  animated = true,
  showLabels = true,
  colorScheme = "purple",
  orientation = "horizontal",
  className = ""
}: DataBlockVizProps) {
  const displayBlocks = useMemo(() => {
    const source = blocks || generateMockBlocks(maxBlocks)
    return source.slice(0, maxBlocks)
  }, [blocks, maxBlocks])

  return (
    <div
      className={`flex ${orientation === "horizontal" ? "flex-row" : "flex-col"} items-center justify-center ${className}`}
      style={{ gap }}
    >
      {displayBlocks.map((block, index) => (
        <IsometricBlock
          key={block.id}
          block={block}
          size={blockSize}
          index={index}
          animated={animated}
          showLabels={showLabels}
          colorScheme={colorScheme}
        />
      ))}
    </div>
  )
}

// Mini block row for compact displays
export function MiniBlockRow({
  count = 6,
  colorScheme = "purple",
  className = ""
}: {
  count?: number
  colorScheme?: "purple" | "cyan" | "orange" | "green"
  className?: string
}) {
  const colors = {
    purple: ["#7C3AED", "#8B5CF6", "#A855F7", "#C084FC"],
    cyan: ["#0891B2", "#06B6D4", "#22D3EE", "#67E8F9"],
    orange: ["#EA580C", "#F97316", "#FB923C", "#FDBA74"],
    green: ["#16A34A", "#22C55E", "#4ADE80", "#86EFAC"]
  }

  const scheme = colors[colorScheme]

  // Use seeded random for deterministic heights (SSR-safe)
  const random = seededRandom(123)
  const heights = useMemo(() => 
    Array.from({ length: count }, () => 12 + random() * 20), 
    [count]
  )
  
  return (
    <div className={`flex items-end gap-1 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="rounded-sm"
          style={{
            width: 8,
            height: heights[i],
            background: `linear-gradient(180deg, ${scheme[i % scheme.length]} 0%, ${scheme[(i + 1) % scheme.length]} 100%)`,
            boxShadow: `0 0 6px ${scheme[i % scheme.length]}40`
          }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
        />
      ))}
    </div>
  )
}

// Transaction block strip (like mempool's block strip)
export function TransactionBlockStrip({
  blocks,
  height = 60,
  className = ""
}: {
  blocks?: { hash: string; size: number; fee: number }[]
  height?: number
  className?: string
}) {
  const displayBlocks = useMemo(() => {
    if (blocks) return blocks
    // Generate mock transaction blocks with seeded random (SSR-safe)
    const random = seededRandom(456)
    return Array.from({ length: 20 }, (_, i) => ({
      hash: `0x${Math.floor(random() * 0xFFFFFFFF).toString(16).padStart(8, '0')}`,
      size: 0.2 + random() * 0.8,
      fee: random() * 10
    }))
  }, [blocks])

  // Color based on fee (low = green, medium = yellow, high = purple)
  const getColor = (fee: number) => {
    if (fee < 3) return "#22C55E"
    if (fee < 6) return "#EAB308"
    return "#8B5CF6"
  }

  return (
    <div className={`flex items-end gap-px ${className}`} style={{ height }}>
      {displayBlocks.map((block, i) => (
        <motion.div
          key={i}
          className="flex-1 min-w-[3px] rounded-t-sm cursor-pointer transition-all hover:brightness-125"
          style={{
            height: `${block.size * 100}%`,
            backgroundColor: getColor(block.fee),
            boxShadow: `0 0 4px ${getColor(block.fee)}60`
          }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: i * 0.02, duration: 0.2 }}
          title={`${block.hash}\nFee: ${block.fee.toFixed(2)} sat/vB`}
        />
      ))}
    </div>
  )
}
