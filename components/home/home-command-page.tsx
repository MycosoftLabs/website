"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowUpRight, Database, Globe2, Layers3, Radar, Shield, Sparkles } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { HeroSearch } from "@/components/home/hero-search"
import { AutoplayVideo } from "@/components/ui/autoplay-video"
import { primaryHomeHeroPosterPath } from "@/lib/asset-video-sources"
import { encodeAssetUrl } from "@/lib/encode-asset-url"
import { cn } from "@/lib/utils"

const HOME_HERO_VIDEO = encodeAssetUrl(process.env.NEXT_PUBLIC_HOME_HERO_MP4?.trim() || "/assets/homepage/Mycosoft Background.mp4")
const HOME_HERO_POSTER = encodeAssetUrl(primaryHomeHeroPosterPath())
const PROD_ASSET_ORIGIN = "https://mycosoft.com"
const HomeMYCAExperience = dynamic(
  () => import("@/components/home/home-myca-demo-panel").then((mod) => mod.HomeMYCAExperience),
  { ssr: false }
)

type HomeTile = {
  title: string
  eyebrow: string
  href: string
  description: string
  video?: string
  sources?: string[]
  poster?: string
  icon: LucideIcon
  span?: 1 | 2
}

const TILES: HomeTile[] = [
  {
    title: "Mushroom 1",
    eyebrow: "Field Robotics",
    href: "/devices/mushroom-1",
    description: "Ground mobility for ecological sensing and autonomous patrol.",
    video: "/assets/mushroom1/mushroom1-hero-2026-fast-web.mp4",
    sources: ["/assets/mushroom1/mushroom1-hero-2026-fast-web.mp4"],
    poster: "/assets/mushroom1/Mushroom 1.jpg",
    icon: Layers3,
  },
  {
    title: "SporeBase",
    eyebrow: "Bioaerosol Collection",
    href: "/devices/sporebase",
    description: "Time-indexed airborne biology collection for field networks.",
    video: "/assets/homepage/tiles/sporebase-tile-1080-2026.mp4",
    poster: "/assets/sporebase/sporebase%20main.jpg",
    icon: Sparkles,
  },
  {
    title: "Hyphae 1",
    eyebrow: "Living Network Node",
    href: "/devices/hyphae-1",
    description: "Mycelial sensing, environmental edge telemetry, and signal routing.",
    video: "/assets/homepage/tiles/hyphae1-tile-1080-2026.mp4",
    poster: "/assets/hyphae1/hyphae1-lab-prototype.png",
    icon: Layers3,
  },
  {
    title: "Psathyrella",
    eyebrow: "Waterline Acoustic Node",
    href: "/devices/psathyrella",
    description: "Surface, shoreline, and amphibious intelligence collection.",
    video: "/assets/homepage/tiles/psathyrella-tile-1080-2026.mp4",
    sources: ["/assets/homepage/tiles/psathyrella-tile-1080-2026.mp4"],
    poster: "/assets/psathyrella/hero.png",
    icon: Radar,
  },
  {
    title: "Agaric",
    eyebrow: "Flying Sensor Droid",
    href: "/devices/agaric",
    description: "Autonomous aerial sensing, deployment, retrieval, and relay.",
    video: "/assets/homepage/tiles/agaric-tile-1080-2026.mp4",
    sources: ["/assets/homepage/tiles/agaric-tile-1080-2026.mp4"],
    poster: "/assets/agaric/hero2.jpg",
    icon: Radar,
  },
  {
    title: "MycoNode",
    eyebrow: "Sensor Mesh",
    href: "/devices/myconode",
    description: "Distributed node hardware for local sensing and resilient comms.",
    video: "/assets/homepage/tiles/myconode-tile-1080-2026.mp4",
    poster: "/assets/myconode/myconode-main.png",
    icon: Database,
  },
  {
    title: "FUSARIUM",
    eyebrow: "Defense OS",
    href: "/defense/fusarium",
    description: "Manned, unmanned, and CREP mission intelligence around MYCA and MINDEX.",
    video: "/assets/homepage/tiles/fusarium-tile-1080-2026.mp4",
    sources: ["/assets/homepage/tiles/fusarium-tile-1080-2026.mp4"],
    icon: Shield,
    span: 2,
  },
  {
    title: "NatureOS",
    eyebrow: "Earth Intelligence",
    href: "/natureos",
    description: "Workflows, live environmental data, ecological operations, and Earth-scale intelligence.",
    video: "/assets/homepage/tiles/generic-tile-1080-2026.mp4",
    poster: HOME_HERO_POSTER,
    icon: Globe2,
    span: 2,
  },
  {
    title: "Earth Simulator",
    eyebrow: "CREP Core",
    href: "/natureos/earth-simulator",
    description: "Worldview, species, sensors, missions, and live planetary context.",
    video: "/assets/homepage/tiles/earth-simulator-tile-1080-2026.mp4",
    poster: HOME_HERO_POSTER,
    icon: Globe2,
  },
  {
    title: "MYCA",
    eyebrow: "Mission AI",
    href: "/myca",
    description: "The AI interface for planning, querying, and coordinating Mycosoft systems.",
    video: "/assets/homepage/tiles/mycobrain-tile-1080-2026.mp4",
    sources: ["/assets/homepage/tiles/mycobrain-tile-1080-2026.mp4"],
    poster: "/assets/devices/mycobrainjetson-black.jpg",
    icon: Sparkles,
  },
]

