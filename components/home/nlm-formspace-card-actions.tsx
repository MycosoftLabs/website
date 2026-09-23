"use client"

import { useState } from "react"
import Link from "next/link"
import { Download, FileText, Play } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

interface NlmFormspaceCardActionsProps {
  paperHref: string
  downloadsHref: string
  videoId: string
  videoTitle: string
}

export function NlmFormspaceCardActions({
  paperHref,
  downloadsHref,
  videoId,
  videoTitle,
}: NlmFormspaceCardActionsProps) {
  const [videoOpen, setVideoOpen] = useState(false)

  return (
    <>
      <div className="relative mt-auto grid w-full grid-cols-3 gap-2 px-3 pb-4 sm:px-4">
        <Link
          href={paperHref}
          className="inline-flex min-h-[44px] min-w-0 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-xl border border-black/15 bg-white/70 px-1 text-[11px] leading-none text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-md transition-transform duration-300 hover:scale-[0.975] dark:border-white/30 dark:bg-white/10 dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
        >
          <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="max-w-full truncate">Paper</span>
        </Link>
        <Link
          href={downloadsHref}
          className="inline-flex min-h-[44px] min-w-0 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-xl border border-black/15 bg-white/70 px-1 text-[11px] leading-none text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-md transition-transform duration-300 hover:scale-[0.975] dark:border-white/30 dark:bg-white/10 dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
        >
          <Download className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="max-w-full truncate">Downloads</span>
        </Link>
        <button
          type="button"
          onClick={() => setVideoOpen(true)}
          className="inline-flex min-h-[44px] min-w-0 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-xl border border-black/15 bg-white/70 px-1 text-[11px] leading-none text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-md transition-transform duration-300 hover:scale-[0.975] dark:border-white/30 dark:bg-white/10 dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
        >
          <Play className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="max-w-full truncate">Video</span>
        </button>
      </div>
      <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
        <DialogContent className="w-[calc(100%-1.5rem)] max-w-4xl border-black/10 bg-white/80 p-3 text-black backdrop-blur-xl sm:p-4 dark:border-white/25 dark:bg-black/45 dark:text-white">
          <DialogTitle className="pr-8 text-base font-semibold sm:text-lg">{videoTitle}</DialogTitle>
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
            {videoOpen ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
                title={videoTitle}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
