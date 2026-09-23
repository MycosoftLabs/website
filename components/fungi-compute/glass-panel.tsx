/**
 * Glass Panel Component
 * 
 * Reusable glass-morphism panel with Tron-inspired aesthetics.
 */

"use client"

import { ReactNode } from "react"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { FUNGI_COLORS } from "@/lib/fungi-compute"

interface GlassPanelProps {
  title?: string
  icon?: LucideIcon
  children: ReactNode
  className?: string
  headerActions?: ReactNode
  glow?: boolean
  variant?: "default" | "accent" | "warning" | "error"
}

const variantStyles = {
  default: {
    border: "border-cyan-300/45",
    glow: "shadow-[0_0_30px_rgba(0,200,255,0.18)]",
    iconBg: "bg-cyan-400/20",
    iconColor: "text-cyan-200",
    titleColor: "text-white drop-shadow-[0_0_6px_rgba(165,243,252,0.85)]",
  },
  accent: {
    border: "border-emerald-300/45",
    glow: "shadow-[0_0_30px_rgba(0,255,200,0.18)]",
    iconBg: "bg-emerald-400/20",
    iconColor: "text-emerald-200",
    titleColor: "text-white drop-shadow-[0_0_6px_rgba(167,243,208,0.85)]",
  },
  warning: {
    border: "border-amber-300/45",
    glow: "shadow-[0_0_30px_rgba(255,170,0,0.18)]",
    iconBg: "bg-amber-400/20",
    iconColor: "text-amber-200",
    titleColor: "text-white drop-shadow-[0_0_6px_rgba(253,230,138,0.85)]",
  },
  error: {
    border: "border-red-300/45",
    glow: "shadow-[0_0_30px_rgba(255,70,70,0.18)]",
    iconBg: "bg-red-400/20",
    iconColor: "text-red-200",
    titleColor: "text-white drop-shadow-[0_0_6px_rgba(254,202,202,0.85)]",
  },
}

export function GlassPanel({
  title,
  icon: Icon,
  children,
  className,
  headerActions,
  glow = true,
  variant = "default",
}: GlassPanelProps) {
  const styles = variantStyles[variant]

  return (
    <div
      className={cn(
        "relative overflow-hidden group h-full flex flex-col",
        "rounded-2xl backdrop-blur-2xl",
        "bg-black/45",
        "border",
        styles.border,
        glow && "shadow-[0_8px_32px_0_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.12),inset_0_1px_0_0_rgba(255,255,255,0.14)]",
        "hover:border-cyan-200/60 hover:shadow-[0_8px_48px_0_rgba(6,182,212,0.28),0_0_0_1px_rgba(255,255,255,0.18)]",
        "transition-all duration-500",
        className
      )}
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-transparent to-emerald-400/10" />
      </div>
      
      {/* Glass refraction edge highlight */}
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-white/[0.14] via-transparent to-transparent pointer-events-none" />
      
      {/* Micro pixel grid overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(165,243,252,0.35) 1px, rgba(165,243,252,0.35) 2px), repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(165,243,252,0.35) 1px, rgba(165,243,252,0.35) 2px)",
          backgroundSize: "2px 2px",
        }}
      />

      {/* Compact Header */}
      {title && (
        <div className={cn(
          "relative flex-none flex items-center justify-between px-3 py-2",
          "border-b bg-black/50",
          styles.border
        )}>
          <div className="flex items-center gap-2">
            {Icon && (
              <div className="relative">
                <div className={cn("absolute inset-0 rounded-lg blur-sm opacity-70", styles.iconBg)} />
                <div className={cn(
                  "relative p-1 rounded-lg border shadow-inner min-h-[28px] min-w-[28px] flex items-center justify-center",
                  styles.iconBg,
                  styles.border
                )}>
                  <Icon className={cn("h-3.5 w-3.5", styles.iconColor)} />
                </div>
              </div>
            )}
            <h3 className={cn("text-[11px] font-bold uppercase tracking-wider", styles.titleColor)}>
              {title}
            </h3>
          </div>
          {headerActions}
        </div>
      )}

      {/* Content - takes remaining space, no scroll */}
      <div className="relative flex-1 p-2 overflow-hidden">
        {children}
      </div>
    </div>
  )
}

/**
 * Glass Card - Smaller variant for nested content
 */
interface GlassCardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  active?: boolean
}

export function GlassCard({ children, className, onClick, active }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative overflow-hidden group",
        "rounded-xl p-2.5 backdrop-blur-xl",
        "bg-gradient-to-br from-black/50 via-black/30 to-black/50",
        "border border-cyan-500/10",
        "shadow-[0_4px_16px_0_rgba(6,182,212,0.08),inset_0_1px_0_0_rgba(255,255,255,0.03)]",
        "transition-all duration-300",
        onClick && "cursor-pointer hover:bg-cyan-500/10 hover:border-cyan-500/30 hover:shadow-[0_6px_24px_0_rgba(6,182,212,0.15)]",
        active && "bg-cyan-500/20 border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.3),inset_0_0_10px_rgba(6,182,212,0.1)]",
        className
      )}
    >
      {/* Glass edge highlight */}
      <div className="absolute -inset-px rounded-xl bg-gradient-to-br from-white/[0.05] via-transparent to-transparent pointer-events-none" />
      
      <div className="relative">
        {children}
      </div>
    </div>
  )
}

/**
 * Glow Text - Text with Tron-style glow effect
 */
interface GlowTextProps {
  children: ReactNode
  className?: string
  color?: "cyan" | "green" | "magenta" | "amber" | "white"
  intensity?: "low" | "medium" | "high"
}

const glowColors = {
  cyan: "text-cyan-400",
  green: "text-emerald-400",
  magenta: "text-fuchsia-400",
  amber: "text-amber-400",
  white: "text-white",
}

const glowShadows = {
  cyan: {
    low: "drop-shadow-[0_0_3px_rgba(0,255,255,0.3)]",
    medium: "drop-shadow-[0_0_6px_rgba(0,255,255,0.5)]",
    high: "drop-shadow-[0_0_10px_rgba(0,255,255,0.7)]",
  },
  green: {
    low: "drop-shadow-[0_0_3px_rgba(0,255,200,0.3)]",
    medium: "drop-shadow-[0_0_6px_rgba(0,255,200,0.5)]",
    high: "drop-shadow-[0_0_10px_rgba(0,255,200,0.7)]",
  },
  magenta: {
    low: "drop-shadow-[0_0_3px_rgba(255,0,255,0.3)]",
    medium: "drop-shadow-[0_0_6px_rgba(255,0,255,0.5)]",
    high: "drop-shadow-[0_0_10px_rgba(255,0,255,0.7)]",
  },
  amber: {
    low: "drop-shadow-[0_0_3px_rgba(255,170,0,0.3)]",
    medium: "drop-shadow-[0_0_6px_rgba(255,170,0,0.5)]",
    high: "drop-shadow-[0_0_10px_rgba(255,170,0,0.7)]",
  },
  white: {
    low: "drop-shadow-[0_0_3px_rgba(255,255,255,0.3)]",
    medium: "drop-shadow-[0_0_6px_rgba(255,255,255,0.5)]",
    high: "drop-shadow-[0_0_10px_rgba(255,255,255,0.7)]",
  },
}

export function GlowText({ 
  children, 
  className, 
  color = "cyan",
  intensity = "medium" 
}: GlowTextProps) {
  return (
    <span 
      className={cn(
        glowColors[color],
        glowShadows[color][intensity],
        className
      )}
    >
      {children}
    </span>
  )
}
