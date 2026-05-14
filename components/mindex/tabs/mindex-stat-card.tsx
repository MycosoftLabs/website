// @ts-nocheck
"use client"

import { motion } from "framer-motion"
import { GlowingStatus } from "@/components/ui/glowing-border"

export function MindexStatCard({
  title,
  value,
  icon: Icon,
  color,
  status,
  subtitle,
}: {
  title: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  color: "purple" | "cyan" | "green" | "orange"
  status?: "online" | "offline" | "warning" | "processing"
  subtitle?: string
}) {
  const colors = {
    purple: { bg: "rgba(139, 92, 246, 0.1)", border: "#8B5CF6", text: "#A855F7" },
    cyan: { bg: "rgba(6, 182, 212, 0.1)", border: "#06B6D4", text: "#22D3EE" },
    green: { bg: "rgba(34, 197, 94, 0.1)", border: "#22C55E", text: "#4ADE80" },
    orange: { bg: "rgba(249, 115, 22, 0.1)", border: "#F97316", text: "#FB923C" },
  }

  const scheme = colors[color]

  return (
    <motion.div
      className="relative rounded-xl p-4 overflow-hidden"
      style={{
        background: scheme.bg,
        border: `1px solid ${scheme.border}30`,
        boxShadow: `0 0 20px ${scheme.border}20`,
      }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 mb-1">{title}</p>
          <p className="text-xl font-bold text-white">{value}</p>
          {subtitle ? <p className="text-xs text-gray-500 mt-1">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          {status ? <GlowingStatus status={status} size={10} /> : null}
          <Icon className="h-5 w-5" style={{ color: scheme.text }} />
        </div>
      </div>
    </motion.div>
  )
}
