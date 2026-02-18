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
      root.style.height = "100dvh"
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
    <>
      {/* Phone: full-screen prompt — the WebGL oscilloscope/SDR cannot fit on a phone */}
      <div className="sm:hidden fixed inset-0 bg-black z-50 flex flex-col items-center justify-center px-8 text-white text-center">
        <div className="mb-8 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
          <svg viewBox="0 0 24 24" className="h-16 w-16 mx-auto text-green-400 mb-4" fill="none" stroke="currentColor" strokeWidth={1.2}>
            <path d="M3 12h2l2-6 3 12 2-8 2 4h5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h2 className="text-xl font-bold mb-3 text-green-400">Fungi Compute</h2>
          <p className="text-sm text-gray-300 leading-relaxed mb-2">
            This biological computing interface uses real-time oscilloscopes, spectrum analyzers, and signal visualization that require a tablet or larger screen.
          </p>
          <p className="text-xs text-gray-500">Minimum: tablet in landscape mode</p>
        </div>
        <a href="/natureos" className="px-6 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors">
          ← Back to NatureOS
        </a>
      </div>
      {/* Tablet+: full research interface */}
      <div className="hidden sm:block fixed inset-0 bg-black overflow-hidden z-50">
        {children}
      </div>
    </>
  )
}
