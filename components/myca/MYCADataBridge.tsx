"use client"

/**
 * MYCADataBridge - Visual connector between User (left) and MYCA (right)
 * Shows directional data flow:
 * - User typing/speaking → flow LEFT to RIGHT (user → MYCA)
 * - MYCA thinking → pulsing/processing
 * - MYCA responding → flow RIGHT to LEFT (MYCA → user)
 * Created: Feb 17, 2026 | Updated: Feb 24, 2026
 */

import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, ArrowLeft, Activity, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export type FlowDirection = "user-to-myca" | "myca-to-user" | "idle"

interface MYCADataBridgeProps {
  height?: number
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
        "relative flex flex-col items-center justify-center w-14 xl:w-16 shrink-0",
        "bg-gradient-to-r from-transparent via-border/30 to-transparent",
        className
      )}
      style={{ height, minHeight: 320 }}
    >
      {/* Central dashed line */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ height, minHeight: 320 }}
      >
        <div className="w-px h-full border-l border-dashed border-border/60" />
      </div>

      {/* Directional data flow */}
      <div
        className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none"
        style={{ height, minHeight: 320 }}
      >
        <AnimatePresence mode="wait">
          {/* User → MYCA: when user sends (typing/speaking), MYCA is thinking */}
          {flowDirection === "user-to-myca" && (
            <motion.div
              key="ltr"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <motion.div
                animate={{
                  x: [0, 24, 48],
                  opacity: [0.6, 1, 0.6],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  repeatDelay: 0.2,
                }}
                className="flex items-center gap-1 rounded-full bg-primary/25 px-2.5 py-1 border border-primary/50"
              >
                <span className="text-[9px] font-mono text-primary">request</span>
                <ArrowRight className="h-3 w-3 text-primary" />
              </motion.div>
            </motion.div>
          )}

          {/* MYCA → User: when MYCA responds */}
          {flowDirection === "myca-to-user" && (
            <motion.div
              key="rtl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <motion.div
                animate={{
                  x: [0, -24, -48],
                  opacity: [0.6, 1, 0.6],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  repeatDelay: 0.2,
                }}
                className="flex items-center gap-1 rounded-full bg-green-500/25 px-2.5 py-1 border border-green-500/50"
              >
                <ArrowLeft className="h-3 w-3 text-green-500" />
                <span className="text-[9px] font-mono text-green-500">response</span>
              </motion.div>
            </motion.div>
          )}

          {/* Idle: subtle pulse */}
          {flowDirection === "idle" && (
            <motion.div
              key="idle"
              animate={{ opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute left-1/2 top-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground/50"
            />
          )}
        </AnimatePresence>
      </div>

      {/* Center icon — state indicator */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex items-center justify-center rounded-full bg-background/90 border border-border p-2 shadow-sm"
      >
        {flowDirection === "user-to-myca" ? (
          <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
        ) : (
          <motion.div
            animate={{
              scale: isActive ? [1, 1.05, 1] : 1,
              opacity: isActive ? 1 : 0.5,
            }}
            transition={{ duration: 1.5, repeat: isActive ? Infinity : 0 }}
          >
            <Activity
              className={cn(
                "h-5 w-5",
                flowDirection === "user-to-myca" && "text-primary",
                flowDirection === "myca-to-user" && "text-green-500",
                flowDirection === "idle" && "text-muted-foreground"
              )}
            />
          </motion.div>
        )}
      </div>
    </div>
  )
}
