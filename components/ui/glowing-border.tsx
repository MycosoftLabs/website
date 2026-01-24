"use client"

import { ReactNode } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface GlowingBorderProps {
  children: ReactNode
  color?: "purple" | "cyan" | "orange" | "green" | "red"
  intensity?: "low" | "medium" | "high"
  animated?: boolean
  pulseSpeed?: number
  borderWidth?: number
  borderRadius?: number
  className?: string
  innerClassName?: string
}

// Get color values based on color prop
const getColors = (color: string) => {
  const colors: Record<string, { primary: string; glow: string; bg: string }> = {
    purple: {
      primary: "#8B5CF6",
      glow: "rgba(139, 92, 246, 0.6)",
      bg: "rgba(139, 92, 246, 0.05)"
    },
    cyan: {
      primary: "#06B6D4",
      glow: "rgba(6, 182, 212, 0.6)",
      bg: "rgba(6, 182, 212, 0.05)"
    },
    orange: {
      primary: "#F97316",
      glow: "rgba(249, 115, 22, 0.6)",
      bg: "rgba(249, 115, 22, 0.05)"
    },
    green: {
      primary: "#22C55E",
      glow: "rgba(34, 197, 94, 0.6)",
      bg: "rgba(34, 197, 94, 0.05)"
    },
    red: {
      primary: "#EF4444",
      glow: "rgba(239, 68, 68, 0.6)",
      bg: "rgba(239, 68, 68, 0.05)"
    }
  }
  return colors[color] || colors.purple
}

// Glowing border wrapper component
export function GlowingBorder({
  children,
  color = "purple",
  intensity = "medium",
  animated = true,
  pulseSpeed = 2,
  borderWidth = 1,
  borderRadius = 12,
  className = "",
  innerClassName = ""
}: GlowingBorderProps) {
  const colors = getColors(color)

  const intensityValues = {
    low: { blur: 8, spread: 4 },
    medium: { blur: 16, spread: 8 },
    high: { blur: 24, spread: 12 }
  }

  const { blur, spread } = intensityValues[intensity]

  return (
    <motion.div
      className={cn("relative", className)}
      animate={animated ? {
        boxShadow: [
          `0 0 ${blur}px ${spread}px ${colors.glow}`,
          `0 0 ${blur * 1.5}px ${spread * 1.5}px ${colors.glow}`,
          `0 0 ${blur}px ${spread}px ${colors.glow}`
        ]
      } : {}}
      transition={{
        duration: pulseSpeed,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      style={{
        borderRadius,
        border: `${borderWidth}px solid ${colors.primary}`,
        background: colors.bg,
        boxShadow: `0 0 ${blur}px ${spread}px ${colors.glow}`
      }}
    >
      <div className={cn("relative z-10", innerClassName)}>
        {children}
      </div>
    </motion.div>
  )
}

// Glass card with glowing border
export function GlassCard({
  children,
  color = "purple",
  animated = true,
  className = "",
  padding = "p-4"
}: {
  children: ReactNode
  color?: "purple" | "cyan" | "orange" | "green" | "red"
  animated?: boolean
  className?: string
  padding?: string
}) {
  const colors = getColors(color)

  return (
    <motion.div
      className={cn(
        "relative overflow-hidden rounded-xl",
        padding,
        className
      )}
      style={{
        background: `linear-gradient(135deg, ${colors.bg} 0%, rgba(0,0,0,0.4) 100%)`,
        backdropFilter: "blur(12px)",
        border: `1px solid ${colors.primary}30`,
        boxShadow: `0 4px 24px ${colors.glow.replace("0.6", "0.2")}`
      }}
      animate={animated ? {
        borderColor: [
          `${colors.primary}30`,
          `${colors.primary}60`,
          `${colors.primary}30`
        ]
      } : {}}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      {/* Glass shine effect */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%)"
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}

// Animated border that travels around the edge
export function TravelingBorder({
  children,
  color = "cyan",
  speed = 3,
  className = "",
  innerClassName = ""
}: {
  children: ReactNode
  color?: "purple" | "cyan" | "orange" | "green"
  speed?: number
  className?: string
  innerClassName?: string
}) {
  const colors = getColors(color)

  return (
    <div className={cn("relative p-[2px] rounded-xl overflow-hidden", className)}>
      {/* Animated gradient border */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `conic-gradient(from 0deg, transparent, ${colors.primary}, transparent)`
        }}
        animate={{
          rotate: 360
        }}
        transition={{
          duration: speed,
          repeat: Infinity,
          ease: "linear"
        }}
      />

      {/* Inner content */}
      <div
        className={cn(
          "relative rounded-[10px] bg-background",
          innerClassName
        )}
        style={{
          background: "rgba(10, 10, 15, 0.95)"
        }}
      >
        {children}
      </div>
    </div>
  )
}

// Corner accents (Tron-style)
export function CornerAccents({
  children,
  color = "purple",
  size = 20,
  thickness = 2,
  className = ""
}: {
  children: ReactNode
  color?: "purple" | "cyan" | "orange" | "green"
  size?: number
  thickness?: number
  className?: string
}) {
  const colors = getColors(color)

  const cornerStyle = (position: "tl" | "tr" | "bl" | "br") => {
    const base = {
      position: "absolute" as const,
      width: size,
      height: size,
      borderColor: colors.primary,
      borderWidth: thickness,
      borderStyle: "solid" as const
    }

    switch (position) {
      case "tl":
        return { ...base, top: 0, left: 0, borderRight: "none", borderBottom: "none" }
      case "tr":
        return { ...base, top: 0, right: 0, borderLeft: "none", borderBottom: "none" }
      case "bl":
        return { ...base, bottom: 0, left: 0, borderRight: "none", borderTop: "none" }
      case "br":
        return { ...base, bottom: 0, right: 0, borderLeft: "none", borderTop: "none" }
    }
  }

  return (
    <div className={cn("relative", className)}>
      <motion.div
        style={cornerStyle("tl")}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <motion.div
        style={cornerStyle("tr")}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
      />
      <motion.div
        style={cornerStyle("bl")}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, delay: 1 }}
      />
      <motion.div
        style={cornerStyle("br")}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}
      />
      {children}
    </div>
  )
}

