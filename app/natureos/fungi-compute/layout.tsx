"use client"

/**
 * Fungi Compute Layout — Desktop-only gate
 * Oscilloscopes, spectrum analyzers, SDR filters, and WebGL signal
 * visualizations require a minimum 1024px wide screen.
 * Phone + tablet users see a clear gate screen.
 */

import type React from "react"
import { useEffect } from "react"
import Link from "next/link"

export default function FungiComputeLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only apply overflow lock on desktop where the app runs
    if (window.innerWidth >= 1024) {
      document.body.style.overflow = "hidden"
      const root = document.getElementById("__next")
      if (root) { root.style.height = "100dvh"; root.style.overflow = "hidden" }
    }
    return () => {
      document.body.style.overflow = ""
      const root = document.getElementById("__next")
      if (root) { root.style.height = ""; root.style.overflow = "" }
    }
  }, [])

  return (
    <>
      {/* ── Phone + Tablet gate (< lg = 1024px) ── */}
      <div className="lg:hidden flex min-h-dvh flex-col items-center justify-center bg-black text-white px-6 py-16 text-center">
        <div className="max-w-sm mx-auto space-y-6">
          {/* Waveform icon */}
          <svg viewBox="0 0 80 40" className="h-16 w-32 mx-auto text-green-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M0 20 L8 20 L14 4 L22 36 L28 10 L34 28 L40 20 L48 20 L54 8 L60 32 L66 14 L72 26 L80 20" />
          </svg>

          <div>
            <h2 className="text-xl font-bold text-green-400 mb-2">Fungi Compute</h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              Real-time oscilloscopes, spectrum analyzers, SDR filters, and bioelectric signal visualization are designed for desktop screens.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-green-900/30 border border-green-700/40 text-xs text-green-300 font-mono">
            Minimum display: 1024 × 768px
          </div>

          <div className="flex flex-col gap-3">
            <Link href="/natureos" className="flex items-center justify-center h-11 px-6 rounded-lg bg-green-600 text-white font-medium text-sm">
              ← Back to NatureOS
            </Link>
            <button onClick={() => window.history.back()} className="flex items-center justify-center h-11 px-6 rounded-lg border border-gray-700 text-gray-400 text-sm">
              Go Back
            </button>
          </div>

          <p className="text-xs text-gray-600">
            Open on a laptop or desktop to access the full research interface
          </p>
        </div>
      </div>

      {/* ── Desktop: full-screen research interface (≥ 1024px) ── */}
      <div className="hidden lg:block fixed inset-0 bg-black overflow-hidden z-50">
        {children}
      </div>
    </>
  )
}
