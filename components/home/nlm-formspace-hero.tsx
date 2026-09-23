import Image from "next/image"
import { NlmFormspaceStage } from "@/components/home/nlm-formspace-stage"
import { cn } from "@/lib/utils"

const HERO_LOGO =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Mycosoft%20Logo%20(1)-lArPx4fwtqahyHVlnRLWWSfqWLIJpv.png"

interface NlmFormspaceHeroProps {
  className?: string
}

export function NlmFormspaceHero({ className }: NlmFormspaceHeroProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="relative overflow-visible rounded-3xl border border-black/10 bg-white/20 text-slate-950 shadow-[0_24px_60px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.55)] backdrop-blur-xl dark:border-white/20 dark:bg-black/20 dark:text-white dark:shadow-[0_24px_60px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.18)]">
        <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-white/25 via-white/8 to-transparent dark:from-white/10 dark:via-transparent dark:to-black/15" />
        <div className="relative z-10 flex flex-col px-3 py-4 sm:px-6 sm:py-6">
          <div className="mb-3 flex items-center justify-center gap-2 sm:gap-3">
            <div className="relative h-12 w-12 shrink-0 sm:h-14 sm:w-14">
              <Image src={HERO_LOGO} alt="Mycosoft" fill priority className="object-contain invert dark:invert-0" />
            </div>
            <h1 className="text-3xl font-bold text-slate-950 sm:text-4xl md:text-5xl dark:text-white">Mycosoft</h1>
          </div>
          <p className="text-center text-base text-slate-900 sm:text-lg md:text-xl dark:text-white">
            Operational Environmental Superintelligence
          </p>
          <p className="mx-auto mb-4 mt-2 max-w-2xl text-center text-xs italic text-slate-600 sm:text-sm dark:text-white/75">
            All species, all signals, all machines, all environments
          </p>
          <NlmFormspaceStage />
        </div>
      </div>
    </div>
  )
}
