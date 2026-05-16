"use client"

import { Search } from "lucide-react"
import { LiveDemo } from "@/components/myca/LiveDemo"
import { MYCALiveDemoBackground } from "@/components/myca/MYCALiveDemoBackground"
import { SiteVoiceStubProvider } from "@/components/voice/UnifiedVoiceProvider"
import { NeuromorphicProvider } from "@/components/ui/neuromorphic"
import { AvaniProvider } from "@/contexts/avani-context"
import { MYCAProvider } from "@/contexts/myca-context"

interface HomeMYCAExperienceProps {
  onReturnToSearch: () => void
}

export function HomeMYCABackdrop() {
  return (
    <MYCAProvider initialConsciousnessActive>
      <MYCALiveDemoBackground className="opacity-80" transparent={false} />
    </MYCAProvider>
  )
}

export function HomeMYCAExperience({ onReturnToSearch }: HomeMYCAExperienceProps) {
  return (
    <NeuromorphicProvider className="dark home-myca-demo-neu h-full" forceDark>
      <div className="myca-page home-myca-demo-surface relative min-h-full w-full overflow-hidden">
        <SiteVoiceStubProvider>
          <AvaniProvider>
            <MYCAProvider initialConsciousnessActive>
              <div className="absolute inset-0 bg-[#080d12]" aria-hidden="true">
                <MYCALiveDemoBackground className="opacity-80" transparent={false} />
              </div>
              <div className="relative z-10 h-full">
                <LiveDemo
                  showDemoBackground={false}
                  showIntro={false}
                  className="min-h-[calc(100dvh-3rem)] md:min-h-[calc(100dvh-3.5rem)] flex items-start"
                />
              </div>
              <div className="natureos-glass-page myco-home-return-search-glass absolute bottom-8 right-4 z-30 sm:right-7 lg:bottom-16 lg:right-10">
                <div className="petri-codepen-button-demo petri-codepen-button-demo-reset myco-hero-petri-icon myco-home-return-search-button">
                  <div className="button-wrap">
                    <button
                      type="button"
                      aria-label="Return to search panels"
                      title="Search"
                      onClick={onReturnToSearch}
                      onPointerDown={onReturnToSearch}
                    >
                      <span>
                        <Search className="h-[1em] w-[1em]" />
                      </span>
                    </button>
                    <div className="button-shadow" />
                  </div>
                </div>
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
                className="min-h-[calc(100dvh-3rem)] md:min-h-[calc(100dvh-3.5rem)] flex items-start"
              />
            </MYCAProvider>
          </AvaniProvider>
        </SiteVoiceStubProvider>
      </div>
    </NeuromorphicProvider>
  )
}
