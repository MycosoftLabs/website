import type React from "react"

/**
 * Template - Page transition wrapper
 * Uses CSS animation instead of framer-motion for zero-JS bundle impact
 * Provides smooth page fade-in without blocking render
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out">
      {children}
    </div>
  )
}
