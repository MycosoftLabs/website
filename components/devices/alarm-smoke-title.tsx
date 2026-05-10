"use client"

import { useEffect, useId, useRef } from "react"

export function AlarmSmokeTitle() {
  const turbulenceRef = useRef<SVGFETurbulenceElement | null>(null)
  const filterId = useId().replace(/:/g, "")

  useEffect(() => {
    let frames = 1
    const rad = Math.PI / 180
    let frameId = 0

    const freqAnimation = () => {
      frames += 0.2

      const bfx = 0.03 + 0.005 * Math.cos(frames * rad)
      const bfy = 0.03 + 0.005 * Math.sin(frames * rad)

      turbulenceRef.current?.setAttributeNS(null, "baseFrequency", `${bfx} ${bfy}`)
      frameId = window.requestAnimationFrame(freqAnimation)
    }

    frameId = window.requestAnimationFrame(freqAnimation)
    return () => window.cancelAnimationFrame(frameId)
  }, [])

  return (
    <div className="alarm-smoke-title-wrap" aria-label="ALARM">
      <div className="alarm-smoke-title" aria-hidden="true">
        ALARM
      </div>
      <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
        <filter id={filterId}>
          <feTurbulence ref={turbulenceRef} type="fractalNoise" baseFrequency=".03" numOctaves="20" />
          <feDisplacementMap in="SourceGraphic" scale="30" />
        </filter>
      </svg>
      <style jsx>{`
        .alarm-smoke-title-wrap {
          width: min(100%, 120vh);
          height: clamp(6.5rem, 26vmin, 18rem);
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          filter: url("#${filterId}");
        }

        .alarm-smoke-title {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(#fff, #999, #ddd, #888);
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
          font-size: clamp(5rem, 23vmin, 17rem);
          font-weight: 900;
          letter-spacing: -0.08em;
          line-height: 0.9;
          filter: blur(6px) contrast(120%);
          text-align: center;
        }
      `}</style>
    </div>
  )
}
