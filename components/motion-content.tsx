"use client"

import type React from "react"
import { motion } from "framer-motion"

interface MotionContentProps {
  children: React.ReactNode
}

export function MotionContent({ children }: MotionContentProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      {children}
    </motion.div>
  )
}