// Neon text effect
export function NeonText({
  children,
  color = "purple",
  size = "lg",
  animated = true,
  className = ""
}: {
  children: ReactNode
  color?: "purple" | "cyan" | "orange" | "green"
  size?: "sm" | "md" | "lg" | "xl"
  animated?: boolean
  className?: string
}) {
  const colors = getColors(color)

  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-2xl"
  }

  return (
    <motion.span
      className={cn(sizeClasses[size], "font-bold", className)}
      style={{
        color: colors.primary,
        textShadow: `
          0 0 4px ${colors.glow},
          0 0 8px ${colors.glow},
          0 0 16px ${colors.glow}
        `
      }}
      animate={animated ? {
        textShadow: [
          `0 0 4px ${colors.glow}, 0 0 8px ${colors.glow}, 0 0 16px ${colors.glow}`,
          `0 0 8px ${colors.glow}, 0 0 16px ${colors.glow}, 0 0 32px ${colors.glow}`,
          `0 0 4px ${colors.glow}, 0 0 8px ${colors.glow}, 0 0 16px ${colors.glow}`
        ]
      } : {}}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      {children}
    </motion.span>
  )
}

// Status indicator with glow
export function GlowingStatus({
  status,
  size = 12,
  animated = true
}: {
  status: "online" | "offline" | "warning" | "processing"
  size?: number
  animated?: boolean
}) {
  const statusColors = {
    online: "#22C55E",
    offline: "#EF4444",
    warning: "#F59E0B",
    processing: "#06B6D4"
  }

  const color = statusColors[status]

  return (
    <motion.div
      className="rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        boxShadow: `0 0 ${size}px ${color}`
      }}
      animate={animated && status === "processing" ? {
        scale: [1, 1.3, 1],
        opacity: [1, 0.7, 1]
      } : status !== "offline" ? {
        boxShadow: [
          `0 0 ${size}px ${color}`,
          `0 0 ${size * 2}px ${color}`,
          `0 0 ${size}px ${color}`
        ]
      } : {}}
      transition={{
        duration: status === "processing" ? 1 : 2,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  )
}
