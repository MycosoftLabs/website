"use client"

import type React from "react"
import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"

interface MotionCardProps {
  index: number
  children: React.ReactNode
}

export function MotionCard({ index, children }: MotionCardProps) {
  return (
    <Card className="overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: index * 0.1 }}
        className="grid md:grid-cols-2 gap-6"
      >
        {children}
      </motion.div>
    </Card>
  )
}
