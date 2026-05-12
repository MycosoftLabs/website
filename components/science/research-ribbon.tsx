"use client"

import { ExternalLink } from "lucide-react"
import { NeuCard, NeuCardContent } from "@/components/ui/neuromorphic"
import {
  MODALITY_BADGE_CLASSES,
  STATUS_PILL_CLASSES,
  type SciencePublication,
} from "@/lib/science-publications"

interface ResearchRibbonProps {
  publications: SciencePublication[]
  /** Optional cap; defaults to 12 to match spec. */
  limit?: number
}

// TODO(api): swap to fetch('/api/research/feed') when route ships.
// For now the ribbon is a pure component over `lib/science-publications.ts`
// so it stays SSR-friendly and trivially testable. The data shape is stable
// (`SciencePublication`), so an eventual API can return the same JSON.

export function ResearchRibbon({ publications, limit = 12 }: ResearchRibbonProps) {
  const items = publications.slice(0, limit)

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
        No publications yet — check back as the atlas grows.
      </div>
    )
  }

  return (
    <div
      className="research-ribbon -mx-4 overflow-x-auto px-4 pb-4 [scrollbar-width:thin]"
      role="region"
      aria-label="Latest research and source repositories"
    >
      <ul className="flex snap-x snap-mandatory gap-4">
        {items.map((pub) => {
          const modalityClass = MODALITY_BADGE_CLASSES[pub.modality]
          const statusClass = pub.status ? STATUS_PILL_CLASSES[pub.status] : null
          return (
            <li
              key={pub.id}
              className="snap-start shrink-0 min-w-[280px] sm:min-w-[320px] max-w-[360px]"
            >
              <NeuCard className="h-full">
                <NeuCardContent className="flex h-full flex-col gap-3 p-5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${modalityClass}`}
                    >
                      {pub.modality}
                    </span>
                    {statusClass ? (
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusClass}`}
                      >
                        {pub.status}
                      </span>
                    ) : null}
                    <span className="ml-auto text-[10px] uppercase tracking-wider text-white/40">
                      {pub.kind}
                    </span>
                  </div>

                  <a
                    href={pub.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col gap-2"
                  >
                    <h3 className="line-clamp-2 text-base font-semibold text-white group-hover:text-emerald-200">
                      {pub.title}
                    </h3>
                    {pub.blurb ? (
                      <p className="line-clamp-3 text-xs leading-relaxed text-white/70">
                        {pub.blurb}
                      </p>
                    ) : null}
                  </a>

                  <div className="mt-auto flex items-center justify-between gap-3 pt-2 text-xs text-white/60">
                    <span className="truncate">
                      {pub.source} · {pub.year}
                    </span>
                    <a
                      href={pub.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${pub.title} in a new tab`}
                      className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[10px] text-white/80 hover:bg-white/10"
                    >
                      Open
                      <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  </div>
                </NeuCardContent>
              </NeuCard>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
