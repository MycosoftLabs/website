"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import HeroSearch from "./hero-search"

/**
 * ParallaxSearch - Client component with revolutionary search UI
 * Updated: February 5, 2026
 * 
 * Features:
 * - New glass morphism HeroSearch component
 * - Voice search integration
 * - AI-powered suggestions
 * - Scroll-based parallax effect
 */
export default function ParallaxSearch() {
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 300], [0, 50])
  const opacity = useTransform(scrollY, [0, 200], [1, 0.8])

  return (
    <motion.div style={{ y, opacity }}>
      <HeroSearch />
    </motion.div>
  )
}
