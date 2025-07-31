"use client"
import { motion } from "framer-motion"
import Image from "next/image"

interface MotionBannerProps {
  src: string
  alt: string
}

export function MotionBanner({ src, alt }: MotionBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.5 }}
      className="relative h-[400px] w-screen -ml-[50vw] left-1/2 right-1/2 -mt-6 overflow-hidden"
    >
      <Image src={src || "/placeholder.svg"} alt={alt} fill className="object-cover" />
      <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/30 to-background" />
    </motion.div>
  )
}
