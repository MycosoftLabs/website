/**
 * Fungi Compute - Standalone Scientific Research Layout
 * 
 * Completely bypasses NatureOS navigation/footer/search for
 * distraction-free full-screen scientific research experience.
 * 
 * NO scrolling, NO chrome, ONLY the research interface.
 */

"use client"

import type React from "react"
import { useEffect } from "react"

export default function FungiComputeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Override parent scrolling on mount
  useEffect(() => {
    document.body.style.overflow = "hidden"
    const root = document.getElementById("__next")
    if (root) {
      root.style.height = "100vh"
      root.style.overflow = "hidden"
    }
    
    return () => {
      document.body.style.overflow = ""
      if (root) {
        root.style.height = ""
        root.style.overflow = ""
      }
    }
  }, [])
  
  return (
    <div className="fixed inset-0 bg-black overflow-hidden z-50">
      {children}
    </div>
  )
}
