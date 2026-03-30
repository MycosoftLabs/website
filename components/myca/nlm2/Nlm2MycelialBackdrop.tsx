"use client"

/**
 * Decorative hyphal network + spore specks. Static when prefers-reduced-motion.
 */

export function Nlm2MycelialBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#050807]"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a120e] via-[#070c0a] to-[#030504]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_120%,rgba(45,120,115,0.12),transparent_55%)]" />

      <svg
        className="motion-safe:animate-pulse absolute bottom-0 left-1/2 h-[min(85vh,900px)] w-[200%] -translate-x-1/2 text-emerald-900/35 motion-reduce:animate-none md:w-[140%]"
        viewBox="0 0 1200 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M600 600 Q520 480 480 380 Q440 300 380 220 M600 600 Q680 470 720 360 Q760 260 820 180 M600 600 Q600 420 590 300 Q585 200 600 80 M480 380 Q420 340 340 320 M720 360 Q800 320 880 300 M590 300 Q520 240 460 200"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M380 220 Q320 180 260 200 M820 180 Q900 140 960 200 M460 200 Q400 140 340 160"
          stroke="currentColor"
          strokeWidth="0.9"
          strokeOpacity="0.7"
          strokeLinecap="round"
        />
        {[...Array(48)].map((_, i) => {
          const x = ((i * 47 + 13) % 100) * 12
          const y = ((i * 31 + 7) % 100) * 6
          const r = 0.6 + (i % 3) * 0.35
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={r}
              fill="currentColor"
              className="text-cyan-500/25"
              style={{ opacity: 0.12 + (i % 5) * 0.04 }}
            />
          )
        })}
      </svg>
    </div>
  )
}
