"use client"

import { LiveDemo } from "@/components/myca/LiveDemo"
import { SiteVoiceStubProvider } from "@/components/voice/UnifiedVoiceProvider"
import { NeuromorphicProvider } from "@/components/ui/neuromorphic"
import { AvaniProvider } from "@/contexts/avani-context"
import { MYCAProvider } from "@/contexts/myca-context"

export function HomeMYCABackdrop() {
  return (
    <MYCAProvider initialConsciousnessActive>
      <div className="absolute inset-0 bg-[#080d12]" aria-hidden="true" />
    </MYCAProvider>
  )
}

interface HomeMYCAExperienceProps {
  active?: boolean
}

export function HomeMYCAExperience({ active = true }: HomeMYCAExperienceProps) {
  return (
    <NeuromorphicProvider className="dark home-myca-demo-neu h-full" forceDark>
      <div className="myca-page home-myca-demo-surface relative min-h-full w-full overflow-hidden">
        <SiteVoiceStubProvider>
          <AvaniProvider enabled={active}>
            <MYCAProvider initialConsciousnessActive={active}>
              <div className="absolute inset-0 bg-[#080d12]" aria-hidden="true">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(34,197,94,0.12),transparent_28%),radial-gradient(circle_at_75%_55%,rgba(20,184,166,0.10),transparent_30%)]" />
              </div>
              <div className="relative z-10 h-full">
                <LiveDemo
                  active={active}
                  showDemoBackground={false}
                  showIntro={false}
                  forceMountPanels={false}
                  className="min-h-[calc(100dvh-3rem)] md:min-h-[calc(100dvh-3.5rem)] flex items-start"
                />
              </div>
            </MYCAProvider>
          </AvaniProvider>
        </SiteVoiceStubProvider>
      </div>
    </NeuromorphicProvider>
  )
}

export function HomeMYCADemoPanel() {
  return (
    <NeuromorphicProvider className="dark home-myca-demo-neu h-full" forceDark>
      <div className="myca-page home-myca-demo-surface min-h-full w-full">
        <SiteVoiceStubProvider>
          <AvaniProvider>
            <MYCAProvider initialConsciousnessActive>
              <LiveDemo
                showDemoBackground={false}
                showIntro={false}
                forceMountPanels={false}
                className="min-h-[calc(100dvh-3rem)] md:min-h-[calc(100dvh-3.5rem)] flex items-start"
              />
            </MYCAProvider>
          </AvaniProvider>
        </SiteVoiceStubProvider>
      </div>
    </NeuromorphicProvider>
  )
}
