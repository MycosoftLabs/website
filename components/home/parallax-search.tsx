"use client"

import { SearchSection } from "@/components/search-section"
import { motion, useScroll, useTransform } from "framer-motion"

/**
 * ParallaxSearch - Client component that wraps SearchSection with scroll-based parallax
 * Separated from the main page to enable code-splitting and dynamic import
 */
export default function ParallaxSearch() {
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 300], [0, 100])

  return (
    <motion.div style={{ y }}>
      <SearchSection />
    </motion.div>
  )
}
