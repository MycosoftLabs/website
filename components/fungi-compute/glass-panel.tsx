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
    border: "border-cyan-500/20",
    glow: "shadow-[0_0_30px_rgba(0,200,255,0.1)]",
    iconBg: "bg-cyan-500/10",
    iconColor: "text-cyan-400",
    titleColor: "text-cyan-100",
  },
  accent: {
    border: "border-emerald-500/20",
    glow: "shadow-[0_0_30px_rgba(0,255,200,0.1)]",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-400",
    titleColor: "text-emerald-100",
  },
  warning: {
    border: "border-amber-500/20",
    glow: "shadow-[0_0_30px_rgba(255,170,0,0.1)]",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-400",
    titleColor: "text-amber-100",
  },
  error: {
    border: "border-red-500/20",
    glow: "shadow-[0_0_30px_rgba(255,70,70,0.1)]",
    iconBg: "bg-red-500/10",
    iconColor: "text-red-400",
    titleColor: "text-red-100",
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
        "bg-gradient-to-br from-black/60 via-black/40 to-black/60",
        "border",
        styles.border,
        glow && "shadow-[0_8px_32px_0_rgba(6,182,212,0.15),0_0_0_1px_rgba(6,182,212,0.05),inset_0_1px_0_0_rgba(255,255,255,0.05)]",
        "hover:border-cyan-400/30 hover:shadow-[0_8px_48px_0_rgba(6,182,212,0.25),0_0_0_1px_rgba(6,182,212,0.1)]",
        "transition-all duration-500",
        className
      )}
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-emerald-500/10" />
      </div>
      
      {/* Glass refraction edge highlight */}
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-white/[0.08] via-transparent to-transparent pointer-events-none" />
      
      {/* Micro pixel grid overlay */}
      <div 
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(6,182,212,0.3) 1px, rgba(6,182,212,0.3) 2px), repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(6,182,212,0.3) 1px, rgba(6,182,212,0.3) 2px)",
          backgroundSize: "2px 2px",
        }}
      />

      {/* Compact Header */}
      {title && (
        <div className={cn(
          "relative flex-none flex items-center justify-between px-3 py-2",
          "border-b bg-black/20",
          styles.border
        )}>
          <div className="flex items-center gap-2">
            {Icon && (
              <div className="relative">
                <div className={cn("absolute inset-0 rounded-lg blur-sm opacity-50", styles.iconBg)} />
                <div className={cn(
                  "relative p-1 rounded-lg border shadow-inner",
                  styles.iconBg,
                  styles.border
                )}>
                  <Icon className={cn("h-3 w-3", styles.iconColor)} />
                </div>
              </div>
            )}
            <h3 className={cn("text-[11px] font-semibold uppercase tracking-wider", styles.titleColor)}>
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
