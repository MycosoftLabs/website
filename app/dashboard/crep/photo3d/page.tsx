"use client"

/**
 * /dashboard/crep/photo3d — photorealistic 3D tile view
 *
 * Standalone route. The heavy three.js / 3d-tiles-renderer / takram
 * bundle is lazy-loaded so it never bloats the main CREP dashboard.
 */

import dynamic from "next/dynamic"

const Scene = dynamic(() => import("@/components/crep/three3d/GooglePhoto3DScene"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-black text-white font-mono text-sm">
      Loading photorealistic 3D tiles…
    </div>
  ),
})

export default function Photo3DPage() {
  return (
    <div className="fixed inset-0 bg-black">
      <Scene />
      <div className="absolute top-3 left-3 px-3 py-2 rounded-md bg-black/60 backdrop-blur-sm text-white text-xs font-mono border border-white/15">
        CREP · Photorealistic 3D (Google 3D Tiles)
        <a href="/dashboard/crep" className="ml-3 text-sky-400 hover:underline">← back</a>
      </div>
    </div>
  )
}
