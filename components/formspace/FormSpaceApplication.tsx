"use client"

import { ArrowRight } from "lucide-react"
import {
  FORMSPACE_GLASS_CYCLE_FRAMES,
  ProductGlassIconCycle,
} from "@/components/brand/product-glass-icon-cycle"
import { FormSpaceDocsPanel } from "@/components/formspace/FormSpaceDocsPanel"
import { FormSpaceIntro } from "@/components/formspace/FormSpaceIntro"
import { FormSpaceWorkspace } from "@/components/formspace/FormSpaceWorkspace"
import { GlassButton } from "@/components/ui/glass-button"
import type { FormSpacePanelSections, FormSpacePaperMetadata } from "@/lib/formspace-paper"
import { cn } from "@/lib/utils"

export interface FormSpaceApplicationProps {
  metadata: FormSpacePaperMetadata
  sections: FormSpacePanelSections
  embedded?: boolean
}

/**
 * FormSpace application shell — mirrors NlmTrainingApplication layout:
 * primary workspace in the center, modular paper context on the right
 * switched by icons (Overview / Abstract / Description).
 */
export function FormSpaceApplication({
  metadata,
  sections,
  embedded = false,
}: FormSpaceApplicationProps) {
  return (
    <div
      className={cn(
        "product-glass-page text-black dark:text-white",
        embedded ? "min-h-[32rem]" : "min-h-dvh",
      )}
    >
      <section className="rounded-none border-x-0 border-t-0 border-b border-black/10 bg-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] backdrop-blur-xl dark:border-white/15 dark:bg-black/20 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]">
        <div className="container mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium uppercase tracking-[0.16em] text-black/60 dark:text-white/70">
                Environmental Platonic Map
              </p>
              <h1 className="mt-1 inline-flex max-w-full flex-nowrap items-center gap-[0.18em] text-3xl font-bold tracking-tight leading-none sm:text-4xl md:text-5xl">
                <ProductGlassIconCycle
                  frames={FORMSPACE_GLASS_CYCLE_FRAMES}
                  className="h-[1em] w-[1em] scale-90 translate-y-[5px]"
                  alt="FormSpace"
                  reducedMotionLightIndex={0}
                  reducedMotionDarkIndex={1}
                />
                <span className="whitespace-nowrap leading-none">{metadata.title}</span>
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-black/70 sm:text-base dark:text-white/80">
                {metadata.subtitle}
              </p>
              <p className="mt-2 text-xs text-black/50 dark:text-white/55">
                Nature Learning Model writes coordinates · FormSpace charts organization
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <GlassButton href="/docs/ai/formspace" className="min-h-[44px]">
                White paper
                <ArrowRight className="ml-2 inline h-4 w-4" />
              </GlassButton>
              <GlassButton href="/ai/formspace/downloads" className="min-h-[44px]">
                Downloads
              </GlassButton>
              <GlassButton href="/myca/nlm" className="min-h-[44px]">
                NLM
              </GlassButton>
            </div>
          </div>

          <FormSpaceIntro />
        </div>
      </section>

      <div className="container mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-6">
          <div className="order-1 min-w-0 flex-1">
            <FormSpaceWorkspace />
          </div>

          <div className="order-2 w-full shrink-0 lg:w-[22rem] xl:w-[26rem]">
            {/*
              Bound panel to viewport: sticky frame + max height.
              Only the active tab body scrolls — not an endless accordion of the whole paper.
            */}
            <div className="flex max-h-[min(70dvh,36rem)] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white/25 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] backdrop-blur-xl sm:max-h-[min(75dvh,40rem)] lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] dark:border-white/15 dark:bg-black/25 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
              <FormSpaceDocsPanel sections={sections} className="min-h-0 flex-1" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
