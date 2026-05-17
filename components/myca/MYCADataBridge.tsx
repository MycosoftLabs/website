// @ts-nocheck
"use client"

/**
 * MYCADataBridge - Visual connector between User (left) and MYCA (right).
 * CSS-only state changes keep the homepage overlay stable while requests start,
 * abort, and return to search.
 */

import { ArrowRight, ArrowLeft, Activity, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export type FlowDirection = "user-to-myca" | "myca-to-user" | "idle"

interface MYCADataBridgeProps {
  height?: number | string
  flowDirection?: FlowDirection
  className?: string
}

export function MYCADataBridge({
  height = 400,
  flowDirection = "idle",
  className,
}: MYCADataBridgeProps) {
  const isActive = flowDirection !== "idle"

  return (
    <div
      className={cn(
        "myca-data-bridge relative flex w-14 shrink-0 flex-col items-center justify-center xl:w-16",
        "bg-gradient-to-r from-transparent via-border/30 to-transparent",
        className
      )}
      style={{ height, minHeight: 320 }}
    >
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ height, minHeight: 320 }}
      >
        <div className="myca-data-bridge-line h-full w-px border-l border-dashed border-border/60" />
      </div>

      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
        style={{ height, minHeight: 320 }}
      >
        {flowDirection === "user-to-myca" ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex animate-pulse items-center gap-1 rounded-full border border-primary/50 bg-primary/25 px-2.5 py-1">
              <span className="text-xs font-mono text-primary">request</span>
              <ArrowRight className="h-3 w-3 text-primary" />
            </div>
          </div>
        ) : null}

        {flowDirection === "myca-to-user" ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex animate-pulse items-center gap-1 rounded-full border border-green-500/50 bg-green-500/25 px-2.5 py-1">
              <ArrowLeft className="h-3 w-3 text-green-500" />
              <span className="text-xs font-mono text-green-500">response</span>
            </div>
          </div>
        ) : null}

        {flowDirection === "idle" ? (
          <div className="myca-data-bridge-idle-dot absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-muted-foreground/50" />
        ) : null}
      </div>

      <div className="myca-data-bridge-status absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 p-2 shadow-sm">
        {flowDirection === "user-to-myca" ? (
          <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
        ) : (
          <div className={cn(isActive ? "animate-pulse opacity-100" : "opacity-50")}>
            <Activity
              className={cn(
                "h-5 w-5",
                flowDirection === "user-to-myca" && "text-primary",
                flowDirection === "myca-to-user" && "text-green-500",
                flowDirection === "idle" && "text-muted-foreground"
              )}
            />
          </div>
        )}
      </div>
    </div>
  )
}
