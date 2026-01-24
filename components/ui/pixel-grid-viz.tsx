"use client"

import { useEffect, useRef, useMemo, useState } from "react"
import { motion } from "framer-motion"

interface PixelGridVizProps {
  hash?: string
  data?: number[]
  rows?: number
  cols?: number
  pixelSize?: number
  gap?: number
  animated?: boolean
  colorScheme?: "purple" | "cyan" | "orange" | "rainbow" | "matrix"
  showHash?: boolean
  className?: string
}

// Convert a hash string to pixel values
function hashToPixels(hash: string, count: number): number[] {
  const pixels: number[] = []
  const cleanHash = hash.replace(/^0x/, "")
  
  for (let i = 0; i < count; i++) {
    const charIndex = i % cleanHash.length
    const charCode = cleanHash.charCodeAt(charIndex)
    pixels.push((charCode * (i + 1)) % 256)
  }
  
  return pixels
}

// Generate random hash
function generateRandomHash(): string {
  return `0x${Array.from({ length: 64 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join("")}`
}

// Pixelated hash visualization (like a visual fingerprint)
export function PixelGridViz({
  hash,
  data,
  rows = 8,
  cols = 16,
  pixelSize = 12,
  gap = 2,
  animated = true,
  colorScheme = "purple",
  showHash = true,
  className = ""
}: PixelGridVizProps) {
  const [currentHash, setCurrentHash] = useState(hash || generateRandomHash())
  const [animationPhase, setAnimationPhase] = useState(0)

  const pixels = useMemo(() => {
    if (data) return data
    return hashToPixels(currentHash, rows * cols)
  }, [currentHash, data, rows, cols])

  // Animate hash changes
  useEffect(() => {
    if (!animated) return

    const interval = setInterval(() => {
      setAnimationPhase(p => (p + 1) % 100)
      // Occasionally update hash
      if (Math.random() > 0.95) {
        setCurrentHash(generateRandomHash())
      }
    }, 100)

    return () => clearInterval(interval)
  }, [animated])

  const getColor = (value: number, index: number) => {
    const schemes = {
      purple: (v: number) => {
        const hue = 260 + (v / 255) * 40 // Purple range
        const lightness = 30 + (v / 255) * 40
        return `hsl(${hue}, 80%, ${lightness}%)`
      },
      cyan: (v: number) => {
        const hue = 180 + (v / 255) * 30 // Cyan range
        const lightness = 30 + (v / 255) * 40
        return `hsl(${hue}, 80%, ${lightness}%)`
      },
      orange: (v: number) => {
        const hue = 20 + (v / 255) * 30 // Orange range
        const lightness = 30 + (v / 255) * 40
        return `hsl(${hue}, 80%, ${lightness}%)`
      },
      rainbow: (v: number) => {
        const hue = (v / 255) * 360
        return `hsl(${hue}, 80%, 50%)`
      },
      matrix: (v: number) => {
        const brightness = (v / 255) * 100
        return `hsl(120, 100%, ${brightness * 0.5}%)`
      }
    }

    return schemes[colorScheme](value)
  }

  const gridWidth = cols * (pixelSize + gap) - gap
  const gridHeight = rows * (pixelSize + gap) - gap

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Pixel Grid */}
      <div
        className="relative rounded-lg overflow-hidden"
        style={{
          width: gridWidth,
          height: gridHeight,
          background: "rgba(0,0,0,0.4)"
        }}
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${cols}, ${pixelSize}px)`,
            gridTemplateRows: `repeat(${rows}, ${pixelSize}px)`,
            gap: `${gap}px`
          }}
        >
          {pixels.map((value, i) => {
            const row = Math.floor(i / cols)
            const col = i % cols
            const delay = (row + col) * 0.02

            return (
              <motion.div
                key={i}
                className="rounded-sm"
                style={{
                  backgroundColor: getColor(value, i),
                  boxShadow: `0 0 ${4 + (value / 255) * 4}px ${getColor(value, i)}60`
                }}
                initial={animated ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
                animate={{
                  scale: 1,
                  opacity: 0.6 + (value / 255) * 0.4
                }}
                transition={{ delay, duration: 0.2 }}
              />
            )
          })}
        </div>

        {/* Scan line effect */}
        {animated && (
          <motion.div
            className="absolute left-0 right-0 h-1 pointer-events-none"
            style={{
              background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.3), transparent)"
            }}
            animate={{
              top: [0, gridHeight, 0]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        )}
      </div>

      {/* Hash display */}
      {showHash && (
        <motion.div
          className="mt-3 font-mono text-xs text-muted-foreground max-w-full overflow-hidden text-ellipsis"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {currentHash.slice(0, 20)}...{currentHash.slice(-8)}
        </motion.div>
      )}
    </div>
  )
}

// Merkle tree visualization as nested pixel grids
export function MerklePixelTree({
  rootHash,
  depth = 3,
  className = ""
}: {
  rootHash?: string
  depth?: number
  className?: string
}) {
  const levels = useMemo(() => {
    const result: string[][] = []
    for (let i = 0; i < depth; i++) {
      const nodesAtLevel = Math.pow(2, i)
      const hashes = Array.from({ length: nodesAtLevel }, () => generateRandomHash())
      result.push(hashes)
    }
    return result
  }, [depth])

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {levels.map((level, levelIndex) => (
        <motion.div
          key={levelIndex}
          className="flex gap-4 justify-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: levelIndex * 0.2 }}
        >
          {level.map((hash, nodeIndex) => (
            <div key={nodeIndex} className="flex flex-col items-center">
              <PixelGridViz
                hash={hash}
                rows={4}
                cols={8}
                pixelSize={6}
                gap={1}
                animated={levelIndex === 0}
                colorScheme={levelIndex === 0 ? "purple" : "cyan"}
                showHash={false}
              />
              {levelIndex === 0 && (
                <div className="text-[8px] font-mono text-purple-400 mt-1">
                  ROOT
                </div>
              )}
            </div>
          ))}
        </motion.div>
      ))}
      
      {/* Connecting lines would go here in a full implementation */}
    </div>
  )
}

// Hash comparison visualizer
export function HashCompareViz({
  hash1,
  hash2,
  label1 = "Original",
  label2 = "Current",
  className = ""
}: {
  hash1?: string
  hash2?: string
  label1?: string
  label2?: string
  className?: string
}) {
  const h1 = hash1 || generateRandomHash()
  const h2 = hash2 || h1 // Same by default (verified)
  const isMatch = h1 === h2

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div className="flex items-center gap-6">
        <div className="flex flex-col items-center">
          <div className="text-xs text-muted-foreground mb-2">{label1}</div>
          <PixelGridViz
            hash={h1}
            rows={4}
            cols={8}
            pixelSize={8}
            gap={1}
            animated={false}
            colorScheme="purple"
            showHash={false}
          />
        </div>

        <motion.div
          className={`text-2xl ${isMatch ? "text-green-500" : "text-red-500"}`}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          {isMatch ? "=" : "≠"}
        </motion.div>

        <div className="flex flex-col items-center">
          <div className="text-xs text-muted-foreground mb-2">{label2}</div>
          <PixelGridViz
            hash={h2}
            rows={4}
            cols={8}
            pixelSize={8}
            gap={1}
            animated={false}
            colorScheme={isMatch ? "purple" : "orange"}
            showHash={false}
          />
        </div>
      </div>

      <div className={`text-center text-sm font-medium ${isMatch ? "text-green-500" : "text-red-500"}`}>
        {isMatch ? "✓ Hash Verified" : "✗ Hash Mismatch"}
      </div>
    </div>
  )
}

// Live hash stream visualization
export function HashStreamViz({
  streamSpeed = 1,
  colorScheme = "purple",
  height = 100,
  className = ""
}: {
  streamSpeed?: number
  colorScheme?: "purple" | "cyan" | "matrix"
  height?: number
  className?: string
}) {
  const [hashes, setHashes] = useState<string[]>([])

  useEffect(() => {
    const interval = setInterval(() => {
      setHashes(prev => {
        const newHashes = [...prev, generateRandomHash().slice(2, 18)]
        return newHashes.slice(-20) // Keep last 20
      })
    }, 500 / streamSpeed)

    return () => clearInterval(interval)
  }, [streamSpeed])

  const getHashColor = (char: string) => {
    const value = parseInt(char, 16)
    const schemes = {
      purple: `hsl(${260 + value * 2}, 80%, ${40 + value * 3}%)`,
      cyan: `hsl(${180 + value * 2}, 80%, ${40 + value * 3}%)`,
      matrix: `hsl(120, 100%, ${20 + value * 4}%)`
    }
    return schemes[colorScheme]
  }

  return (
    <div
      className={`overflow-hidden font-mono text-xs ${className}`}
      style={{ height, background: "rgba(0,0,0,0.3)", borderRadius: 8 }}
    >
      <div className="flex flex-col-reverse p-2 gap-1">
        {hashes.map((hash, i) => (
          <motion.div
            key={i}
            className="flex gap-px"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1 - i * 0.04, x: 0 }}
          >
            {hash.split("").map((char, j) => (
              <span
                key={j}
                style={{ color: getHashColor(char) }}
              >
                {char}
              </span>
            ))}
          </motion.div>
        ))}
      </div>
    </div>
  )
}
