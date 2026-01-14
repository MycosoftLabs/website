"use client";

/**
 * LiveCounter - Animated number display that increments in real-time
 * 
 * Features:
 * - Smooth number transitions with easing
 * - Real-time increment simulation
 * - Pulse effect on value changes
 * - Compact and full display modes
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface LiveCounterProps {
  value: number;
  label?: string;
  prefix?: string;
  suffix?: string;
  incrementRate?: number; // Increments per second
  format?: "compact" | "full" | "scientific";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showDelta?: boolean;
  deltaValue?: number;
  color?: "default" | "green" | "blue" | "purple" | "orange" | "red";
  animate?: boolean;
}

function formatNumber(num: number, format: "compact" | "full" | "scientific"): string {
  if (format === "scientific") {
    return num.toExponential(2);
  }
  
  if (format === "compact") {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + "T";
    if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
    if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(1) + "K";
    return num.toFixed(0);
  }
  
  return num.toLocaleString();
}

const sizeStyles = {
  sm: "text-lg font-semibold",
  md: "text-2xl font-bold",
  lg: "text-3xl font-bold",
  xl: "text-4xl font-black",
};

const colorStyles = {
  default: "text-foreground",
  green: "text-green-500",
  blue: "text-blue-500",
  purple: "text-purple-500",
  orange: "text-orange-500",
  red: "text-red-500",
};

export function LiveCounter({
  value,
  label,
  prefix = "",
  suffix = "",
  incrementRate = 0,
  format = "compact",
  size = "md",
  className,
  showDelta = false,
  deltaValue,
  color = "default",
  animate = true,
}: LiveCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const previousValue = useRef(value);
  const animationRef = useRef<number>();
  const lastUpdateRef = useRef(Date.now());

  // Smooth animation when value changes
  useEffect(() => {
    if (!animate) {
      setDisplayValue(value);
      return;
    }

    const startValue = displayValue;
    const endValue = value;
    const diff = endValue - startValue;
    const duration = 500; // ms
    const startTime = Date.now();

    if (Math.abs(diff) < 1) {
      setDisplayValue(value);
      return;
    }

    setIsAnimating(true);

    const animateValue = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out cubic)
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      
      const newValue = startValue + diff * easedProgress;
      setDisplayValue(Math.round(newValue));

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animateValue);
      } else {
        setDisplayValue(endValue);
        setIsAnimating(false);
      }
    };

    animationRef.current = requestAnimationFrame(animateValue);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, animate]);

  // Simulate real-time increments
  useEffect(() => {
    if (incrementRate <= 0) return;

    const interval = setInterval(() => {
      const elapsed = (Date.now() - lastUpdateRef.current) / 1000;
      const increment = Math.floor(elapsed * incrementRate * (0.8 + Math.random() * 0.4));
      
      if (increment > 0) {
        setDisplayValue(prev => prev + increment);
        lastUpdateRef.current = Date.now();
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 200);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [incrementRate]);

  // Track value changes for delta calculation
  useEffect(() => {
    previousValue.current = value;
  }, [value]);

  const formattedValue = formatNumber(displayValue, format);
  const deltaDisplay = deltaValue !== undefined 
    ? `+${formatNumber(deltaValue, "compact")}/hr`
    : null;

  return (
    <div className={cn("flex flex-col", className)}>
      {label && (
        <span className="text-xs text-muted-foreground mb-1">{label}</span>
      )}
      <div className="flex items-baseline gap-1">
        {prefix && <span className="text-sm text-muted-foreground">{prefix}</span>}
        <span
          className={cn(
            sizeStyles[size],
            colorStyles[color],
            "tabular-nums tracking-tight transition-all duration-200",
            isAnimating && "scale-[1.02]"
          )}
        >
          {formattedValue}
        </span>
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
      {showDelta && deltaDisplay && (
        <span className="text-xs text-green-500 flex items-center gap-1 mt-0.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          {deltaDisplay}
        </span>
      )}
    </div>
  );
}

/**
 * LiveStatsGrid - Grid of live counters for dashboard display
 */
interface StatItem {
  id: string;
  label: string;
  value: number;
  delta?: number;
  incrementRate?: number;
  format?: "compact" | "full";
  color?: LiveCounterProps["color"];
  prefix?: string;
  suffix?: string;
}

interface LiveStatsGridProps {
  stats: StatItem[];
  columns?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

export function LiveStatsGrid({ stats, columns = 4, className }: LiveStatsGridProps) {
  const colStyles = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-2 md:grid-cols-4",
    5: "grid-cols-2 md:grid-cols-5",
    6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
  };

  return (
    <div className={cn("grid gap-4", colStyles[columns], className)}>
      {stats.map((stat) => (
        <div
          key={stat.id}
          className="p-4 rounded-lg bg-card border border-border/50 hover:border-border transition-colors"
        >
          <LiveCounter
            value={stat.value}
            label={stat.label}
            prefix={stat.prefix}
            suffix={stat.suffix}
            incrementRate={stat.incrementRate}
            format={stat.format || "compact"}
            showDelta={!!stat.delta}
            deltaValue={stat.delta}
            color={stat.color}
            size="lg"
          />
        </div>
      ))}
    </div>
  );
}

export default LiveCounter;
