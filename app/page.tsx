"use client"

import { SearchSection } from "@/components/search-section"
import { QuickAccess } from "@/components/quick-access"
import { motion, useScroll, useTransform } from "framer-motion"

export default function HomePage() {
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 300], [0, 100])

  return (
    <>
      <div className="container mx-auto px-4 relative">
        <motion.div style={{ y }}>
          <SearchSection />
        </motion.div>
        <QuickAccess />
      </div>
    </>
  )
}
