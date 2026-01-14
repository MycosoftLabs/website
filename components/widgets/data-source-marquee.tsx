"use client";

/**
 * DataSourceMarquee - News ticker style scrolling display of data sources
 * 
 * Scrolls sources like GBIF, iNaturalist, MycoBank with their live counts
 * horizontally in a continuous infinite loop, like a news ticker.
 */

import { cn } from "@/lib/utils";
import { useState } from "react";

export interface DataSource {
  name: string;
  count: number;
  status?: "online" | "offline" | "syncing";
  color?: string;
}

interface DataSourceMarqueeProps {
  sources: DataSource[];
  className?: string;
  speed?: number; // Duration in seconds for one complete cycle
  pauseOnHover?: boolean;
  separator?: string;
  showStatus?: boolean;
}

function formatCount(num: number): string {
  if (num >= 1e12) return (num / 1e12).toFixed(2) + "T";
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(1) + "K";
  return num.toLocaleString();
}

export function DataSourceMarquee({
  sources,
  className,
  speed = 20, // seconds for one complete scroll
  pauseOnHover = true,
  separator = "•",
  showStatus = true,
}: DataSourceMarqueeProps) {
  const [isPaused, setIsPaused] = useState(false);

  // Create single source element
  const renderSource = (source: DataSource, key: string) => (
    <span key={key} className="inline-flex items-center whitespace-nowrap mx-2">
      {showStatus && (
        <span 
          className={cn(
            "w-1.5 h-1.5 rounded-full mr-1.5 shrink-0",
            source.status === "online" && "bg-green-500",
            source.status === "syncing" && "bg-blue-500 animate-pulse",
            source.status === "offline" && "bg-gray-500",
            !source.status && "bg-green-500"
          )}
        />
      )}
      <span className="font-semibold text-foreground/90">{source.name}</span>
      <span className="ml-1.5 text-foreground/70 tabular-nums font-mono">{formatCount(source.count)}</span>
      <span className="mx-3 text-foreground/25">{separator}</span>
    </span>
  );

  return (
    <div
      className={cn(
        "relative overflow-hidden h-5 mt-2",
        className
      )}
      onMouseEnter={() => pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => pauseOnHover && setIsPaused(false)}
    >
      {/* Gradient fade edges - transparent fades only */}
      <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-background/80 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-background/80 to-transparent z-10 pointer-events-none" />
      
      {/* Ticker track - uses CSS animation for smooth infinite scroll */}
      <div 
        className="ticker-track flex items-center h-full"
        style={{
          animationDuration: `${speed}s`,
          animationPlayState: isPaused ? "paused" : "running",
        }}
      >
        {/* Repeat sources 4 times for seamless infinite loop */}
        <div className="ticker-content flex items-center shrink-0 text-[10px]">
          {sources.map((source, i) => renderSource(source, `set1-${i}`))}
        </div>
        <div className="ticker-content flex items-center shrink-0 text-[10px]">
          {sources.map((source, i) => renderSource(source, `set2-${i}`))}
        </div>
        <div className="ticker-content flex items-center shrink-0 text-[10px]">
          {sources.map((source, i) => renderSource(source, `set3-${i}`))}
        </div>
        <div className="ticker-content flex items-center shrink-0 text-[10px]">
          {sources.map((source, i) => renderSource(source, `set4-${i}`))}
        </div>
      </div>

      <style jsx>{`
        .ticker-track {
          animation: scroll-ticker linear infinite;
        }
        
        @keyframes scroll-ticker {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}

export default DataSourceMarquee;