function TileMedia({ tile }: { tile: HomeTile }) {
  const mediaRef = useRef<HTMLDivElement>(null)
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false)
  const tileSources = getTileVideoSources(tile)

  useEffect(() => {
    const node = mediaRef.current
    if (!node) return

    let frame = 0
    const loadWhenNearViewport = () => {
      const rect = node.getBoundingClientRect()
      const margin = Math.max(640, window.innerHeight * 0.75)
      if (rect.bottom >= -margin && rect.top <= window.innerHeight + margin) {
        setShouldLoadVideo(true)
      }
    }
    const scheduleVisibilityCheck = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        loadWhenNearViewport()
      })
    }

    loadWhenNearViewport()
    window.addEventListener("scroll", scheduleVisibilityCheck, { passive: true })
    window.addEventListener("resize", scheduleVisibilityCheck)
    const settleCheck = window.setTimeout(loadWhenNearViewport, 250)

    if (typeof IntersectionObserver === "undefined") {
      setShouldLoadVideo(true)
      return () => {
        if (frame) window.cancelAnimationFrame(frame)
        window.clearTimeout(settleCheck)
        window.removeEventListener("scroll", scheduleVisibilityCheck)
        window.removeEventListener("resize", scheduleVisibilityCheck)
      }
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setShouldLoadVideo(true)
        observer.disconnect()
      },
      { rootMargin: "900px 0px" }
    )

    observer.observe(node)
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.clearTimeout(settleCheck)
      window.removeEventListener("scroll", scheduleVisibilityCheck)
      window.removeEventListener("resize", scheduleVisibilityCheck)
      observer.disconnect()
    }
  }, [])

  return (
    <div ref={mediaRef} className="absolute inset-0 overflow-hidden bg-neutral-950">
      {shouldLoadVideo && (tile.video || tile.sources?.length) ? (
        <AutoplayVideo
          sources={tileSources}
          poster={tile.poster}
          preload="auto"
          stallTimeoutMs={1800}
          probeEmptyMp4={false}
          className="absolute inset-0 h-full w-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-105"
          encodeSrc
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/10" />
      <div className="absolute inset-0 bg-red-950/10 mix-blend-multiply" />
    </div>
  )
}

function getTileVideoSources(tile: HomeTile): string[] | undefined {
  const localSources = tile.sources?.length ? tile.sources : tile.video ? [tile.video] : []
  if (process.env.NODE_ENV !== "development") return localSources

  const withDevFallbacks: string[] = []
  for (const source of localSources) {
    if (source.startsWith("/assets/")) {
      withDevFallbacks.push(`${PROD_ASSET_ORIGIN}${source}`)
    }
    withDevFallbacks.push(source)
  }
  return withDevFallbacks
}

export function HomeCommandPage() {
  const [showMYCADemo, setShowMYCADemo] = useState(false)
  const mycaPreloadStartedRef = useRef(false)

  useEffect(() => {
    if (mycaPreloadStartedRef.current) return
    mycaPreloadStartedRef.current = true

    const preloadMYCA = () => {
      void Promise.allSettled([
        import("@/components/home/home-myca-demo-panel"),
        import("@/components/myca/MYCALiveDemoBackground"),
        import("three"),
        import("three/examples/jsm/postprocessing/EffectComposer.js"),
        import("three/examples/jsm/postprocessing/RenderPass.js"),
        import("three/examples/jsm/postprocessing/UnrealBloomPass.js"),
      ])
    }

    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(preloadMYCA, { timeout: 1800 })
      return () => window.cancelIdleCallback(id)
    }

    const timeout = window.setTimeout(preloadMYCA, 500)
    return () => window.clearTimeout(timeout)
  }, [])

  useEffect(() => {
    if (!showMYCADemo) return
    const keepHeroPinned = () => window.scrollTo({ top: 0, left: 0, behavior: "auto" })
    keepHeroPinned()
    const frame = window.requestAnimationFrame(keepHeroPinned)
    const settle = window.setTimeout(keepHeroPinned, 360)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(settle)
    }
  }, [showMYCADemo])

  return (
    <div className="home-command-page-light min-h-dvh bg-white text-slate-950 dark:bg-black dark:text-white">
      <section data-over-video className="home-hero-glass-field relative min-h-[calc(100dvh-3rem)] overflow-hidden border-b border-white/10">
        <div className="absolute inset-0">
          <motion.div
            className="absolute inset-0"
            initial={false}
            animate={{ opacity: showMYCADemo ? 0 : 1, scale: showMYCADemo ? 1.018 : 1 }}
            transition={{ duration: 0.62, ease: [0.22, 0.61, 0.36, 1] }}
          >
            {HOME_HERO_VIDEO ? (
              <video
                aria-hidden="true"
                data-testid="home-hero-full-video"
                className="absolute inset-0 h-full w-full object-cover"
                src={HOME_HERO_VIDEO}
                poster={HOME_HERO_POSTER}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                disablePictureInPicture
                onCanPlay={(event) => {
                  event.currentTarget.play().catch(() => {})
                }}
              />
            ) : null}
          </motion.div>
          <motion.div
            className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/12 to-black/70"
            initial={false}
            animate={{ opacity: showMYCADemo ? 0.42 : 1 }}
            transition={{ duration: 0.62, ease: [0.22, 0.61, 0.36, 1] }}
          />
        </div>

        <div className="relative z-10 mx-auto min-h-[calc(100dvh-3rem)] w-full max-w-7xl">
          <AnimatePresence mode="wait">
            {!showMYCADemo ? (
              <motion.div
                key="home-search"
                className="absolute inset-0 flex items-center justify-center px-4 py-20 sm:px-6 lg:px-8"
                initial={false}
                animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -48, scale: 0.96, filter: "blur(10px)" }}
                transition={{ duration: 0.46, ease: [0.22, 0.61, 0.36, 1] }}
              >
                <div className="mx-auto w-full max-w-3xl">
                  <HeroSearch
                    showBackground={false}
                    embedded
                    className="w-full"
                    onOpenMYCADemo={() => setShowMYCADemo(true)}
                  />
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {showMYCADemo ? (
            <motion.div
              key="myca-demo"
              className="absolute inset-0 z-20"
              initial={{ opacity: 0, y: 56, scale: 0.985, filter: "blur(12px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: 32, scale: 0.985, filter: "blur(8px)" }}
              transition={{ duration: 0.58, ease: [0.22, 0.61, 0.36, 1] }}
            >
              <HomeMYCAExperience onReturnToSearch={() => setShowMYCADemo(false)} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </section>

      <section className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8 dark:border-white/10 dark:bg-black">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="home-direct-links-eyebrow text-xs font-semibold uppercase tracking-[0.22em] text-red-600 dark:text-red-400">Direct Links</p>
            <h2 className="home-direct-links-title mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl dark:text-white">
              Devices, platforms, and mission systems.
            </h2>
          </div>
          <p className="home-direct-links-copy max-w-2xl text-sm leading-6 text-slate-700 dark:text-white/55">
            Each square routes directly into the operating layer behind Mycosoft: hardware, MYCA, NatureOS, Earth Simulator, and FUSARIUM.
          </p>
        </div>
      </section>

      <section className="bg-white px-3 pb-16 pt-3 sm:px-4 lg:px-6 dark:bg-black">
        <div className="mx-auto grid max-w-[1800px] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {TILES.map((tile) => {
            const Icon = tile.icon
            return (
              <Link
                key={tile.href}
                href={tile.href}
                prefetch={false}
                className={cn(
                  "home-video-tile group relative aspect-square overflow-hidden border border-white/10 bg-neutral-950 text-white",
                  "transition duration-300 hover:border-red-400/70 hover:shadow-[0_0_36px_rgba(220,38,38,0.25)]",
                  tile.span === 2 && "sm:col-span-2 sm:aspect-[2/1]"
                )}
              >
                <TileMedia tile={tile} />
                <div className="relative z-10 flex h-full flex-col justify-between p-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 border border-white/15 bg-black/35 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70 backdrop-blur">
                      <Icon className="h-3.5 w-3.5 text-red-300" />
                      {tile.eyebrow}
                    </span>
                    <span className="flex h-10 w-10 items-center justify-center border border-white/15 bg-white/10 backdrop-blur transition group-hover:border-red-300 group-hover:bg-red-500/20">
                      <ArrowUpRight className="h-5 w-5" />
                    </span>
                  </div>

                  <div>
                    <h3 className="text-3xl font-semibold tracking-tight sm:text-4xl">{tile.title}</h3>
                    <p className="mt-3 max-w-md text-sm leading-6 text-white/68">{tile.description}</p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
