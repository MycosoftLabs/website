"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"

export function ModeToggle() {
  const { resolvedTheme, theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    setIsDark((resolvedTheme ?? theme ?? "dark") === "dark")
  }, [mounted, resolvedTheme, theme])

  function handleToggle() {
    const nextIsDark = !isDark
    setIsDark(nextIsDark)
    setTheme(nextIsDark ? "dark" : "light")
    document.documentElement.classList.toggle("dark", nextIsDark)
    document.documentElement.style.colorScheme = nextIsDark ? "dark" : "light"
  }

  return (
    <>
      <label className="theme-switch" aria-label="Toggle theme">
        <input
          type="checkbox"
          checked={isDark}
          onChange={handleToggle}
          suppressHydrationWarning
        />
        <div className="theme-switch-surface">
          <div className="theme-switch-bg" />
          <div className="theme-switch-outer-shadow" />
          <div className="theme-switch-inner-shadow" />
          <div className="theme-switch-active-light" />
          <div className="theme-switch-inner-surface">
            <div className="theme-switch-balls">
              <div className="theme-switch-active-ball" />
              <div className="theme-switch-inactive-ball" />
            </div>
            <div className="theme-switch-glass" />
            <div className="theme-switch-dark-shadow" />
            <div className="theme-switch-light-shadow" />
          </div>
          <div className="theme-switch-lights">
            <div className="theme-switch-active-ball-light" />
            <div className="theme-switch-inactive-ball-light" />
          </div>
        </div>
      </label>

      <style jsx>{`
        .theme-switch {
          --switch-w: 3.6rem;
          --switch-h: 2rem;
          --switch-pad: 0.16rem;
          --ball: 1.4rem;
          --duration: 0.25s;
          --press-duration: 0.25s;
          --press-timing-function: ease-in-out;
          --timing-function: ease-in-out;
          --light: #f7fbfc;
          --dark: #bcc7d3;
          position: relative;
          display: inline-block;
          width: var(--switch-w);
          height: var(--switch-h);
          border-radius: 999px;
          cursor: pointer;
          perspective: 50rem;
          flex: 0 0 auto;
        }

        .theme-switch input {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }

        .theme-switch-surface,
        .theme-switch-bg,
        .theme-switch-outer-shadow,
        .theme-switch-inner-shadow,
        .theme-switch-active-light,
        .theme-switch-inner-surface,
        .theme-switch-balls,
        .theme-switch-glass,
        .theme-switch-dark-shadow,
        .theme-switch-light-shadow,
        .theme-switch-lights {
          position: absolute;
          inset: 0;
          border-radius: inherit;
        }

        .theme-switch-bg {
          background: #ffffff;
          box-shadow:
            0.38rem 0.38rem 0.85rem rgba(119, 132, 146, 0.5),
            -0.38rem -0.38rem 0.85rem rgba(255, 255, 255, 0.92);
          filter: blur(0.035rem);
        }

        .theme-switch-bg::before {
          content: "";
          position: absolute;
          inset: 0.28rem 0.2rem 0.16rem 0.28rem;
          border-radius: inherit;
          box-shadow: 0.16rem 0.16rem 0.28rem rgba(0, 0, 0, 0.55);
          z-index: -1;
        }

        .theme-switch-bg::after {
          content: "";
          position: absolute;
          inset: 0.14rem;
          border-radius: inherit;
          background: #ffffff;
        }

        .theme-switch-outer-shadow::before {
          content: "";
          position: absolute;
          inset: 0.1rem 0 0.1rem -0.08rem;
          border-left: 0.12rem solid rgba(0, 0, 0, 0.08);
          border-radius: inherit;
          filter: blur(0.04rem);
        }

        .theme-switch-outer-shadow::after {
          content: "";
          position: absolute;
          inset: 0.08rem 0.06rem 0.08rem 0;
          border-top: 0.06rem solid rgba(0, 0, 0, 0.38);
          border-bottom: 0.28rem solid var(--light);
          border-radius: inherit;
          filter: blur(0.04rem);
        }

        .theme-switch-inner-shadow {
          inset: 0.24rem;
          box-shadow:
            0 0 0.08rem rgba(0, 0, 0, 0.24),
            0 0 0.2rem rgba(0, 0, 0, 0.24),
            0 0 0.28rem rgba(45, 62, 79, 0.5),
            0 0 0.26rem 0.12rem rgba(255, 255, 255, 0.75);
          animation: theme-switch-ratio-reverse var(--press-duration) var(--press-timing-function);
        }

        .theme-switch-active-light {
          inset: 0.16rem;
          opacity: 0.78;
          filter: blur(0.2rem) brightness(110%);
          mix-blend-mode: darken;
          background:
            radial-gradient(50% 100% at 50% 50%, #111111, #050505, transparent 88%),
            radial-gradient(20% 100% at 100% 50%, #7c8794 70%, transparent 90%),
            radial-gradient(20% 100% at 0% 50%, #7c8794 70%, transparent 90%);
          background-size: 200%;
          background-position-x: 100%;
          animation: theme-switch-active-light-reverse calc(var(--duration) * 1.2) var(--timing-function) alternate backwards;
          animation-delay: var(--press-duration);
        }

        .theme-switch-inner-surface {
          inset: 0.2rem;
          overflow: hidden;
          background:
            linear-gradient(to bottom, hsla(0, 0%, 90%, 0.8), transparent),
            radial-gradient(32% 49% at 60% 50%, #ffffff, transparent),
            radial-gradient(32% 49% at 50% 70%, #1e2f42, transparent),
            radial-gradient(82% 49% at 50% 50%, #1e2f42, transparent);
          animation: theme-switch-ratio-reverse var(--press-duration) var(--press-timing-function);
        }

        .theme-switch-dark-shadow,
        .theme-switch-light-shadow {
          perspective: 50rem;
          z-index: 4;
          pointer-events: none;
        }

        .theme-switch-dark-shadow::before,
        .theme-switch-dark-shadow::after,
        .theme-switch-light-shadow::before,
        .theme-switch-light-shadow::after {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          border-radius: 999px;
          filter: blur(0.04rem);
          mix-blend-mode: darken;
        }

        .theme-switch-dark-shadow::before {
          right: -3.74rem;
          left: -0.05rem;
          border-left: 0.17rem solid rgba(50, 66, 81, 0.25);
          transform: rotateY(1deg);
          top: -0.05rem;
        }

        .theme-switch-dark-shadow::after {
          left: -1rem;
          right: 0;
          border: 0.15rem solid rgba(97, 97, 97, 0.2);
          transform: rotateY(18deg) scale(1.2) rotate(2deg);
          bottom: -0.1rem;
          top: -0.03rem;
        }

        .theme-switch-light-shadow::after {
          inset: -0.09rem;
          border: 0.15rem solid rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          transform: scale(1.1);
        }

        .theme-switch-active-ball,
        .theme-switch-inactive-ball {
          position: absolute;
          top: 0.1rem;
          width: var(--ball);
          aspect-ratio: 1;
          border-radius: 50%;
        }

        .theme-switch-inactive-ball {
          left: 0.15rem;
          background:
            radial-gradient(30% 30% at 60% 40%, white, transparent 60%),
            radial-gradient(40% 40% at 10% 65%, white, transparent),
            radial-gradient(70% 70% at 30% 30%, white, transparent),
            radial-gradient(60% 60% at 30% 30%, white 30%, #39414a),
            #ffffff;
          box-shadow:
            inset 0.12rem 0.12rem 0.2rem rgba(255, 255, 255, 0.95),
            0.08rem 0.08rem 0.18rem rgba(0, 0, 0, 0.28);
          transform: translateX(0) scale(1);
          animation: theme-switch-inactive-ball-next calc(var(--duration) * 2.5) ease-in-out alternate backwards;
        }

        .theme-switch-active-ball {
          right: 0.15rem;
          z-index: 1;
          background:
            radial-gradient(25% 25% at 68% 62%, rgba(255, 255, 255, 0.22), transparent),
            radial-gradient(20% 20% at 70% 30%, rgba(255, 255, 255, 0.22), transparent),
            radial-gradient(60% 60% at 70% 30%, #3f3f46, transparent),
            radial-gradient(60% 60% at 20% 10%, #242424, transparent),
            radial-gradient(60% 60% at 20% 50%, #151515, transparent),
            #000000;
          box-shadow:
            inset 0.12rem 0.12rem 0.22rem rgba(255, 255, 255, 0.16),
            inset -0.12rem -0.12rem 0.22rem rgba(0, 0, 0, 0.8),
            0.08rem 0.08rem 0.2rem rgba(0, 0, 0, 0.4);
          transform: translateX(-110%) scale(1);
          animation: theme-switch-active-ball-next calc(var(--duration) * 2.5) ease-in-out alternate backwards;
        }

        .theme-switch-glass {
          background: rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(0.14rem);
          -webkit-backdrop-filter: blur(0.14rem);
          z-index: 3;
        }

        .theme-switch-glass::after {
          content: "";
          position: absolute;
          inset: -0.12rem;
          border-radius: 999px;
          background:
            radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.45), transparent 22%),
            radial-gradient(circle at 70% 70%, rgba(255, 255, 255, 0.14), transparent 32%);
          mix-blend-mode: plus-lighter;
          opacity: 0.72;
          mask: radial-gradient(at center, black, transparent 88%);
        }

        .theme-switch-active-ball-light,
        .theme-switch-inactive-ball-light {
          position: absolute;
          top: 0.1rem;
          width: 2rem;
          aspect-ratio: 1;
          border-top: 0.34rem rgba(255, 255, 255, 0.16) solid;
          border-bottom: 0.34rem rgba(255, 255, 255, 0.16) solid;
          filter: blur(0.1rem);
          mix-blend-mode: overlay;
          border-radius: 50%;
          z-index: 5;
          opacity: 0;
        }

        .theme-switch-active-ball-light {
          right: 0.1rem;
          border-color: rgba(0, 0, 0, 0.18);
          transform: translateX(0);
        }

        .theme-switch-inactive-ball-light {
          left: 0.1rem;
          transform: translateX(0);
        }

        .theme-switch input:checked + .theme-switch-surface .theme-switch-inner-shadow,
        .theme-switch input:checked + .theme-switch-surface .theme-switch-inner-surface {
          inset: 0.25rem;
          animation: theme-switch-ratio var(--press-duration) var(--press-timing-function);
        }

        .theme-switch input:checked + .theme-switch-surface .theme-switch-active-light {
          background-position-x: 0%;
          filter: blur(0.2rem) brightness(125%);
          animation: theme-switch-active-light calc(var(--duration) * 1.2) var(--timing-function) forwards;
          animation-delay: var(--press-duration);
        }

        .theme-switch input:checked + .theme-switch-surface .theme-switch-inactive-ball {
          transform: translateX(110%) scale(1);
          opacity: 0.72;
          animation: theme-switch-inactive-ball calc(var(--duration) * 2.5) ease-in-out forwards;
        }

        .theme-switch input:checked + .theme-switch-surface .theme-switch-active-ball {
          transform: translateX(0) scale(1);
          opacity: 1;
          animation: theme-switch-active-ball calc(var(--duration) * 2.5) ease-in-out forwards;
        }

        .theme-switch input:checked + .theme-switch-surface .theme-switch-inactive-ball-light {
          transform: translateX(70%);
          opacity: 0;
          animation: theme-switch-inactive-ball-light var(--duration) ease-in-out forwards;
        }

        .theme-switch input:checked + .theme-switch-surface .theme-switch-active-ball-light {
          transform: translateX(-70%);
          opacity: 1;
          animation: theme-switch-active-ball-light var(--duration) ease-in-out forwards;
        }

        .theme-switch:not(:has(input:checked)) .theme-switch-active-ball-light {
          opacity: 0;
          animation: theme-switch-active-ball-light-next var(--duration) ease-in-out alternate backwards;
        }

        .theme-switch:not(:has(input:checked)) .theme-switch-inactive-ball-light {
          opacity: 1;
          animation: theme-switch-inactive-ball-light-next var(--duration) ease-in-out alternate backwards;
        }

        @keyframes theme-switch-ratio {
          from { inset: 0.24rem; }
          50% { inset: 0.12rem; }
          to { inset: 0.25rem; }
        }

        @keyframes theme-switch-ratio-reverse {
          from { inset: 0.25rem; }
          50% { inset: 0.12rem; }
          to { inset: 0.24rem; }
        }

        @keyframes theme-switch-active-light {
          from {
            background-position-x: 100%;
            filter: brightness(100%) blur(0.2rem);
            opacity: 0.78;
          }
          50% {
            filter: brightness(155%) blur(0.2rem);
            opacity: 0.42;
          }
          to {
            background-position-x: 0%;
            filter: brightness(110%) blur(0.2rem);
            opacity: 0.86;
          }
        }

        @keyframes theme-switch-active-light-reverse {
          from {
            background-position-x: 0%;
            filter: brightness(110%) blur(0.2rem);
            opacity: 0.86;
          }
          50% {
            filter: brightness(155%) blur(0.2rem);
            opacity: 0.42;
          }
          to {
            background-position-x: 100%;
            filter: brightness(100%) blur(0.2rem);
            opacity: 0.78;
          }
        }

        @keyframes theme-switch-inactive-ball {
          from { transform: translateX(0) scale(1); opacity: 1; }
          40% { transform: translateX(130%) scale(1); opacity: 1; }
          80% { transform: translateX(100%) scale(0.6); opacity: 0.4; }
          to { transform: translateX(110%) scale(1); opacity: 0.72; }
        }

        @keyframes theme-switch-active-ball {
          from { transform: translateX(-110%) scale(1); opacity: 1; }
          30% { transform: translateX(-50%) scale(0.2); opacity: 0.6; }
          70% { transform: translateX(-120%) scale(0.6); opacity: 0.8; }
          80% { transform: translateX(-90%) scale(1); opacity: 1; }
          to { transform: translateX(0) scale(1); opacity: 1; }
        }

        @keyframes theme-switch-inactive-ball-next {
          from { transform: translateX(110%) scale(1); opacity: 0.72; }
          30% { transform: translateX(50%) scale(0.2); opacity: 0.6; }
          70% { transform: translateX(0) scale(0.6); opacity: 0.8; }
          80% { transform: translateX(10%) scale(1); opacity: 1; }
          to { transform: translateX(0) scale(1); opacity: 1; }
        }

        @keyframes theme-switch-active-ball-next {
          from { transform: translateX(0) scale(1); opacity: 1; }
          20% { transform: translateX(-20%) scale(1.1); opacity: 1; }
          40% { transform: translateX(-110%) scale(1.1); opacity: 1; }
          80% { transform: translateX(-110%) scale(0.6); opacity: 0.4; }
          to { transform: translateX(-110%) scale(1); opacity: 1; }
        }

        @keyframes theme-switch-inactive-ball-light {
          from { transform: translateX(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          to { transform: translateX(70%); opacity: 0; }
        }

        @keyframes theme-switch-active-ball-light {
          from { transform: translateX(0); opacity: 0; }
          95% { opacity: 0; }
          to { transform: translateX(-70%); opacity: 1; }
        }

        @keyframes theme-switch-active-ball-light-next {
          from { transform: translateX(-70%); opacity: 1; }
          to { transform: translateX(0); opacity: 0; }
        }

        @keyframes theme-switch-inactive-ball-light-next {
          from { transform: translateX(70%); opacity: 0; }
          95% { opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        .theme-switch:focus-within {
          outline: 2px solid hsl(var(--ring));
          outline-offset: 3px;
        }

        @media (max-width: 640px) {
          .theme-switch {
            --switch-w: 3.15rem;
            --switch-h: 1.75rem;
            --ball: 1.2rem;
          }
        }
      `}</style>
    </>
  )
}
