"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowUpRight, Database, Globe2, Layers3, Radar, Search, Shield, Sparkles } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { HeroSearch } from "@/components/home/hero-search"
import { HomeMYCAExperience } from "@/components/home/home-myca-demo-panel"
import { AutoplayVideo } from "@/components/ui/autoplay-video"
import { homeHeroVideoSources, primaryHomeHeroPosterPath } from "@/lib/asset-video-sources"
import { cn } from "@/lib/utils"

const HOME_HERO_SOURCES = homeHeroVideoSources()
const HOME_HERO_POSTER = primaryHomeHeroPosterPath()

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
    sources: ["/assets/homepage/tiles/sporebase-tile-1080-2026.mp4"],
    poster: "/assets/sporebase/sporebase%20main.jpg",
    icon: Sparkles,
  },
  {
    title: "Hyphae 1",
    eyebrow: "Living Network Node",
    href: "/devices/hyphae-1",
    description: "Mycelial sensing, environmental edge telemetry, and signal routing.",
    video: "/assets/homepage/tiles/hyphae1-tile-1080-2026.mp4",
    sources: ["/assets/homepage/tiles/hyphae1-tile-1080-2026.mp4"],
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
    sources: ["/assets/homepage/tiles/myconode-tile-1080-2026.mp4"],
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
    sources: ["/assets/homepage/tiles/generic-tile-1080-2026.mp4"],
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
    sources: ["/assets/homepage/tiles/earth-simulator-tile-1080-2026.mp4"],
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
  return (
    <div className="absolute inset-0 overflow-hidden bg-neutral-950">
      {tile.video || tile.sources?.length ? (
        <AutoplayVideo
          src={tile.video}
          sources={tile.sources}
          preload="auto"
          stallTimeoutMs={1800}
          className="absolute inset-0 h-full w-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-105"
          encodeSrc
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/10" />
      <div className="absolute inset-0 bg-red-950/10 mix-blend-multiply" />
    </div>
  )
}

export function HomeCommandPage() {
  const [showMYCADemo, setShowMYCADemo] = useState(false)
  const [hasMountedMYCADemo, setHasMountedMYCADemo] = useState(true)
  const showMYCADemoRef = useRef(false)

  const pinHero = () => {
    if (typeof window === "undefined") return
    window.scrollTo({ top: 0, left: 0, behavior: "auto" })
  }

  const openMYCADemo = () => {
    if (showMYCADemoRef.current) return
    showMYCADemoRef.current = true
    pinHero()
    window.dispatchEvent(new Event("myca-home-demo-reset"))
    setHasMountedMYCADemo(true)
    window.requestAnimationFrame(() => {
      setShowMYCADemo(true)
      pinHero()
    })
  }

  const returnToSearch = () => {
    if (!showMYCADemoRef.current) return
    showMYCADemoRef.current = false
    pinHero()
    window.dispatchEvent(new Event("myca-home-demo-close"))
    setShowMYCADemo(false)
    window.requestAnimationFrame(pinHero)
  }

  useEffect(() => {
    showMYCADemoRef.current = showMYCADemo
    if (!showMYCADemo) return
    pinHero()
    const frame = window.requestAnimationFrame(pinHero)
    const settle = window.setTimeout(pinHero, 360)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(settle)
    }
  }, [showMYCADemo])

  return (
    <div className="home-command-page-light min-h-dvh bg-white text-slate-950 dark:bg-black dark:text-white">
      <section
        data-over-video
        data-myca-active={showMYCADemo ? "true" : "false"}
        className="home-hero-glass-field relative min-h-[calc(100dvh-3rem)] overflow-hidden border-b border-white/10"
      >
        <div className="absolute inset-0">
          {HOME_HERO_SOURCES[0] ? (
            <AutoplayVideo
              src={HOME_HERO_SOURCES[0]}
              sources={HOME_HERO_SOURCES}
              poster={HOME_HERO_POSTER}
              preload="auto"
              stallTimeoutMs={18000}
              className="absolute inset-0 h-full w-full object-cover"
              encodeSrc
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/12 to-black/70" />
        </div>

        <div
          data-home-search-layer
          inert={showMYCADemo ? true : undefined}
          className={cn(
            "relative z-10 mx-auto min-h-[calc(100dvh-3rem)] w-full max-w-7xl",
            showMYCADemo && "pointer-events-none"
          )}
        >
          <motion.div
            className="absolute inset-0 flex items-center justify-center px-4 py-20 sm:px-6 lg:px-8"
            initial={false}
            animate={showMYCADemo ? { opacity: 0, y: -48, scale: 0.96 } : { opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.46, ease: [0.22, 0.61, 0.36, 1] }}
            aria-hidden={showMYCADemo}
          >
            <div className="mx-auto w-full max-w-3xl">
              <HeroSearch
                showBackground={false}
                embedded
                className="w-full"
                onOpenMYCADemo={openMYCADemo}
              />
            </div>
          </motion.div>
        </div>

        {hasMountedMYCADemo ? (
          <motion.div
            key="myca-demo"
            data-home-myca-layer
            className={cn("absolute inset-0 z-20", !showMYCADemo && "pointer-events-none")}
            initial={false}
            animate={showMYCADemo ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 32, scale: 0.985 }}
            transition={{ duration: 0.58, ease: [0.22, 0.61, 0.36, 1] }}
            aria-hidden={!showMYCADemo}
            inert={!showMYCADemo ? true : undefined}
          >
            <HomeMYCAExperience active={showMYCADemo} />
            {showMYCADemo ? (
              <div className="natureos-glass-page myco-home-return-search-glass absolute bottom-8 right-4 z-30 sm:right-7 lg:bottom-16 lg:right-10">
                <div className="petri-codepen-button-demo petri-codepen-button-demo-reset myco-hero-petri-icon myco-home-return-search-button">
                  <div className="button-wrap">
                    <button
                      type="button"
                      aria-label="Return to search panels"
                      title="Search"
                      onClick={returnToSearch}
                      onPointerDown={(event) => {
                        event.preventDefault()
                        returnToSearch()
                      }}
                    >
                      <span>
                        <Search className="h-[1em] w-[1em]" />
                      </span>
                    </button>
                    <div className="button-shadow" />
                  </div>
                </div>
              </div>
            ) : null}
          </motion.div>
        ) : null}
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
