"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowUpRight, Database, Globe2, Layers3, Radar, Shield, Sparkles } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { HeroSearch } from "@/components/home/hero-search"
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
    video: "/assets/mushroom1/mushroom1-hero-2026.mp4",
    sources: ["/assets/mushroom1/mushroom1-hero-2026.mp4"],
    poster: "/assets/mushroom1/Mushroom 1.jpg",
    icon: Layers3,
  },
  {
    title: "SporeBase",
    eyebrow: "Bioaerosol Collection",
    href: "/devices/sporebase",
    description: "Time-indexed airborne biology collection for field networks.",
    video: "/assets/sporebase/sporebase1publish.mp4",
    poster: "/assets/sporebase/sporebase%20main.jpg",
    icon: Sparkles,
  },
  {
    title: "Hyphae 1",
    eyebrow: "Living Network Node",
    href: "/devices/hyphae-1",
    description: "Mycelial sensing, environmental edge telemetry, and signal routing.",
    video: "/assets/hyphae1/hero.mp4",
    poster: "/assets/hyphae1/hyphae1-lab-prototype.png",
    icon: Layers3,
  },
  {
    title: "Psathyrella",
    eyebrow: "Waterline Acoustic Node",
    href: "/devices/psathyrella",
    description: "Surface, shoreline, and amphibious intelligence collection.",
    video: "/assets/psathyrella/psathyrella-hero-2026.mp4",
    sources: ["/assets/psathyrella/psathyrella-hero-2026.mp4"],
    poster: "/assets/psathyrella/hero.png",
    icon: Radar,
  },
  {
    title: "Agaric",
    eyebrow: "Flying Sensor Droid",
    href: "/devices/agaric",
    description: "Autonomous aerial sensing, deployment, retrieval, and relay.",
    video: "/assets/agaric/agaric-hero2.mp4",
    sources: ["/assets/agaric/agaric-hero2.mp4"],
    poster: "/assets/agaric/hero2.jpg",
    icon: Radar,
  },
  {
    title: "MycoNode",
    eyebrow: "Sensor Mesh",
    href: "/devices/myconode",
    description: "Distributed node hardware for local sensing and resilient comms.",
    video: "/assets/myconode/myconode hero1.mp4",
    poster: "/assets/myconode/myconode-main.png",
    icon: Database,
  },
  {
    title: "FUSARIUM",
    eyebrow: "Defense OS",
    href: "/defense/fusarium",
    description: "Manned, unmanned, and CREP mission intelligence around MYCA and MINDEX.",
    video: "/assets/fusarium/fusarium-hero-web.mp4",
    sources: ["/assets/fusarium/fusarium-hero-web.mp4"],
    icon: Shield,
    span: 2,
  },
  {
    title: "Earth Simulator",
    eyebrow: "CREP Core",
    href: "/natureos/earth-simulator",
    description: "Worldview, species, sensors, missions, and live planetary context.",
    video: "/assets/homepage/Mycosoft Background-web.mp4",
    poster: HOME_HERO_POSTER,
    icon: Globe2,
  },
  {
    title: "MYCA",
    eyebrow: "Mission AI",
    href: "/myca",
    description: "The AI interface for planning, querying, and coordinating Mycosoft systems.",
    video: "/assets/homepage/Mycosoft Background-web.mp4",
    poster: HOME_HERO_POSTER,
    icon: Sparkles,
  },
  {
    title: "NatureOS",
    eyebrow: "Earth Intelligence",
    href: "/natureos",
    description: "Workflows, live environmental data, ecological operations, and Earth-scale intelligence.",
    video: "/assets/homepage/Mycosoft Background-web.mp4",
    poster: HOME_HERO_POSTER,
    icon: Globe2,
    span: 2,
  },
]

function TileMedia({ tile }: { tile: HomeTile }) {
  const mediaRef = useRef<HTMLDivElement>(null)
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false)

  useEffect(() => {
    const node = mediaRef.current
    if (!node) return
    if (typeof IntersectionObserver === "undefined") {
      setShouldLoadVideo(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setShouldLoadVideo(true)
        observer.disconnect()
      },
      { rootMargin: "420px" }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={mediaRef} className="absolute inset-0 overflow-hidden bg-neutral-950">
      {shouldLoadVideo && (tile.video || tile.sources?.length) ? (
        <AutoplayVideo
          src={tile.video}
          sources={tile.sources}
          preload="metadata"
          stallTimeoutMs={9000}
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
  return (
    <div className="min-h-dvh bg-black text-white">
      <section className="relative min-h-[calc(100dvh-3rem)] overflow-hidden border-b border-white/10">
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
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(255,255,255,0.20),transparent_34%),radial-gradient(circle_at_80%_70%,rgba(150,0,0,0.28),transparent_30%)]" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-3rem)] max-w-7xl flex-col justify-center px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-3xl">
            <HeroSearch showBackground={false} embedded className="w-full" />
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-black px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-400">Direct Links</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Devices, platforms, and mission systems.
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-white/55">
            Each square routes directly into the operating layer behind Mycosoft: hardware, MYCA, NatureOS, Earth Simulator, and FUSARIUM.
          </p>
        </div>
      </section>

      <section className="bg-black px-3 pb-16 pt-3 sm:px-4 lg:px-6">
        <div className="mx-auto grid max-w-[1800px] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {TILES.map((tile) => {
            const Icon = tile.icon
            return (
              <Link
                key={tile.href}
                href={tile.href}
                prefetch={false}
                className={cn(
                  "group relative aspect-square overflow-hidden border border-white/10 bg-neutral-950 text-white",
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
