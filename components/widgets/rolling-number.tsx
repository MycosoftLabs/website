"use client";

/**
 * RollingNumber - Animated number display using @fecapark/number-rolling
 * 
 * Shows full numbers (not abbreviated) with smooth rolling animation
 * when values change. Perfect for live data displays.
 */

import { Roller } from "@fecapark/number-rolling";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export interface RollingNumberProps {
  value: number;
  className?: string;
  color?: "default" | "green" | "blue" | "purple" | "orange" | "red" | "teal" | "cyan" | "emerald" | "sky" | "amber" | "rose";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  suffix?: string;
  suffixPosition?: "front" | "back";
  align?: "left" | "center" | "right";
  rollDuration?: number;
  shiftDuration?: number;
  staggering?: boolean;
  diff?: boolean;
  rollWay?: "up" | "down";
  showDelta?: boolean;
  deltaValue?: number;
  deltaLabel?: string;
}

const colorStyles: Record<string, string> = {
  default: "text-foreground",
  green: "text-green-500",
  blue: "text-blue-500",
  purple: "text-purple-500",
  orange: "text-orange-500",
  red: "text-red-500",
  teal: "text-teal-500",
  cyan: "text-cyan-500",
  // Additional colors for kingdom rows
  emerald: "text-emerald-400",
  sky: "text-sky-400",
  amber: "text-amber-400",
  rose: "text-rose-400",
};

const sizeMap: Record<string, number> = {
  xs: 12,
  sm: 16,
  md: 24,
  lg: 36,
  xl: 48,
};

export function RollingNumber({
  value,
  className,
  color = "default",
  size = "lg",
  suffix = "",
  suffixPosition = "back",
  align = "left",
  rollDuration = 0.6,
  shiftDuration = 0.45,
  staggering = true,
  diff = true,
  rollWay = "down",
  showDelta = false,
  deltaValue,
  deltaLabel = "/hr",
}: RollingNumberProps) {
  const [mounted, setMounted] = useState(false);
  
  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // SSR fallback - show static number
    return (
      <div className={cn("flex flex-col", className)}>
        <span
          className={cn(
            colorStyles[color],
            "font-bold tabular-nums tracking-tight",
            size === "xs" && "text-sm",
            size === "sm" && "text-base",
            size === "md" && "text-xl",
            size === "lg" && "text-3xl",
            size === "xl" && "text-4xl"
          )}
        >
          {suffixPosition === "front" && suffix}
          {value.toLocaleString()}
          {suffixPosition === "back" && suffix}
        </span>
      </div>
    );
  }

  // Format delta for display
  const formatDelta = (num: number): string => {
    if (num >= 1e9) return `+${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `+${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `+${(num / 1e3).toFixed(1)}K`;
    return `+${num.toLocaleString()}`;
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <div
        className={cn(colorStyles[color], "font-bold")}
        style={{
          fontFamily: "'JetBrains Mono', 'SF Mono', 'Consolas', monospace",
          fontWeight: 700,
          letterSpacing: "-0.02em",
        }}
      >
        <Roller
          value={value}
          suffix={suffix}
          suffixPosition={suffixPosition}
          align={align}
          fontSize={sizeMap[size]}
          rollDuration={rollDuration}
          shiftDuration={shiftDuration}
          staggering={staggering}
          diff={diff}
          rollWay={rollWay}
        />
      </div>
      {showDelta && deltaValue !== undefined && (
        <span className="text-xs text-green-500 flex items-center gap-1 mt-0.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          {formatDelta(deltaValue)}{deltaLabel}
        </span>
      )}
    </div>
  );
}

export default RollingNumber;
