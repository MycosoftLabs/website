"use client"

/**
 * Layered substrate: depth planes, hyphal SVG, floating spores, subtle grain.
 * Motion is decorative; reduce-motion users get static layers only.
 */

const SPORE_POSITIONS = [
  { l: "8%", t: "18%", d: 0 },
  { l: "22%", t: "42%", d: 2.5 },
  { l: "78%", t: "12%", d: 1.2 },
  { l: "88%", t: "38%", d: 3.8 },
  { l: "14%", t: "72%", d: 4.1 },
  { l: "45%", t: "8%", d: 1.9 },
  { l: "62%", t: "55%", d: 2.2 },
  { l: "92%", t: "68%", d: 0.6 },
  { l: "35%", t: "88%", d: 3.2 },
  { l: "55%", t: "28%", d: 5.4 },
  { l: "72%", t: "82%", d: 1.1 },
  { l: "5%", t: "52%", d: 4.7 },
]

export function Nlm2MycelialBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#030504]"
      style={{ perspective: "1400px" }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b1511] via-[#060a08] to-[#020302]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_115%,rgba(34,120,110,0.14),transparent_58%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_15%_20%,rgba(74,222,128,0.06),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_45%_35%_at_85%_30%,rgba(45,212,191,0.07),transparent_48%)]" />

      {/* Mid plane — slight 3D tilt for depth */}
      <div
        className="nlm2-backdrop-sway absolute inset-0 origin-center"
        style={{ transformStyle: "preserve-3d" }}
      >
        <svg
          className="nlm2-backdrop-breathe absolute bottom-0 left-1/2 h-[min(88vh,920px)] w-[210%] -translate-x-1/2 text-emerald-800/30 md:w-[145%]"
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
            strokeOpacity="0.65"
            strokeLinecap="round"
          />
          <path
            d="M200 520 Q280 400 320 300 M1000 520 Q920 400 880 300"
            stroke="currentColor"
            strokeWidth="0.7"
            strokeOpacity="0.45"
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
                className="text-teal-400/20"
                style={{ opacity: 0.1 + (i % 5) * 0.035 }}
              />
            )
          })}
        </svg>
      </div>

      {/* Foreground spores — CSS only */}
      <div className="absolute inset-0">
        {SPORE_POSITIONS.map((s, i) => (
          <span
            key={i}
            className="nlm2-spore-float absolute block h-1.5 w-1.5 rounded-full bg-lime-300/35 shadow-[0_0_12px_rgba(163,230,53,0.35)]"
            style={{
              left: s.l,
              top: s.t,
              animationDelay: `${s.d}s`,
            }}
          />
        ))}
      </div>

      {/* Film grain */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.035] mix-blend-overlay" aria-hidden>
        <filter id="nlm2-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#nlm2-grain)" />
      </svg>

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#030504]/90" />
    </div>
  )
}
